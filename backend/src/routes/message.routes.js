const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  listMessages,
  sendMessage,
} = require("../controllers/message.controller");

router.get("/cases/:caseId/messages", requireAuth, listMessages);
router.post("/cases/:caseId/messages", requireAuth, sendMessage);

module.exports = router;