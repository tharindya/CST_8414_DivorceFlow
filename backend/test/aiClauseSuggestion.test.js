const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSuggestionInput,
  cleanGeneratedClause,
  requestClauseSuggestion,
} = require("../src/services/aiClauseSuggestion.service");

const caseDoc = {
  jurisdiction: "Ontario",
  intake: {
    dependents: "One child",
    assets: "Matrimonial home",
    debts: "Joint credit card",
    supportRequirements: "Child support amount not agreed",
    custodyPreferences: "Shared parenting",
  },
};
const recommendation = {
  title: "Child Support",
  category: "Support",
  reason: "The intake mentions children or child support.",
};

test("buildSuggestionInput includes intake, jurisdiction, and existing clauses", () => {
  const input = buildSuggestionInput({
    caseDoc,
    recommendation,
    existingClauses: [{ title: "Parenting Plan", category: "Custody", contentCurrent: "Shared parenting." }],
  });

  assert.match(input, /Ontario/);
  assert.match(input, /One child/);
  assert.match(input, /Parenting Plan/);
});

test("cleanGeneratedClause removes a surrounding Markdown fence", () => {
  assert.equal(
    cleanGeneratedClause("```text\nParty A and Party B will agree on support terms.\n```"),
    "Party A and Party B will agree on support terms."
  );
});

test("requestClauseSuggestion requests a non-persistent Gemini drafting preview", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "test-model";
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: "The parties will pay [TO BE AGREED: monthly amount]." }],
          },
        ],
      }),
    };
  };

  const result = await requestClauseSuggestion({
    caseDoc,
    recommendation,
    existingClauses: [],
    fetchImpl,
  });

  assert.equal(captured.url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(captured.body.model, "test-model");
  assert.equal(captured.body.store, false);
  assert.match(captured.body.input, /TO BE AGREED/);
  assert.match(captured.body.input, /Child Support/);
  assert.equal(result.model, "test-model");
  assert.match(result.contentCurrent, /monthly amount/);
});
