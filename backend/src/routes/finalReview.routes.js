const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const { getFinalReview } = require("../controllers/finalReview.controller");

router.get(
  "/cases/:caseId/final-review",
  requireAuth,
  requireCaseParticipant,
  getFinalReview
);

module.exports = router;
