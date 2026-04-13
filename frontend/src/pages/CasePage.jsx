import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

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
    return <div style={{ padding: 16 }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "24px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: "#666" }}>
            <Link to="/dashboard">← Back</Link>
          </div>
          <h2 style={{ margin: "6px 0" }}>{caseDoc?.title || "Case"}</h2>
          <div style={{ fontSize: 13, color: "#555" }}>
            Status: <b>{caseDoc?.status}</b> &nbsp; | &nbsp; Case ID: <code>{caseId}</code>
          </div>
          <div style={{ fontSize: 13, color: "#555" }}>
            Jurisdiction: <b>{caseDoc?.jurisdiction || "General"}</b>
          </div>
          {caseDoc?.inviteCode && (
            <div style={{ fontSize: 13, color: "#555" }}>
              Invite Code: <code>{caseDoc.inviteCode}</code>{" "}
              {caseDoc.inviteUsed ? "(used)" : "(not used)"}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {caseDoc?.status === "READY" && (
            <button onClick={onDownloadPdf} disabled={busy} style={{ padding: "8px 12px" }}>
              Download PDF
            </button>
          )}
        </div>
      </div>

      {caseDoc?.status === "READY" && exportCheck && (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #f0d58a",
            background: "#fff6df",
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Drafting Completeness Review
          </div>

          <div style={{ fontSize: 12, color: "#7a4d00", marginBottom: 8 }}>
            {exportCheck.disclaimer}
          </div>

          {exportCheck.warnings?.length === 0 ? (
            <div style={{ color: "#1f6f2a", fontWeight: 600 }}>
              No major missing sections were detected.
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Warnings:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {exportCheck.warnings.map((warning) => (
                  <li key={warning} style={{ marginBottom: 4 }}>
                    {warning}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          border: "1px solid #d9d9d9",
          background: "#fafafa",
          padding: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 700 }}>Mock Legal Review</div>
          <button
            onClick={onRunMockReview}
            disabled={reviewBusy || busy}
            style={{ padding: "8px 12px" }}
          >
            {reviewBusy ? "Running Review..." : "Run Review"}
          </button>
        </div>

        {!mockReview ? (
          <div style={{ fontSize: 13, color: "#666" }}>
            Run a simulated review to generate demo legal-review feedback.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <b>Summary:</b> {mockReview.summary}
            </div>

            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
              {mockReview.disclaimer}
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Issues</div>
              {mockReview.issues?.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {mockReview.issues.map((issue, index) => (
                    <div
                      key={`${issue.title}-${index}`}
                      style={{
                        border: "1px solid #e6e6e6",
                        background: "#fff",
                        padding: 10,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {issue.title}{" "}
                        <span style={{ fontWeight: 400, color: "#666" }}>
                          ({issue.severity})
                        </span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>{issue.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#666" }}>No issues returned.</div>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Suggestions</div>
              {mockReview.suggestions?.length ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {mockReview.suggestions.map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`} style={{ marginBottom: 4 }}>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 13, color: "#666" }}>No suggestions returned.</div>
              )}
            </div>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #f99",
            padding: 10,
            marginTop: 12,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr 360px",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Clauses</h3>

          <form onSubmit={onCreateClause} style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <select
              value={selectedTemplateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              style={{ padding: 10 }}
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
              style={{ padding: 10 }}
            />
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category"
              style={{ padding: 10 }}
            />

            {templateDetails && (
              <div
                style={{
                  border: "1px solid #e6e6e6",
                  background: "#fafafa",
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 700 }}>{templateDetails.title}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {templateDetails.description}
                </div>
                <div style={{ fontSize: 12 }}>
                  Review Status: <b>{templateDetails.reviewStatus || "UNKNOWN"}</b>
                </div>
                <div style={{ fontSize: 12 }}>
                  Reviewed By: <b>{templateDetails.reviewedBy || "Not specified"}</b>
                </div>
                <div style={{ fontSize: 12 }}>
                  Reviewed On: <b>{templateDetails.reviewedOn || "Not yet reviewed"}</b>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#7a4d00",
                    background: "#fff6df",
                    border: "1px solid #f0d58a",
                    padding: 8,
                  }}
                >
                  {templateDetails.disclaimer}
                </div>

                {(templateDetails.placeholders || []).map((field) => (
                  <div key={field.key} style={{ display: "grid", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        value={templateValues[field.key] || ""}
                        onChange={(e) => onTemplateValueChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ""}
                        rows={4}
                        style={{ padding: 8, resize: "vertical" }}
                      />
                    ) : (
                      <input
                        value={templateValues[field.key] || ""}
                        onChange={(e) => onTemplateValueChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ""}
                        style={{ padding: 8 }}
                      />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={onGenerateFromTemplate}
                  disabled={busy}
                  style={{ padding: 10 }}
                >
                  Generate Draft from Template
                </button>
              </div>
            )}

            <button disabled={busy || !newTitle.trim()} style={{ padding: 10 }}>
              Add Clause
            </button>
          </form>

          <div style={{ display: "grid", gap: 8 }}>
            {clauses.length === 0 ? (
              <div style={{ color: "#666" }}>No clauses yet.</div>
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
                      style={{
                        textAlign: "left",
                        padding: 10,
                        border: "1px solid #eee",
                        background: isSelected ? "#f2f6ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{c.category}</div>
                      {c.templateTitle && (
                        <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                          Template: <b>{c.templateTitle}</b>
                        </div>
                      )}
                      {s && (
                        <div style={{ fontSize: 12, marginTop: 6 }}>
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

        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Editor</h3>

          {!selectedClause ? (
            <div style={{ color: "#666" }}>Select a clause to edit.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                Editing: <b>{selectedClause.title}</b>
              </div>

              {selectedClause.templateId && (
                <div
                  style={{
                    border: "1px solid #e6e6e6",
                    background: "#fafafa",
                    padding: 10,
                    display: "grid",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>Template Source</div>
                  <div style={{ fontSize: 12 }}>
                    Template: <b>{selectedClause.templateTitle || "Unknown template"}</b>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Jurisdiction: <b>{selectedClause.templateJurisdiction || "Unknown"}</b>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Review Status: <b>{selectedClause.templateReviewStatus || "UNKNOWN"}</b>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Reviewed By: <b>{selectedClause.templateReviewedBy || "Not specified"}</b>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Reviewed On: <b>{selectedClause.templateReviewedOn || "Not yet reviewed"}</b>
                  </div>
                  {selectedClause.templateDisclaimer && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#7a4d00",
                        background: "#fff6df",
                        border: "1px solid #f0d58a",
                        padding: 8,
                      }}
                    >
                      {selectedClause.templateDisclaimer}
                    </div>
                  )}
                </div>
              )}

              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                style={{ width: "95%", height: 320, padding: 10, fontFamily: "inherit" }}
                placeholder="Write the clause text here..."
              />

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button onClick={onSaveClause} disabled={busy} style={{ padding: "8px 12px" }}>
                  Save
                </button>
                <button onClick={onApprove} disabled={busy} style={{ padding: "8px 12px" }}>
                  Approve
                </button>
                <button onClick={openRejectModal} disabled={busy} style={{ padding: "8px 12px" }}>
                  Reject
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
                Tip: Rejecting a clause requires a written reason.
              </div>
            </>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Comments</h3>

          {!selectedClause ? (
            <div style={{ color: "#666" }}>Select a clause to view comments.</div>
          ) : (
            <>
              <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #eee", padding: 10 }}>
                {comments.length === 0 ? (
                  <div style={{ color: "#666" }}>No comments yet.</div>
                ) : (
                  comments.map((c) => (
                    <div key={c._id} style={{ padding: "8px 0", borderBottom: "1px solid #f2f2f2" }}>
                      <div style={{ fontSize: 12, color: "#777" }}>
                        User:{" "}
                        <code>
                          {typeof c.userId === "object"
                            ? c.userId.email || c.userId.name || "User"
                            : c.userId}
                        </code>
                      </div>
                      <div>{c.message}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={onAddComment} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  style={{ padding: 10 }}
                />
                <button disabled={busy || !commentText.trim()} style={{ padding: 10 }}>
                  Add Comment
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {rejectModalOpen && (
        <div
          onClick={closeRejectModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Reject Clause</h3>
            <p style={{ color: "#555" }}>
              Enter the reason for rejecting this clause.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={5}
              placeholder="Explain what needs to change..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 10,
                border: "1px solid #ccc",
                borderRadius: 6,
                resize: "vertical",
                marginBottom: 12,
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={closeRejectModal} disabled={busy}>
                Cancel
              </button>
              <button type="button" onClick={onRejectConfirm} disabled={busy}>
                {busy ? "Submitting..." : "Submit Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}