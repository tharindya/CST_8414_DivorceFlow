import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayEmail = user?.email || "";
  const initial = displayEmail ? displayEmail.charAt(0).toUpperCase() : "U";

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
              <div className="app-navbar__user-pill">
                <div className="app-navbar__avatar">{initial}</div>
                <div className="app-navbar__user-meta">
                  <div className="app-navbar__user-label">Signed in</div>
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