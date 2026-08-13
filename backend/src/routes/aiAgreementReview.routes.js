const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const {
  getLatestAgreementReview,
  reviewAgreement,
} = require("../controllers/aiAgreementReview.controller");

router.get(
  "/cases/:caseId/ai-review",
  requireAuth,
  requireCaseParticipant,
  getLatestAgreementReview
);

router.post(
  "/cases/:caseId/ai-review",
  requireAuth,
  requireCaseParticipant,
  reviewAgreement
);

module.exports = router;
