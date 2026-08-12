const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractOutputText,
  requestClauseRewrite,
} = require("../src/services/aiClauseRewrite.service");

test("extractOutputText reads a Gemini output_text field", () => {
  assert.equal(
    extractOutputText({ output_text: "Rewritten clause" }),
    "Rewritten clause"
  );
});

test("requestClauseRewrite sends the clause to the Gemini Interactions API", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "test-model";
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({ output_text: "Party A shall pay monthly." }),
    };
  };

  const result = await requestClauseRewrite({
    content: "Party A will make payment every month.",
    mode: "FORMAL",
    fetchImpl,
  });

  assert.equal(captured.url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(captured.options.headers["x-goog-api-key"], "test-key");
  assert.equal(captured.body.model, "test-model");
  assert.match(captured.body.input, /Party A will make payment every month/);
  assert.equal(captured.body.generation_config.thinking_level, "low");
  assert.equal(result.rewrittenContent, "Party A shall pay monthly.");
});

test("provider errors are returned without a fake fallback", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "test-model";
  const fetchImpl = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { message: "Rate limit reached" } }),
  });

  await assert.rejects(
    requestClauseRewrite({ content: "This is a complete clause for testing.", fetchImpl }),
    { message: "Rate limit reached", statusCode: 429 }
  );
});
