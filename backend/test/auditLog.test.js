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
