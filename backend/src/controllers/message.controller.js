const Case = require("../models/Case");
const Message = require("../models/Message");
const { recordAuditLog } = require("../services/audit.service");

function isParticipant(caseDoc, userId) {
  return caseDoc.participants.some(
    (p) => p.userId && p.userId.toString() === userId.toString()
  );
}

async function listMessages(req, res, next) {
  try {
    const { caseId } = req.params;

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    if (!isParticipant(caseDoc, req.user.id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await Message.find({ caseId })
      .sort({ createdAt: 1 })
      .populate("senderId", "name email");

    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { caseId } = req.params;
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    if (!isParticipant(caseDoc, req.user.id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const message = await Message.create({
      caseId,
      senderId: req.user.id,
      text,
    });

    await recordAuditLog({
      caseId,
      userId: req.user.id,
      type: "MESSAGE_SENT",
      title: "Private message sent",
      message: "A private message was sent in this case.",
      metadata: { preview: text.slice(0, 120) },
    });

    const populated = await Message.findById(message._id).populate(
      "senderId",
      "name email"
    );

    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMessages,
  sendMessage,
};