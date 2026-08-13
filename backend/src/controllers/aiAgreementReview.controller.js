const Case = require("../models/Case");
const Clause = require("../models/Clause");
const AiAgreementReview = require("../models/AiAgreementReview");
const { recordAuditLog } = require("../services/audit.service");
const { requestAgreementReview } = require("../services/aiAgreementReview.service");

const DISCLAIMER =
  "This AI-generated drafting review may be incomplete or incorrect. It is not legal advice and does not replace review by a qualified legal professional.";

function reviewResponse(review) {
  return {
    reviewType: "AI_AGREEMENT_REVIEW",
    id: review._id,
    summary: review.summary,
    readiness: review.readiness,
    issues: review.issues || [],
    recommendations: review.recommendations || [],
    provider: review.provider || "Gemini",
    model: review.model,
    createdAt: review.createdAt,
    disclaimer: DISCLAIMER,
  };
}

async function getLatestAgreementReview(req, res, next) {
  try {
    const review = await AiAgreementReview.findOne({ caseId: req.params.caseId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ review: review ? reviewResponse(review) : null });
  } catch (error) {
    next(error);
  }
}

async function reviewAgreement(req, res, next) {
  try {
    const { caseId } = req.params;
    const caseDoc = await Case.findById(caseId).lean();
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });

    const clauses = await Clause.find({ caseId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    const result = await requestAgreementReview({ caseDoc, clauses });

    const savedReview = await AiAgreementReview.create({
      caseId,
      createdBy: req.user.id,
      provider: "Gemini",
      model: result.model,
      summary: result.summary,
      readiness: result.readiness,
      issues: result.issues,
      recommendations: result.recommendations,
    });

    await recordAuditLog({
      caseId,
      userId: req.user.id,
      type: "AI_AGREEMENT_REVIEW",
      title: "AI agreement review generated",
      message: `AI reviewed ${clauses.length} clause(s).`,
      metadata: {
        readiness: result.readiness,
        issueCount: result.issues.length,
        provider: "Gemini",
        model: result.model,
      },
    });

    res.json(reviewResponse(savedReview));
  } catch (error) {
    next(error);
  }
}

module.exports = { getLatestAgreementReview, reviewAgreement };
