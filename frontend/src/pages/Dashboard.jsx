import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Dashboard() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newTitle, setNewTitle] = useState("Divorce Agreement - A & B");
  const [partyBEmail, setPartyBEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCaseId, setJoinCaseId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function loadCases() {
    setError("");
    try {
      setLoading(true);
      const data = await api.listCases();
      setCases(data.cases || []);
    } catch (err) {
      setError(err.message || "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  async function onCreateCase(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);
    try {
      const data = await api.createCase({
        title: newTitle,
        partyBEmail,
      });

      await api.sendInvite(data.case._id);
      setMessage("Case created and invitation email sent.");
      navigate(`/cases/${data.case._id}`);
    } catch (err) {
      setError(err.message || "Failed to create case");
    } finally {
      setCreating(false);
    }
  }

  async function onJoinCase(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setJoining(true);
    try {
      const data = await api.joinCase(joinCaseId.trim(), {
        inviteCode: inviteCode.trim(),
      });
      navigate(`/cases/${data.case._id}`);
    } catch (err) {
      setError(err.message || "Failed to join case");
    } finally {
      setJoining(false);
    }
  }

  async function onResendInvite(caseId) {
    setError("");
    setMessage("");
    try {
      await api.sendInvite(caseId);
      setMessage("Invitation email sent.");
      await loadCases();
    } catch (err) {
      setError(err.message || "Failed to send invitation");
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Dashboard</h2>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{ background: "#eef9ee", border: "1px solid #7ac77a", padding: 10, marginBottom: 12 }}>
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Create a new agreement</h3>
          <form onSubmit={onCreateCase} style={{ display: "grid", gap: 10 }}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ padding: 10 }}
              placeholder="Agreement title"
            />
            <input
              type="email"
              value={partyBEmail}
              onChange={(e) => setPartyBEmail(e.target.value)}
              style={{ padding: 10 }}
              placeholder="Other party email"
            />
            <button disabled={creating} style={{ padding: 10 }}>
              {creating ? "Creating..." : "Create Case and Send Invite"}
            </button>
          </form>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Join an agreement</h3>
          <form onSubmit={onJoinCase} style={{ display: "grid", gap: 10 }}>
            <input
              value={joinCaseId}
              onChange={(e) => setJoinCaseId(e.target.value)}
              style={{ padding: 10 }}
              placeholder="Case ID"
            />
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              style={{ padding: 10 }}
              placeholder="Invite Code"
            />
            <button disabled={joining} style={{ padding: 10 }}>
              {joining ? "Joining..." : "Join Case"}
            </button>
          </form>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ margin: 0 }}>My agreements</h3>
        <button onClick={loadCases} disabled={loading} style={{ padding: "6px 10px" }}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 12 }}>Loading...</div>
      ) : cases.length === 0 ? (
        <div style={{ padding: 12, color: "#555" }}>No cases yet.</div>
      ) : (
        <div style={{ marginTop: 10, border: "1px solid #ddd" }}>
          {cases.map((c) => (
            <div
              key={c._id}
              style={{
                padding: 12,
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: "#555" }}>
                  Status: <b>{c.status}</b>
                </div>
                <div style={{ fontSize: 12, color: "#777" }}>
                  Case ID: <code>{c._id}</code>
                </div>
                <div style={{ fontSize: 12, color: "#777" }}>
                  Party B Email: <code>{c.partyBEmail || "not set"}</code>
                </div>
                <div style={{ fontSize: 12, color: "#777" }}>
                  Invitation: <b>{c.invitationStatus || "PENDING"}</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <Link to={`/cases/${c._id}`}>Open</Link>
                <button
                  onClick={() => onResendInvite(c._id)}
                  style={{ padding: "6px 10px" }}
                >
                  Send Invite
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}