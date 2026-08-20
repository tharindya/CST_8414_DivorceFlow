import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import "./navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const displayEmail = user?.email || "";
  const initial = displayEmail ? displayEmail.charAt(0).toUpperCase() : "U";

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await api.getUnreadNotificationCount();
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Notification status must not interrupt navigation.
    }
  }, [user]);

  useEffect(() => {
    refreshUnreadCount();

    const timer = window.setInterval(refreshUnreadCount, 30000);
    function handleNotificationUpdate(event) {
      setUnreadCount(event.detail?.unreadCount || 0);
    }
    window.addEventListener("notifications:updated", handleNotificationUpdate);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("notifications:updated", handleNotificationUpdate);
    };
  }, [location.pathname, refreshUnreadCount]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="app-navbar">
      <div className="app-navbar__inner">
        <Link to="/" className="app-navbar__brand">
          DivorceFlow
        </Link>

        <div className="app-navbar__right">
          {user ? (
            <>
              <div className="app-navbar__nav-links">
                <Link to="/dashboard" className="app-navbar__link">
                  Dashboard
                </Link>

                <Link
                  to="/notifications"
                  className="app-navbar__link app-navbar__notification-link"
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="app-navbar__notification-count">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                {user.role === "ADMIN" && (
                  <>
                    <Link to="/admin" className="app-navbar__link app-navbar__link--admin">
                      Admin Cases
                    </Link>
                    <Link
                      to="/admin/templates"
                      className="app-navbar__link app-navbar__link--admin"
                    >
                      Templates
                    </Link>
                  </>
                )}
              </div>

              <div className="app-navbar__user-pill">
                <div className="app-navbar__avatar">{initial}</div>
                <div className="app-navbar__user-meta">
                  <div className="app-navbar__user-label">
                    {user.role === "ADMIN" ? "Legal moderator" : "Signed in"}
                  </div>
                  <div className="app-navbar__user-email">{displayEmail}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="app-navbar__logout"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="app-navbar__guest-links">
              <Link to="/login" className="app-navbar__link">
                Login
              </Link>
              <Link to="/register" className="app-navbar__link app-navbar__link--primary">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
