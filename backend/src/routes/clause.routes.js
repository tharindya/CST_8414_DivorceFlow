const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const { listClauses, createClause, updateClause } = require("../controllers/clause.controller");
const Clause = require("../models/Clause");

// List + create clauses under a case (must be participant)
router.get("/cases/:caseId/clauses", requireAuth, requireCaseParticipant, listClauses);
router.post("/cases/:caseId/clauses", requireAuth, requireCaseParticipant, createClause);

// Update clause (must be participant in the clause's case)
router.put("/clauses/:clauseId", requireAuth, async (req, res, next) => {
  try {
    const clause = await Clause.findById(req.params.clauseId).select("caseId");
    if (!clause) return res.status(404).json({ error: "Clause not found" });

    // Inject caseId so requireCaseParticipant can use it
    req.params.caseId = clause.caseId.toString();
    return requireCaseParticipant(req, res, () => updateClause(req, res, next));
  } catch (err) {
    next(err);
  }
});

module.exports = router;