const router = require("express").Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");
const {
  listAllCases,
  getAdminCaseById,
  listAdminTemplates,
  updateAdminTemplateReview,
  updateAdminClauseReview,
} = require("../controllers/admin.controller");

router.use(requireAuth, requireAdmin);

router.get("/cases", listAllCases);
router.get("/cases/:caseId", getAdminCaseById);

router.get("/templates", listAdminTemplates);
router.put("/templates/:templateId/review", updateAdminTemplateReview);

router.put("/clauses/:clauseId/review", updateAdminClauseReview);

module.exports = router;