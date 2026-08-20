const Case = require("../models/Case");
const Clause = require("../models/Clause");
const ClauseAction = require("../models/ClauseAction");
const Comment = require("../models/Comment");

const CASE_STATUSES = [
  "DRAFT",
  "NEGOTIATING",
  "REVIEW",
  "REVISION",
  "APPROVAL",
  "READY",
  "FINALIZED",
  "EXPORTED",
];

function percentage(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function buildAdminAnalytics({ cases = [], clauses = [], actions = [], commentCount = 0 }) {
  const statusCounts = Object.fromEntries(CASE_STATUSES.map((status) => [status, 0]));
  const caseById = new Map();

  for (const caseDoc of cases) {
    const status = caseDoc.status || "DRAFT";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    caseById.set(String(caseDoc._id), caseDoc);
  }

  const latestActions = new Map();
  for (const action of actions) {
    const key = `${action.clauseId}:${action.userId}`;
    if (!latestActions.has(key)) latestActions.set(key, action.action);
  }

  let approvedClauses = 0;
  let rejectedClauses = 0;
  let pendingClauses = 0;
  let moderatorReviewed = 0;
  let moderatorNeedsRevision = 0;
  let moderatorPending = 0;
  const unresolvedCategories = new Map();

  for (const clause of clauses) {
    const caseDoc = caseById.get(String(clause.caseId));
    const participants = caseDoc?.participants || [];
    const partyA = participants.find((participant) => participant.role === "PARTY_A");
    const partyB = participants.find((participant) => participant.role === "PARTY_B");
    const partyAAction = partyA
      ? latestActions.get(`${clause._id}:${partyA.userId}`)
      : undefined;
    const partyBAction = partyB
      ? latestActions.get(`${clause._id}:${partyB.userId}`)
      : undefined;

    const rejected = partyAAction === "REJECT" || partyBAction === "REJECT";
    const approved = partyAAction === "APPROVE" && partyBAction === "APPROVE";

    if (rejected) rejectedClauses += 1;
    else if (approved) approvedClauses += 1;
    else pendingClauses += 1;

    if (clause.adminReviewStatus === "REVIEWED") moderatorReviewed += 1;
    else if (clause.adminReviewStatus === "NEEDS_REVISION") moderatorNeedsRevision += 1;
    else moderatorPending += 1;

    if (!approved || clause.adminReviewStatus !== "REVIEWED") {
      const category = String(clause.category || "General").trim() || "General";
      unresolvedCategories.set(category, (unresolvedCategories.get(category) || 0) + 1);
    }
  }

  const categoryIssues = [...unresolvedCategories.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const totalClauses = clauses.length;
  const joinedCases = cases.filter((caseDoc) =>
    (caseDoc.participants || []).some((participant) => participant.role === "PARTY_B")
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    cases: {
      total: cases.length,
      statusCounts,
      finalized: (statusCounts.FINALIZED || 0) + (statusCounts.EXPORTED || 0),
      bothPartiesJoined: joinedCases,
      partyJoinRate: percentage(joinedCases, cases.length),
    },
    clauses: {
      total: totalClauses,
      approved: approvedClauses,
      rejected: rejectedClauses,
      pending: pendingClauses,
      approvalRate: percentage(approvedClauses, totalClauses),
    },
    moderator: {
      reviewed: moderatorReviewed,
      needsRevision: moderatorNeedsRevision,
      pending: moderatorPending,
      reviewRate: percentage(moderatorReviewed, totalClauses),
    },
    unresolved: {
      total: rejectedClauses + pendingClauses + moderatorNeedsRevision + moderatorPending,
      rejectedClauses,
      pendingApprovals: pendingClauses,
      moderatorRevisions: moderatorNeedsRevision,
      moderatorPending,
      commonCategories: categoryIssues,
    },
    activity: {
      comments: commentCount,
    },
  };
}

async function loadAdminAnalytics() {
  const [cases, clauses, actions, commentCount] = await Promise.all([
    Case.find({}).select("status participants").lean(),
    Clause.find({}).select("caseId category adminReviewStatus").lean(),
    ClauseAction.find({}).sort({ createdAt: -1 }).lean(),
    Comment.countDocuments({}),
  ]);

  return buildAdminAnalytics({ cases, clauses, actions, commentCount });
}

module.exports = { buildAdminAnalytics, loadAdminAnalytics };
