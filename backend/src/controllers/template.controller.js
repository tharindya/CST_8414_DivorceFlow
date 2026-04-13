const { clauseTemplates } = require("../data/clauseTemplates");

async function listTemplates(req, res, next) {
  try {
    const jurisdiction = String(req.query.jurisdiction || "General").trim();

    const templates = clauseTemplates
      .filter((t) => t.jurisdiction === "General" || t.jurisdiction === jurisdiction)
      .map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        jurisdiction: t.jurisdiction,
        reviewStatus: t.reviewStatus,
        reviewedBy: t.reviewedBy,
        reviewedOn: t.reviewedOn,
        disclaimer: t.disclaimer,
        description: t.description,
        placeholders: t.placeholders,
      }));

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

    res.json({
      template: {
        id: template.id,
        title: template.title,
        category: template.category,
        jurisdiction: template.jurisdiction,
        reviewStatus: template.reviewStatus,
        reviewedBy: template.reviewedBy,
        reviewedOn: template.reviewedOn,
        disclaimer: template.disclaimer,
        description: template.description,
      },
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