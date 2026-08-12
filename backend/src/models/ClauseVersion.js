const mongoose = require("mongoose");

const clauseVersionSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    clauseId: { type: mongoose.Schema.Types.ObjectId, ref: "Clause", required: true, index: true },
    versionNumber: { type: Number, required: true },

    previousTitle: { type: String, default: "" },
    previousCategory: { type: String, default: "General" },
    previousContent: { type: String, default: "" },

    newTitle: { type: String, default: "" },
    newCategory: { type: String, default: "General" },
    newContent: { type: String, default: "" },

    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    changeSummary: { type: String, default: "Clause content was updated." },
    approvalsReset: { type: Boolean, default: true },
  },
  { timestamps: true }
);

clauseVersionSchema.index({ clauseId: 1, versionNumber: -1 });

module.exports = mongoose.model("ClauseVersion", clauseVersionSchema);
