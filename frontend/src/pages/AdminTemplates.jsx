import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import "../styles/admin-dashboard.css";

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

export default function AdminTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState("");

  const loadTemplates = useCallback(async () => {
    try {
      setError("");
      setMessage("");
      setLoading(true);

      const data = await api.listAdminTemplates();
      const rows = data.templates || [];
      setTemplates(rows);

      const initialDrafts = {};
      for (const t of rows) {
        initialDrafts[t.id] = {
          reviewStatus: t.reviewStatus || "NOT_REVIEWED",
          reviewNote: t.reviewNote || "",
        };
      }
      setDrafts(initialDrafts);
    } catch (err) {
      setError(err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function updateDraft(templateId, key, value) {
    setDrafts((prev) => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || {}),
        [key]: value,
      },
    }));
  }

  async function saveTemplateReview(templateId) {
    const draft = drafts[templateId];
    if (!draft) return;

    try {
      setError("");
      setMessage("");
      setSavingId(templateId);

      const data = await api.updateAdminTemplateReview(templateId, {
        reviewStatus: draft.reviewStatus,
        reviewNote: draft.reviewNote,
      });

      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? {
                ...t,
                reviewStatus: data.templateReview.reviewStatus,
                reviewNote: data.templateReview.reviewNote,
                reviewedBy: data.templateReview.reviewedBy,
                reviewedAt: data.templateReview.reviewedAt,
              }
            : t
        )
      );

      setMessage("Template review updated.");
    } catch (err) {
      setError(err.message || "Failed to update template review");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <Link to="/admin" className="admin-back-link">
            ← Back to Admin Dashboard
          </Link>
          <div className="admin-eyebrow">Template review library</div>
          <h1 className="admin-title">Review reusable agreement templates</h1>
          <p className="admin-subtitle">
            These reviews apply globally to the reusable clause templates used
            across future cases.
          </p>
        </div>
      </section>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {message && <div className="admin-alert admin-alert-success">{message}</div>}

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <h2 className="admin-section-title">Templates</h2>
            <p className="admin-section-text">
              Set legal-moderator status for each reusable drafting template.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="admin-empty">No templates found.</div>
        ) : (
          <div className="admin-list">
            {templates.map((template) => {
              const draft = drafts[template.id] || {
                reviewStatus: "NOT_REVIEWED",
                reviewNote: "",
              };

              return (
                <article key={template.id} className="admin-case-card">
                  <div className="admin-case-top">
                    <div>
                      <h3 className="admin-case-title">{template.title}</h3>
                      <div className="admin-case-id">{template.id}</div>
                    </div>

                    <div className="admin-badges">
                      <span
                        className={`admin-badge admin-badge--${reviewTone(
                          template.reviewStatus
                        )}`}
                      >
                        {template.reviewStatus || "NOT_REVIEWED"}
                      </span>
                    </div>
                  </div>

                  <div className="admin-case-grid">
                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Category</span>
                      <span className="admin-meta-value">{template.category}</span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Jurisdiction</span>
                      <span className="admin-meta-value">{template.jurisdiction}</span>
                    </div>

                    <div className="admin-meta-box admin-meta-box--full">
                      <span className="admin-meta-label">Description</span>
                      <span className="admin-meta-value">
                        {template.description || "No description"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Reviewed by</span>
                      <span className="admin-meta-value">
                        {template.reviewedBy
                          ? `${template.reviewedBy.name} (${template.reviewedBy.email})`
                          : "Not reviewed yet"}
                      </span>
                    </div>

                    <div className="admin-meta-box">
                      <span className="admin-meta-label">Reviewed on</span>
                      <span className="admin-meta-value">
                        {template.reviewedAt
                          ? new Date(template.reviewedAt).toLocaleString()
                          : "Not reviewed yet"}
                      </span>
                    </div>
                  </div>

                  <div className="admin-review-form">
                    <label className="admin-field">
                      <span className="admin-field-label">Review status</span>
                      <select
                        className="admin-select"
                        value={draft.reviewStatus}
                        onChange={(e) =>
                          updateDraft(template.id, "reviewStatus", e.target.value)
                        }
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
                        onChange={(e) =>
                          updateDraft(template.id, "reviewNote", e.target.value)
                        }
                        placeholder="Add legal-moderator notes for this reusable template..."
                      />
                    </label>

                    <div className="admin-form-actions">
                      <button
                        type="button"
                        onClick={() => saveTemplateReview(template.id)}
                        disabled={savingId === template.id}
                        className="admin-button admin-button-primary"
                      >
                        {savingId === template.id ? "Saving..." : "Save template review"}
                      </button>
                    </div>
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
