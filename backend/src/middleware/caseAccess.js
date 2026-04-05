const Case = require("../models/Case");

async function requireCaseParticipant(req, res, next) {
  try {
    const caseId = req.params.caseId || req.params.id;
    if (!caseId) return res.status(400).json({ error: "Missing caseId" });

    const doc = await Case.findById(caseId).select("participants");
    if (!doc) return res.status(404).json({ error: "Case not found" });

    const isParticipant = doc.participants.some(
      (p) => p.userId.toString() === req.user.id
    );

    if (!isParticipant) return res.status(403).json({ error: "Forbidden: not a case participant" });

    req.caseDoc = doc; // optional
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireCaseParticipant };