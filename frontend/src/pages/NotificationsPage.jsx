import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import "../styles/notifications.css";

function notifyNavbar(unreadCount) {
  window.dispatchEvent(
    new CustomEvent("notifications:updated", { detail: { unreadCount } })
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await api.listNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      notifyNavbar(data.unreadCount || 0);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markRead(notificationId) {
    try {
      setError("");
      setBusyId(notificationId);
      const data = await api.markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId ? data.notification : item
        )
      );
      const nextUnreadCount = Math.max(0, unreadCount - 1);
      setUnreadCount(nextUnreadCount);
      notifyNavbar(nextUnreadCount);
    } catch (err) {
      setError(err.message || "Failed to mark notification as read");
    } finally {
      setBusyId("");
    }
  }

  async function markAllRead() {
    try {
      setError("");
      setBusyId("all");
      await api.markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt || readAt }))
      );
      setUnreadCount(0);
      notifyNavbar(0);
    } catch (err) {
      setError(err.message || "Failed to mark notifications as read");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="notifications-page">
      <section className="notifications-hero">
        <div>
          <div className="notifications-eyebrow">Case activity</div>
          <h1>Notifications</h1>
          <p>Review collaboration, moderator, and finalization updates.</p>
        </div>
        <div className="notifications-summary">
          <strong>{unreadCount}</strong>
          <span>Unread</span>
        </div>
      </section>

      <section className="notifications-panel">
        <div className="notifications-panel__header">
          <h2>Recent notifications</h2>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0 || busyId === "all"}
          >
            {busyId === "all" ? "Updating..." : "Mark all as read"}
          </button>
        </div>

        {error && <div className="notifications-alert">{error}</div>}

        {loading ? (
          <div className="notifications-empty">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">No notifications yet.</div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => {
              const unread = !notification.readAt;
              return (
                <article
                  key={notification._id}
                  className={`notification-card${unread ? " notification-card--unread" : ""}`}
                >
                  <div className="notification-card__marker" aria-hidden="true" />
                  <div className="notification-card__content">
                    <div className="notification-card__topline">
                      <span>{notification.caseTitle}</span>
                      <time dateTime={notification.createdAt}>
                        {formatDate(notification.createdAt)}
                      </time>
                    </div>
                    <h3>{notification.title}</h3>
                    <p>{notification.message}</p>
                    {notification.actor?.name && (
                      <div className="notification-card__actor">
                        Updated by {notification.actor.name}
                      </div>
                    )}
                  </div>
                  <div className="notification-card__actions">
                    {notification.caseId && (
                      <Link
                        to={`/cases/${notification.caseId}`}
                        onClick={() => {
                          if (unread) markRead(notification._id);
                        }}
                      >
                        Open case
                      </Link>
                    )}
                    {unread && (
                      <button
                        type="button"
                        onClick={() => markRead(notification._id)}
                        disabled={busyId === notification._id}
                      >
                        {busyId === notification._id ? "Updating..." : "Mark read"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
