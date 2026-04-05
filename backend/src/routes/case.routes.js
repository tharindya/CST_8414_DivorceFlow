const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const { createCase, listMyCases, getCase, joinCase } = require("../controllers/case.controller");

router.use(requireAuth);

router.post("/", createCase);
router.get("/", listMyCases);

// get case details (must be participant)
router.get("/:caseId", requireCaseParticipant, getCase);

// join case (needs invite code; you don't need to be participant yet)
// but you DO need to be logged in
router.post("/:caseId/join", joinCase);

module.exports = router;