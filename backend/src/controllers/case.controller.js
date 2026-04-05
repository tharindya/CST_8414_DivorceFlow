const crypto = require("crypto");
const Case = require("../models/Case");

function makeInviteCode() {
  // short, demo-friendly code
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
}

async function createCase(req, res, next) {
  try {
    const { title } = req.body;
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: "title must be at least 3 characters" });
    }

    const inviteCode = makeInviteCode();

    const doc = await Case.create({
      title: title.trim(),
      participants: [{ userId: req.user.id, role: "PARTY_A" }],
      inviteCode,
      inviteUsed: false,
      status: "DRAFT",
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
      .select("_id title status participants inviteCode inviteUsed createdAt updatedAt");

    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

async function getCase(req, res, next) {
  try {
    const { caseId } = req.params;

    const doc = await Case.findById(caseId).select(
      "_id title status participants inviteCode inviteUsed createdAt updatedAt"
    );

    if (!doc) return res.status(404).json({ error: "Case not found" });

    // access already checked by middleware
    res.json({ case: doc });
  } catch (err) {
    next(err);
  }
}

async function joinCase(req, res, next) {
  try {
    const { caseId } = req.params;
    const { inviteCode } = req.body;

    if (!inviteCode) return res.status(400).json({ error: "inviteCode is required" });

    const doc = await Case.findById(caseId);
    if (!doc) return res.status(404).json({ error: "Case not found" });

    const alreadyParticipant = doc.participants.some(
      (p) => p.userId.toString() === req.user.id
    );
    if (alreadyParticipant) return res.json({ case: doc });

    if (doc.inviteUsed) return res.status(409).json({ error: "Invite already used" });

    if (doc.inviteCode !== String(inviteCode).trim().toUpperCase()) {
      return res.status(401).json({ error: "Invalid invite code" });
    }

    doc.participants.push({ userId: req.user.id, role: "PARTY_B" });
    doc.inviteUsed = true;
    doc.status = "NEGOTIATING";
    await doc.save();

    res.json({ case: doc });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCase, listMyCases, getCase, joinCase };