const Case = require("../models/Case");
const Clause = require("../models/Clause");
const ClauseAction = require("../models/ClauseAction");
const AuditLog = require("../models/AuditLog");
const { buildExportCheck } = require("./exportCheck.service");

function buildFinalReview({ caseDoc, clauses, actions, exportCheck, latestAiReview }) {
  const participants = caseDoc?.participants || [];
  const participantRoles = new Set(participants.map((participant) => participant.role));
  const latestByClauseAndUser = new Map();

  for (const action of actions || []) {
    const key = `${action.clauseId}:${action.userId}`;
    if (!latestByClauseAndUser.has(key)) latestByClauseAndUser.set(key, action.action);
  }

  const clauseRows = (clauses || []).map((clause) => {
    const approval = {};
    const rejection = {};

    for (const participant of participants) {
      const action = latestByClauseAndUser.get(`${clause._id}:${participant.userId}`);
      approval[participant.role] = action === "APPROVE";
      rejection[participant.role] = action === "REJECT";
    }

    const rejected = Object.values(rejection).some(Boolean);
    const approvedByBoth =
      participantRoles.has("PARTY_A") &&
      participantRoles.has("PARTY_B") &&
      approval.PARTY_A === true &&
      approval.PARTY_B === true;

    return {
      clauseId: clause._id,
      title: clause.title,
      category: clause.category || "General",
      partyAStatus: rejection.PARTY_A ? "REJECTED" : approval.PARTY_A ? "APPROVED" : "PENDING",
      partyBStatus: rejection.PARTY_B ? "REJECTED" : approval.PARTY_B ? "APPROVED" : "PENDING",
      overallStatus: rejected ? "REJECTED" : approvedByBoth ? "APPROVED" : "PENDING",
      moderatorStatus: clause.adminReviewStatus || "NOT_REVIEWED",
      updatedAt: clause.updatedAt || null,
    };
  });

  const approvedCount = clauseRows.filter((row) => row.overallStatus === "APPROVED").length;
  const rejectedCount = clauseRows.filter((row) => row.overallStatus === "REJECTED").length;
  const pendingCount = clauseRows.filter((row) => row.overallStatus === "PENDING").length;
  const moderatorReviewedCount = clauseRows.filter(
    (row) => row.moderatorStatus === "REVIEWED"
  ).length;
  const moderatorRevisionCount = clauseRows.filter(
    (row) => row.moderatorStatus === "NEEDS_REVISION"
  ).length;

  const latestClauseChange = (clauses || []).reduce((latest, clause) => {
    const timestamp = clause.updatedAt ? new Date(clause.updatedAt).getTime() : 0;
    return Math.max(latest, timestamp);
  }, 0);
  const intakeChange = caseDoc?.intake?.completedAt
    ? new Date(caseDoc.intake.completedAt).getTime()
    : 0;
  const latestDraftChange = Math.max(latestClauseChange, intakeChange);
  const aiReviewTime = latestAiReview?.createdAt
    ? new Date(latestAiReview.createdAt).getTime()
    : 0;
  const aiReviewCurrent = Boolean(latestAiReview && aiReviewTime >= latestDraftChange);

  const blockers = [];
  const addBlocker = (code, title, message) => blockers.push({ code, title, message });

  if (!participantRoles.has("PARTY_A") || !participantRoles.has("PARTY_B")) {
    addBlocker("PARTIES", "Both parties must join", "Party A and Party B must both participate before final review.");
  }
  if (!caseDoc?.intake?.completed) {
    addBlocker("INTAKE", "Guided intake is incomplete", "Complete all guided intake sections.");
  }
  if (!clauseRows.length) {
    addBlocker("CLAUSES", "No clauses exist", "Add agreement clauses before final review.");
  }
  if (rejectedCount) {
    addBlocker("REJECTIONS", "Rejected clauses remain", `${rejectedCount} clause(s) require revision.`);
  }
  if (pendingCount) {
    addBlocker("APPROVALS", "Party approvals are incomplete", `${pendingCount} clause(s) are still pending approval.`);
  }
  if (moderatorRevisionCount) {
    addBlocker("MODERATOR_REVISION", "Moderator revisions remain", `${moderatorRevisionCount} clause(s) require moderator-requested revisions.`);
  }
  if (clauseRows.length && moderatorReviewedCount < clauseRows.length) {
    addBlocker("MODERATOR_REVIEW", "Moderator review is incomplete", `${clauseRows.length - moderatorReviewedCount} clause(s) are not marked reviewed.`);
  }
  if (!exportCheck?.completenessOk) {
    addBlocker(
      "COMPLETENESS",
      "Drafting completeness check failed",
      (exportCheck?.missingCategories || []).length
        ? `Missing: ${exportCheck.missingCategories.join(", ")}.`
        : "Resolve the drafting completeness warnings."
    );
  }
  if (!latestAiReview) {
    addBlocker("AI_REVIEW", "AI agreement review has not been run", "Run the AI agreement review after completing the draft.");
  } else if (!aiReviewCurrent) {
    addBlocker("AI_REVIEW_STALE", "AI agreement review is outdated", "Run the AI agreement review again after the latest drafting changes.");
  } else if (latestAiReview.metadata?.readiness !== "READY_FOR_HUMAN_REVIEW") {
    addBlocker(
      "AI_REVIEW_RESULT",
      "AI review found drafting issues",
      `Latest result: ${latestAiReview.metadata?.readiness || "UNKNOWN"}; ${latestAiReview.metadata?.issueCount || 0} issue(s).`
    );
  }

  const readyForSigning = blockers.length === 0;

  return {
    case: {
      id: caseDoc?._id,
      title: caseDoc?.title || "Agreement",
      jurisdiction: caseDoc?.jurisdiction || "General",
      workflowStatus: caseDoc?.status || "DRAFT",
    },
    readiness: readyForSigning ? "READY_FOR_SIGNING" : "NOT_READY",
    readyForSigning,
    canExport: readyForSigning && caseDoc?.status === "READY",
    summary: {
      partyCount: participants.length,
      intakeComplete: Boolean(caseDoc?.intake?.completed),
      clauseCount: clauseRows.length,
      approvedCount,
      pendingCount,
      rejectedCount,
      moderatorReviewedCount,
    },
    blockers,
    clauses: clauseRows,
    completeness: exportCheck,
    latestAiReview: latestAiReview
      ? {
          readiness: latestAiReview.metadata?.readiness || "UNKNOWN",
          issueCount: latestAiReview.metadata?.issueCount || 0,
          provider: latestAiReview.metadata?.provider || "AI",
          model: latestAiReview.metadata?.model || null,
          createdAt: latestAiReview.createdAt,
          current: aiReviewCurrent,
        }
      : null,
    disclaimer:
      "Signing readiness confirms completion of the DivorceFlow workflow only. It does not determine legal validity or replace independent legal advice.",
  };
}

async function loadFinalReview(caseId) {
  const caseDoc = await Case.findById(caseId).lean();
  if (!caseDoc) return null;

  const [clauses, actions, latestAiReview] = await Promise.all([
    Clause.find({ caseId }).sort({ orderIndex: 1, createdAt: 1 }).lean(),
    ClauseAction.find({ caseId }).sort({ createdAt: -1 }).lean(),
    AuditLog.findOne({ caseId, type: "AI_AGREEMENT_REVIEW" }).sort({ createdAt: -1 }).lean(),
  ]);

  return buildFinalReview({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
    exportCheck: buildExportCheck(caseDoc, clauses),
  });
}

module.exports = { buildFinalReview, loadFinalReview };
