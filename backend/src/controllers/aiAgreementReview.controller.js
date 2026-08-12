const Case = require("../models/Case");
const Clause = require("../models/Clause");
const { recordAuditLog } = require("../services/audit.service");
const { requestAgreementReview } = require("../services/aiAgreementReview.service");

async function reviewAgreement(req, res, next) {
  try {
    const { caseId } = req.params;
    const caseDoc = await Case.findById(caseId).lean();
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });

    const clauses = await Clause.find({ caseId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    const result = await requestAgreementReview({ caseDoc, clauses });

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

    res.json({
      reviewType: "AI_AGREEMENT_REVIEW",
      ...result,
      provider: "Gemini",
      disclaimer:
        "This AI-generated drafting review may be incomplete or incorrect. It is not legal advice and does not replace review by a qualified legal professional.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { reviewAgreement };
