import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

export default function CasePage() {
  const { caseId } = useParams();

  const [caseDoc, setCaseDoc] = useState(null);
  const [clauses, setClauses] = useState([]);
  const [statusRows, setStatusRows] = useState([]); // from /clauses/status

  const [selectedClauseId, setSelectedClauseId] = useState(null);
  const selectedClause = useMemo(
    () => clauses.find((c) => c._id === selectedClauseId) || null,
    [clauses, selectedClauseId]
  );

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // create clause form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");

  // editor state
  const [draftContent, setDraftContent] = useState("");

  // comment form
  const [commentText, setCommentText] = useState("");

  async function loadAll() {
    setError("");
    setLoading(true);
    try {
      const [caseRes, clauseRes, statusRes] = await Promise.all([
        api.getCase(caseId),
        api.listClauses(caseId),
        api.getClauseStatus(caseId),
      ]);

      setCaseDoc(caseRes.case);
      setClauses(clauseRes.clauses || []);
      setStatusRows(statusRes.clauses || []);

      // auto-select first clause if none selected
      const first = (clauseRes.clauses || [])[0];
      if (!selectedClauseId && first?._id) setSelectedClauseId(first._id);
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

  // initial load
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // when selected clause changes, load its comments and set editor draft
  useEffect(() => {
    if (selectedClause) {
      setDraftContent(selectedClause.contentCurrent || "");
      loadCommentsForClause(selectedClause._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClauseId]);

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
      const nextClauses = [...clauses, created].sort((a, b) => a.orderIndex - b.orderIndex);
      setClauses(nextClauses);

      // refresh status summary
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

      // refresh status + case status
      const statusRes = await api.getClauseStatus(caseId);
      setStatusRows(statusRes.clauses || []);
      setCaseDoc((prev) => (prev ? { ...prev, status: statusRes.caseStatus } : prev));
    } catch (err) {
      setError(err.message || "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!selectedClause) return;
    const reason = window.prompt("Reason for rejection (required):");
    if (!reason || !reason.trim()) return;

    setError("");
    setBusy(true);
    try {
      await api.reject(selectedClause._id, { comment: reason });

      // refresh comments and status
      await loadCommentsForClause(selectedClause._id);

      const statusRes = await api.getClauseStatus(caseId);
      setStatusRows(statusRes.clauses || []);
      setCaseDoc((prev) => (prev ? { ...prev, status: statusRes.caseStatus } : prev));
    } catch (err) {
      setError(err.message || "Failed to reject");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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
              Invite Code: <code>{caseDoc.inviteCode}</code> {caseDoc.inviteUsed ? "(used)" : "(not used)"}
            </div>
          )}
        </div>

        {  /*
        <button onClick={loadAll} disabled={busy} style={{ padding: "8px 12px" }}>
          Refresh
        </button>
          */}

      </div>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 10, marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 360px", gap: 16, marginTop: 16 }}>
        {/* LEFT: Clause list + create */}
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
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((c) => {
                  const s = statusForClause(c._id);
                  const isSelected = c._id === selectedClauseId;

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
                          <span>Party A: {s.approvedBy?.PARTY_A ? "✅" : "—"}</span>{" "}
                          <span style={{ marginLeft: 8 }}>Party B: {s.approvedBy?.PARTY_B ? "✅" : "—"}</span>
                          <span style={{ marginLeft: 8 }}>
                            {s.isApprovedByBoth ? "✅ Approved" : "⏳ Pending"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
            )}
          </div>
        </div>

        {/* CENTER: Editor */}
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
                <button onClick={onReject} disabled={busy} style={{ padding: "8px 12px" }}>
                  Reject
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
                Tip: Reject requires a comment. (We’ll replace the prompt with a UI field later.)
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Comments */}
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
                            ? (c.userId.email || c.userId.name || "User")
                            : c.userId}
                        </code>
                      </div>
                      <div>{c.message}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>{new Date(c.createdAt).toLocaleString()}</div>
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
    </div>
  );
}