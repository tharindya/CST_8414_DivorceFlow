const { loadFinalReview } = require("../services/finalReview.service");

async function getFinalReview(req, res, next) {
  try {
    const review = await loadFinalReview(req.params.caseId, req.user.id);
    if (!review) return res.status(404).json({ error: "Case not found" });
    res.json(review);
  } catch (error) {
    next(error);
  }
}

module.exports = { getFinalReview };
