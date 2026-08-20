const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveWorkflowStatus } = require("../src/services/workflowStatus.service");

const partyA = "64b000000000000000000001";
const partyB = "64b000000000000000000002";

function scenario() {
  const caseDoc = {
    status: "NEGOTIATING",
    participants: [
      { userId: partyA, role: "PARTY_A" },
      { userId: partyB, role: "PARTY_B" },
    ],
    intake: {
      completed: true,
      completedAt: new Date("2026-08-20T10:00:00Z"),
      dependents: "None",
      assets: "Matrimonial home",
      debts: "Joint credit card",
      supportRequirements: "None",
      custodyPreferences: "Not applicable",
    },
  };
  const clauses = [
    {
      _id: "64b000000000000000000010",
      title: "Property Division",
      category: "Property",
      contentCurrent: "The matrimonial home will be sold and proceeds divided equally.",
      adminReviewStatus: "REVIEWED",
      updatedAt: new Date("2026-08-20T11:00:00Z"),
    },
    {
      _id: "64b000000000000000000011",
      title: "Debt Responsibility",
      category: "Debt",
      contentCurrent: "The joint credit card balance will be divided equally.",
      adminReviewStatus: "REVIEWED",
      updatedAt: new Date("2026-08-20T11:00:00Z"),
    },
  ];
  const actions = clauses.flatMap((clause) => [
    { clauseId: clause._id, userId: partyA, action: "APPROVE" },
    { clauseId: clause._id, userId: partyB, action: "APPROVE" },
  ]);
  const latestAiReview = { createdAt: new Date("2026-08-20T12:00:00Z") };

  return { caseDoc, clauses, actions, latestAiReview };
}

test("workflow remains DRAFT until both parties and clauses exist", () => {
  const input = scenario();
  input.caseDoc.participants.pop();
  assert.equal(deriveWorkflowStatus(input), "DRAFT");

  input.caseDoc.participants.push({ userId: partyB, role: "PARTY_B" });
  input.clauses = [];
  assert.equal(deriveWorkflowStatus(input), "DRAFT");
});

test("workflow becomes NEGOTIATING before clause review activity starts", () => {
  const input = scenario();
  input.actions = [];
  assert.equal(deriveWorkflowStatus(input), "NEGOTIATING");
});

test("workflow becomes REVIEW after approval activity starts", () => {
  const input = scenario();
  input.actions = [input.actions[0]];
  assert.equal(deriveWorkflowStatus(input), "REVIEW");
});

test("workflow becomes REVISION after a party or moderator rejection", () => {
  const input = scenario();
  input.actions.unshift({
    clauseId: input.clauses[0]._id,
    userId: partyA,
    action: "REJECT",
  });
  assert.equal(deriveWorkflowStatus(input), "REVISION");

  const moderatorInput = scenario();
  moderatorInput.clauses[0].adminReviewStatus = "NEEDS_REVISION";
  assert.equal(deriveWorkflowStatus(moderatorInput), "REVISION");
});

test("workflow becomes APPROVAL while final readiness work remains", () => {
  const moderatorInput = scenario();
  moderatorInput.clauses[0].adminReviewStatus = "NOT_REVIEWED";
  assert.equal(deriveWorkflowStatus(moderatorInput), "APPROVAL");

  const staleAiInput = scenario();
  staleAiInput.latestAiReview.createdAt = new Date("2026-08-20T09:00:00Z");
  assert.equal(deriveWorkflowStatus(staleAiInput), "APPROVAL");
});

test("workflow becomes READY after all readiness requirements are current", () => {
  assert.equal(deriveWorkflowStatus(scenario()), "READY");
});

test("workflow preserves terminal statuses", () => {
  const finalized = scenario();
  finalized.caseDoc.status = "FINALIZED";
  assert.equal(deriveWorkflowStatus(finalized), "FINALIZED");

  const exported = scenario();
  exported.caseDoc.status = "EXPORTED";
  assert.equal(deriveWorkflowStatus(exported), "EXPORTED");
});
