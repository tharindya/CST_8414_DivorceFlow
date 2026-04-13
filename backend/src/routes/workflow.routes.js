const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");

const Clause = require("../models/Clause");
const { listComments, addComment } = require("../controllers/comment.controller");
const { approveClause, rejectClause } = require("../controllers/approval.controller");

const { getClauseStatusSummary } = require("../controllers/approval.controller");

// Helper: ensure the current user is a participant in the clause's case
async function requireClauseCaseAccess(req, res, next) {
  try {
    const clause = await Clause.findById(req.params.clauseId).select("caseId");
    if (!clause) return res.status(404).json({ error: "Clause not found" });

    req.params.caseId = clause.caseId.toString();
    return requireCaseParticipant(req, res, next);
  } catch (err) {
    next(err);
  }
}

// Comments
router.get("/clauses/:clauseId/comments", requireAuth, requireClauseCaseAccess, listComments);
router.post("/clauses/:clauseId/comments", requireAuth, requireClauseCaseAccess, addComment);

// Approvals
router.post("/clauses/:clauseId/approve", requireAuth, requireClauseCaseAccess, approveClause);
router.post("/clauses/:clauseId/reject", requireAuth, requireClauseCaseAccess, rejectClause);

router.get(
  "/cases/:caseId/clauses/status",
  requireAuth,
  requireCaseParticipant,
  getClauseStatusSummary
);

module.exports = router;