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

async function fetchDashboardData() {
  const [caseData, analyticsData] = await Promise.all([
    api.listAdminCases(),
    api.getAdminAnalytics(),
  ]);

  return { caseData, analyticsData };
}

export default function AdminDashboard() {
  const [cases, setCases] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setError("");
      setLoading(true);
      const { caseData, analyticsData } = await fetchDashboardData();
      setCases(caseData.cases || []);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err.message || "Failed to load admin reporting");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialDashboard() {
      try {
        const { caseData, analyticsData } = await fetchDashboardData();
        if (!active) return;
        setCases(caseData.cases || []);
        setAnalytics(analyticsData);
      } catch (err) {
        if (active) setError(err.message || "Failed to load admin reporting");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialDashboard();
    return () => { active = false; };
  }, []);

  const statusRows = useMemo(
    () => Object.entries(analytics?.cases?.statusCounts || {}),
    [analytics]
  );

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <div className="admin-eyebrow">Legal moderator dashboard</div>
          <h1 className="admin-title">Review all agreement cases</h1>
          <p className="admin-subtitle">
            Monitor agreement lifecycle, approval progress, moderator workload,
            unresolved issues, and case activity.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
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
          <div className="admin-stat-value">{analytics?.cases?.total ?? 0}</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Finalized agreements</span>
          <div className="admin-stat-value">{analytics?.cases?.finalized ?? 0}</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Clause approval</span>
          <div className="admin-stat-value">{analytics?.clauses?.approvalRate ?? 0}%</div>
          <div className="admin-stat-detail">
            {analytics?.clauses?.approved ?? 0}/{analytics?.clauses?.total ?? 0} approved
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Moderator reviewed</span>
          <div className="admin-stat-value">{analytics?.moderator?.reviewRate ?? 0}%</div>
          <div className="admin-stat-detail">
            {analytics?.moderator?.reviewed ?? 0}/{analytics?.clauses?.total ?? 0} reviewed
          </div>
        </div>
      </section>

      <section className="admin-report-grid" aria-label="Administrative reporting">
        <article className="admin-report-card">
          <div className="admin-section-header admin-section-header--row">
            <h2 className="admin-section-title">Case lifecycle</h2>
            <span className="admin-report-total">{analytics?.cases?.total ?? 0} cases</span>
          </div>
          <div className="admin-progress-list">
            {statusRows.map(([status, count]) => {
              const width = analytics?.cases?.total
                ? Math.round((count / analytics.cases.total) * 100)
                : 0;
              return (
                <div key={status} className="admin-progress-row">
                  <div className="admin-progress-label">
                    <span>{status.replaceAll("_", " ")}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="admin-progress-track" aria-hidden="true">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="admin-report-card">
          <div className="admin-section-header admin-section-header--row">
            <h2 className="admin-section-title">Unresolved workflow issues</h2>
            <span className="admin-report-total">{analytics?.unresolved?.total ?? 0} items</span>
          </div>
          <div className="admin-issue-grid">
            <div><span>Rejected clauses</span><strong>{analytics?.unresolved?.rejectedClauses ?? 0}</strong></div>
            <div><span>Pending approvals</span><strong>{analytics?.unresolved?.pendingApprovals ?? 0}</strong></div>
            <div><span>Moderator revisions</span><strong>{analytics?.unresolved?.moderatorRevisions ?? 0}</strong></div>
            <div><span>Awaiting moderator</span><strong>{analytics?.unresolved?.moderatorPending ?? 0}</strong></div>
          </div>
          <div className="admin-activity-line">
            <span>Both parties joined</span>
            <strong>{analytics?.cases?.bothPartiesJoined ?? 0}/{analytics?.cases?.total ?? 0} ({analytics?.cases?.partyJoinRate ?? 0}%)</strong>
          </div>
          <div className="admin-activity-line">
            <span>Recorded comments</span>
            <strong>{analytics?.activity?.comments ?? 0}</strong>
          </div>
        </article>

        <article className="admin-report-card">
          <div className="admin-section-header">
            <h2 className="admin-section-title">Common unresolved categories</h2>
          </div>
          {analytics?.unresolved?.commonCategories?.length ? (
            <div className="admin-category-list">
              {analytics.unresolved.commonCategories.map((item) => (
                <div key={item.category} className="admin-category-row">
                  <span>{item.category}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-report-empty">No unresolved clause categories.</div>
          )}
        </article>
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
