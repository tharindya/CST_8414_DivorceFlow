const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const { exportCasePdf } = require("../controllers/export.controller");

router.get("/cases/:caseId/export/pdf", requireAuth, requireCaseParticipant, exportCasePdf);

module.exports = router;