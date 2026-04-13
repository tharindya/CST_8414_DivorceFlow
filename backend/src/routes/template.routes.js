const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  listTemplates,
  buildTemplateDraft,
} = require("../controllers/template.controller");

router.get("/templates", requireAuth, listTemplates);
router.post("/templates/:templateId/build", requireAuth, buildTemplateDraft);

module.exports = router;