const mongoose = require("mongoose");

const clauseSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },
    title: { type: String, required: true, trim: true, minlength: 2 },
    category: { type: String, default: "General", trim: true },
    orderIndex: { type: Number, default: 0 },
    contentCurrent: { type: String, default: "" },

    templateId: { type: String, default: null },
    templateTitle: { type: String, default: null },
    templateJurisdiction: { type: String, default: null },

    // template-level review
    templateReviewStatus: { type: String, default: null },
    templateReviewedBy: { type: String, default: null },
    templateReviewedOn: { type: String, default: null },
    templateDisclaimer: { type: String, default: null },

    // clause-level legal moderator review
    adminReviewStatus: {
      type: String,
      enum: ["NOT_REVIEWED", "REVIEWED", "NEEDS_REVISION"],
      default: "NOT_REVIEWED",
    },
    adminReviewNote: { type: String, default: "" },
    adminReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adminReviewedAt: { type: Date, default: null },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

clauseSchema.index({ caseId: 1, orderIndex: 1 });

module.exports = mongoose.model("Clause", clauseSchema);