const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    clauseId: { type: mongoose.Schema.Types.ObjectId, ref: "Clause", default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: {
      type: String,
      required: true,
      enum: [
        "CASE_INTAKE_UPDATED",
        "INVITE_SENT",
        "CASE_JOINED",
        "CLAUSE_CREATED",
        "CLAUSE_UPDATED",
        "CLAUSE_APPROVED",
        "CLAUSE_REJECTED",
        "COMMENT_ADDED",
        "MESSAGE_SENT",
        "AI_AGREEMENT_REVIEW",
      ],
    },

    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ caseId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
