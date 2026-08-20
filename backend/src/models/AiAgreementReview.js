const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    severity: { type: String, enum: ["INFO", "WARNING", "HIGH"], required: true },
    category: { type: String, required: true },
    clauseTitle: { type: String, default: "" },
    message: { type: String, required: true },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], required: true },
    action: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const aiAgreementReviewSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: String, default: "Gemini" },
    model: { type: String, required: true },
    summary: { type: String, required: true },
    readiness: {
      type: String,
      enum: ["NEEDS_WORK", "REVIEW_REQUIRED", "READY_FOR_HUMAN_REVIEW"],
      required: true,
    },
    issues: { type: [issueSchema], default: [] },
    recommendations: { type: [recommendationSchema], default: [] },
  },
  { timestamps: true }
);

aiAgreementReviewSchema.index({ caseId: 1, createdAt: -1 });

module.exports = mongoose.model("AiAgreementReview", aiAgreementReviewSchema);
