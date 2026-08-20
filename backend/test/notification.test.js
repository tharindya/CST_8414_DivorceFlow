const test = require("node:test");
const assert = require("node:assert/strict");
const Notification = require("../src/models/Notification");
const {
  NOTIFIABLE_EVENT_TYPES,
  recipientIdsForCase,
} = require("../src/services/notification.service");

const partyA = "64b000000000000000000001";
const partyB = "64b000000000000000000002";

test("Notification validates a persistent unread case event", async () => {
  const notification = new Notification({
    userId: partyB,
    caseId: "64b000000000000000000003",
    auditLogId: "64b000000000000000000004",
    actorUserId: partyA,
    type: "CLAUSE_UPDATED",
    title: "Clause updated",
    message: "A clause was updated and requires review.",
  });

  await notification.validate();
  assert.equal(notification.readAt, null);
});

test("recipientIdsForCase excludes the actor and removes duplicates", () => {
  const recipients = recipientIdsForCase(
    {
      participants: [
        { userId: partyA },
        { userId: partyB },
        { userId: partyB },
      ],
    },
    partyA
  );

  assert.deepEqual(recipients, [partyB]);
});

test("notifiable events cover collaboration and finalization activity", () => {
  for (const eventType of [
    "CLAUSE_UPDATED",
    "COMMENT_ADDED",
    "CLAUSE_APPROVED",
    "CLAUSE_REJECTED",
    "MODERATOR_REVIEW_UPDATED",
    "FINAL_REVIEW_CONFIRMED",
    "CASE_FINALIZED",
  ]) {
    assert.equal(NOTIFIABLE_EVENT_TYPES.has(eventType), true);
  }
});
