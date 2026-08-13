const crypto = require("crypto");
const Case = require("../models/Case");
const { sendCaseInviteEmail } = require("../services/email.service");
const {
  buildIntakeRecommendations,
} = require("../services/intakeRecommendations.service");
const { recordAuditLog } = require("../services/audit.service");
const { clearFinalConfirmations } = require("../services/signing.service");
const {
  validateCaseCreation,
  validateJoinCase,
  validateIntake,
  sendValidationError,
} = require("../services/validation.service");

const CASE_SELECT_FIELDS =
  "_id title status participants jurisdiction intake finalConfirmations finalizedAt inviteCode inviteUsed partyBEmail invitationStatus createdAt updatedAt";

const INTAKE_FIELDS = [
  "dependents",
  "assets",
  "debts",
  "supportRequirements",
  "custodyPreferences",
];

function makeInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function makeInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeJurisdiction(value) {
  const allowed = ["General", "Ontario", "Quebec", "British Columbia", "Alberta"];
  return allowed.includes(value) ? value : "General";
}

function normalizeIntakePayload(payload = {}, userId) {
  const intake = {};

  for (const field of INTAKE_FIELDS) {
    intake[field] = String(payload[field] || "").trim();
  }

  const completed = INTAKE_FIELDS.every((field) => intake[field].length > 0);

  intake.completed = completed;
  intake.completedAt = completed ? new Date() : null;
  intake.updatedBy = userId || null;

  return intake;
}

async function createCase(req, res, next) {
  try {
    const { title, partyBEmail, jurisdiction } = req.body;

    if (sendValidationError(res, validateCaseCreation(req.body))) return;

    const inviteCode = makeInviteCode();
    const inviteToken = makeInviteToken();

    const doc = await Case.create({
      title: title.trim(),
      participants: [{ userId: req.user.id, role: "PARTY_A" }],
      jurisdiction: normalizeJurisdiction(jurisdiction),
      intake: normalizeIntakePayload(req.body.intake || {}, req.user.id),
      inviteCode,
      inviteUsed: false,
      status: "DRAFT",
      partyBEmail: normalizeEmail(partyBEmail),
      inviteToken,
      invitationStatus: "PENDING",
    });

    res.status(201).json({ case: doc });
  } catch (err) {
    next(err);
  }
}

async function listMyCases(req, res, next) {
  try {
    const cases = await Case.find({ "participants.userId": req.user.id })
      .sort({ updatedAt: -1 })
      .select(CASE_SELECT_FIELDS);

    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

async function getCase(req, res, next) {
  try {
    const { caseId } = req.params;

    const doc = await Case.findById(caseId).select(CASE_SELECT_FIELDS);

    if (!doc) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json({ case: doc });
  } catch (err) {
    next(err);
  }
}

async function updateIntake(req, res, next) {
  try {
    const { caseId } = req.params;

    const doc = await Case.findById(caseId);

    if (!doc) {
      return res.status(404).json({ error: "Case not found" });
    }

    if (sendValidationError(res, validateIntake(req.body))) return;

    const previousIntake = JSON.stringify(doc.intake?.toObject?.() || doc.intake || {});
    doc.intake = normalizeIntakePayload(req.body || {}, req.user.id);
    await doc.save();

    const intakeChanged = previousIntake !== JSON.stringify(doc.intake?.toObject?.() || doc.intake || {});
    const confirmationsReset = intakeChanged
      ? await clearFinalConfirmations(caseId)
      : 0;

    const updated = await Case.findById(caseId).select(CASE_SELECT_FIELDS);

    await recordAuditLog({
      caseId,
      userId: req.user.id,
      type: "CASE_INTAKE_UPDATED",
      title: "Guided intake updated",
      message: updated.intake?.completed
        ? "Guided case intake was completed."
        : "Guided case intake was saved but is still incomplete.",
      metadata: { completed: !!updated.intake?.completed },
    });

    if (confirmationsReset) {
      await recordAuditLog({
        caseId,
        userId: req.user.id,
        type: "SIGNING_CONFIRMATIONS_RESET",
        title: "Final confirmations reset",
        message: "Guided intake changed, so both parties must confirm the final review again.",
        metadata: { confirmationsReset },
      });
    }

    res.json({
      message: updated.intake?.completed
        ? "Guided intake completed"
        : "Guided intake saved",
      case: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function getIntakeRecommendations(req, res, next) {
  try {
    const { caseId } = req.params;

    const doc = await Case.findById(caseId);

    if (!doc) {
      return res.status(404).json({ error: "Case not found" });
    }

    const result = await buildIntakeRecommendations(doc);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function joinCase(req, res, next) {
  try {
    const { caseId } = req.params;
    const { inviteCode } = req.body;

    if (sendValidationError(res, validateJoinCase(caseId, req.body))) return;

    const doc = await Case.findById(caseId);

    if (!doc) {
      return res.status(404).json({ error: "Case not found" });
    }

    const alreadyParticipant = doc.participants.some(
      (p) => p.userId.toString() === req.user.id
    );

    if (alreadyParticipant) {
      return res.json({ case: doc });
    }

    if (doc.inviteUsed) {
      return res.status(409).json({ error: "Invite already used" });
    }

    if (doc.inviteCode !== String(inviteCode).trim().toUpperCase()) {
      return res.status(401).json({ error: "Invalid invite code" });
    }

    doc.participants.push({ userId: req.user.id, role: "PARTY_B" });
    doc.inviteUsed = true;
    doc.invitationStatus = "ACCEPTED";
    doc.status = "NEGOTIATING";

    await doc.save();

    await recordAuditLog({
      caseId,
      userId: req.user.id,
      type: "CASE_JOINED",
      title: "Case joined",
      message: "The invited party joined the case using the invite code.",
    });

    res.json({ case: doc });
  } catch (err) {
    next(err);
  }
}

async function sendInvite(req, res, next) {
  try {
    const { caseId } = req.params;

    const doc = await Case.findById(caseId);

    if (!doc) {
      return res.status(404).json({ error: "Case not found" });
    }

    const isPartyA = doc.participants.some(
      (p) => p.userId.toString() === req.user.id && p.role === "PARTY_A"
    );

    if (!isPartyA) {
      return res.status(403).json({ error: "Only Party A can send invitations" });
    }

    if (!doc.partyBEmail) {
      return res.status(400).json({ error: "partyBEmail is missing on this case" });
    }

    if (!doc.inviteToken) {
      doc.inviteToken = makeInviteToken();
    }

    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
    const inviteLink = `${appBaseUrl}/invite?caseId=${doc._id}&token=${doc.inviteToken}`;

    await sendCaseInviteEmail({
      to: doc.partyBEmail,
      caseTitle: doc.title,
      inviteCode: doc.inviteCode,
      inviteLink,
    });

    doc.invitationStatus = "SENT";
    await doc.save();

    await recordAuditLog({
      caseId,
      userId: req.user.id,
      type: "INVITE_SENT",
      title: "Invitation sent",
      message: `An invitation email was sent to ${doc.partyBEmail}.`,
      metadata: { partyBEmail: doc.partyBEmail },
    });

    res.json({
      message: "Invitation email sent",
      case: doc,
    });
  } catch (err) {
    next(err);
  }
}

async function getInviteByToken(req, res, next) {
  try {
    const { caseId, token } = req.query;

    if (!caseId || !token) {
      return res.status(400).json({ error: "caseId and token are required" });
    }

    const doc = await Case.findOne({
      _id: caseId,
      inviteToken: token,
    }).select("_id title jurisdiction inviteCode inviteUsed invitationStatus partyBEmail status");

    if (!doc) {
      return res.status(404).json({ error: "Invitation not found or invalid" });
    }

    res.json({ invite: doc });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCase,
  listMyCases,
  getCase,
  updateIntake,
  getIntakeRecommendations,
  joinCase,
  sendInvite,
  getInviteByToken,
};
