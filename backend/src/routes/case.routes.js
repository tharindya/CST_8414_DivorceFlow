const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");

const {
  createCase,
  listMyCases,
  getCase,
  updateIntake,
  getIntakeRecommendations,
  joinCase,
  sendInvite,
  getInviteByToken,
} = require("../controllers/case.controller");

router.get("/invite", requireAuth, getInviteByToken);

router.use(requireAuth);

router.post("/", createCase);
router.get("/", listMyCases);

router.get("/:caseId", requireCaseParticipant, getCase);
router.put("/:caseId/intake", requireCaseParticipant, updateIntake);
router.get(
  "/:caseId/intake/recommendations",
  requireCaseParticipant,
  getIntakeRecommendations
);

router.post("/:caseId/join", joinCase);
router.post("/:caseId/send-invite", sendInvite);

module.exports = router;