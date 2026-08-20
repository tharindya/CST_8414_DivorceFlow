const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const AiAgreementReview = require("../src/models/AiAgreementReview");

test("AiAgreementReview validates a persisted Gemini review", () => {
  const review = new AiAgreementReview({
    caseId: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(),
    provider: "Gemini",
    model: "gemini-3.5-flash",
    summary: "The agreement needs further drafting.",
    readiness: "NEEDS_WORK",
    issues: [{
      severity: "HIGH",
      category: "Debt",
      clauseTitle: "Debt division",
      message: "Payment responsibility is unclear.",
    }],
    recommendations: [{
      priority: "HIGH",
      action: "Clarify debt responsibility.",
      reason: "The current clause is ambiguous.",
    }],
  });

  assert.equal(review.validateSync(), undefined);
});
