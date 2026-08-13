const test = require("node:test");
const assert = require("node:assert/strict");
const { buildFinalReview } = require("../src/services/finalReview.service");

const partyA = "64b000000000000000000001";
const partyB = "64b000000000000000000002";
const clauseId = "64b000000000000000000003";

function completeFixture() {
  return {
    caseDoc: {
      _id: "64b000000000000000000004",
      title: "Complete agreement",
      jurisdiction: "Ontario",
      status: "READY",
      participants: [
        { userId: partyA, role: "PARTY_A" },
        { userId: partyB, role: "PARTY_B" },
      ],
      intake: { completed: true, completedAt: new Date("2026-08-01T10:00:00Z") },
    },
    clauses: [{
      _id: clauseId,
      title: "Property division",
      category: "Property",
      adminReviewStatus: "REVIEWED",
      updatedAt: new Date("2026-08-01T11:00:00Z"),
    }],
    actions: [
      { clauseId, userId: partyA, action: "APPROVE" },
      { clauseId, userId: partyB, action: "APPROVE" },
    ],
    exportCheck: { completenessOk: true, missingCategories: [], warnings: [] },
    latestAiReview: {
      createdAt: new Date("2026-08-01T12:00:00Z"),
      readiness: "READY_FOR_HUMAN_REVIEW",
      issues: [],
      provider: "Gemini",
      model: "gemini-3.5-flash",
    },
  };
}

test("buildFinalReview marks a fully reviewed agreement ready for signing", () => {
  const review = buildFinalReview(completeFixture());

  assert.equal(review.readyForSigning, true);
  assert.equal(review.canExport, true);
  assert.equal(review.readiness, "READY_FOR_SIGNING");
  assert.equal(review.blockers.length, 0);
  assert.equal(review.warnings.length, 0);
  assert.equal(review.clauses[0].overallStatus, "APPROVED");
});

test("buildFinalReview treats current AI findings as advisory after moderator review", () => {
  const fixture = completeFixture();
  fixture.latestAiReview.readiness = "REVIEW_REQUIRED";
  fixture.latestAiReview.issues = [{ severity: "HIGH" }];

  const review = buildFinalReview(fixture);

  assert.equal(review.readyForSigning, true);
  assert.equal(review.canExport, true);
  assert.equal(review.blockers.length, 0);
  assert.equal(review.warnings.length, 1);
  assert.equal(review.warnings[0].code, "AI_REVIEW_RESULT");
});

test("buildFinalReview reports actionable blockers", () => {
  const fixture = completeFixture();
  fixture.caseDoc.participants = [{ userId: partyA, role: "PARTY_A" }];
  fixture.caseDoc.intake.completed = false;
  fixture.actions = [];
  fixture.clauses[0].adminReviewStatus = "NEEDS_REVISION";
  fixture.exportCheck = {
    completenessOk: false,
    missingCategories: ["Debt"],
    warnings: ["No debt-related clause was found."],
  };
  fixture.latestAiReview.readiness = "NEEDS_WORK";
  fixture.latestAiReview.issues = [{ severity: "HIGH" }];

  const review = buildFinalReview(fixture);
  const blockerCodes = review.blockers.map((blocker) => blocker.code);

  assert.equal(review.readyForSigning, false);
  assert.equal(review.canExport, false);
  assert.ok(blockerCodes.includes("PARTIES"));
  assert.ok(blockerCodes.includes("INTAKE"));
  assert.ok(blockerCodes.includes("APPROVALS"));
  assert.ok(blockerCodes.includes("MODERATOR_REVISION"));
  assert.ok(blockerCodes.includes("COMPLETENESS"));
  assert.equal(review.warnings.length, 1);
  assert.equal(review.warnings[0].code, "AI_REVIEW_RESULT");
});
