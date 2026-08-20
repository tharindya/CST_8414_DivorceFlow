const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "readiness", "issues", "recommendations"],
  properties: {
    summary: { type: "string" },
    readiness: {
      type: "string",
      enum: ["NEEDS_WORK", "REVIEW_REQUIRED", "READY_FOR_HUMAN_REVIEW"],
    },
    issues: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "category", "clauseTitle", "message"],
        properties: {
          severity: { type: "string", enum: ["INFO", "WARNING", "HIGH"] },
          category: { type: "string" },
          clauseTitle: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    recommendations: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["priority", "action", "reason"],
        properties: {
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          action: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
};

function extractOutputText(responseBody) {
  if (responseBody?.output_text) return String(responseBody.output_text).trim();

  const stepText = [];
  for (const step of responseBody?.steps || []) {
    if (step?.type !== "model_output") continue;
    for (const content of step.content || []) {
      if (content?.type === "text" && content.text) stepText.push(String(content.text));
    }
  }
  if (stepText.length) return stepText.join("").trim();

  const legacyText = [];
  for (const output of responseBody?.outputs || []) {
    if (output?.type === "text" && output.text) legacyText.push(String(output.text));
  }
  if (legacyText.length) return legacyText.join("").trim();

  for (const output of responseBody?.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === "refusal") {
        const error = new Error(content.refusal || "Gemini declined the agreement review");
        error.statusCode = 422;
        throw error;
      }
      if (content?.type === "output_text" && content.text) return content.text.trim();
    }
  }
  return "";
}

function parseReviewOutput(outputText) {
  const source = String(outputText || "").trim();
  if (!source) throw new SyntaxError("Empty JSON output");

  const withoutFence = source
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const firstBrace = withoutFence.indexOf("{");
    const lastBrace = withoutFence.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) throw new SyntaxError("No JSON object found");
    return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1));
  }
}

function buildReviewInput({ caseDoc, clauses }) {
  const intake = caseDoc?.intake || {};

  return JSON.stringify({
    case: {
      title: String(caseDoc?.title || "").slice(0, 300),
      jurisdiction: String(caseDoc?.jurisdiction || "General").slice(0, 100),
      workflowStatus: String(caseDoc?.status || "DRAFT").slice(0, 50),
      intake: {
        dependents: String(intake.dependents || "").slice(0, 2500),
        assets: String(intake.assets || "").slice(0, 2500),
        debts: String(intake.debts || "").slice(0, 2500),
        supportRequirements: String(intake.supportRequirements || "").slice(0, 2500),
        custodyPreferences: String(intake.custodyPreferences || "").slice(0, 2500),
      },
    },
    clauses: (clauses || []).slice(0, 50).map((clause) => ({
      title: String(clause.title || "Untitled clause").slice(0, 300),
      category: String(clause.category || "General").slice(0, 100),
      content: String(clause.contentCurrent || "").slice(0, 6000),
      moderatorReviewStatus: String(clause.adminReviewStatus || "NOT_REVIEWED"),
    })),
  });
}

async function requestAgreementReview({ caseDoc, clauses, fetchImpl = fetch }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey || !model) {
    const error = new Error("GEMINI_API_KEY and GEMINI_MODEL must be configured");
    error.statusCode = 503;
    throw error;
  }
  if (!clauses?.length) {
    const error = new Error("Add at least one clause before running the AI agreement review");
    error.statusCode = 400;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetchImpl("https://generativelanguage.googleapis.com/v1beta/interactions", {
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
          "Review the supplied divorce agreement draft as a drafting assistant, not as a lawyer.",
          "Compare the intake with every clause and identify missing topics, internal conflicts, ambiguous wording, incomplete amounts or dates, and terms that require human attention.",
          "Do not decide legal validity, predict court outcomes, invent facts, or provide jurisdiction-specific legal conclusions.",
          "Use an empty string for clauseTitle when an issue applies to the whole agreement.",
          "READY_FOR_HUMAN_REVIEW means the draft has no obvious drafting gaps; it never means legally approved.",
          `AGREEMENT DATA:\n${buildReviewInput({ caseDoc, clauses })}`,
        ].join("\n\n"),
        generation_config: {
          thinking_level: "medium",
          max_output_tokens: 4096,
        },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: REVIEW_SCHEMA,
        },
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body?.error?.message || "Gemini agreement review request failed");
      error.statusCode = response.status >= 500 ? 502 : response.status;
      throw error;
    }
    const outputText = extractOutputText(body);
    if (!outputText) {
      const error = new Error("Gemini returned an empty agreement review");
      error.statusCode = 502;
      throw error;
    }

    let review;
    try {
      review = parseReviewOutput(outputText);
    } catch {
      const error = new Error("Gemini returned an invalid agreement review");
      error.statusCode = 502;
      throw error;
    }

    return { ...review, model };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Gemini agreement review request timed out");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  REVIEW_SCHEMA,
  extractOutputText,
  parseReviewOutput,
  buildReviewInput,
  requestAgreementReview,
};
