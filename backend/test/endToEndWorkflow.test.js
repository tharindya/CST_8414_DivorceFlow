const test = require("node:test");
const assert = require("node:assert/strict");
const { buildExportCheck } = require("../src/services/exportCheck.service");
const { buildFinalReview } = require("../src/services/finalReview.service");
const {
  applyFinalConfirmation,
  resetFinalConfirmationState,
} = require("../src/services/signing.service");

const partyA = "64b000000000000000000001";
const partyB = "64b000000000000000000002";
const caseId = "64b000000000000000000003";

function reviewScenario({ caseDoc, clauses, actions, latestAiReview, currentUserId }) {
  return buildFinalReview({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
    currentUserId,
    exportCheck: buildExportCheck(caseDoc, clauses),
  });
}

test("complete agreement workflow reaches finalization and reopens after an edit", () => {
  const caseDoc = {
    _id: caseId,
    title: "End-to-end Ontario agreement",
    jurisdiction: "Ontario",
    status: "DRAFT",
    participants: [{ userId: partyA, role: "PARTY_A" }],
    intake: { completed: false, completedAt: null },
    finalConfirmations: [],
    finalizedAt: null,
  };
  const clauses = [];
  const actions = [];
  let latestAiReview = null;

  const draftReview = reviewScenario({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
    currentUserId: partyA,
  });
  const draftBlockers = draftReview.blockers.map((blocker) => blocker.code);
  assert.equal(draftReview.readiness, "NOT_READY");
  assert.equal(draftReview.canExport, false);
  assert.ok(draftBlockers.includes("PARTIES"));
  assert.ok(draftBlockers.includes("INTAKE"));
  assert.ok(draftBlockers.includes("CLAUSES"));
  assert.ok(draftBlockers.includes("AI_REVIEW"));

  caseDoc.participants.push({ userId: partyB, role: "PARTY_B" });
  caseDoc.status = "NEGOTIATING";
  caseDoc.intake = {
    completed: true,
    completedAt: new Date("2026-08-13T10:00:00Z"),
    dependents: "Two children",
    assets: "Matrimonial home",
    debts: "Joint credit card",
    supportRequirements: "Child support",
    custodyPreferences: "Shared parenting",
  };
  clauses.push(
    {
      _id: "64b000000000000000000010",
      caseId,
      title: "Custody and Parenting Plan",
      category: "Custody",
      contentCurrent: "The parties agree to a shared parenting schedule for their children.",
      adminReviewStatus: "NOT_REVIEWED",
      updatedAt: new Date("2026-08-13T11:00:00Z"),
    },
    {
      _id: "64b000000000000000000011",
      caseId,
      title: "Child Support",
      category: "Support",
      contentCurrent: "Party A will pay monthly child support.",
      adminReviewStatus: "NOT_REVIEWED",
      updatedAt: new Date("2026-08-13T11:00:00Z"),
    },
    {
      _id: "64b000000000000000000012",
      caseId,
      title: "Property Division",
      category: "Property",
      contentCurrent: "The matrimonial home and other assets will be divided as agreed.",
      adminReviewStatus: "NOT_REVIEWED",
      updatedAt: new Date("2026-08-13T11:00:00Z"),
    },
    {
      _id: "64b000000000000000000013",
      caseId,
      title: "Debt Responsibility",
      category: "Debt",
      contentCurrent: "The joint credit card debt will be divided equally.",
      adminReviewStatus: "NOT_REVIEWED",
      updatedAt: new Date("2026-08-13T11:00:00Z"),
    }
  );
  latestAiReview = {
    createdAt: new Date("2026-08-13T12:00:00Z"),
    readiness: "REVIEW_REQUIRED",
    issues: [{ severity: "WARNING" }],
    provider: "Gemini",
    model: "gemini-flash",
  };

  const negotiationReview = reviewScenario({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
    currentUserId: partyA,
  });
  assert.equal(negotiationReview.canExport, false);
  assert.ok(negotiationReview.blockers.some((blocker) => blocker.code === "APPROVALS"));
  assert.ok(negotiationReview.blockers.some((blocker) => blocker.code === "MODERATOR_REVIEW"));

  for (const clause of clauses) {
    actions.push(
      { clauseId: clause._id, userId: partyA, action: "APPROVE" },
      { clauseId: clause._id, userId: partyB, action: "APPROVE" }
    );
    clause.adminReviewStatus = "REVIEWED";
  }
  caseDoc.status = "READY";

  const readyReview = reviewScenario({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
    currentUserId: partyA,
  });
  assert.equal(readyReview.readiness, "READY_FOR_SIGNING");
  assert.equal(readyReview.readyForSigning, true);
  assert.equal(readyReview.canExport, true);
  assert.equal(readyReview.blockers.length, 0);
  assert.equal(readyReview.warnings[0].code, "AI_REVIEW_RESULT");
  assert.equal(readyReview.signing.canConfirm, true);

  const firstConfirmation = applyFinalConfirmation(caseDoc, {
    userId: partyA,
    confirmedAt: new Date("2026-08-13T13:00:00Z"),
    validRoles: [],
  });
  assert.equal(firstConfirmation.finalized, false);

  const signingReview = reviewScenario({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
    currentUserId: partyB,
  });
  assert.equal(signingReview.readiness, "SIGNING_IN_PROGRESS");
  assert.equal(signingReview.signing.confirmedCount, 1);
  assert.equal(signingReview.signing.canConfirm, true);

  const secondConfirmation = applyFinalConfirmation(caseDoc, {
    userId: partyB,
    confirmedAt: new Date("2026-08-13T14:00:00Z"),
    validRoles: ["PARTY_A"],
  });
  assert.equal(secondConfirmation.finalized, true);
  assert.equal(caseDoc.status, "FINALIZED");

  const finalizedReview = reviewScenario({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
    currentUserId: partyB,
  });
  assert.equal(finalizedReview.readiness, "FINALIZED");
  assert.equal(finalizedReview.signing.bothConfirmed, true);
  assert.equal(finalizedReview.canExport, true);
  assert.equal(buildExportCheck(caseDoc, clauses).caseStatusAllowsExport, true);

  const clearedCount = resetFinalConfirmationState(caseDoc);
  clauses[0].updatedAt = new Date("2026-08-13T15:00:00Z");
  clauses[0].adminReviewStatus = "NOT_REVIEWED";
  actions.splice(
    0,
    actions.length,
    ...actions.filter((action) => String(action.clauseId) !== String(clauses[0]._id))
  );
  caseDoc.status = "NEGOTIATING";

  const reopenedReview = reviewScenario({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
    currentUserId: partyA,
  });
  const reopenedBlockers = reopenedReview.blockers.map((blocker) => blocker.code);
  assert.equal(clearedCount, 2);
  assert.equal(caseDoc.finalConfirmations.length, 0);
  assert.equal(reopenedReview.readiness, "NOT_READY");
  assert.equal(reopenedReview.canExport, false);
  assert.ok(reopenedBlockers.includes("APPROVALS"));
  assert.ok(reopenedBlockers.includes("MODERATOR_REVIEW"));
  assert.ok(reopenedBlockers.includes("AI_REVIEW_STALE"));
});
