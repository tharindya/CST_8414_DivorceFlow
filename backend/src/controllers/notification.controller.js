const mongoose = require("mongoose");
const Notification = require("../models/Notification");

function serializeNotification(notification) {
  const caseRef = notification.caseId;
  const actorRef = notification.actorUserId;

  return {
    _id: notification._id,
    caseId: caseRef?._id || caseRef,
    caseTitle: caseRef?.title || "Agreement",
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actor: actorRef
      ? {
          id: actorRef._id || actorRef,
          name: actorRef.name || "DivorceFlow user",
          email: actorRef.email || "",
        }
      : null,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

async function listNotifications(req, res, next) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("caseId", "title")
        .populate("actorUserId", "name email"),
      Notification.countDocuments({ userId: req.user.id, readAt: null }),
    ]);

    res.json({
      notifications: notifications.map(serializeNotification),
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

async function getUnreadNotificationCount(req, res, next) {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      readAt: null,
    });
    res.json({ unreadCount });
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    if (!mongoose.isValidObjectId(notificationId)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.user.id },
      { $set: { readAt: new Date() } },
      { new: true }
    )
      .populate("caseId", "title")
      .populate("actorUserId", "name email");

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ notification: serializeNotification(notification) });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ updatedCount: result.modifiedCount || 0, unreadCount: 0 });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
};
