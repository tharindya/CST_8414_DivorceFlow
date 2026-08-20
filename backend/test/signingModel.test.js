const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Case = require("../src/models/Case");

test("Case validates final confirmations for both parties", () => {
  const partyA = new mongoose.Types.ObjectId();
  const partyB = new mongoose.Types.ObjectId();
  const caseDoc = new Case({
    title: "Final agreement",
    status: "FINALIZED",
    participants: [
      { userId: partyA, role: "PARTY_A" },
      { userId: partyB, role: "PARTY_B" },
    ],
    finalConfirmations: [
      { role: "PARTY_A", userId: partyA, confirmedAt: new Date() },
      { role: "PARTY_B", userId: partyB, confirmedAt: new Date() },
    ],
    finalizedAt: new Date(),
    inviteCode: "ABCD1234",
  });

  assert.equal(caseDoc.validateSync(), undefined);
});
