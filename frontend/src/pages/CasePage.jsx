import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import "../styles/case-page.css";

export default function CasePage() {
  const { caseId } = useParams();

  const [caseDoc, setCaseDoc] = useState(null);
  const [clauses, setClauses] = useState([]);
  const [statusRows, setStatusRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateDetails, setTemplateDetails] = useState(null);
  const [templateValues, setTemplateValues] = useState({});
  const [exportCheck, setExportCheck] = useState(null);
  const [mockReview, setMockReview] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  const [selectedClauseId, setSelectedClauseId] = useState(null);
  const selectedClause = useMemo(
    () => clauses.find((c) => c._id === selectedClauseId) || null,
    [clauses, selectedClauseId]
  );

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");

  const [draftContent, setDraftContent] = useState("");
  const [commentText, setCommentText] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function loadExportCheck(currentCaseDoc) {
    if (!currentCaseDoc || currentCaseDoc.status !== "READY") {
      setExportCheck(null);
      return;
    }

    try {
      const data = await api.getExportCheck(caseId);
      setExportCheck(data);
    } catch (err) {
      setError(err.message || "Failed to load export check");
    }
  }

  async function onRunMockReview() {
    try {
      setError("");
      setReviewBusy(true);
      const data = await api.getMockReview(caseId);
      setMockReview(data);
    } catch (err) {
      setError(err.message || "Failed to run mock review");
    } finally {
      setReviewBusy(false);
    }
  }

  async function loadAll() {
    setError("");
    setLoading(true);

    try {
      const caseRes = await api.getCase(caseId);
      const clauseRes = await api.listClauses(caseId);
      const statusRes = await api.getClauseStatus(caseId);
      const templateRes = await api.listTemplates(caseRes.case?.jurisdiction || "General");

      const loadedClauses = clauseRes.clauses || [];
      const loadedTemplates = templateRes.templates || [];

      setCaseDoc(caseRes.case);
      setClauses(loadedClauses);
      setStatusRows(statusRes.clauses || []);
      setTemplates(loadedTemplates);
      setMockReview(null);
      await loadExportCheck(caseRes.case);

      const first = loadedClauses[0];
      if (!selectedClauseId && first?._id) {
        setSelectedClauseId(first._id);
      }
    } catch (err) {
      setError(err.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  }

  async function loadCommentsForClause(clauseId) {
    if (!clauseId) {
      setComments([]);
      return;
    }

    try {
      const data = await api.listComments(clauseId);
      setComments(data.comments || []);
    } catch (err) {
      setError(err.message || "Failed to load comments");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    if (selectedClause) {
      setDraftContent(selectedClause.contentCurrent || "");
      loadCommentsForClause(selectedClause._id);
    } else {
      setDraftContent("");
      setComments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClauseId, selectedClause]);

  function statusForClause(clauseId) {
    return statusRows.find((s) => s.clauseId === clauseId) || null;
  }

  function onSelectTemplate(templateId) {
    setSelectedTemplateId(templateId);

    const template = templates.find((t) => t.id === templateId) || null;
    setTemplateDetails(template);
    setTemplateValues({});

    if (template) {
      setNewTitle(template.title);
      setNewCategory(template.category);
      setDraftContent("");
    } else {
      setNewTitle("");
      setNewCategory("General");
      setDraftContent("");
    }
  }

  function onTemplateValueChange(key, value) {
    setTemplateValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function onGenerateFromTemplate() {
    if (!selectedTemplateId) return;

    try {
      setError("");
      setBusy(true);

      const data = await api.buildTemplateDraft(selectedTemplateId, templateValues);
      setDraftContent(data.content || "");
      setNewTitle(data.template?.title || newTitle);
      setNewCategory(data.template?.category || newCategory);

      setTemplateDetails((prev) =>
        prev
          ? {
              ...prev,
              ...data.template,
            }
          : data.template || null
      );
    } catch (err) {
      setError(err.message || "Failed to generate template draft");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateClause(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await api.createClause(caseId, {
        title: newTitle,
        category: newCategory,
        contentCurrent: draftContent,

        templateId: templateDetails?.id || null,
        templateTitle: templateDetails?.title || null,
        templateJurisdiction: templateDetails?.jurisdiction || null,
        templateReviewStatus: templateDetails?.reviewStatus || null,
        templateReviewedBy: templateDetails?.reviewedBy || null,
        templateReviewedOn: templateDetails?.reviewedOn || null,
        templateDisclaimer: templateDetails?.disclaimer || null,
      });

      const created = data.clause;
      const nextClauses = [...clauses, created].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );

      setClauses(nextClauses);

      const statusRes = await api.getClauseStatus(caseId);
      const nextCase = { ...(caseDoc || {}), status: statusRes.caseStatus };

      setStatusRows(statusRes.clauses || []);
      setCaseDoc(nextCase);
      setMockReview(null);
      await loadExportCheck(nextCase);

      setSelectedTemplateId("");
      setTemplateDetails(null);
      setTemplateValues({});
      setNewTitle("");
      setNewCategory("General");
      setDraftContent("");
      setSelectedClauseId(created._id);
    } catch (err) {
      setError(err.message || "Failed to create clause");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveClause() {
    if (!selectedClause) return;

    setError("");
    setBusy(true);

    try {
      const data = await api.updateClause(selectedClause._id, {
        contentCurrent: draftContent,
      });

      const updated = data.clause;
      setClauses((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));

      const statusRes = await api.getClauseStatus(caseId);
      const nextCase = { ...(caseDoc || {}), status: statusRes.caseStatus };

      setStatusRows(statusRes.clauses || []);
      setCaseDoc(nextCase);
      setMockReview(null);
      await loadExportCheck(nextCase);
    } catch (err) {
      setError(err.message || "Failed to save clause");
    } finally {
      setBusy(false);
    }
  }

  async function onAddComment(e) {
    e.preventDefault();
    if (!selectedClause) return;

    setError("");
    setBusy(true);

    try {
      await api.addComment(selectedClause._id, { message: commentText });
      setCommentText("");
      setMockReview(null);
      await loadCommentsForClause(selectedClause._id);
    } catch (err) {
      setError(err.message || "Failed to add comment");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove() {
    if (!selectedClause) return;

    setError("");
    setBusy(true);

    try {
      await api.approve(selectedClause._id);

      const statusRes = await api.getClauseStatus(caseId);
      const nextCase = { ...(caseDoc || {}), status: statusRes.caseStatus };

      setStatusRows(statusRes.clauses || []);
      setCaseDoc(nextCase);
      setMockReview(null);
      await loadExportCheck(nextCase);
    } catch (err) {
      setError(err.message || "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  function openRejectModal() {
    if (!selectedClause) return;
    setRejectReason("");
    setError("");
    setRejectModalOpen(true);
  }

  function closeRejectModal() {
    if (busy) return;
    setRejectModalOpen(false);
    setRejectReason("");
  }

  async function onRejectConfirm() {
    if (!selectedClause) return;

    const reason = rejectReason.trim();
    if (!reason) {
      setError("Reason for rejection is required.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await api.reject(selectedClause._id, { comment: reason });

      await loadCommentsForClause(selectedClause._id);

      const statusRes = await api.getClauseStatus(caseId);
      const nextCase = { ...(caseDoc || {}), status: statusRes.caseStatus };

      setStatusRows(statusRes.clauses || []);
      setCaseDoc(nextCase);
      setMockReview(null);
      await loadExportCheck(nextCase);

      setRejectModalOpen(false);
      setRejectReason("");
    } catch (err) {
      setError(err.message || "Failed to reject");
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadPdf() {
    try {
      setError("");
      setBusy(true);
      await api.downloadCasePdf(caseId);
    } catch (err) {
      setError(err.message || "Failed to export PDF");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && rejectModalOpen && !busy) {
        closeRejectModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rejectModalOpen, busy]);

  if (loading) {
    return <div className="case-page">Loading...</div>;
  }

  return (
    <div className="case-page">
      <div className="case-header">
        <div className="case-header-main">
          <Link to="/dashboard" className="case-back-link">
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>

          <h2 className="case-title">{caseDoc?.title || "Case"}</h2>

          <div className="case-meta-row">
            <div className="case-meta-group case-meta-group-left">
              <div
                className={`case-status-badge ${
                  caseDoc?.status === "READY"
                    ? "case-status-ready"
                    : caseDoc?.status === "NEGOTIATING"
                    ? "case-status-negotiating"
                    : caseDoc?.status === "REJECTED"
                    ? "case-status-rejected"
                    : "case-status-draft"
                }`}
              >
                {caseDoc?.status || "DRAFT"}
              </div>

              <div className="case-meta-chip">
                <span className="case-meta-label">Jurisdiction</span>
                <b>{caseDoc?.jurisdiction || "General"}</b>
              </div>
            </div>

            <div className="case-meta-group case-meta-group-right">
              <div className="case-meta-chip">
                <span className="case-meta-label">Case ID</span>
                <code>{caseId}</code>
              </div>

              {caseDoc?.inviteCode && (
                <div className="case-meta-chip">
                  <span className="case-meta-label">Invite</span>
                  <code>{caseDoc.inviteCode}</code>
                  <span>{caseDoc.inviteUsed ? "used" : "not used"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {caseDoc?.status === "READY" && (
          <div className="case-header-actions">
            <button onClick={onDownloadPdf} disabled={busy} className="button button-primary">
              Download PDF
            </button>
          </div>
        )}
      </div>

      {caseDoc?.status === "READY" && exportCheck && (
        <div className="review-panel review-panel-warning">
          <div className="review-title">Drafting Completeness Review</div>

          <div className="review-subtle review-subtle-warning">
            {exportCheck.disclaimer}
          </div>

          {exportCheck.warnings?.length === 0 ? (
            <div className="review-ok">No major missing sections were detected.</div>
          ) : (
            <>
              <div className="review-title">Warnings:</div>
              <ul className="list">
                {exportCheck.warnings.map((warning) => (
                  <li key={warning} className="list-item">
                    {warning}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="review-panel review-panel-neutral">
        <div className="review-panel-header">
          <div className="review-title">Mock Legal Review</div>
          <button
            onClick={onRunMockReview}
            disabled={reviewBusy || busy}
            className="button"
          >
            {reviewBusy ? "Running Review..." : "Run Review"}
          </button>
        </div>

        {!mockReview ? (
          <div className="muted">
            Run a simulated review to generate demo legal-review feedback.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <b>Summary:</b> {mockReview.summary}
            </div>

            <div className="review-subtle">{mockReview.disclaimer}</div>

            <div style={{ marginBottom: 10 }}>
              <div className="review-title">Issues</div>
              {mockReview.issues?.length ? (
                <div className="issue-list">
                  {mockReview.issues.map((issue, index) => (
                    <div key={`${issue.title}-${index}`} className="issue-card">
                      <div className="issue-title">
                        {issue.title}{" "}
                        <span className="issue-severity">({issue.severity})</span>
                      </div>
                      <div className="issue-message">{issue.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">No issues returned.</div>
              )}
            </div>

            <div>
              <div className="review-title">Suggestions</div>
              {mockReview.suggestions?.length ? (
                <ul className="list">
                  {mockReview.suggestions.map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`} className="list-item">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="muted">No suggestions returned.</div>
              )}
            </div>
          </>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="workspace-grid">
        <div className="panel">
          <h3 className="panel-title">Clauses</h3>

          <form onSubmit={onCreateClause} className="form-grid form-section">
            <select
              value={selectedTemplateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              className="select"
            >
              <option value="">Custom Clause</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.jurisdiction})
                </option>
              ))}
            </select>

            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New clause title"
              className="input"
            />
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category"
              className="input"
            />

            {templateDetails && (
              <div className="template-box">
                <div className="template-title">{templateDetails.title}</div>
                <div className="template-description">
                  {templateDetails.description}
                </div>
                <div className="muted">
                  Review Status: <b>{templateDetails.reviewStatus || "UNKNOWN"}</b>
                </div>
                <div className="muted">
                  Reviewed By: <b>{templateDetails.reviewedBy || "Not specified"}</b>
                </div>
                <div className="muted">
                  Reviewed On: <b>{templateDetails.reviewedOn || "Not yet reviewed"}</b>
                </div>
                <div className="template-disclaimer">
                  {templateDetails.disclaimer}
                </div>

                {(templateDetails.placeholders || []).map((field) => (
                  <div key={field.key} className="form-grid">
                    <label className="muted" style={{ fontWeight: 600 }}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        value={templateValues[field.key] || ""}
                        onChange={(e) => onTemplateValueChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ""}
                        rows={4}
                        className="textarea"
                      />
                    ) : (
                      <input
                        value={templateValues[field.key] || ""}
                        onChange={(e) => onTemplateValueChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ""}
                        className="input"
                      />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={onGenerateFromTemplate}
                  disabled={busy}
                  className="button"
                >
                  Generate Draft from Template
                </button>
              </div>
            )}

            <button disabled={busy || !newTitle.trim()} className="button button-primary">
              Add Clause
            </button>
          </form>

          <div className="clause-list">
            {clauses.length === 0 ? (
              <div className="empty-state">No clauses yet.</div>
            ) : (
              clauses
                .slice()
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                .map((c) => {
                  const s = statusForClause(c._id);
                  const isSelected = c._id === selectedClauseId;

                  const partyARejected = s?.rejectedBy?.PARTY_A;
                  const partyBRejected = s?.rejectedBy?.PARTY_B;
                  const partyAApproved = s?.approvedBy?.PARTY_A;
                  const partyBApproved = s?.approvedBy?.PARTY_B;

                  return (
                    <button
                      key={c._id}
                      onClick={() => setSelectedClauseId(c._id)}
                      className={`clause-card ${isSelected ? "clause-card-selected" : ""}`}
                    >
                      <div className="clause-card-title">{c.title}</div>
                      <div className="clause-card-meta">{c.category}</div>
                      {c.templateTitle && (
                        <div className="clause-card-template">
                          Template: <b>{c.templateTitle}</b>
                        </div>
                      )}
                      {s && (
                        <div className="clause-card-status">
                          <span>
                            Party A: {partyARejected ? "❌" : partyAApproved ? "✅" : "—"}
                          </span>
                          <span style={{ marginLeft: 8 }}>
                            Party B: {partyBRejected ? "❌" : partyBApproved ? "✅" : "—"}
                          </span>
                          <span style={{ marginLeft: 8 }}>
                            {s.overallState === "REJECTED"
                              ? "❌ Rejected"
                              : s.isApprovedByBoth
                              ? "✅ Approved"
                              : "⏳ Pending"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
            )}
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-title">Editor</h3>

          {!selectedClause ? (
            <div className="empty-state">Select a clause to edit.</div>
          ) : (
            <>
              <div className="editor-meta">
                Editing: <b>{selectedClause.title}</b>
              </div>

              {selectedClause.templateId && (
                <div className="template-box" style={{ marginBottom: 12 }}>
                  <div className="template-title">Template Source</div>
                  <div className="muted">
                    Template: <b>{selectedClause.templateTitle || "Unknown template"}</b>
                  </div>
                  <div className="muted">
                    Jurisdiction: <b>{selectedClause.templateJurisdiction || "Unknown"}</b>
                  </div>
                  <div className="muted">
                    Review Status: <b>{selectedClause.templateReviewStatus || "UNKNOWN"}</b>
                  </div>
                  <div className="muted">
                    Reviewed By: <b>{selectedClause.templateReviewedBy || "Not specified"}</b>
                  </div>
                  <div className="muted">
                    Reviewed On: <b>{selectedClause.templateReviewedOn || "Not yet reviewed"}</b>
                  </div>
                  {selectedClause.templateDisclaimer && (
                    <div className="template-disclaimer">
                      {selectedClause.templateDisclaimer}
                    </div>
                  )}
                </div>
              )}

              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="textarea textarea-editor"
                placeholder="Write the clause text here..."
              />

              <div className="button-row">
                <button onClick={onSaveClause} disabled={busy} className="button">
                  Save
                </button>
                <button onClick={onApprove} disabled={busy} className="button button-primary">
                  Approve
                </button>
                <button onClick={openRejectModal} disabled={busy} className="button">
                  Reject
                </button>
              </div>

              <div className="muted" style={{ marginTop: 10 }}>
                Tip: Rejecting a clause requires a written reason.
              </div>
            </>
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">Comments</h3>

          {!selectedClause ? (
            <div className="empty-state">Select a clause to view comments.</div>
          ) : (
            <>
              <div className="comment-list">
                {comments.length === 0 ? (
                  <div className="empty-state">No comments yet.</div>
                ) : (
                  comments.map((c) => (
                    <div key={c._id} className="comment-item">
                      <div className="comment-user">
                        User:{" "}
                        <code>
                          {typeof c.userId === "object"
                            ? c.userId.email || c.userId.name || "User"
                            : c.userId}
                        </code>
                      </div>
                      <div>{c.message}</div>
                      <div className="comment-time">
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={onAddComment} className="form-grid" style={{ marginTop: 10 }}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="input"
                />
                <button disabled={busy || !commentText.trim()} className="button">
                  Add Comment
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {rejectModalOpen && (
        <div onClick={closeRejectModal} className="modal-backdrop">
          <div onClick={(e) => e.stopPropagation()} className="modal-card">
            <h3 style={{ marginTop: 0 }}>Reject Clause</h3>
            <p className="modal-copy">
              Enter the reason for rejecting this clause.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={5}
              placeholder="Explain what needs to change..."
              className="textarea"
              style={{ marginBottom: 12 }}
            />

            <div className="modal-actions">
              <button type="button" onClick={closeRejectModal} disabled={busy} className="button">
                Cancel
              </button>
              <button
                type="button"
                onClick={onRejectConfirm}
                disabled={busy}
                className="button button-primary"
              >
                {busy ? "Submitting..." : "Submit Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}