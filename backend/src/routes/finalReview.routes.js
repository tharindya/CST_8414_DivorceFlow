const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const { getFinalReview } = require("../controllers/finalReview.controller");
const { confirmFinalReview } = require("../controllers/signing.controller");

router.get(
  "/cases/:caseId/final-review",
  requireAuth,
  requireCaseParticipant,
  getFinalReview
);

router.post(
  "/cases/:caseId/final-review/confirm",
  requireAuth,
  requireCaseParticipant,
  confirmFinalReview
);

module.exports = router;
