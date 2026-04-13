const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },
    clauseId: { type: mongoose.Schema.Types.ObjectId, ref: "Clause", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  },
  { timestamps: true }
);

commentSchema.index({ clauseId: 1, createdAt: 1 });

module.exports = mongoose.model("Comment", commentSchema);