import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

function clauseTone(state) {
  switch ((state || "").toUpperCase()) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    case "PENDING":
    default:
      return "warning";
  }
}

function reviewTone(status) {
  switch ((status || "").toUpperCase()) {
    case "REVIEWED":
      return "success";
    case "NEEDS_REVISION":
      return "danger";
    case "NOT_REVIEWED":
    default:
      return "default";
  }
}

export default function AdminCaseReview() {
  const { caseId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [reviewDrafts, setReviewDrafts] = useState({});
  const [savingClauseId, setSavingClauseId] = useState("");

  async function loadCase() {
    try {
      setError("");
      setMessage("");
      setLoading(true);
      const res = await api.getAdminCase(caseId);
      setData(res);

      const initialDrafts = {};
      for (const clause of res?.clauses || []) {
        initialDrafts[clause._id] = {
          reviewStatus: clause.adminReviewStatus || "NOT_REVIEWED",
          reviewNote: clause.adminReviewNote || "",
        };
      }
      setReviewDrafts(initialDrafts);
    } catch (err) {
      setError(err.message || "Failed to load admin case review");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCase();
  }, [caseId]);

  const commentsByClause = useMemo(() => {
    const map = new Map();
    for (const comment of data?.comments || []) {
      const key = comment.clauseId?.toString?.() || comment.clauseId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(comment);
    }
    return map;
  }, [data]);

  const statusByClause = useMemo(() => {
    const map = new Map();
    for (const row of data?.clauseStatus || []) {
      map.set(row.clauseId?.toString?.() || row.clauseId, row);
    }
    return map;
  }, [data]);

  function updateDraft(clauseId, key, value) {
    setReviewDrafts((prev) => ({
      ...prev,
      [clauseId]: {
        ...(prev[clauseId] || {}),
        [key]: value,
      },
    }));
  }

  async function saveClauseReview(clauseId) {
    const draft = reviewDrafts[clauseId];
    if (!draft) return;

    try {
      setError("");
      setMessage("");
      setSavingClauseId(clauseId);

      const res = await api.updateAdminClauseReview(clauseId, {
        reviewStatus: draft.reviewStatus,
        reviewNote: draft.reviewNote,
      });

      setData((prev) => ({
        ...prev,
        clauses: (prev?.clauses || []).map((clause) =>
          clause._id === clauseId ? { ...clause, ...res.clause } : clause
        ),
      }));

      setMessage("Clause moderator review updated.");
    } catch (err) {
      setError(err.message || "Failed to update clause review");
    } finally {
      setSavingClauseId("");
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-empty">Loading case review...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <Link to="/admin" className="admin-back-link">
            ← Back to Admin Dashboard
          </Link>
          <div className="admin-eyebrow">Case review</div>
          <h1 className="admin-title">{data?.case?.title || "Case"}</h1>
          <p className="admin-subtitle">
            Moderator view of participant progress, template provenance, and
            clause-level legal review.
          </p>
        </div>
      </section>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {message && <div className="admin-alert admin-alert-success">{message}</div>}

      {data?.case && (
        <section className="admin-review-grid">
          <div className="admin-review-card">
            <h2 className="admin-card-title">Case summary</h2>

            <div className="admin-case-grid">
              <div className="admin-meta-box">
                <span className="admin-meta-label">Status</span>
                <span className={`admin-badge admin-badge--${caseTone(data.case.status)}`}>
                  {data.case.status}
                </span>
              </div>

              <div className="admin-meta-box">
                <span className="admin-meta-label">Jurisdiction</span>
                <span className="admin-meta-value">{data.case.jurisdiction || "General"}</span>
              </div>

              <div className="admin-meta-box">
                <span className="admin-meta-label">Invite code</span>
                <span className="admin-meta-value">{data.case.inviteCode || "N/A"}</span>
              </div>

              <div className="admin-meta-box">
                <span className="admin-meta-label">Invite used</span>
                <span className="admin-meta-value">{data.case.inviteUsed ? "Yes" : "No"}</span>
              </div>

              <div className="admin-meta-box admin-meta-box--full">
                <span className="admin-meta-label">Party B email</span>
                <span className="admin-meta-value">{data.case.partyBEmail || "Not set"}</span>
              </div>
            </div>
          </div>

          <div className="admin-review-card">
            <h2 className="admin-card-title">Participants</h2>

            <div className="admin-stack">
              {(data.case.participants || []).map((p, index) => (
                <div key={`${p.role}-${index}`} className="admin-meta-box">
                  <span className="admin-meta-label">{p.role}</span>
                  <span className="admin-meta-value">
                    {p.user ? `${p.user.name} (${p.user.email})` : "Not assigned"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <h2 className="admin-section-title">Clauses and moderator review</h2>
            <p className="admin-section-text">
              Review party workflow status, template review status, and live
              clause legal-moderator status separately.
            </p>
          </div>
        </div>

        {!data?.clauses?.length ? (
          <div className="admin-empty">No clauses found for this case.</div>
        ) : (
          <div className="admin-list">
            {data.clauses.map((clause) => {
              const key = clause._id?.toString?.() || clause._id;
              const status = statusByClause.get(key);
              const comments = commentsByClause.get(key) || [];
              const draft = reviewDrafts[key] || {
                reviewStatus: clause.adminReviewStatus || "NOT_REVIEWED",
                reviewNote: clause.adminReviewNote || "",
              };

              return (
                <article key={key} className="admin-clause-card">
                  <div className="admin-case-top">
                    <div>
                      <h3 className="admin-case-title">{clause.title}</h3>
                      <div className="admin-clause-category">{clause.category}</div>
                    </div>

                    <div className="admin-badges">
                      <span className={`admin-badge admin-badge--${clauseTone(status?.overallState)}`}>
                        Party Workflow: {status?.overallState || "PENDING"}
                      </span>
                      <span
                        className={`admin-badge admin-badge--${reviewTone(
                          clause.templateReviewStatus
                        )}`}
                      >
                        Template: {clause.templateReviewStatus || "NOT_REVIEWED"}
                      </span>
                      <span
                        className={`admin-badge admin-badge--${reviewTone(
                          clause.adminReviewStatus
                        )}`}
                      >
                        Moderator: {clause.adminReviewStatus || "NOT_REVIEWED"}
                      </span>
                    </div>
                  </div>

                  <div className="admin-clause-body">
                    {clause.contentCurrent || "No content"}
                  </div>

                  <div className="admin-case-grid">
                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Party A</span>
                      <span className="admin-meta-value">
                        {status?.rejectedBy?.PARTY_A
                          ? "Rejected"
                          : status?.approvedBy?.PARTY_A
                          ? "Approved"
                          : "Pending"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Party B</span>
                      <span className="admin-meta-value">
                        {status?.rejectedBy?.PARTY_B
                          ? "Rejected"
                          : status?.approvedBy?.PARTY_B
                          ? "Approved"
                          : "Pending"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Template source</span>
                      <span className="admin-meta-value">
                        {clause.templateTitle || "Custom clause"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Template jurisdiction</span>
                      <span className="admin-meta-value">
                        {clause.templateJurisdiction || "N/A"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Template reviewed by</span>
                      <span className="admin-meta-value">
                        {clause.templateReviewedBy || "Not reviewed"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Template reviewed on</span>
                      <span className="admin-meta-value">
                        {clause.templateReviewedOn
                          ? new Date(clause.templateReviewedOn).toLocaleString()
                          : "Not reviewed"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Moderator reviewed by</span>
                      <span className="admin-meta-value">
                        {clause.adminReviewedBy
                          ? `${clause.adminReviewedBy.name} (${clause.adminReviewedBy.email})`
                          : "Not reviewed"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Moderator reviewed on</span>
                      <span className="admin-meta-value">
                        {clause.adminReviewedAt
                          ? new Date(clause.adminReviewedAt).toLocaleString()
                          : "Not reviewed"}
                      </span>
                    </div>

                    <div className="admin-meta-box admin-meta-box--full">
                      <span className="admin-meta-label">Template note</span>
                      <span className="admin-meta-value">
                        {clause.templateDisclaimer || "No template note"}
                      </span>
                    </div>
                  </div>

                  <div className="admin-review-form">
                    <label className="admin-field">
                      <span className="admin-field-label">Moderator review status</span>
                      <select
                        className="admin-select"
                        value={draft.reviewStatus}
                        onChange={(e) => updateDraft(key, "reviewStatus", e.target.value)}
                      >
                        <option value="NOT_REVIEWED">NOT_REVIEWED</option>
                        <option value="REVIEWED">REVIEWED</option>
                        <option value="NEEDS_REVISION">NEEDS_REVISION</option>
                      </select>
                    </label>

                    <label className="admin-field">
                      <span className="admin-field-label">Moderator note</span>
                      <textarea
                        className="admin-textarea"
                        rows={4}
                        value={draft.reviewNote}
                        onChange={(e) => updateDraft(key, "reviewNote", e.target.value)}
                        placeholder="Add legal-moderator notes for this live clause..."
                      />
                    </label>

                    <div className="admin-form-actions">
                      <button
                        type="button"
                        onClick={() => saveClauseReview(key)}
                        disabled={savingClauseId === key}
                        className="admin-button admin-button-primary"
                      >
                        {savingClauseId === key ? "Saving..." : "Save clause review"}
                      </button>
                    </div>
                  </div>

                  <div className="admin-comments-block">
                    <div className="admin-comments-title">Comments</div>

                    {comments.length === 0 ? (
                      <div className="admin-comment-empty">No comments for this clause.</div>
                    ) : (
                      <div className="admin-comments-list">
                        {comments.map((comment) => (
                          <div key={comment._id} className="admin-comment-card">
                            <div className="admin-comment-top">
                              <span className="admin-comment-user">
                                {typeof comment.userId === "object"
                                  ? comment.userId.email || comment.userId.name || "User"
                                  : comment.userId}
                              </span>
                              <span className="admin-comment-time">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="admin-comment-message">{comment.message}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}