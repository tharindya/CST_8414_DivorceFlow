const Case = require("../models/Case");
const Clause = require("../models/Clause");
const User = require("../models/User");
const { buildAgreementPdf } = require("../services/export.service");

async function exportCasePdf(req, res, next) {
  try {
    const { caseId } = req.params;

    const caseDoc = await Case.findById(caseId).lean();
    if (!caseDoc) {
      return res.status(404).json({ error: "Case not found" });
    }

    if (caseDoc.status !== "READY") {
      return res.status(400).json({ error: "Case must be READY before export" });
    }

    const clauses = await Clause.find({ caseId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    const participantIds = caseDoc.participants.map((p) => p.userId);
    const users = await User.find({ _id: { $in: participantIds } })
      .select("name email")
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const partyARecord = caseDoc.participants.find((p) => p.role === "PARTY_A");
    const partyBRecord = caseDoc.participants.find((p) => p.role === "PARTY_B");

    const partyA = partyARecord ? userMap.get(String(partyARecord.userId)) : null;
    const partyB = partyBRecord ? userMap.get(String(partyBRecord.userId)) : null;

    const filename = `${(caseDoc.title || "divorce-agreement")
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = buildAgreementPdf({
      caseDoc,
      clauses,
      partyA,
      partyB,
    });

    doc.pipe(res);
    doc.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportCasePdf,
};