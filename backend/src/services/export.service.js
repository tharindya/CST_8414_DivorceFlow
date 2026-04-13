const PDFDocument = require("pdfkit");

function writeLabelValue(doc, label, value) {
  doc
    .font("Helvetica-Bold")
    .text(`${label}: `, { continued: true })
    .font("Helvetica")
    .text(value || "-");
}

function addDivider(doc) {
  const y = doc.y;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#cccccc").stroke();
  doc.moveDown();
  doc.strokeColor("#000000");
}

function ensureSpace(doc, required = 100) {
  if (doc.y > doc.page.height - required) {
    doc.addPage();
  }
}

function buildAgreementPdf({ caseDoc, clauses, partyA, partyB }) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  doc.info.Title = caseDoc.title || "Divorce Agreement";
  doc.info.Author = "DivorceFlow";

  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(caseDoc.title || "Divorce Agreement", { align: "center" });

  doc.moveDown(0.5);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(`Generated on ${new Date().toLocaleDateString()}`, { align: "center" });

  doc.moveDown(1.5);

  writeLabelValue(doc, "Case Status", caseDoc.status);
  writeLabelValue(doc, "Jurisdiction", caseDoc.jurisdiction || "General");
  writeLabelValue(doc, "Party A", partyA?.name || partyA?.email || "Party A");
  writeLabelValue(doc, "Party B", partyB?.name || partyB?.email || "Party B");

  doc.moveDown();
  addDivider(doc);

  doc.font("Helvetica-Bold").fontSize(14).text("Final Agreed Clauses");
  doc.moveDown(0.75);

  if (!clauses.length) {
    doc.font("Helvetica").fontSize(11).text("No clauses available.");
  } else {
    clauses.forEach((clause, index) => {
      ensureSpace(doc, 140);

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(`${index + 1}. ${clause.title || "Untitled Clause"}`);

      if (clause.category) {
        doc
          .moveDown(0.2)
          .font("Helvetica-Oblique")
          .fontSize(10)
          .text(`Category: ${clause.category}`);
      }

      doc
        .moveDown(0.4)
        .font("Helvetica")
        .fontSize(11)
        .text(clause.contentCurrent || "-", {
          align: "left",
          lineGap: 3,
        });

      doc.moveDown();
      addDivider(doc);
    });
  }

  ensureSpace(doc, 180);

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(14).text("Signatures");

  doc.moveDown(1.5);
  doc.font("Helvetica").fontSize(11);
  doc.text("Party A Signature: ______________________________");
  doc.moveDown(1.5);
  doc.text("Party B Signature: ______________________________");
  doc.moveDown(1.5);
  doc.text("Date: ______________________________");

  return doc;
}

module.exports = {
  buildAgreementPdf,
};