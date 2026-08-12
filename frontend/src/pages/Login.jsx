import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("a@test.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-eyebrow">Secure agreement workspace</div>
        <h1 className="auth-title">Sign in to DivorceFlow</h1>
        <p className="auth-subtitle">
          Access your agreement, review clauses, and continue negotiations securely.
        </p>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={busy} className="auth-button">
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-footer">
          No account yet? <Link to="/register">Create one here</Link>
        </div>
      </div>
    </div>
  );
}