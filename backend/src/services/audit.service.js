const AuditLog = require("../models/AuditLog");
const { createNotificationsForAudit } = require("./notification.service");

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

  const auditLog = await AuditLog.create({
    caseId,
    clauseId,
    userId,
    type,
    title,
    message,
    metadata,
  });

  await createNotificationsForAudit(auditLog);
  return auditLog;
}

module.exports = { recordAuditLog };
