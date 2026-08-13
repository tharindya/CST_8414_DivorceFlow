const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  requireCaseParticipant,
  requireClauseCaseParticipant,
} = require("../middleware/caseAccess");
const { listClauses, createClause, updateClause, previewClauseRewrite } = require("../controllers/clause.controller");

// List + create clauses under a case (must be participant)
router.get("/cases/:caseId/clauses", requireAuth, requireCaseParticipant, listClauses);
router.post("/cases/:caseId/clauses", requireAuth, requireCaseParticipant, createClause);

// Update clause (must be participant in the clause's case)
router.put(
  "/clauses/:clauseId",
  requireAuth,
  requireClauseCaseParticipant,
  updateClause
);

router.post(
  "/clauses/:clauseId/rewrite",
  requireAuth,
  requireClauseCaseParticipant,
  previewClauseRewrite
);

module.exports = router;
