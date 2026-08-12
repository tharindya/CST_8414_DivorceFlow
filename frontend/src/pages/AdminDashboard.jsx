import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import "../styles/admin-dashboard.css";

function caseTone(status) {
  switch ((status || "").toUpperCase()) {
    case "READY":
      return "success";
    case "NEGOTIATING":
      return "warning";
    case "DRAFT":
      return "default";
    case "EXPORTED":
      return "neutral";
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
      return "default";
    default:
      return "default";
  }
}

export default function AdminDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCases() {
    try {
      setError("");
      setLoading(true);
      const data = await api.listAdminCases();
      setCases(data.cases || []);
    } catch (err) {
      setError(err.message || "Failed to load admin cases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  const stats = useMemo(() => {
    return {
      total: cases.length,
      draft: cases.filter((c) => c.status === "DRAFT").length,
      negotiating: cases.filter((c) => c.status === "NEGOTIATING").length,
      ready: cases.filter((c) => c.status === "READY").length,
    };
  }, [cases]);

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <div className="admin-eyebrow">Legal moderator dashboard</div>
          <h1 className="admin-title">Review all agreement cases</h1>
          <p className="admin-subtitle">
            Read-only view for moderators to inspect agreements, clause volume,
            discussion activity, and negotiation progress.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCases}
          disabled={loading}
          className="admin-button admin-button-secondary"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <section className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-label">Total cases</span>
          <div className="admin-stat-value">{stats.total}</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Draft</span>
          <div className="admin-stat-value">{stats.draft}</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Negotiating</span>
          <div className="admin-stat-value">{stats.negotiating}</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Ready</span>
          <div className="admin-stat-value">{stats.ready}</div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <h2 className="admin-section-title">Cases</h2>
            <p className="admin-section-text">
              Open any case to inspect clauses, comments, and approval status.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="admin-empty">No cases found.</div>
        ) : (
          <div className="admin-list">
            {cases.map((c) => (
              <article key={c._id} className="admin-case-card">
                <div className="admin-case-top">
                  <div>
                    <h3 className="admin-case-title">{c.title}</h3>
                    <div className="admin-case-id">{c._id}</div>
                  </div>

                  <div className="admin-badges">
                    <span className={`admin-badge admin-badge--${caseTone(c.status)}`}>
                      {c.status}
                    </span>
                    <span className={`admin-badge admin-badge--${inviteTone(c.invitationStatus)}`}>
                      Invite {c.invitationStatus || "PENDING"}
                    </span>
                  </div>
                </div>

                <div className="admin-case-grid">
                  <div className="admin-meta-box">
                    <span className="admin-meta-label">Jurisdiction</span>
                    <span className="admin-meta-value">{c.jurisdiction || "General"}</span>
                  </div>

                  <div className="admin-meta-box">
                    <span className="admin-meta-label">Invite used</span>
                    <span className="admin-meta-value">{c.inviteUsed ? "Yes" : "No"}</span>
                  </div>

                  <div className="admin-meta-box">
                    <span className="admin-meta-label">Clauses</span>
                    <span className="admin-meta-value">{c.clauseCount}</span>
                  </div>

                  <div className="admin-meta-box">
                    <span className="admin-meta-label">Comments</span>
                    <span className="admin-meta-value">{c.commentCount}</span>
                  </div>

                  <div className="admin-meta-box">
                    <span className="admin-meta-label">Party A</span>
                    <span className="admin-meta-value">
                      {c.partyA ? `${c.partyA.name} (${c.partyA.email})` : "Not available"}
                    </span>
                  </div>

                  <div className="admin-meta-box">
                    <span className="admin-meta-label">Party B</span>
                    <span className="admin-meta-value">
                      {c.partyB
                        ? `${c.partyB.name} (${c.partyB.email})`
                        : c.partyBEmail || "Not joined yet"}
                    </span>
                  </div>
                </div>

                <div className="admin-case-actions">
                  <Link to={`/admin/cases/${c._id}`} className="admin-button admin-button-primary">
                    Open review
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}