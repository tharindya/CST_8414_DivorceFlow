const ClauseAction = require("../models/ClauseAction");
const Clause = require("../models/Clause");
const Case = require("../models/Case");
const Comment = require("../models/Comment");

async function recomputeCaseStatus(caseId) {
  // Determine if case is READY: every clause has latest APPROVE from both participants
  const caseDoc = await Case.findById(caseId).select("participants status");
  if (!caseDoc) return;

  const participantIds = caseDoc.participants.map((p) => p.userId.toString());
  if (participantIds.length < 2) {
    // can't be ready with only one party
    if (caseDoc.status !== "DRAFT") {
      caseDoc.status = "DRAFT";
      await caseDoc.save();
    }
    return;
  }

  const clauses = await Clause.find({ caseId }).select("_id");
  if (clauses.length === 0) {
    if (caseDoc.status !== "DRAFT") {
      caseDoc.status = "DRAFT";
      await caseDoc.save();
    }
    return;
  }

  for (const c of clauses) {
    // For each user, get latest action
    const latestActions = await ClauseAction.find({ clauseId: c._id })
      .sort({ createdAt: -1 })
      .select("userId action createdAt");

    const latestByUser = new Map();
    for (const a of latestActions) {
      const uid = a.userId.toString();
      if (!latestByUser.has(uid)) latestByUser.set(uid, a.action);
    }

    // Both must have APPROVE
    const allApproved = participantIds.every((uid) => latestByUser.get(uid) === "APPROVE");
    if (!allApproved) {
      if (caseDoc.status !== "NEGOTIATING") {
        caseDoc.status = "NEGOTIATING";
        await caseDoc.save();
      }
      return;
    }
  }

  if (caseDoc.status !== "READY") {
    caseDoc.status = "READY";
    await caseDoc.save();
  }
}

async function approveClause(req, res, next) {
  try {
    const { clauseId } = req.params;

    const clause = await Clause.findById(clauseId).select("caseId");
    if (!clause) return res.status(404).json({ error: "Clause not found" });

    const action = await ClauseAction.create({
      clauseId,
      caseId: clause.caseId,
      userId: req.user.id,
      action: "APPROVE",
    });

    await recomputeCaseStatus(clause.caseId);

    res.status(201).json({ action });
  } catch (err) {
    next(err);
  }
}

async function rejectClause(req, res, next) {
  try {
    const { clauseId } = req.params;
    const { comment } = req.body;

    // Rule: reject requires a comment
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Reject requires a comment" });
    }

    const clause = await Clause.findById(clauseId).select("caseId");
    if (!clause) return res.status(404).json({ error: "Clause not found" });

    // Save rejection action
    const action = await ClauseAction.create({
      clauseId,
      caseId: clause.caseId,
      userId: req.user.id,
      action: "REJECT",
    });

    // Save mandatory comment
    await Comment.create({
      clauseId,
      caseId: clause.caseId,
      userId: req.user.id,
      message: comment.trim(),
    });

    await recomputeCaseStatus(clause.caseId);

    res.status(201).json({ action });
  } catch (err) {
    next(err);
  }
}

async function getClauseStatusSummary(req, res, next) {
  try {
    const { caseId } = req.params;

    const caseDoc = await Case.findById(caseId).select("participants status");
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });

    const clauses = await Clause.find({ caseId }).select("_id title");

    const result = [];

    for (const clause of clauses) {
      const actions = await ClauseAction.find({ clauseId: clause._id })
        .sort({ createdAt: -1 })
        .select("userId action");

      const latestByUser = new Map();
      for (const a of actions) {
        const uid = a.userId.toString();
        if (!latestByUser.has(uid)) latestByUser.set(uid, a.action);
      }

      const summary = {
        clauseId: clause._id,
        title: clause.title,
        approvedBy: {},
        isApprovedByBoth: false,
      };

      for (const p of caseDoc.participants) {
        const uid = p.userId.toString();
        summary.approvedBy[p.role] = latestByUser.get(uid) === "APPROVE";
      }

      summary.isApprovedByBoth =
        Object.values(summary.approvedBy).length === 2 &&
        Object.values(summary.approvedBy).every((v) => v === true);

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

module.exports = { approveClause, rejectClause, recomputeCaseStatus, getClauseStatusSummary };