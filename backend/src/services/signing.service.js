const Case = require("../models/Case");

function resetFinalConfirmationState(caseDoc) {
  const clearedCount = caseDoc.finalConfirmations?.length || 0;
  caseDoc.finalConfirmations = [];
  caseDoc.finalizedAt = null;
  if (caseDoc.status === "FINALIZED") caseDoc.status = "READY";
  return clearedCount;
}

function applyFinalConfirmation(caseDoc, { userId, confirmedAt = new Date(), validRoles = [] }) {
  const participant = (caseDoc.participants || []).find(
    (item) => String(item.userId) === String(userId)
  );
  if (!participant) {
    const error = new Error("Only case participants can confirm final review");
    error.statusCode = 403;
    throw error;
  }

  const validRoleSet = new Set(validRoles);
  caseDoc.finalConfirmations = (caseDoc.finalConfirmations || []).filter(
    (confirmation) =>
      validRoleSet.has(confirmation.role) && confirmation.role !== participant.role
  );
  caseDoc.finalConfirmations.push({
    role: participant.role,
    userId,
    confirmedAt,
  });

  const confirmedRoles = new Set(
    caseDoc.finalConfirmations.map((confirmation) => confirmation.role)
  );
  const finalized = confirmedRoles.has("PARTY_A") && confirmedRoles.has("PARTY_B");
  if (finalized) {
    caseDoc.status = "FINALIZED";
    caseDoc.finalizedAt = confirmedAt;
  }

  return { participant, finalized };
}

async function clearFinalConfirmations(caseId) {
  const caseDoc = await Case.findById(caseId).select(
    "status finalConfirmations finalizedAt"
  );
  if (!caseDoc) return 0;

  const clearedCount = caseDoc.finalConfirmations?.length || 0;
  const requiresSave = clearedCount > 0 || caseDoc.finalizedAt || caseDoc.status === "FINALIZED";
  if (!requiresSave) return 0;

  resetFinalConfirmationState(caseDoc);
  await caseDoc.save();

  return clearedCount;
}

module.exports = {
  applyFinalConfirmation,
  resetFinalConfirmationState,
  clearFinalConfirmations,
};
