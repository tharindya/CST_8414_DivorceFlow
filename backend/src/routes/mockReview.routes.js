const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const { getMockReview } = require("../controllers/mockReview.controller");

router.get(
  "/cases/:caseId/mock-review",
  requireAuth,
  requireCaseParticipant,
  getMockReview
);

module.exports = router;