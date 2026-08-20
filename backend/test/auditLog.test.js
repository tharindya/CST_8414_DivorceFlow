const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const AuditLog = require("../src/models/AuditLog");

test("AuditLog accepts the AI agreement review event type", () => {
  const auditLog = new AuditLog({
    caseId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    type: "AI_AGREEMENT_REVIEW",
    title: "AI agreement review generated",
    message: "AI reviewed 3 clauses.",
  });

  assert.equal(auditLog.validateSync(), undefined);
});

test("AuditLog accepts final signing workflow event types", () => {
  for (const type of [
    "FINAL_REVIEW_CONFIRMED",
    "SIGNING_CONFIRMATIONS_RESET",
    "CASE_FINALIZED",
  ]) {
    const auditLog = new AuditLog({
      caseId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      type,
      title: "Signing workflow event",
      message: "Signing workflow changed.",
    });

    assert.equal(auditLog.validateSync(), undefined);
  }
});
