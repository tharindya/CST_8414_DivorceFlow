const mongoose = require("mongoose");

const clauseActionSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },
    clauseId: { type: mongoose.Schema.Types.ObjectId, ref: "Clause", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["APPROVE", "REJECT"], required: true },
  },
  { timestamps: true }
);

clauseActionSchema.index({ clauseId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model("ClauseAction", clauseActionSchema);