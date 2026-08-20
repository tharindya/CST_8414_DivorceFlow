const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notification.controller");

router.use(requireAuth);

router.get("/notifications", listNotifications);
router.get("/notifications/unread-count", getUnreadNotificationCount);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:notificationId/read", markNotificationRead);

module.exports = router;
