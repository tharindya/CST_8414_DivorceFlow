const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["PARTY_A", "PARTY_B"], required: true },
  },
  { _id: false }
);

const intakeSchema = new mongoose.Schema(
  {
    dependents: { type: String, trim: true, default: "" },
    assets: { type: String, trim: true, default: "" },
    debts: { type: String, trim: true, default: "" },
    supportRequirements: { type: String, trim: true, default: "" },
    custodyPreferences: { type: String, trim: true, default: "" },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const caseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3 },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "NEGOTIATING",
        "REVIEW",
        "REVISION",
        "APPROVAL",
        "READY",
        "FINALIZED",
        "EXPORTED",
      ],
      default: "DRAFT",
    },

    participants: { type: [participantSchema], default: [] },

    intake: { type: intakeSchema, default: () => ({}) },

    jurisdiction: {
      type: String,
      enum: ["General", "Ontario", "Quebec", "British Columbia", "Alberta"],
      default: "General",
    },

    inviteCode: { type: String, required: true },
    inviteUsed: { type: Boolean, default: false },

    partyBEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    inviteToken: {
      type: String,
      default: null,
      index: true,
    },

    invitationStatus: {
      type: String,
      enum: ["PENDING", "SENT", "ACCEPTED", "EXPIRED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

caseSchema.index({ "participants.userId": 1 });

module.exports = mongoose.model("Case", caseSchema);