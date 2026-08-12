const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildReviewInput,
  requestAgreementReview,
} = require("../src/services/aiAgreementReview.service");

test("buildReviewInput includes intake and all supplied clauses", () => {
  const result = JSON.parse(buildReviewInput({
    caseDoc: {
      title: "Test case",
      jurisdiction: "Ontario",
      status: "REVIEW",
      intake: { assets: "Home", debts: "Credit card" },
    },
    clauses: [
      { title: "Property", category: "Assets", contentCurrent: "The home will be sold." },
      { title: "Debt", category: "Debts", contentCurrent: "Debt will be divided." },
    ],
  }));

  assert.equal(result.case.intake.assets, "Home");
  assert.equal(result.clauses.length, 2);
  assert.equal(result.clauses[1].title, "Debt");
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
      json: async () => ({ output_text: JSON.stringify(modelReview) }),
    };
  };

  const result = await requestAgreementReview({
    caseDoc: { title: "Test", intake: {} },
    clauses: [{ title: "Debt", contentCurrent: "Party A pays the debt." }],
    fetchImpl,
  });

  assert.equal(captured.url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(captured.options.headers["x-goog-api-key"], "test-key");
  assert.equal(captured.body.response_format.mime_type, "application/json");
  assert.deepEqual(captured.body.response_format.schema.required, [
    "summary",
    "readiness",
    "issues",
    "recommendations",
  ]);
  assert.equal(captured.body.generation_config.thinking_level, "medium");
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
