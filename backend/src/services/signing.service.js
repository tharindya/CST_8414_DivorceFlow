const Case = require("../models/Case");

async function clearFinalConfirmations(caseId) {
  const caseDoc = await Case.findById(caseId).select(
    "status finalConfirmations finalizedAt"
  );
  if (!caseDoc) return 0;

  const clearedCount = caseDoc.finalConfirmations?.length || 0;
  const requiresSave = clearedCount > 0 || caseDoc.finalizedAt || caseDoc.status === "FINALIZED";
  if (!requiresSave) return 0;

  caseDoc.finalConfirmations = [];
  caseDoc.finalizedAt = null;
  if (caseDoc.status === "FINALIZED") caseDoc.status = "READY";
  await caseDoc.save();

  return clearedCount;
}

module.exports = { clearFinalConfirmations };
