const Case = require("../models/Case");
const Clause = require("../models/Clause");
const {
  buildIntakeRecommendations,
} = require("../services/intakeRecommendations.service");
const {
  requestClauseSuggestion,
} = require("../services/aiClauseSuggestion.service");

const DISCLAIMER =
  "This AI-generated clause is an editable drafting preview. Verify every term before adding it. It is not legal advice.";

async function generateClauseSuggestion(req, res, next) {
  try {
    const { caseId, recommendationId } = req.params;
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });

    if (!caseDoc.intake?.completed) {
      return res.status(400).json({
        error: "Complete and save the guided intake before generating an AI clause",
      });
    }

    const recommendationResult = await buildIntakeRecommendations(caseDoc);
    const recommendation = recommendationResult.recommendations.find(
      (item) => item.id === recommendationId
    );

    if (!recommendation) {
      return res.status(409).json({
        error: "This clause is no longer recommended for the current agreement",
      });
    }

    const existingClauses = await Clause.find({ caseId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .select("title category contentCurrent")
      .lean();

    const result = await requestClauseSuggestion({
      caseDoc,
      recommendation,
      existingClauses,
    });

    res.json({
      recommendationId: recommendation.id,
      title: recommendation.title,
      category: recommendation.category,
      contentCurrent: result.contentCurrent,
      provider: "Gemini",
      model: result.model,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateClauseSuggestion };
