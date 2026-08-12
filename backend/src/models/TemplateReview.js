const mongoose = require("mongoose");

const templateReviewSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    reviewStatus: {
      type: String,
      enum: ["NOT_REVIEWED", "REVIEWED", "NEEDS_REVISION"],
      default: "NOT_REVIEWED",
    },
    reviewNote: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TemplateReview", templateReviewSchema);