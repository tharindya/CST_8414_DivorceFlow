const Case = require("../models/Case");
const Clause = require("../models/Clause");
const ClauseAction = require("../models/ClauseAction");
const AiAgreementReview = require("../models/AiAgreementReview");
const { buildExportCheck } = require("./exportCheck.service");

function latestActionsByClauseAndUser(actions = []) {
  const latest = new Map();

  for (const action of actions) {
    const key = `${action.clauseId}:${action.userId}`;
    if (!latest.has(key)) latest.set(key, action.action);
  }

  return latest;
}

function isAiReviewCurrent(caseDoc, clauses, latestAiReview) {
  if (!latestAiReview?.createdAt) return false;

  const latestClauseChange = clauses.reduce((latest, clause) => {
    const timestamp = clause.updatedAt ? new Date(clause.updatedAt).getTime() : 0;
    return Math.max(latest, timestamp);
  }, 0);
  const intakeChange = caseDoc?.intake?.completedAt
    ? new Date(caseDoc.intake.completedAt).getTime()
    : 0;

  return new Date(latestAiReview.createdAt).getTime() >= Math.max(
    latestClauseChange,
    intakeChange
  );
}

function deriveWorkflowStatus({ caseDoc, clauses = [], actions = [], latestAiReview = null }) {
  if (["FINALIZED", "EXPORTED"].includes(caseDoc?.status)) return caseDoc.status;

  const participants = caseDoc?.participants || [];
  const participantRoles = new Set(participants.map((participant) => participant.role));
  const hasBothParties =
    participantRoles.has("PARTY_A") && participantRoles.has("PARTY_B");

  if (!hasBothParties || clauses.length === 0) return "DRAFT";

  const latestActions = latestActionsByClauseAndUser(actions);
  const hasReviewActivity = latestActions.size > 0;
  const hasPartyRejection = clauses.some((clause) =>
    participants.some(
      (participant) =>
        latestActions.get(`${clause._id}:${participant.userId}`) === "REJECT"
    )
  );
  const hasModeratorRevision = clauses.some(
    (clause) => clause.adminReviewStatus === "NEEDS_REVISION"
  );

  if (hasPartyRejection || hasModeratorRevision) return "REVISION";

  const everyClauseApproved = clauses.every((clause) =>
    participants.every(
      (participant) =>
        latestActions.get(`${clause._id}:${participant.userId}`) === "APPROVE"
    )
  );

  if (!everyClauseApproved) return hasReviewActivity ? "REVIEW" : "NEGOTIATING";

  const moderatorReviewComplete = clauses.every(
    (clause) => clause.adminReviewStatus === "REVIEWED"
  );
  const intakeComplete = Boolean(caseDoc?.intake?.completed);
  const completenessOk = buildExportCheck(caseDoc, clauses).completenessOk;
  const aiReviewCurrent = isAiReviewCurrent(caseDoc, clauses, latestAiReview);

  if (
    !moderatorReviewComplete ||
    !intakeComplete ||
    !completenessOk ||
    !aiReviewCurrent
  ) {
    return "APPROVAL";
  }

  return "READY";
}

async function recomputeCaseStatus(caseId) {
  const caseDoc = await Case.findById(caseId).select(
    "participants status intake"
  );
  if (!caseDoc || ["FINALIZED", "EXPORTED"].includes(caseDoc.status)) return;

  const [clauses, actions, latestAiReview] = await Promise.all([
    Clause.find({ caseId }).sort({ orderIndex: 1, createdAt: 1 }).lean(),
    ClauseAction.find({ caseId }).sort({ createdAt: -1 }).lean(),
    AiAgreementReview.findOne({ caseId }).sort({ createdAt: -1 }).lean(),
  ]);

  const nextStatus = deriveWorkflowStatus({
    caseDoc,
    clauses,
    actions,
    latestAiReview,
  });

  if (caseDoc.status !== nextStatus) {
    caseDoc.status = nextStatus;
    await caseDoc.save();
  }
}

module.exports = {
  deriveWorkflowStatus,
  isAiReviewCurrent,
  recomputeCaseStatus,
};
