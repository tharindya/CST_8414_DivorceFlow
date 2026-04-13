import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("User X");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Register</h2>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="Your name"
            autoComplete="name"
          />
        </label>

        <label>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            type="password"
            placeholder="min 8 chars"
            autoComplete="new-password"
          />
        </label>

        <button disabled={busy} style={{ padding: 10 }}>
          {busy ? "Creating..." : "Create account"}
        </button>
      </form>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        Already have an account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}