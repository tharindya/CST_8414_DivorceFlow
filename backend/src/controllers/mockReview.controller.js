const Case = require("../models/Case");
const Clause = require("../models/Clause");
const { getClauseStatusSummary } = require("./approval.controller");
const { buildExportCheck } = require("../services/exportCheck.service");
const { buildMockReview } = require("../services/mockReview.service");

async function getMockReview(req, res, next) {
  try {
    const { caseId } = req.params;

    const caseDoc = await Case.findById(caseId).lean();
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    const clauses = await Clause.find({ caseId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    const exportCheck = buildExportCheck(caseDoc, clauses);

    const summaryPayload = {
      json(payload) {
        this.payload = payload;
      },
    };

    await getClauseStatusSummary(req, summaryPayload, next);

    const statusRows = summaryPayload?.payload?.clauses || [];

    const review = buildMockReview({
      caseDoc,
      clauses,
      statusRows,
      exportCheck,
    });

    res.json(review);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMockReview,
};