const test = require("node:test");
const assert = require("node:assert/strict");
const { requestClauseRewrite } = require("../src/services/aiClauseRewrite.service");

test("real AI rewrite rejects an invalid mode before contacting Gemini", async () => {
  await assert.rejects(
    requestClauseRewrite({
      content: "This clause contains enough text.",
      mode: "CASUAL",
    }),
    { message: "mode must be CLEAR, CONCISE, or FORMAL", statusCode: 400 }
  );
});

test("real AI rewrite rejects clause content that is too short", async () => {
  await assert.rejects(
    requestClauseRewrite({ content: "Short", mode: "CLEAR" }),
    { message: "Clause content must contain at least 10 characters", statusCode: 400 }
  );
});
