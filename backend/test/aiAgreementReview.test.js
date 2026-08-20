const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildReviewInput,
  extractOutputText,
  parseReviewOutput,
  requestAgreementReview,
} = require("../src/services/aiAgreementReview.service");

test("extractOutputText joins multiple Gemini model output blocks", () => {
  const text = extractOutputText({
    steps: [
      { type: "model_output", content: [{ type: "text", text: '{"summary":"Draft' }] },
      { type: "model_output", content: [{ type: "text", text: ' review"}' }] },
    ],
  });

  assert.equal(text, '{"summary":"Draft review"}');
});

test("parseReviewOutput accepts JSON wrapped in a Markdown fence", () => {
  assert.deepEqual(
    parseReviewOutput('```json\n{"summary":"Draft review"}\n```'),
    { summary: "Draft review" }
  );
});

test("buildReviewInput includes intake, clauses, and collaboration context", () => {
  const partyA = "64b000000000000000000001";
  const partyB = "64b000000000000000000002";
  const clauseId = "64b000000000000000000003";
  const result = JSON.parse(buildReviewInput({
    caseDoc: {
      title: "Test case",
      jurisdiction: "Ontario",
      status: "REVIEW",
      participants: [
        { userId: partyA, role: "PARTY_A" },
        { userId: partyB, role: "PARTY_B" },
      ],
      intake: { assets: "Home", debts: "Credit card" },
    },
    clauses: [
      {
        _id: clauseId,
        title: "Property",
        category: "Assets",
        contentCurrent: "The home will be sold.",
        adminReviewStatus: "NEEDS_REVISION",
        adminReviewNote: "Add a sale deadline.",
      },
      { title: "Debt", category: "Debts", contentCurrent: "Debt will be divided." },
    ],
    actions: [
      { clauseId, userId: partyA, action: "APPROVE", createdAt: "2026-08-01T10:00:00Z" },
      { clauseId, userId: partyB, action: "REJECT", createdAt: "2026-08-01T11:00:00Z" },
    ],
    comments: [{
      clauseId,
      userId: partyB,
      message: "The sale deadline is missing.",
      createdAt: "2026-08-01T11:00:00Z",
    }],
    versions: [{
      clauseId,
      versionNumber: 2,
      previousContent: "The home stays jointly owned.",
      newContent: "The home will be sold.",
      approvalsReset: true,
    }],
  }));

  assert.equal(result.case.intake.assets, "Home");
  assert.equal(result.clauses.length, 2);
  assert.equal(result.clauses[1].title, "Debt");
  assert.equal(result.clauses[0].partyReview.PARTY_A.status, "APPROVE");
  assert.equal(result.clauses[0].partyReview.PARTY_B.status, "REJECT");
  assert.equal(result.clauses[0].comments[0].authorRole, "PARTY_B");
  assert.equal(result.clauses[0].versionHistory[0].versionNumber, 2);
  assert.equal(result.clauses[0].moderatorReview.status, "NEEDS_REVISION");
  assert.equal(result.clauses[0].moderatorReview.note, "Add a sale deadline.");
});

test("requestAgreementReview requests structured JSON from Gemini", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "test-model";
  let captured;
  const modelReview = {
    summary: "The draft requires human review.",
    readiness: "REVIEW_REQUIRED",
    issues: [{ severity: "WARNING", category: "Debt", clauseTitle: "Debt", message: "No payment date is stated." }],
    recommendations: [{ priority: "HIGH", action: "Add a payment date.", reason: "The current timing is ambiguous." }],
  };
  const fetchImpl = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        steps: [{
          type: "model_output",
          content: [{ type: "text", text: JSON.stringify(modelReview) }],
        }],
      }),
    };
  };

  const result = await requestAgreementReview({
    caseDoc: { title: "Test", intake: {} },
    clauses: [{ title: "Debt", contentCurrent: "Party A pays the debt." }],
    fetchImpl,
  });

  assert.equal(captured.url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(captured.options.headers["x-goog-api-key"], "test-key");
  assert.equal(captured.options.headers["Api-Revision"], "2026-05-20");
  assert.equal(captured.body.store, false);
  assert.equal(captured.body.response_format.mime_type, "application/json");
  assert.deepEqual(captured.body.response_format.schema.required, [
    "summary",
    "readiness",
    "issues",
    "recommendations",
  ]);
  assert.equal(captured.body.generation_config.thinking_level, "medium");
  assert.match(captured.body.input, /unresolved party disagreements/);
  assert.equal(result.readiness, "REVIEW_REQUIRED");
  assert.equal(result.issues.length, 1);
});

test("requestAgreementReview rejects a case without clauses before calling Gemini", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "test-model";

  await assert.rejects(
    requestAgreementReview({ caseDoc: { title: "Empty" }, clauses: [] }),
    { message: "Add at least one clause before running the AI agreement review", statusCode: 400 }
  );
});
