const Case = require("../models/Case");
const Clause = require("../models/Clause");
const Comment = require("../models/Comment");
const ClauseAction = require("../models/ClauseAction");
const TemplateReview = require("../models/TemplateReview");
const { clauseTemplates } = require("../data/clauseTemplates");
const { loadAdminAnalytics } = require("../services/adminAnalytics.service");

async function getAdminAnalytics(req, res, next) {
  try {
    res.json(await loadAdminAnalytics());
  } catch (err) {
    next(err);
  }
}

async function listAllCases(req, res, next) {
  try {
    const cases = await Case.find({})
      .populate("participants.userId", "name email")
      .sort({ updatedAt: -1 });

    const summaries = await Promise.all(
      cases.map(async (doc) => {
        const clauseCount = await Clause.countDocuments({ caseId: doc._id });
        const commentCount = await Comment.countDocuments({ caseId: doc._id });

        const partyA = doc.participants.find((p) => p.role === "PARTY_A");
        const partyB = doc.participants.find((p) => p.role === "PARTY_B");

        return {
          _id: doc._id,
          title: doc.title,
          status: doc.status,
          jurisdiction: doc.jurisdiction,
          inviteUsed: doc.inviteUsed,
          invitationStatus: doc.invitationStatus,
          partyA: partyA?.userId
            ? {
                id: partyA.userId._id,
                name: partyA.userId.name,
                email: partyA.userId.email,
              }
            : null,
          partyB: partyB?.userId
            ? {
                id: partyB.userId._id,
                name: partyB.userId.name,
                email: partyB.userId.email,
              }
            : null,
          partyBEmail: doc.partyBEmail || null,
          clauseCount,
          commentCount,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      })
    );

    res.json({ cases: summaries });
  } catch (err) {
    next(err);
  }
}

async function getAdminCaseById(req, res, next) {
  try {
    const { caseId } = req.params;

    const caseDoc = await Case.findById(caseId).populate("participants.userId", "name email");
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    const clauses = await Clause.find({ caseId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .populate("updatedBy", "name email")
      .populate("adminReviewedBy", "name email");

    const comments = await Comment.find({ caseId })
      .sort({ createdAt: 1 })
      .populate("userId", "name email");

    const actions = await ClauseAction.find({ caseId }).sort({ createdAt: -1 });

    const clauseStatus = clauses.map((clause) => {
      const clauseActions = actions.filter(
        (a) => a.clauseId.toString() === clause._id.toString()
      );

      const latestByUser = new Map();
      for (const action of clauseActions) {
        const userId = action.userId.toString();
        if (!latestByUser.has(userId)) {
          latestByUser.set(userId, action.action);
        }
      }

      const summary = {
        clauseId: clause._id,
        title: clause.title,
        approvedBy: {},
        rejectedBy: {},
        isApprovedByBoth: false,
        overallState: "PENDING",
      };

      for (const participant of caseDoc.participants) {
        const userId = participant.userId?._id?.toString() || participant.userId?.toString();
        const latestAction = latestByUser.get(userId);

        summary.approvedBy[participant.role] = latestAction === "APPROVE";
        summary.rejectedBy[participant.role] = latestAction === "REJECT";
      }

      summary.isApprovedByBoth =
        Object.values(summary.approvedBy).length === 2 &&
        Object.values(summary.approvedBy).every((v) => v === true);

      const anyRejected = Object.values(summary.rejectedBy).some((v) => v === true);

      if (anyRejected) {
        summary.overallState = "REJECTED";
      } else if (summary.isApprovedByBoth) {
        summary.overallState = "APPROVED";
      } else {
        summary.overallState = "PENDING";
      }

      return summary;
    });

    res.json({
      case: {
        _id: caseDoc._id,
        title: caseDoc.title,
        status: caseDoc.status,
        jurisdiction: caseDoc.jurisdiction,
        inviteCode: caseDoc.inviteCode,
        inviteUsed: caseDoc.inviteUsed,
        invitationStatus: caseDoc.invitationStatus,
        partyBEmail: caseDoc.partyBEmail || null,
        participants: caseDoc.participants.map((p) => ({
          role: p.role,
          user: p.userId
            ? {
                id: p.userId._id,
                name: p.userId.name,
                email: p.userId.email,
              }
            : null,
        })),
        createdAt: caseDoc.createdAt,
        updatedAt: caseDoc.updatedAt,
      },
      clauses,
      comments,
      clauseStatus,
    });
  } catch (err) {
    next(err);
  }
}

async function listAdminTemplates(req, res, next) {
  try {
    const reviews = await TemplateReview.find({})
      .populate("reviewedBy", "name email")
      .sort({ updatedAt: -1 });

    const reviewMap = new Map(reviews.map((r) => [r.templateId, r]));

    const templates = clauseTemplates.map((template) => {
      const review = reviewMap.get(template.id);

      return {
        id: template.id,
        title: template.title,
        category: template.category,
        jurisdiction: template.jurisdiction,
        description: template.description,
        reviewStatus: review?.reviewStatus || "NOT_REVIEWED",
        reviewNote: review?.reviewNote || "",
        reviewedBy: review?.reviewedBy
          ? {
              id: review.reviewedBy._id,
              name: review.reviewedBy.name,
              email: review.reviewedBy.email,
            }
          : null,
        reviewedAt: review?.reviewedAt || null,
      };
    });

    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

async function updateAdminTemplateReview(req, res, next) {
  try {
    const { templateId } = req.params;
    const { reviewStatus, reviewNote } = req.body;

    const template = clauseTemplates.find((t) => t.id === templateId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const allowed = ["NOT_REVIEWED", "REVIEWED", "NEEDS_REVISION"];
    if (!allowed.includes(reviewStatus)) {
      return res.status(400).json({ error: "Invalid reviewStatus" });
    }

    const doc = await TemplateReview.findOneAndUpdate(
      { templateId },
      {
        templateId,
        reviewStatus,
        reviewNote: String(reviewNote || "").trim(),
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("reviewedBy", "name email");

    res.json({
      templateReview: {
        templateId: doc.templateId,
        reviewStatus: doc.reviewStatus,
        reviewNote: doc.reviewNote,
        reviewedBy: doc.reviewedBy
          ? {
              id: doc.reviewedBy._id,
              name: doc.reviewedBy.name,
              email: doc.reviewedBy.email,
            }
          : null,
        reviewedAt: doc.reviewedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateAdminClauseReview(req, res, next) {
  try {
    const { clauseId } = req.params;
    const { reviewStatus, reviewNote } = req.body;

    const allowed = ["NOT_REVIEWED", "REVIEWED", "NEEDS_REVISION"];
    if (!allowed.includes(reviewStatus)) {
      return res.status(400).json({ error: "Invalid reviewStatus" });
    }

    const clause = await Clause.findById(clauseId);
    if (!clause) {
      return res.status(404).json({ error: "Clause not found" });
    }

    clause.adminReviewStatus = reviewStatus;
    clause.adminReviewNote = String(reviewNote || "").trim();
    clause.adminReviewedBy = req.user.id;
    clause.adminReviewedAt = new Date();

    await clause.save();
    await clause.populate("adminReviewedBy", "name email");

    res.json({ clause });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminAnalytics,
  listAllCases,
  getAdminCaseById,
  listAdminTemplates,
  updateAdminTemplateReview,
  updateAdminClauseReview,
};
