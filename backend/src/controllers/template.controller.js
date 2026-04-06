const { clauseTemplates } = require("../data/clauseTemplates");

async function listTemplates(req, res, next) {
  try {
    const jurisdiction = String(req.query.jurisdiction || "General").trim();

    const templates = clauseTemplates.filter(
      (t) => t.jurisdiction === "General" || t.jurisdiction === jurisdiction
    );

    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTemplates,
};