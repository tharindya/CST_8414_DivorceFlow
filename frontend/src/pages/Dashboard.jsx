import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "../styles/dashboard.css";

function statusTone(status) {
  switch ((status || "").toUpperCase()) {
    case "READY":
    case "FINALIZED":
      return "success";
    case "NEGOTIATING":
      return "warning";
    case "EXPORTED":
      return "neutral";
    case "DRAFT":
    default:
      return "default";
  }
}

function inviteTone(status) {
  switch ((status || "").toUpperCase()) {
    case "ACCEPTED":
      return "success";
    case "SENT":
      return "info";
    case "PENDING":
    default:
      return "default";
  }
}

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

  const stats = useMemo(() => {
    const total = cases.length;
    const ready = cases.filter((c) => c.status === "READY").length;
    const negotiating = cases.filter((c) => c.status === "NEGOTIATING").length;
    const draft = cases.filter((c) => c.status === "DRAFT").length;

    return { total, ready, negotiating, draft };
  }, [cases]);

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

      try {
        await api.sendInvite(data.case._id);
        setMessage("Agreement created and invitation email sent.");
      } catch (inviteErr) {
        setMessage(
          "Agreement created successfully. Email invitation could not be sent, but you can still share the case ID and invite code manually."
        );
      }

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
      <section className="dashboard-hero">
        <div>
          <div className="dashboard-eyebrow">Agreement control center</div>
          <h1 className="dashboard-title">Manage agreements and invitations</h1>
          <p className="dashboard-subtitle">
            Create a new agreement, join an existing case, and track the current
            negotiation status for every agreement in one place.
          </p>
        </div>

        <button
          onClick={loadCases}
          disabled={loading}
          className="dashboard-button dashboard-button-secondary"
        >
          {loading ? "Refreshing..." : "Refresh dashboard"}
        </button>
      </section>

      {error && (
        <div className="dashboard-alert dashboard-alert-error">{error}</div>
      )}

      {message && (
        <div className="dashboard-alert dashboard-alert-success">{message}</div>
      )}

      <section className="dashboard-stats">
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Total agreements</span>
          <div className="dashboard-stat-value">{stats.total}</div>
        </div>

        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">In draft</span>
          <div className="dashboard-stat-value">{stats.draft}</div>
        </div>

        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Negotiating</span>
          <div className="dashboard-stat-value">{stats.negotiating}</div>
        </div>

        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Ready for export</span>
          <div className="dashboard-stat-value">{stats.ready}</div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2 className="dashboard-card-title">Create a new agreement</h2>
              <p className="dashboard-card-text">
                Start a new case, choose a jurisdiction, and send an invitation
                to the second party.
              </p>
            </div>
          </div>

          <form onSubmit={onCreateCase} className="dashboard-form">
            <label className="dashboard-field">
              <span className="dashboard-label">Agreement title</span>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="dashboard-input"
                placeholder="Agreement title"
              />
            </label>

            <label className="dashboard-field">
              <span className="dashboard-label">Other party email</span>
              <input
                type="email"
                value={partyBEmail}
                onChange={(e) => setPartyBEmail(e.target.value)}
                className="dashboard-input"
                placeholder="otherparty@example.com"
              />
            </label>

            <label className="dashboard-field">
              <span className="dashboard-label">Jurisdiction</span>
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
            </label>

            <button
              disabled={creating}
              className="dashboard-button dashboard-button-primary"
            >
              {creating ? "Creating agreement..." : "Create agreement and send invite"}
            </button>
          </form>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2 className="dashboard-card-title">Join an agreement</h2>
              <p className="dashboard-card-text">
                Enter the case ID and invite code to join an agreement shared
                with you.
              </p>
            </div>
          </div>

          <form onSubmit={onJoinCase} className="dashboard-form">
            <label className="dashboard-field">
              <span className="dashboard-label">Case ID</span>
              <input
                value={joinCaseId}
                onChange={(e) => setJoinCaseId(e.target.value)}
                className="dashboard-input"
                placeholder="Paste the case ID"
              />
            </label>

            <label className="dashboard-field">
              <span className="dashboard-label">Invite code</span>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="dashboard-input"
                placeholder="Paste the invite code"
              />
            </label>

            <button
              disabled={joining}
              className="dashboard-button dashboard-button-secondary"
            >
              {joining ? "Joining agreement..." : "Join agreement"}
            </button>
          </form>
        </div>
      </section>

      <section className="dashboard-agreements">
        <div className="dashboard-section-header">
          <div>
            <h2 className="dashboard-section-title">My agreements</h2>
            <p className="dashboard-section-text">
              Review all active agreements and reopen any case to continue work.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-empty-card">Loading agreements...</div>
        ) : cases.length === 0 ? (
          <div className="dashboard-empty-card">
            No agreements yet. Create one to begin the workflow.
          </div>
        ) : (
          <div className="dashboard-list">
            {cases.map((c) => (
              <article key={c._id} className="dashboard-list-item">
                <div className="dashboard-list-main">
                  <div className="dashboard-list-top">
                    <h3 className="dashboard-case-title">{c.title}</h3>
                    <div className="dashboard-badges">
                      <span
                        className={`dashboard-badge dashboard-badge--${statusTone(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                      <span
                        className={`dashboard-badge dashboard-badge--${inviteTone(
                          c.invitationStatus
                        )}`}
                      >
                        Invite {c.invitationStatus || "PENDING"}
                      </span>
                    </div>
                  </div>

                  <div className="dashboard-meta-grid">
                    <div className="dashboard-meta-item">
                      <span className="dashboard-meta-label">Jurisdiction</span>
                      <span className="dashboard-meta-value">
                        {c.jurisdiction || "General"}
                      </span>
                    </div>

                    <div className="dashboard-meta-item">
                      <span className="dashboard-meta-label">Party B email</span>
                      <span className="dashboard-meta-value">
                        {c.partyBEmail || "Not set"}
                      </span>
                    </div>

                    <div className="dashboard-meta-item dashboard-meta-item--full">
                      <span className="dashboard-meta-label">Case ID</span>
                      <code className="dashboard-code">{c._id}</code>
                    </div>
                  </div>
                </div>

                <div className="dashboard-actions">
                  <Link to={`/cases/${c._id}`} className="dashboard-link-button">
                    Open case
                  </Link>

                  <button
                    onClick={() => onResendInvite(c._id)}
                    className="dashboard-button dashboard-button-secondary"
                  >
                    Send invite
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
