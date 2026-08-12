const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const { reviewAgreement } = require("../controllers/aiAgreementReview.controller");

router.post(
  "/cases/:caseId/ai-review",
  requireAuth,
  requireCaseParticipant,
  reviewAgreement
);

module.exports = router;
