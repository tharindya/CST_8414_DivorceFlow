const Clause = require("../models/Clause");

async function listClauses(req, res, next) {
  try {
    const { caseId } = req.params;

    const clauses = await Clause.find({ caseId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .select("_id caseId title category orderIndex contentCurrent updatedAt updatedBy");

    res.json({ clauses });
  } catch (err) {
    next(err);
  }
}

async function createClause(req, res, next) {
  try {
    const { caseId } = req.params;
    const { title, category } = req.body;

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ error: "title must be at least 2 characters" });
    }

    // place at end
    const last = await Clause.findOne({ caseId }).sort({ orderIndex: -1 }).select("orderIndex");
    const nextIndex = last ? last.orderIndex + 1 : 1;

    const clause = await Clause.create({
      caseId,
      title: title.trim(),
      category: category?.trim() || "General",
      orderIndex: nextIndex,
      contentCurrent: "",
      updatedBy: req.user.id,
    });

    res.status(201).json({ clause });
  } catch (err) {
    next(err);
  }
}

async function updateClause(req, res, next) {
  try {
    const { clauseId } = req.params;
    const { title, category, contentCurrent } = req.body;

    const clause = await Clause.findById(clauseId);
    if (!clause) return res.status(404).json({ error: "Clause not found" });

    // NOTE: we’ll enforce clause belongs to a case user has access to in the route (middleware)
    if (typeof title === "string") clause.title = title.trim();
    if (typeof category === "string") clause.category = category.trim();
    if (typeof contentCurrent === "string") clause.contentCurrent = contentCurrent;

    clause.updatedBy = req.user.id;
    await clause.save();

    res.json({ clause });
  } catch (err) {
    next(err);
  }
}

module.exports = { listClauses, createClause, updateClause };