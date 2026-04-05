const mongoose = require("mongoose");

const clauseSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },
    title: { type: String, required: true, trim: true, minlength: 2 },
    category: { type: String, default: "General", trim: true },
    orderIndex: { type: Number, default: 0 },
    contentCurrent: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

clauseSchema.index({ caseId: 1, orderIndex: 1 });

module.exports = mongoose.model("Clause", clauseSchema);