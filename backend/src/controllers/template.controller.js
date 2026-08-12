const { clauseTemplates } = require("../data/clauseTemplates");
const TemplateReview = require("../models/TemplateReview");

function buildTemplateResponse(template, reviewDoc) {
  return {
    id: template.id,
    title: template.title,
    category: template.category,
    jurisdiction: template.jurisdiction,

    reviewStatus: reviewDoc?.reviewStatus || "NOT_REVIEWED",
    reviewedBy: reviewDoc?.reviewedBy?.email || reviewDoc?.reviewedBy?.name || null,
    reviewedOn: reviewDoc?.reviewedAt
      ? new Date(reviewDoc.reviewedAt).toISOString()
      : null,
    disclaimer: reviewDoc?.reviewNote || "",

    description: template.description,
    placeholders: template.placeholders,
  };
}

async function listTemplates(req, res, next) {
  try {
    const jurisdiction = String(req.query.jurisdiction || "General").trim();

    const filteredTemplates = clauseTemplates.filter(
      (t) => t.jurisdiction === "General" || t.jurisdiction === jurisdiction
    );

    const reviews = await TemplateReview.find({
      templateId: { $in: filteredTemplates.map((t) => t.id) },
    }).populate("reviewedBy", "name email");

    const reviewMap = new Map(reviews.map((r) => [r.templateId, r]));

    const templates = filteredTemplates.map((t) =>
      buildTemplateResponse(t, reviewMap.get(t.id))
    );

    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

async function buildTemplateDraft(req, res, next) {
  try {
    const { templateId } = req.params;
    const values = req.body?.values || {};

    const template = clauseTemplates.find((t) => t.id === templateId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const missingRequired = (template.placeholders || [])
      .filter((p) => p.required && !String(values[p.key] || "").trim())
      .map((p) => p.label);

    if (missingRequired.length > 0) {
      return res.status(400).json({
        error: "Missing required template inputs",
        missingRequired,
      });
    }

    const content =
      typeof template.buildContent === "function" ? template.buildContent(values) : "";

    const reviewDoc = await TemplateReview.findOne({ templateId }).populate(
      "reviewedBy",
      "name email"
    );

    res.json({
      template: buildTemplateResponse(template, reviewDoc),
      content,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTemplates,
  buildTemplateDraft,
};