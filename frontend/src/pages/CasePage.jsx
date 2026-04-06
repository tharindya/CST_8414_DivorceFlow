import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

export default function CasePage() {
  const { caseId } = useParams();

  const [caseDoc, setCaseDoc] = useState(null);
  const [clauses, setClauses] = useState([]);
  const [statusRows, setStatusRows] = useState([]);

  const [selectedClauseId, setSelectedClauseId] = useState(null);
  const selectedClause = useMemo(
    () => clauses.find((c) => c._id === selectedClauseId) || null,
    [clauses, selectedClauseId]
  );

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");

  const [draftContent, setDraftContent] = useState("");
  const [commentText, setCommentText] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function loadAll() {
    setError("");
    setLoading(true);

    try {
      const [caseRes, clauseRes, statusRes] = await Promise.all([
        api.getCase(caseId),
        api.listClauses(caseId),
        api.getClauseStatus(caseId),
      ]);

      const loadedClauses = clauseRes.clauses || [];

      setCaseDoc(caseRes.case);
      setClauses(loadedClauses);
      setStatusRows(statusRes.clauses || []);

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

  async function onCreateClause(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await api.createClause(caseId, {
        title: newTitle,
        category: newCategory,
      });

      const created = data.clause;
      const nextClauses = [...clauses, created].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );

      setClauses(nextClauses);

      const statusRes = await api.getClauseStatus(caseId);
      setStatusRows(statusRes.clauses || []);
      setCaseDoc((prev) => (prev ? { ...prev, status: statusRes.caseStatus } : prev));

      setNewTitle("");
      setNewCategory("General");
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
      setStatusRows(statusRes.clauses || []);
      setCaseDoc((prev) => (prev ? { ...prev, status: statusRes.caseStatus } : prev));
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
      setStatusRows(statusRes.clauses || []);
      setCaseDoc((prev) => (prev ? { ...prev, status: statusRes.caseStatus } : prev));

      setRejectModalOpen(false);
      setRejectReason("");
    } catch (err) {
      setError(err.message || "Failed to reject");
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
          {caseDoc?.inviteCode && (
            <div style={{ fontSize: 13, color: "#555" }}>
              Invite Code: <code>{caseDoc.inviteCode}</code>{" "}
              {caseDoc.inviteUsed ? "(used)" : "(not used)"}
            </div>
          )}
        </div>
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
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New clause title (e.g., Child Custody)"
              style={{ padding: 10 }}
            />
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category (e.g., Custody)"
              style={{ padding: 10 }}
            />
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