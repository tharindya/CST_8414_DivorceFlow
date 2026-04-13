const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requireCaseParticipant } = require("../middleware/caseAccess");
const {
  getExportCheck,
  exportCasePdf,
} = require("../controllers/export.controller");

router.get(
  "/cases/:caseId/export/check",
  requireAuth,
  requireCaseParticipant,
  getExportCheck
);

router.get(
  "/cases/:caseId/export/pdf",
  requireAuth,
  requireCaseParticipant,
  exportCasePdf
);

module.exports = router;