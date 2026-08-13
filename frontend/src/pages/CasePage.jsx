import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import "../styles/case-page.css";

function caseStatusClass(status) {
  switch ((status || "").toUpperCase()) {
    case "READY":
      return "case-status-ready";
    case "NEGOTIATING":
      return "case-status-negotiating";
    case "EXPORTED":
      return "case-status-exported";
    case "DRAFT":
    default:
      return "case-status-draft";
  }
}

function clauseOverallTone(statusRow) {
  if (!statusRow) return "default";
  if (statusRow.overallState === "REJECTED") return "danger";
  if (statusRow.isApprovedByBoth) return "success";
  return "warning";
}

function clauseOverallLabel(statusRow) {
  if (!statusRow) return "Pending";
  if (statusRow.overallState === "REJECTED") return "Rejected";
  if (statusRow.isApprovedByBoth) return "Approved";
  return "Pending";
}

function actorMark(approved, rejected) {
  if (rejected) return "Rejected";
  if (approved) return "Approved";
  return "Pending";
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

function reviewLabel(status) {
  if (!status) return "NOT_REVIEWED";
  return status;
}

function reviewPerson(value) {
  if (!value) return "Not reviewed";
  if (typeof value === "object") {
    return value.email || value.name || "Reviewer";
  }
  return value;
}

function actorDisplay(value) {
  if (!value) return "System";
  if (typeof value === "object") {
    return value.name || value.email || "User";
  }
  return value;
}

const EMPTY_INTAKE = {
  dependents: "",
  assets: "",
  debts: "",
  supportRequirements: "",
  custodyPreferences: "",
};

const INTAKE_FIELDS = [
  {
    key: "dependents",
    label: "Dependents",
    placeholder: "List children or dependents, or state that there are none.",
  },
  {
    key: "assets",
    label: "Assets",
    placeholder: "Summarize major assets such as home, vehicles, savings, or shared property.",
  },
  {
    key: "debts",
    label: "Debts",
    placeholder: "Summarize debts such as loans, credit cards, mortgages, or state none.",
  },
  {
    key: "supportRequirements",
    label: "Support requirements",
    placeholder: "Describe spousal support, child support, or state that no support is requested.",
  },
  {
    key: "custodyPreferences",
    label: "Custody preferences",
    placeholder: "Describe parenting time, decision-making, or state that custody does not apply.",
  },
];

function normalizeIntakeForForm(intake) {
  return {
    dependents: intake?.dependents || "",
    assets: intake?.assets || "",
    debts: intake?.debts || "",
    supportRequirements: intake?.supportRequirements || "",
    custodyPreferences: intake?.custodyPreferences || "",
  };
}

function intakeCompletionStats(intake) {
  const total = INTAKE_FIELDS.length;
  const completed = INTAKE_FIELDS.filter((field) =>
    String(intake?.[field.key] || "").trim()
  ).length;

  return {
    total,
    completed,
    percent: Math.round((completed / total) * 100),
  };
}

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
  const [aiReview, setAiReview] = useState(null);
  const [aiReviewBusy, setAiReviewBusy] = useState(false);
  const [intakeDraft, setIntakeDraft] = useState(EMPTY_INTAKE);
  const [intakeSaving, setIntakeSaving] = useState(false);
  const [intakeMessage, setIntakeMessage] = useState("");
  const [intakeRecommendations, setIntakeRecommendations] = useState({
    warnings: [],
    recommendations: [],
  });
  const [recommendationBusy, setRecommendationBusy] = useState(false);

  const intakeStats = useMemo(() => intakeCompletionStats(intakeDraft), [intakeDraft]);

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
  const [rewriteMode, setRewriteMode] = useState("CLEAR");
  const [rewritePreview, setRewritePreview] = useState(null);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [commentText, setCommentText] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [clauseVersions, setClauseVersions] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);

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

  function onIntakeChange(field, value) {
    setIntakeDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function onSaveIntake(e) {
    e.preventDefault();

    try {
      setError("");
      setIntakeMessage("");
      setIntakeSaving(true);

      const data = await api.updateCaseIntake(caseId, intakeDraft);
      setCaseDoc(data.case);
      setIntakeDraft(normalizeIntakeForForm(data.case?.intake));
      setIntakeMessage(data.message || "Guided intake saved");
      setMockReview(null);
      await loadIntakeRecommendations();
      await loadAuditTrail();
    } catch (err) {
      setError(err.message || "Failed to save guided intake");
    } finally {
      setIntakeSaving(false);
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

  async function onRunAiReview() {
    try {
      setError("");
      setAiReviewBusy(true);
      const data = await api.getAiAgreementReview(caseId);
      setAiReview(data);
      await loadAuditTrail();
    } catch (err) {
      setError(err.message || "Failed to run AI agreement review");
    } finally {
      setAiReviewBusy(false);
    }
  }

  async function loadIntakeRecommendations() {
    try {
      const data = await api.getIntakeRecommendations(caseId);

      setIntakeRecommendations({
        warnings: data.warnings || [],
        recommendations: data.recommendations || [],
      });
    } catch (err) {
      setError(err.message || "Failed to load intake recommendations");
    }
  }

  async function loadAuditTrail() {
    try {
      const data = await api.listCaseAudit(caseId);
      setAuditEvents(data.events || []);
    } catch (err) {
      setError(err.message || "Failed to load audit trail");
    }
  }

  async function loadClauseVersions(clauseId) {
    if (!clauseId) {
      setClauseVersions([]);
      return;
    }

    try {
      const data = await api.listClauseVersions(clauseId);
      setClauseVersions(data.versions || []);
    } catch (err) {
      setError(err.message || "Failed to load clause versions");
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
      const aiReviewRes = await api.getLatestAiAgreementReview(caseId);

      const loadedClauses = clauseRes.clauses || [];
      const loadedTemplates = templateRes.templates || [];

      setCaseDoc(caseRes.case);
      setIntakeDraft(normalizeIntakeForForm(caseRes.case?.intake));
      setIntakeMessage("");
      setClauses(loadedClauses);
      setStatusRows(statusRes.clauses || []);
      setTemplates(loadedTemplates);
      setMockReview(null);
      setAiReview(aiReviewRes.review || null);
      await loadExportCheck(caseRes.case);
      await loadIntakeRecommendations();
      await loadAuditTrail();

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
      loadClauseVersions(selectedClause._id);
    } else {
      setDraftContent("");
      setComments([]);
      setClauseVersions([]);
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

  async function onAddRecommendedClause(recommendation) {
    try {
      setError("");
      setRecommendationBusy(true);

      const data = await api.createClause(caseId, {
        title: recommendation.title,
        category: recommendation.category,
        contentCurrent: recommendation.contentCurrent,
      });

      const created = data.clause;

      setClauses((prev) =>
        [...prev, created].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      );

      const statusRes = await api.getClauseStatus(caseId);
      const nextCase = { ...(caseDoc || {}), status: statusRes.caseStatus };

      setStatusRows(statusRes.clauses || []);
      setCaseDoc(nextCase);
      setSelectedClauseId(created._id);
      setMockReview(null);

      await loadExportCheck(nextCase);
      await loadIntakeRecommendations();
      await loadAuditTrail();
      await loadClauseVersions(created._id);
    } catch (err) {
      setError(err.message || "Failed to add recommended clause");
    } finally {
      setRecommendationBusy(false);
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
      const nextClauses = [...clauses].concat(created).sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );

      setClauses(nextClauses);

      const statusRes = await api.getClauseStatus(caseId);
      const nextCase = { ...(caseDoc || {}), status: statusRes.caseStatus };

      setStatusRows(statusRes.clauses || []);
      setCaseDoc(nextCase);
      setMockReview(null);
      await loadExportCheck(nextCase);
      await loadIntakeRecommendations();
      await loadAuditTrail();
      await loadClauseVersions(created._id);

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
      setRewritePreview(null);

      const statusRes = await api.getClauseStatus(caseId);
      const nextCase = { ...(caseDoc || {}), status: statusRes.caseStatus };

      setStatusRows(statusRes.clauses || []);
      setCaseDoc(nextCase);
      setMockReview(null);
      await loadExportCheck(nextCase);
      await loadIntakeRecommendations();
      await loadAuditTrail();
      await loadClauseVersions(updated._id);
    } catch (err) {
      setError(err.message || "Failed to save clause");
    } finally {
      setBusy(false);
    }
  }

  async function onPreviewRewrite() {
    if (!selectedClause) return;
    try {
      setError("");
      setRewriteBusy(true);
      const data = await api.previewClauseRewrite(selectedClause._id, rewriteMode, draftContent);
      setRewritePreview(data);
    } catch (err) {
      setError(err.message || "Failed to generate clause rewrite");
    } finally {
      setRewriteBusy(false);
    }
  }

  function onUseRewrite() {
    if (!rewritePreview?.rewrittenContent) return;
    setDraftContent(rewritePreview.rewrittenContent);
    setRewritePreview(null);
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
      await loadAuditTrail();
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
      await loadAuditTrail();
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
      await loadAuditTrail();

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
    return (
      <div className="case-page">
        <div className="case-loading">Loading case...</div>
      </div>
    );
  }

  return (
    <div className="case-page">
      <section className="case-hero">
        <div className="case-hero-main">
          <Link to="/dashboard" className="case-back-link">
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>

          <div className="case-eyebrow">Agreement workspace</div>

          <h1 className="case-title">{caseDoc?.title || "Case"}</h1>

          <p className="case-subtitle">
            Review clauses, apply templates, negotiate edits, and move the agreement toward
            final export.
          </p>

          <div className="case-meta-grid">
            <div className="case-meta-card">
              <span className="case-meta-label">Status</span>
              <div className={`case-status-badge ${caseStatusClass(caseDoc?.status)}`}>
                {caseDoc?.status || "DRAFT"}
              </div>
            </div>

            <div className="case-meta-card">
              <span className="case-meta-label">Jurisdiction</span>
              <div className="case-meta-value">{caseDoc?.jurisdiction || "General"}</div>
            </div>

            <div className="case-meta-card">
              <span className="case-meta-label">Case ID</span>
              <code className="case-code">{caseId}</code>
            </div>

            {caseDoc?.inviteCode && (
              <div className="case-meta-card">
                <span className="case-meta-label">Invite</span>
                <div className="case-meta-value">
                  <code className="case-code-inline">{caseDoc.inviteCode}</code>
                  <span className="case-inline-note">
                    {caseDoc.inviteUsed ? "Used" : "Not used"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="case-hero-actions">
          <Link
            to={`/cases/${caseId}/final-review`}
            className="case-button case-button-secondary"
          >
            Open final review
          </Link>

          <button
            type="button"
            onClick={onRunAiReview}
            disabled={aiReviewBusy || reviewBusy || busy || clauses.length === 0}
            className="case-button case-button-primary"
          >
            {aiReviewBusy ? "Analyzing agreement..." : "Run AI agreement review"}
          </button>

          <button
            type="button"
            onClick={onRunMockReview}
            disabled={reviewBusy || aiReviewBusy || busy}
            className="case-button case-button-secondary"
          >
            {reviewBusy ? "Running review..." : "Run mock review"}
          </button>

        </div>
      </section>

      {error && <div className="case-alert case-alert-error">{error}</div>}

      <section className="case-panel case-intake-panel">
        <div className="case-panel-header case-intake-header">
          <div>
            <h2 className="case-panel-title">Guided case intake</h2>
            <p className="case-panel-subtitle">
              Capture the key case details needed for templates, AI clause suggestions,
              agreement review, and final signing readiness.
            </p>
          </div>

          <div className="case-intake-progress" aria-label="Guided intake completion">
            <span>{caseDoc?.intake?.completed ? "Complete" : "In progress"}</span>
            <strong>
              {intakeStats.completed}/{intakeStats.total} sections
            </strong>
          </div>
        </div>

        {intakeMessage && (
          <div className="case-alert case-alert-success case-alert-inline">
            {intakeMessage}
          </div>
        )}

        <form onSubmit={onSaveIntake} className="case-intake-form">
          {INTAKE_FIELDS.map((field) => (
            <label key={field.key} className="case-field">
              <span className="case-label">{field.label}</span>
              <textarea
                value={intakeDraft[field.key]}
                onChange={(e) => onIntakeChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="case-textarea"
              />
            </label>
          ))}

          <div className="case-intake-footer">
            <div className="case-help-note">
              Intake completion is based on all five sections being filled. Use “None” or
              “Not applicable” when a section does not apply.
            </div>

            <button
              type="submit"
              disabled={intakeSaving}
              className="case-button case-button-primary"
            >
              {intakeSaving ? "Saving intake..." : "Save guided intake"}
            </button>
          </div>
        </form>

        <div className="case-intake-recommendations">
          <h3 className="case-section-small-title">Intake recommendations</h3>

          {intakeRecommendations.warnings.length > 0 && (
            <div className="case-warning-list">
              {intakeRecommendations.warnings.map((warning) => (
                <div key={warning.id} className="case-warning-card">
                  <div className="case-warning-title">
                    {warning.title}
                    <span
                      className={`case-warning-severity case-warning-${warning.severity?.toLowerCase()}`}
                    >
                      {warning.severity}
                    </span>
                  </div>
                  <p>{warning.message}</p>
                </div>
              ))}
            </div>
          )}

          {intakeRecommendations.recommendations.length > 0 ? (
            <div className="case-recommendation-list">
              {intakeRecommendations.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="case-recommendation-card">
                  <div>
                    <div className="case-recommendation-title">
                      {recommendation.title}
                    </div>
                    <div className="case-recommendation-category">
                      {recommendation.category}
                    </div>
                    <p className="case-recommendation-reason">
                      {recommendation.reason}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={recommendationBusy}
                    onClick={() => onAddRecommendedClause(recommendation)}
                    className="case-button case-button-secondary"
                  >
                    Add suggested clause
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="case-empty-card case-empty-card-tight">
              No missing intake-based clauses detected.
            </div>
          )}
        </div>
      </section>

      <section className="case-review-grid">
        {caseDoc?.status === "READY" && exportCheck && (
          <div className="case-review-card case-review-card-warning">
            <div className="case-review-header">
              <h2 className="case-review-title">Drafting completeness review</h2>
            </div>

            <p className="case-review-copy">{exportCheck.disclaimer}</p>

            {exportCheck.warnings?.length === 0 ? (
              <div className="case-review-ok">No major missing sections were detected.</div>
            ) : (
              <div className="case-review-block">
                <div className="case-review-label">Warnings</div>
                <ul className="case-list">
                  {exportCheck.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="case-review-card case-review-card-ai">
          <div className="case-review-header">
            <h2 className="case-review-title">AI agreement review</h2>
            {aiReview?.readiness && (
              <span className={`case-ai-readiness case-ai-readiness--${aiReview.readiness.toLowerCase()}`}>
                {aiReview.readiness.replaceAll("_", " ")}
              </span>
            )}
          </div>

          {!aiReview ? (
            <p className="case-review-copy">
              Analyze the guided intake and all current clauses for drafting gaps,
              conflicts, ambiguity, and incomplete details.
            </p>
          ) : (
            <div className="case-review-stack">
              <div className="case-summary-box">
                <span className="case-review-label">AI summary</span>
                <div>{aiReview.summary}</div>
              </div>

              <p className="case-review-copy">{aiReview.disclaimer}</p>

              <div className="case-review-block">
                <div className="case-review-label">Issues</div>
                {aiReview.issues?.length ? (
                  <div className="case-issue-list">
                    {aiReview.issues.map((issue, index) => (
                      <div key={`${issue.category}-${index}`} className="case-issue-card">
                        <div className="case-issue-title">
                          {issue.category}
                          <span className="case-issue-severity">{issue.severity}</span>
                        </div>
                        {issue.clauseTitle && (
                          <div className="case-ai-clause-name">Clause: {issue.clauseTitle}</div>
                        )}
                        <div className="case-issue-message">{issue.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="case-review-ok">No obvious drafting issues returned.</div>
                )}
              </div>

              <div className="case-review-block">
                <div className="case-review-label">Recommendations</div>
                {aiReview.recommendations?.length ? (
                  <div className="case-issue-list">
                    {aiReview.recommendations.map((recommendation, index) => (
                      <div key={`${recommendation.action}-${index}`} className="case-issue-card">
                        <div className="case-issue-title">
                          {recommendation.action}
                          <span className="case-issue-severity">{recommendation.priority}</span>
                        </div>
                        <div className="case-issue-message">{recommendation.reason}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="case-muted">No recommendations returned.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="case-review-card case-review-card-neutral">
          <div className="case-review-header">
            <h2 className="case-review-title">Mock legal review</h2>
          </div>

          {!mockReview ? (
            <p className="case-review-copy">
              Run a simulated legal review to generate demo feedback about missing terms,
              fairness concerns, and clause quality.
            </p>
          ) : (
            <div className="case-review-stack">
              <div className="case-summary-box">
                <span className="case-review-label">Summary</span>
                <div>{mockReview.summary}</div>
              </div>

              <p className="case-review-copy">{mockReview.disclaimer}</p>

              <div className="case-review-block">
                <div className="case-review-label">Issues</div>
                {mockReview.issues?.length ? (
                  <div className="case-issue-list">
                    {mockReview.issues.map((issue, index) => (
                      <div key={`${issue.title}-${index}`} className="case-issue-card">
                        <div className="case-issue-title">
                          {issue.title}
                          <span className="case-issue-severity">{issue.severity}</span>
                        </div>
                        <div className="case-issue-message">{issue.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="case-muted">No issues returned.</div>
                )}
              </div>

              <div className="case-review-block">
                <div className="case-review-label">Suggestions</div>
                {mockReview.suggestions?.length ? (
                  <ul className="case-list">
                    {mockReview.suggestions.map((suggestion, index) => (
                      <li key={`${suggestion}-${index}`}>{suggestion}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="case-muted">No suggestions returned.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="case-activity-grid">
        <div className="case-panel case-activity-panel">
          <div className="case-panel-header">
            <div>
              <h2 className="case-panel-title">Activity and notifications</h2>
              <p className="case-panel-subtitle">
                Track major case events, clause edits, approvals, rejections, and comments.
              </p>
            </div>
          </div>

          {auditEvents.length === 0 ? (
            <div className="case-empty-card case-empty-card-tight">No activity recorded yet.</div>
          ) : (
            <div className="case-activity-list">
              {auditEvents.slice(0, 8).map((event) => (
                <div key={event._id} className="case-activity-card">
                  <div className="case-activity-top">
                    <strong>{event.title}</strong>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="case-activity-message">{event.message}</div>
                  <div className="case-activity-meta">
                    {actorDisplay(event.userId)} · {event.type.replaceAll("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="case-workspace">
        <aside className="case-panel case-panel-left">
          <div className="case-panel-header">
            <div>
              <h2 className="case-panel-title">Clauses</h2>
              <p className="case-panel-subtitle">
                Create a custom clause or generate a draft from a jurisdiction template.
              </p>
            </div>
          </div>

          <form onSubmit={onCreateClause} className="case-form">
            <label className="case-field">
              <span className="case-label">Template</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => onSelectTemplate(e.target.value)}
                className="case-select"
              >
                <option value="">Custom Clause</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.jurisdiction})
                  </option>
                ))}
              </select>
            </label>

            <label className="case-field">
              <span className="case-label">Clause title</span>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New clause title"
                className="case-input"
              />
            </label>

            <label className="case-field">
              <span className="case-label">Category</span>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category"
                className="case-input"
              />
            </label>

            {templateDetails && (
              <div className="case-template-box">
                <div className="case-template-head">
                  <div className="case-template-title">{templateDetails.title}</div>
                  <span className="case-template-chip">
                    {templateDetails.jurisdiction || "General"}
                  </span>
                </div>

                <div className="case-template-description">{templateDetails.description}</div>

                <div className="case-template-meta-grid">
                  <div className="case-template-meta-item">
                    <span className="case-template-meta-label">Review status</span>
                    <span>{templateDetails.reviewStatus || "UNKNOWN"}</span>
                  </div>
                  <div className="case-template-meta-item">
                    <span className="case-template-meta-label">Reviewed by</span>
                    <span>{templateDetails.reviewedBy || "Not specified"}</span>
                  </div>
                  <div className="case-template-meta-item">
                    <span className="case-template-meta-label">Reviewed on</span>
                    <span>{templateDetails.reviewedOn || "Not yet reviewed"}</span>
                  </div>
                </div>

                <div className="case-template-disclaimer">{templateDetails.disclaimer}</div>

                {(templateDetails.placeholders || []).map((field) => (
                  <label key={field.key} className="case-field">
                    <span className="case-label">
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>

                    {field.type === "textarea" ? (
                      <textarea
                        value={templateValues[field.key] || ""}
                        onChange={(e) => onTemplateValueChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ""}
                        rows={4}
                        className="case-textarea"
                      />
                    ) : (
                      <input
                        value={templateValues[field.key] || ""}
                        onChange={(e) => onTemplateValueChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ""}
                        className="case-input"
                      />
                    )}
                  </label>
                ))}

                <button
                  type="button"
                  onClick={onGenerateFromTemplate}
                  disabled={busy}
                  className="case-button case-button-secondary case-button-full"
                >
                  Generate draft from template
                </button>
              </div>
            )}

            <button
              disabled={busy || !newTitle.trim()}
              className="case-button case-button-primary case-button-full"
            >
              Add clause
            </button>
          </form>

          <div className="case-clause-list">
            {clauses.length === 0 ? (
              <div className="case-empty-card">No clauses yet.</div>
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
                      type="button"
                      onClick={() => setSelectedClauseId(c._id)}
                      className={`case-clause-card ${isSelected ? "case-clause-card-selected" : ""}`}
                    >
                      <div className="case-clause-top">
                        <div>
                          <div className="case-clause-title">{c.title}</div>
                          <div className="case-clause-category">{c.category}</div>
                        </div>

                        <span
                          className={`case-clause-state case-clause-state--${clauseOverallTone(
                            s
                          )}`}
                        >
                          {clauseOverallLabel(s)}
                        </span>
                      </div>

                      {c.templateTitle && (
                        <div className="case-clause-template">
                          Template: <strong>{c.templateTitle}</strong>
                        </div>
                      )}

                      <div className="case-clause-review-row">
                        <span
                          className={`case-review-chip case-review-chip--${reviewTone(
                            c.templateReviewStatus
                          )}`}
                        >
                          Template: {reviewLabel(c.templateReviewStatus)}
                        </span>

                        <span
                          className={`case-review-chip case-review-chip--${reviewTone(
                            c.adminReviewStatus
                          )}`}
                        >
                          Moderator: {reviewLabel(c.adminReviewStatus)}
                        </span>
                      </div>

                      {s && (
                        <div className="case-clause-actors">
                          <span>Party A: {actorMark(partyAApproved, partyARejected)}</span>
                          <span>Party B: {actorMark(partyBApproved, partyBRejected)}</span>
                        </div>
                      )}
                    </button>
                  );
                })
            )}
          </div>
        </aside>

        <main className="case-panel case-panel-editor">
          <div className="case-panel-header">
            <div>
              <h2 className="case-panel-title">Editor</h2>
              <p className="case-panel-subtitle">
                Review the selected clause, revise its wording, and record approval decisions.
              </p>
            </div>
          </div>

          {!selectedClause ? (
            <div className="case-empty-card">Select a clause to edit.</div>
          ) : (
            <>
              <div className="case-editor-summary">
                <div className="case-editor-summary-main">
                  <div className="case-editor-label">Editing clause</div>
                  <div className="case-editor-title">{selectedClause.title}</div>
                </div>

                <span
                  className={`case-clause-state case-clause-state--${clauseOverallTone(
                    statusForClause(selectedClause._id)
                  )}`}
                >
                  {clauseOverallLabel(statusForClause(selectedClause._id))}
                </span>
              </div>

              <div className="case-review-panel">
                {selectedClause.templateId && (
                  <details className="case-review-dropdown">
                    <summary className="case-review-dropdown-summary">
                      <span className="case-review-dropdown-title">Template source review</span>
                      <span
                        className={`case-review-chip case-review-chip--${reviewTone(
                          selectedClause.templateReviewStatus
                        )}`}
                      >
                        {reviewLabel(selectedClause.templateReviewStatus)}
                      </span>
                    </summary>

                    <div className="case-review-dropdown-body">
                      <div className="case-template-meta-grid">
                        <div className="case-template-meta-item">
                          <span className="case-template-meta-label">Template</span>
                          <span>{selectedClause.templateTitle || "Unknown template"}</span>
                        </div>
                        <div className="case-template-meta-item">
                          <span className="case-template-meta-label">Jurisdiction</span>
                          <span>{selectedClause.templateJurisdiction || "Unknown"}</span>
                        </div>
                        <div className="case-template-meta-item">
                          <span className="case-template-meta-label">Reviewed by</span>
                          <span>{reviewPerson(selectedClause.templateReviewedBy)}</span>
                        </div>
                        <div className="case-template-meta-item">
                          <span className="case-template-meta-label">Reviewed on</span>
                          <span>
                            {selectedClause.templateReviewedOn
                              ? new Date(selectedClause.templateReviewedOn).toLocaleString()
                              : "Not reviewed"}
                          </span>
                        </div>
                      </div>

                      <div className="case-template-disclaimer">
                        {selectedClause.templateDisclaimer || "No template review note."}
                      </div>
                    </div>
                  </details>
                )}

                <details className="case-review-dropdown">
                  <summary className="case-review-dropdown-summary">
                    <span className="case-review-dropdown-title">Legal moderator review</span>
                    <span
                      className={`case-review-chip case-review-chip--${reviewTone(
                        selectedClause.adminReviewStatus
                      )}`}
                    >
                      {reviewLabel(selectedClause.adminReviewStatus)}
                    </span>
                  </summary>

                  <div className="case-review-dropdown-body">
                    <div className="case-template-meta-grid">
                      <div className="case-template-meta-item">
                        <span className="case-template-meta-label">Reviewed by</span>
                        <span>{reviewPerson(selectedClause.adminReviewedBy)}</span>
                      </div>
                      <div className="case-template-meta-item">
                        <span className="case-template-meta-label">Reviewed on</span>
                        <span>
                          {selectedClause.adminReviewedAt
                            ? new Date(selectedClause.adminReviewedAt).toLocaleString()
                            : "Not reviewed"}
                        </span>
                      </div>
                    </div>

                    <div className="case-template-disclaimer">
                      {selectedClause.adminReviewNote || "No moderator note yet."}
                    </div>
                  </div>
                </details>
              </div>

              <details className="case-review-dropdown case-version-history">
                <summary className="case-review-dropdown-summary">
                  <span className="case-review-dropdown-title">Clause version history</span>
                  <span className="case-review-chip case-review-chip--default">
                    {clauseVersions.length} versions
                  </span>
                </summary>

                <div className="case-review-dropdown-body">
                  {clauseVersions.length === 0 ? (
                    <div className="case-muted">No edits have been saved for this clause yet.</div>
                  ) : (
                    <div className="case-version-list">
                      {clauseVersions.map((version) => (
                        <div key={version._id} className="case-version-card">
                          <div className="case-version-header">
                            <strong>Version {version.versionNumber}</strong>
                            <span>{new Date(version.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="case-version-meta">
                            Edited by {actorDisplay(version.editedBy)} · approvals reset
                          </div>
                          <div className="case-version-diff">
                            <div>
                              <span className="case-version-label">Previous</span>
                              <p>{version.previousContent || "No previous content."}</p>
                            </div>
                            <div>
                              <span className="case-version-label">Updated</span>
                              <p>{version.newContent || "No updated content."}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>

              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="case-textarea case-editor-textarea"
                placeholder="Write the clause text here..."
              />

              <section className="case-rewrite-box" aria-labelledby="rewrite-heading">
                <div>
                  <h3 id="rewrite-heading" className="case-section-small-title">AI clause rewrite</h3>
                  <p className="case-panel-subtitle">
                    Generate a drafting preview without changing the saved clause.
                  </p>
                </div>
                <div className="case-rewrite-controls">
                  <label className="case-field">
                    <span className="case-label">Rewrite style</span>
                    <select className="case-select" value={rewriteMode}
                      onChange={(e) => { setRewriteMode(e.target.value); setRewritePreview(null); }}>
                      <option value="CLEAR">Clearer language</option>
                      <option value="CONCISE">More concise</option>
                      <option value="FORMAL">More formal</option>
                    </select>
                  </label>
                  <button type="button" className="case-button case-button-secondary"
                    onClick={onPreviewRewrite} disabled={rewriteBusy || busy || !draftContent.trim()}>
                    {rewriteBusy ? "Generating..." : "Generate rewrite"}
                  </button>
                </div>
                {rewritePreview && (
                  <div className="case-rewrite-preview" aria-live="polite">
                    <div className="case-review-label">Suggested rewrite</div>
                    <p>{rewritePreview.rewrittenContent}</p>
                    <div className="case-help-note">{rewritePreview.disclaimer}</div>
                    <div className="case-editor-actions">
                      <button type="button" className="case-button case-button-primary" onClick={onUseRewrite}>Use this draft</button>
                      <button type="button" className="case-button case-button-secondary" onClick={() => setRewritePreview(null)}>Discard</button>
                    </div>
                  </div>
                )}
              </section>

              <div className="case-editor-actions">
                <button
                  type="button"
                  onClick={onSaveClause}
                  disabled={busy}
                  className="case-button case-button-secondary"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={busy}
                  className="case-button case-button-primary"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={openRejectModal}
                  disabled={busy}
                  className="case-button case-button-danger"
                >
                  Reject
                </button>
              </div>

              <div className="case-help-note">
                Rejecting a clause requires a written reason.
              </div>
            </>
          )}
        </main>

        <aside className="case-panel case-panel-comments">
          <div className="case-panel-header">
            <div>
              <h2 className="case-panel-title">Comments</h2>
              <p className="case-panel-subtitle">
                Track feedback and discussion for the selected clause.
              </p>
            </div>
          </div>

          {!selectedClause ? (
            <div className="case-empty-card">Select a clause to view comments.</div>
          ) : (
            <>
              <div className="case-comments-list">
                {comments.length === 0 ? (
                  <div className="case-empty-card case-empty-card-tight">No comments yet.</div>
                ) : (
                  comments.map((c) => (
                    <div key={c._id} className="case-comment-card">
                      <div className="case-comment-top">
                        <div className="case-comment-user">
                          {typeof c.userId === "object"
                            ? c.userId.email || c.userId.name || "User"
                            : c.userId}
                        </div>
                        <div className="case-comment-time">
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="case-comment-message">{c.message}</div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={onAddComment} className="case-comment-form">
                <label className="case-field">
                  <span className="case-label">Add comment</span>
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="case-input"
                  />
                </label>

                <button
                  disabled={busy || !commentText.trim()}
                  className="case-button case-button-secondary case-button-full"
                >
                  Add comment
                </button>
              </form>
            </>
          )}
        </aside>
      </section>

      {rejectModalOpen && (
        <div onClick={closeRejectModal} className="case-modal-backdrop">
          <div onClick={(e) => e.stopPropagation()} className="case-modal-card">
            <h3 className="case-modal-title">Reject clause</h3>
            <p className="case-modal-copy">
              Enter the reason for rejecting this clause. This feedback will be saved as part
              of the clause discussion.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={5}
              placeholder="Explain what needs to change..."
              className="case-textarea"
            />

            <div className="case-modal-actions">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={busy}
                className="case-button case-button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRejectConfirm}
                disabled={busy}
                className="case-button case-button-danger"
              >
                {busy ? "Submitting..." : "Submit rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
