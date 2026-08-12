const AuditLog = require("../models/AuditLog");

async function recordAuditLog({
  caseId,
  clauseId = null,
  userId,
  type,
  title,
  message,
  metadata = {},
}) {
  if (!caseId || !userId || !type || !title || !message) {
    return null;
  }

  return AuditLog.create({
    caseId,
    clauseId,
    userId,
    type,
    title,
    message,
    metadata,
  });
}

module.exports = { recordAuditLog };
