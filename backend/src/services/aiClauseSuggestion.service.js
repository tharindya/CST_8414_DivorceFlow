const { extractOutputText } = require("./aiClauseRewrite.service");

function buildSuggestionInput({ caseDoc, recommendation, existingClauses = [] }) {
  const intake = caseDoc?.intake || {};

  return JSON.stringify({
    jurisdiction: caseDoc?.jurisdiction || "General",
    requestedClause: {
      title: recommendation.title,
      category: recommendation.category,
      reason: recommendation.reason,
    },
    guidedIntake: {
      dependents: intake.dependents || "Not provided",
      assets: intake.assets || "Not provided",
      debts: intake.debts || "Not provided",
      supportRequirements: intake.supportRequirements || "Not provided",
      custodyPreferences: intake.custodyPreferences || "Not provided",
    },
    existingClauses: existingClauses.map((clause) => ({
      title: String(clause.title || "Untitled").slice(0, 300),
      category: String(clause.category || "General").slice(0, 100),
      content: String(clause.contentCurrent || "").slice(0, 2500),
    })),
  });
}

function cleanGeneratedClause(value) {
  let content = String(value || "").trim();
  const fenced = content.match(/^```(?:text|markdown)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) content = fenced[1].trim();
  return content.replace(/^(["'])|(["'])$/g, "").trim();
}

async function requestClauseSuggestion({
  caseDoc,
  recommendation,
  existingClauses = [],
  fetchImpl = fetch,
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey || !model) {
    const error = new Error("GEMINI_API_KEY and GEMINI_MODEL must be configured");
    error.statusCode = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetchImpl(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Api-Revision": "2026-05-20",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          store: false,
          input: [
            "Draft one editable clause for a divorce agreement workspace.",
            "Use only facts supplied in the guided intake. Do not invent names, amounts, dates, schedules, ownership, obligations, or legal conclusions.",
            "Where a necessary fact is missing, insert a clear [TO BE AGREED: ...] placeholder.",
            "Avoid duplicating or contradicting the existing clauses.",
            "Do not provide legal advice or claim that the clause is valid or enforceable in the jurisdiction.",
            "Return only the clause body. Do not include a heading, explanation, Markdown fence, or quotation marks.",
            `CASE CONTEXT:\n${buildSuggestionInput({ caseDoc, recommendation, existingClauses })}`,
          ].join("\n\n"),
          generation_config: {
            thinking_level: "medium",
            max_output_tokens: 1200,
          },
        }),
        signal: controller.signal,
      }
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        body?.error?.message || "Gemini clause suggestion request failed"
      );
      error.statusCode = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    const contentCurrent = cleanGeneratedClause(extractOutputText(body));
    if (contentCurrent.length < 10) {
      const error = new Error("Gemini returned an empty clause suggestion");
      error.statusCode = 502;
      throw error;
    }

    return { contentCurrent: contentCurrent.slice(0, 8000), model };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Gemini clause suggestion request timed out");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  buildSuggestionInput,
  cleanGeneratedClause,
  requestClauseSuggestion,
};
