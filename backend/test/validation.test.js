const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateRegistration,
  validateLogin,
  validateCaseCreation,
  validateJoinCase,
  validateIntake,
  validateClause,
  validateComment,
  validateRejection,
  sendValidationError,
} = require("../src/services/validation.service");

test("registration validation accepts valid input and rejects field boundaries", () => {
  assert.deepEqual(
    validateRegistration({
      name: "Party A",
      email: "party.a@example.com",
      password: "password123",
    }),
    {}
  );

  const errors = validateRegistration({ name: "A", email: "invalid", password: "short" });
  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.password);
});

test("login validation reports email and password independently", () => {
  const errors = validateLogin({ email: "invalid", password: "" });
  assert.equal(errors.email, "Enter a valid email address");
  assert.equal(errors.password, "Password is required");
});

test("case creation and join validation reject malformed identifiers", () => {
  const createErrors = validateCaseCreation({
    title: "A",
    partyBEmail: "bad-email",
    jurisdiction: "Unsupported",
  });
  assert.ok(createErrors.title);
  assert.ok(createErrors.partyBEmail);
  assert.ok(createErrors.jurisdiction);

  const joinErrors = validateJoinCase("not-an-object-id", { inviteCode: "123" });
  assert.ok(joinErrors.caseId);
  assert.ok(joinErrors.inviteCode);
});

test("intake validation permits partial saves but enforces section limits", () => {
  assert.deepEqual(validateIntake({ dependents: "" }), {});
  const errors = validateIntake({ dependents: "x".repeat(5001) });
  assert.ok(errors.dependents);
});

test("clause validation requires useful drafting content", () => {
  const errors = validateClause({ title: "A", category: "", contentCurrent: "short" });
  assert.ok(errors.title);
  assert.ok(errors.contentCurrent);

  assert.deepEqual(
    validateClause({
      title: "Property Division",
      category: "Property",
      contentCurrent: "The parties agree to divide their listed property equally.",
    }),
    {}
  );
});

test("comment and rejection validation enforce useful feedback limits", () => {
  assert.ok(validateComment({ message: "" }).message);
  assert.ok(validateComment({ message: "x".repeat(2001) }).message);
  assert.ok(validateRejection({ comment: "no" }).comment);
  assert.deepEqual(validateRejection({ comment: "Payment date must be revised." }), {});
});

test("sendValidationError returns a consistent API payload", () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  const sent = sendValidationError(res, { email: "Enter a valid email address" });
  assert.equal(sent, true);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "VALIDATION_ERROR");
  assert.equal(res.body.fields.email, "Enter a valid email address");
});
