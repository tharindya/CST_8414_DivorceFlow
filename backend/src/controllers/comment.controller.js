const Comment = require("../models/Comment");
const Clause = require("../models/Clause");

async function listComments(req, res, next) {
  try {
    const { clauseId } = req.params;

    const comments = await Comment.find({ clauseId })
      .sort({ createdAt: 1 })
      .populate("userId", "name email")
      .select("_id caseId clauseId userId message createdAt");

    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const { clauseId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const clause = await Clause.findById(clauseId).select("caseId");
    if (!clause) return res.status(404).json({ error: "Clause not found" });

    const comment = await Comment.create({
      clauseId,
      caseId: clause.caseId,
      userId: req.user.id,
      message: message.trim(),
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

module.exports = { listComments, addComment };