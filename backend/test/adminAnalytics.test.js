const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAdminAnalytics } = require("../src/services/adminAnalytics.service");

const partyA = "64b000000000000000000001";
const partyB = "64b000000000000000000002";
const caseOne = "64b000000000000000000003";
const caseTwo = "64b000000000000000000004";
const clauseOne = "64b000000000000000000005";
const clauseTwo = "64b000000000000000000006";

test("buildAdminAnalytics reports workflow and unresolved issue metrics", () => {
  const result = buildAdminAnalytics({
    cases: [
      {
        _id: caseOne,
        status: "READY",
        participants: [
          { userId: partyA, role: "PARTY_A" },
          { userId: partyB, role: "PARTY_B" },
        ],
      },
      {
        _id: caseTwo,
        status: "FINALIZED",
        participants: [{ userId: partyA, role: "PARTY_A" }],
      },
    ],
    clauses: [
      {
        _id: clauseOne,
        caseId: caseOne,
        category: "Property",
        adminReviewStatus: "REVIEWED",
      },
      {
        _id: clauseTwo,
        caseId: caseOne,
        category: "Debt",
        adminReviewStatus: "NEEDS_REVISION",
      },
    ],
    actions: [
      { clauseId: clauseOne, userId: partyA, action: "APPROVE" },
      { clauseId: clauseOne, userId: partyB, action: "APPROVE" },
      { clauseId: clauseTwo, userId: partyA, action: "REJECT" },
    ],
    commentCount: 7,
  });

  assert.equal(result.cases.total, 2);
  assert.equal(result.cases.statusCounts.READY, 1);
  assert.equal(result.cases.finalized, 1);
  assert.equal(result.cases.partyJoinRate, 50);
  assert.equal(result.clauses.approved, 1);
  assert.equal(result.clauses.rejected, 1);
  assert.equal(result.clauses.approvalRate, 50);
  assert.equal(result.moderator.reviewed, 1);
  assert.equal(result.moderator.needsRevision, 1);
  assert.equal(result.unresolved.commonCategories[0].category, "Debt");
  assert.equal(result.activity.comments, 7);
});

test("buildAdminAnalytics returns stable zero-value reporting for an empty database", () => {
  const result = buildAdminAnalytics({});

  assert.equal(result.cases.total, 0);
  assert.equal(result.cases.partyJoinRate, 0);
  assert.equal(result.clauses.approvalRate, 0);
  assert.equal(result.moderator.reviewRate, 0);
  assert.deepEqual(result.unresolved.commonCategories, []);
});
