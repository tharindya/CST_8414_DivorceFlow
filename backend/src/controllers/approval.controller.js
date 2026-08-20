const ClauseAction = require("../models/ClauseAction");
const Clause = require("../models/Clause");
const Case = require("../models/Case");
const Comment = require("../models/Comment");
const { recordAuditLog } = require("../services/audit.service");
const { clearFinalConfirmations } = require("../services/signing.service");
const { validateRejection, sendValidationError } = require("../services/validation.service");
const { recomputeCaseStatus } = require("../services/workflowStatus.service");

async function ensureCaseIsNotFinalized(caseId) {
  const caseDoc = await Case.findById(caseId).select("status");
  return caseDoc?.status !== "FINALIZED";
}

async function auditConfirmationReset({ caseId, clauseId, userId, confirmationsReset }) {
  if (!confirmationsReset) return;
  await recordAuditLog({
    caseId,
    clauseId,
    userId,
    type: "SIGNING_CONFIRMATIONS_RESET",
    title: "Final confirmations reset",
    message: "Clause approval activity changed, so both parties must confirm final review again.",
    metadata: { confirmationsReset },
  });
}

async function approveClause(req, res, next) {
  try {
    const { clauseId } = req.params;

    const clause = await Clause.findById(clauseId).select("caseId title");
    if (!clause) {
      return res.status(404).json({ error: "Clause not found" });
    }

    if (!(await ensureCaseIsNotFinalized(clause.caseId))) {
      return res.status(409).json({ error: "Finalized agreements cannot receive new approval actions" });
    }

    const confirmationsReset = await clearFinalConfirmations(clause.caseId);

    const action = await ClauseAction.create({
      clauseId,
      caseId: clause.caseId,
      userId: req.user.id,
      action: "APPROVE",
    });

    await recomputeCaseStatus(clause.caseId);

    await recordAuditLog({
      caseId: clause.caseId,
      clauseId,
      userId: req.user.id,
      type: "CLAUSE_APPROVED",
      title: `Clause approved: ${clause.title}`,
      message: `${clause.title} was approved by a party.`,
    });

    await auditConfirmationReset({
      caseId: clause.caseId,
      clauseId,
      userId: req.user.id,
      confirmationsReset,
    });

    res.status(201).json({ action });
  } catch (err) {
    next(err);
  }
}

async function rejectClause(req, res, next) {
  try {
    const { clauseId } = req.params;
    const { comment } = req.body;

    if (sendValidationError(res, validateRejection(req.body))) return;

    const clause = await Clause.findById(clauseId).select("caseId title");
    if (!clause) {
      return res.status(404).json({ error: "Clause not found" });
    }

    if (!(await ensureCaseIsNotFinalized(clause.caseId))) {
      return res.status(409).json({ error: "Finalized agreements cannot receive new rejection actions" });
    }

    const confirmationsReset = await clearFinalConfirmations(clause.caseId);

    const action = await ClauseAction.create({
      clauseId,
      caseId: clause.caseId,
      userId: req.user.id,
      action: "REJECT",
    });

    await Comment.create({
      clauseId,
      caseId: clause.caseId,
      userId: req.user.id,
      message: comment.trim(),
    });

    await recomputeCaseStatus(clause.caseId);

    await recordAuditLog({
      caseId: clause.caseId,
      clauseId,
      userId: req.user.id,
      type: "CLAUSE_REJECTED",
      title: `Clause rejected: ${clause.title}`,
      message: `${clause.title} was rejected with feedback.`,
      metadata: { reason: comment.trim() },
    });

    await auditConfirmationReset({
      caseId: clause.caseId,
      clauseId,
      userId: req.user.id,
      confirmationsReset,
    });

    res.status(201).json({ action });
  } catch (err) {
    next(err);
  }
}

async function getClauseStatusSummary(req, res, next) {
  try {
    const { caseId } = req.params;

    const caseDoc = await Case.findById(caseId).select("participants status");
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    const clauses = await Clause.find({ caseId }).select("_id title");

    const result = [];

    for (const clause of clauses) {
      const actions = await ClauseAction.find({ clauseId: clause._id })
        .sort({ createdAt: -1 })
        .select("userId action");

      const latestByUser = new Map();
      for (const a of actions) {
        const uid = a.userId.toString();
        if (!latestByUser.has(uid)) {
          latestByUser.set(uid, a.action);
        }
      }

      const summary = {
        clauseId: clause._id,
        title: clause.title,
        approvedBy: {},
        rejectedBy: {},
        isApprovedByBoth: false,
        overallState: "PENDING",
      };

      for (const p of caseDoc.participants) {
        const uid = p.userId.toString();
        const latestAction = latestByUser.get(uid);

        summary.approvedBy[p.role] = latestAction === "APPROVE";
        summary.rejectedBy[p.role] = latestAction === "REJECT";
      }

      summary.isApprovedByBoth =
        Object.values(summary.approvedBy).length === 2 &&
        Object.values(summary.approvedBy).every((v) => v === true);

      const anyRejected = Object.values(summary.rejectedBy).some((v) => v === true);

      if (anyRejected) {
        summary.overallState = "REJECTED";
      } else if (summary.isApprovedByBoth) {
        summary.overallState = "APPROVED";
      } else {
        summary.overallState = "PENDING";
      }

      result.push(summary);
    }

    res.json({
      clauses: result,
      caseStatus: caseDoc.status,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  approveClause,
  rejectClause,
  recomputeCaseStatus,
  getClauseStatusSummary,
};
