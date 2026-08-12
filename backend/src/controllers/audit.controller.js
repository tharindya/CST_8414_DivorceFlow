const AuditLog = require("../models/AuditLog");
const ClauseVersion = require("../models/ClauseVersion");

async function listClauseVersions(req, res, next) {
  try {
    const { clauseId } = req.params;

    const versions = await ClauseVersion.find({ clauseId })
      .sort({ versionNumber: -1, createdAt: -1 })
      .populate("editedBy", "name email")
      .select(
        "_id caseId clauseId versionNumber previousTitle previousCategory previousContent newTitle newCategory newContent editedBy changeSummary approvalsReset createdAt"
      );

    res.json({ versions });
  } catch (err) {
    next(err);
  }
}

async function listCaseAudit(req, res, next) {
  try {
    const { caseId } = req.params;

    const events = await AuditLog.find({ caseId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "name email")
      .populate("clauseId", "title category")
      .select("_id caseId clauseId userId type title message metadata createdAt");

    res.json({ events });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listClauseVersions,
  listCaseAudit,
};
