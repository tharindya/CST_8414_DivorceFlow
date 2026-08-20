const Case = require("../models/Case");
const Notification = require("../models/Notification");

const NOTIFIABLE_EVENT_TYPES = new Set([
  "CASE_INTAKE_UPDATED",
  "CASE_JOINED",
  "CLAUSE_CREATED",
  "CLAUSE_UPDATED",
  "CLAUSE_APPROVED",
  "CLAUSE_REJECTED",
  "COMMENT_ADDED",
  "MESSAGE_SENT",
  "AI_AGREEMENT_REVIEW",
  "MODERATOR_REVIEW_UPDATED",
  "FINAL_REVIEW_CONFIRMED",
  "SIGNING_CONFIRMATIONS_RESET",
  "CASE_FINALIZED",
]);

function recipientIdsForCase(caseDoc, actorUserId) {
  const actorId = String(actorUserId || "");
  const uniqueIds = new Set();

  for (const participant of caseDoc?.participants || []) {
    const userId = String(participant.userId?._id || participant.userId || "");
    if (userId && userId !== actorId) uniqueIds.add(userId);
  }

  return [...uniqueIds];
}

async function createNotificationsForAudit(auditLog) {
  if (!auditLog || !NOTIFIABLE_EVENT_TYPES.has(auditLog.type)) return [];

  const caseDoc = await Case.findById(auditLog.caseId).select("participants");
  if (!caseDoc) return [];

  const recipientIds = recipientIdsForCase(caseDoc, auditLog.userId);
  if (!recipientIds.length) return [];

  return Notification.insertMany(
    recipientIds.map((userId) => ({
      userId,
      caseId: auditLog.caseId,
      auditLogId: auditLog._id,
      actorUserId: auditLog.userId,
      type: auditLog.type,
      title: auditLog.title,
      message: auditLog.message,
    }))
  );
}

module.exports = {
  NOTIFIABLE_EVENT_TYPES,
  recipientIdsForCase,
  createNotificationsForAudit,
};
