import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "../styles/dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newTitle, setNewTitle] = useState("Divorce Agreement - A & B");
  const [partyBEmail, setPartyBEmail] = useState("");
  const [jurisdiction, setJurisdiction] = useState("General");
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
        jurisdiction,
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
    <div className="dashboard-page">
      <h2 className="dashboard-title">Dashboard</h2>

      {error && (
        <div className="dashboard-alert dashboard-alert-error">
          {error}
        </div>
      )}

      {message && (
        <div className="dashboard-alert dashboard-alert-success">
          {message}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3 className="dashboard-card-title">Create a new agreement</h3>
          <form onSubmit={onCreateCase} className="dashboard-form">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="dashboard-input"
              placeholder="Agreement title"
            />
            <input
              type="email"
              value={partyBEmail}
              onChange={(e) => setPartyBEmail(e.target.value)}
              className="dashboard-input"
              placeholder="Other party email"
            />
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="dashboard-select"
            >
              <option value="General">General</option>
              <option value="Ontario">Ontario</option>
              <option value="Quebec">Quebec</option>
              <option value="British Columbia">British Columbia</option>
              <option value="Alberta">Alberta</option>
            </select>
            <button
              disabled={creating}
              className="dashboard-button dashboard-button-primary"
            >
              {creating ? "Creating..." : "Create Case and Send Invite"}
            </button>
          </form>
        </div>

        <div className="dashboard-card">
          <h3 className="dashboard-card-title">Join an agreement</h3>
          <form onSubmit={onJoinCase} className="dashboard-form">
            <input
              value={joinCaseId}
              onChange={(e) => setJoinCaseId(e.target.value)}
              className="dashboard-input"
              placeholder="Case ID"
            />
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="dashboard-input"
              placeholder="Invite Code"
            />
            <button
              disabled={joining}
              className="dashboard-button"
            >
              {joining ? "Joining..." : "Join Case"}
            </button>
          </form>
        </div>
      </div>

      <div className="dashboard-section-header">
        <h3 className="dashboard-section-title">My agreements</h3>
        <button
          onClick={loadCases}
          disabled={loading}
          className="dashboard-button"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading...</div>
      ) : cases.length === 0 ? (
        <div className="dashboard-empty">No cases yet.</div>
      ) : (
        <div className="dashboard-list">
          {cases.map((c) => (
            <div key={c._id} className="dashboard-list-item">
              <div>
                <div className="dashboard-case-title">{c.title}</div>
                <div className="dashboard-case-meta">
                  Status: <b>{c.status}</b>
                </div>
                <div className="dashboard-case-submeta">
                  Jurisdiction: <b>{c.jurisdiction || "General"}</b>
                </div>
                <div className="dashboard-case-submeta">
                  Case ID: <code>{c._id}</code>
                </div>
                <div className="dashboard-case-submeta">
                  Party B Email: <code>{c.partyBEmail || "not set"}</code>
                </div>
                <div className="dashboard-case-submeta">
                  Invitation: <b>{c.invitationStatus || "PENDING"}</b>
                </div>
              </div>

              <div className="dashboard-actions">
                <Link to={`/cases/${c._id}`} className="dashboard-link">
                  Open
                </Link>
                <button
                  onClick={() => onResendInvite(c._id)}
                  className="dashboard-button"
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