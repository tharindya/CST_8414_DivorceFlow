const Case = require("../models/Case");
const { loadFinalReview } = require("../services/finalReview.service");
const { recordAuditLog } = require("../services/audit.service");

async function confirmFinalReview(req, res, next) {
  try {
    const { caseId } = req.params;
    const review = await loadFinalReview(caseId, req.user.id);
    if (!review) return res.status(404).json({ error: "Case not found" });

    if (review.signing.currentUserConfirmed) {
      return res.json(review);
    }

    if (!review.signing.canConfirm) {
      return res.status(400).json({
        error: "Final review cannot be confirmed while readiness blockers remain",
        blockers: review.blockers,
      });
    }

    const caseDoc = await Case.findById(caseId);
    const participant = caseDoc.participants.find(
      (item) => String(item.userId) === String(req.user.id)
    );
    if (!participant) {
      return res.status(403).json({ error: "Only case participants can confirm final review" });
    }

    const validRoles = new Set(
      review.signing.confirmations
        .filter((confirmation) => confirmation.confirmed)
        .map((confirmation) => confirmation.role)
    );
    caseDoc.finalConfirmations = (caseDoc.finalConfirmations || []).filter(
      (confirmation) =>
        validRoles.has(confirmation.role) && confirmation.role !== participant.role
    );
    caseDoc.finalConfirmations.push({
      role: participant.role,
      userId: req.user.id,
      confirmedAt: new Date(),
    });

    const confirmedRoles = new Set(
      caseDoc.finalConfirmations.map((confirmation) => confirmation.role)
    );
    const finalized = confirmedRoles.has("PARTY_A") && confirmedRoles.has("PARTY_B");
    if (finalized) {
      caseDoc.status = "FINALIZED";
      caseDoc.finalizedAt = new Date();
    }
    await caseDoc.save();

    await recordAuditLog({
      caseId,
      userId: req.user.id,
      type: "FINAL_REVIEW_CONFIRMED",
      title: `${participant.role.replace("_", " ")} confirmed final review`,
      message: "A party confirmed that they reviewed the final agreement workflow.",
      metadata: { role: participant.role },
    });

    if (finalized) {
      await recordAuditLog({
        caseId,
        userId: req.user.id,
        type: "CASE_FINALIZED",
        title: "Agreement finalized",
        message: "Both parties confirmed final review and the case was finalized.",
      });
    }

    res.json(await loadFinalReview(caseId, req.user.id));
  } catch (error) {
    next(error);
  }
}

module.exports = { confirmFinalReview };
