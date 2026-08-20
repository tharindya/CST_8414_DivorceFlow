const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const Case = require("../src/models/Case");
const Clause = require("../src/models/Clause");
const { requireAuth, requireAdmin } = require("../src/middleware/auth");
const {
  requireCaseParticipant,
  requireClauseCaseParticipant,
} = require("../src/middleware/caseAccess");

const partyA = "64b000000000000000000001";
const partyB = "64b000000000000000000002";
const unrelatedUser = "64b000000000000000000003";
const caseId = "64b000000000000000000004";
const clauseId = "64b000000000000000000005";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function stubFindById(model, result) {
  const original = model.findById;
  model.findById = () => ({ select: async () => result });
  return () => { model.findById = original; };
}

test("requireAuth rejects requests without a bearer token", () => {
  const req = { headers: {} };
  const res = responseRecorder();
  let nextCalled = false;

  requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Missing or invalid Authorization header");
  assert.equal(nextCalled, false);
});

test("requireAuth accepts a valid token and restores the user role", () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "authorization-test-secret";
  const token = jwt.sign(
    { sub: partyA, email: "party.a@example.com", role: "USER" },
    process.env.JWT_SECRET
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = responseRecorder();
  let nextCalled = false;

  requireAuth(req, res, () => { nextCalled = true; });

  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, partyA);
  assert.equal(req.user.role, "USER");
});

test("requireAdmin blocks users and permits administrators", () => {
  const userResponse = responseRecorder();
  let userNextCalled = false;
  requireAdmin(
    { user: { id: partyA, role: "USER" } },
    userResponse,
    () => { userNextCalled = true; }
  );

  assert.equal(userResponse.statusCode, 403);
  assert.equal(userResponse.body.error, "Admin access required");
  assert.equal(userNextCalled, false);

  const adminResponse = responseRecorder();
  let adminNextCalled = false;
  requireAdmin(
    { user: { id: unrelatedUser, role: "ADMIN" } },
    adminResponse,
    () => { adminNextCalled = true; }
  );

  assert.equal(adminResponse.statusCode, 200);
  assert.equal(adminNextCalled, true);
});

test("requireCaseParticipant permits Party A and Party B", async () => {
  const restore = stubFindById(Case, {
    participants: [
      { userId: { toString: () => partyA }, role: "PARTY_A" },
      { userId: { toString: () => partyB }, role: "PARTY_B" },
    ],
  });

  try {
    for (const userId of [partyA, partyB]) {
      const req = { params: { caseId }, user: { id: userId, role: "USER" } };
      const res = responseRecorder();
      let nextCalled = false;
      await requireCaseParticipant(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 200);
      assert.equal(nextCalled, true);
    }
  } finally {
    restore();
  }
});

test("requireCaseParticipant rejects an unrelated authenticated user", async () => {
  const restore = stubFindById(Case, {
    participants: [
      { userId: { toString: () => partyA }, role: "PARTY_A" },
      { userId: { toString: () => partyB }, role: "PARTY_B" },
    ],
  });

  try {
    const req = { params: { caseId }, user: { id: unrelatedUser, role: "USER" } };
    const res = responseRecorder();
    let nextCalled = false;
    await requireCaseParticipant(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, "Forbidden: not a case participant");
    assert.equal(nextCalled, false);
  } finally {
    restore();
  }
});

test("requireClauseCaseParticipant resolves the parent case before authorizing", async () => {
  const restoreClause = stubFindById(Clause, { caseId: { toString: () => caseId } });
  const restoreCase = stubFindById(Case, {
    participants: [{ userId: { toString: () => partyA }, role: "PARTY_A" }],
  });

  try {
    const req = { params: { clauseId }, user: { id: partyA, role: "USER" } };
    const res = responseRecorder();
    let nextCalled = false;
    await requireClauseCaseParticipant(req, res, () => { nextCalled = true; });

    assert.equal(req.params.caseId, caseId);
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  } finally {
    restoreClause();
    restoreCase();
  }
});

test("requireClauseCaseParticipant returns 404 for an unknown clause", async () => {
  const restore = stubFindById(Clause, null);

  try {
    const req = { params: { clauseId }, user: { id: partyA, role: "USER" } };
    const res = responseRecorder();
    let nextCalled = false;
    await requireClauseCaseParticipant(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, "Clause not found");
    assert.equal(nextCalled, false);
  } finally {
    restore();
  }
});
