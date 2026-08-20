const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  requireCaseParticipant,
  requireClauseCaseParticipant,
} = require("../middleware/caseAccess");
const { listComments, addComment } = require("../controllers/comment.controller");
const { approveClause, rejectClause } = require("../controllers/approval.controller");

const { getClauseStatusSummary } = require("../controllers/approval.controller");
const {
  listClauseVersions,
  listCaseAudit,
} = require("../controllers/audit.controller");

// Version history and audit trail
router.get("/clauses/:clauseId/versions", requireAuth, requireClauseCaseParticipant, listClauseVersions);
router.get("/cases/:caseId/audit", requireAuth, requireCaseParticipant, listCaseAudit);

// Comments
router.get("/clauses/:clauseId/comments", requireAuth, requireClauseCaseParticipant, listComments);
router.post("/clauses/:clauseId/comments", requireAuth, requireClauseCaseParticipant, addComment);

// Approvals
router.post("/clauses/:clauseId/approve", requireAuth, requireClauseCaseParticipant, approveClause);
router.post("/clauses/:clauseId/reject", requireAuth, requireClauseCaseParticipant, rejectClause);

router.get(
  "/cases/:caseId/clauses/status",
  requireAuth,
  requireCaseParticipant,
  getClauseStatusSummary
);

module.exports = router;
