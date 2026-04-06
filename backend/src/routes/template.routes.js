const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { listTemplates } = require("../controllers/template.controller");

router.get("/templates", requireAuth, listTemplates);

module.exports = router;