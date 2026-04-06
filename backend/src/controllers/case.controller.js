const crypto = require("crypto");
const Case = require("../models/Case");
const { sendCaseInviteEmail } = require("../services/email.service");

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

async function createCase(req, res, next) {
  try {
    const { title, partyBEmail, jurisdiction } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: "title must be at least 3 characters" });
    }

    if (!partyBEmail || !normalizeEmail(partyBEmail)) {
      return res.status(400).json({ error: "partyBEmail is required" });
    }

    const inviteCode = makeInviteCode();
    const inviteToken = makeInviteToken();

    const doc = await Case.create({
      title: title.trim(),
      participants: [{ userId: req.user.id, role: "PARTY_A" }],
      jurisdiction: normalizeJurisdiction(jurisdiction),
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
      .select(
        "_id title status participants jurisdiction inviteCode inviteUsed partyBEmail invitationStatus createdAt updatedAt"
      );

    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

async function getCase(req, res, next) {
  try {
    const { caseId } = req.params;

    const doc = await Case.findById(caseId).select(
      "_id title status participants jurisdiction inviteCode inviteUsed partyBEmail invitationStatus createdAt updatedAt"
    );

    if (!doc) return res.status(404).json({ error: "Case not found" });

    res.json({ case: doc });
  } catch (err) {
    next(err);
  }
}

async function joinCase(req, res, next) {
  try {
    const { caseId } = req.params;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: "inviteCode is required" });
    }

    const doc = await Case.findById(caseId);
    if (!doc) return res.status(404).json({ error: "Case not found" });

    const alreadyParticipant = doc.participants.some(
      (p) => p.userId.toString() === req.user.id
    );
    if (alreadyParticipant) return res.json({ case: doc });

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

    res.json({ case: doc });
  } catch (err) {
    next(err);
  }
}

async function sendInvite(req, res, next) {
  try {
    const { caseId } = req.params;

    const doc = await Case.findById(caseId);
    if (!doc) return res.status(404).json({ error: "Case not found" });

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
  joinCase,
  sendInvite,
  getInviteByToken,
};