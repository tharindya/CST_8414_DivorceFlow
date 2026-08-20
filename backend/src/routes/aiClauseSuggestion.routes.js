const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const {
  generateClauseSuggestion,
} = require("../controllers/aiClauseSuggestion.controller");

router.post(
  "/cases/:caseId/intake/recommendations/:recommendationId/ai-draft",
  requireAuth,
  requireCaseParticipant,
  generateClauseSuggestion
);

module.exports = router;
