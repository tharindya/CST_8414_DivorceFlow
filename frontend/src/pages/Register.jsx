import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("User X");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setBusy(true);

    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setFieldErrors(err.fields || {});
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-eyebrow">Start a new agreement</div>
        <h1 className="auth-title">Create your DivorceFlow account</h1>
        <p className="auth-subtitle">
          Set up your secure access to create, review, and negotiate agreement clauses.
        </p>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">Full name</span>
            <input
              className="auth-input"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((current) => ({ ...current, name: "" })); }}
              placeholder="Your name"
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "register-name-error" : undefined}
            />
            {fieldErrors.name && <span id="register-name-error" className="auth-field-error">{fieldErrors.name}</span>}
          </label>

          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((current) => ({ ...current, email: "" })); }}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
            />
            {fieldErrors.email && <span id="register-email-error" className="auth-field-error">{fieldErrors.email}</span>}
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="auth-input"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((current) => ({ ...current, password: "" })); }}
              type="password"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
            />
            {fieldErrors.password && <span id="register-password-error" className="auth-field-error">{fieldErrors.password}</span>}
          </label>

          <button type="submit" disabled={busy} className="auth-button">
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
