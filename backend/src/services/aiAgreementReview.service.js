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

function idString(value) {
  return String(value?._id || value || "");
}

function timestamp(value) {
  const result = value ? new Date(value).getTime() : 0;
  return Number.isFinite(result) ? result : 0;
}

function buildReviewInput({
  caseDoc,
  clauses,
  actions = [],
  comments = [],
  versions = [],
}) {
  const intake = caseDoc?.intake || {};
  const roleByUserId = new Map(
    (caseDoc?.participants || []).map((participant) => [
      idString(participant.userId),
      participant.role,
    ])
  );

  const latestActionByClauseAndRole = new Map();
  for (const action of actions) {
    const role = roleByUserId.get(idString(action.userId));
    if (!role) continue;

    const key = `${idString(action.clauseId)}:${role}`;
    const existing = latestActionByClauseAndRole.get(key);
    if (!existing || timestamp(action.createdAt) >= timestamp(existing.createdAt)) {
      latestActionByClauseAndRole.set(key, action);
    }
  }

  const commentsByClause = new Map();
  for (const comment of comments) {
    const clauseId = idString(comment.clauseId);
    const list = commentsByClause.get(clauseId) || [];
    list.push(comment);
    commentsByClause.set(clauseId, list);
  }

  const versionsByClause = new Map();
  for (const version of versions) {
    const clauseId = idString(version.clauseId);
    const list = versionsByClause.get(clauseId) || [];
    list.push(version);
    versionsByClause.set(clauseId, list);
  }

  return JSON.stringify({
    case: {
      title: String(caseDoc?.title || "").slice(0, 300),
      jurisdiction: String(caseDoc?.jurisdiction || "General").slice(0, 100),
      workflowStatus: String(caseDoc?.status || "DRAFT").slice(0, 50),
      participants: (caseDoc?.participants || []).map((participant) => participant.role),
      finalReview: {
        confirmations: (caseDoc?.finalConfirmations || []).map((confirmation) => ({
          role: confirmation.role,
          confirmedAt: confirmation.confirmedAt || null,
        })),
        finalizedAt: caseDoc?.finalizedAt || null,
      },
      intake: {
        completed: Boolean(intake.completed),
        dependents: String(intake.dependents || "").slice(0, 2500),
        assets: String(intake.assets || "").slice(0, 2500),
        debts: String(intake.debts || "").slice(0, 2500),
        supportRequirements: String(intake.supportRequirements || "").slice(0, 2500),
        custodyPreferences: String(intake.custodyPreferences || "").slice(0, 2500),
      },
    },
    clauses: (clauses || []).slice(0, 50).map((clause) => {
      const clauseId = idString(clause._id);
      const partyReview = {};

      for (const role of ["PARTY_A", "PARTY_B"]) {
        const action = latestActionByClauseAndRole.get(`${clauseId}:${role}`);
        partyReview[role] = {
          status: action?.action || "PENDING",
          actedAt: action?.createdAt || null,
        };
      }

      const clauseComments = (commentsByClause.get(clauseId) || [])
        .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt))
        .slice(-8)
        .map((comment) => ({
          authorRole: roleByUserId.get(idString(comment.userId)) || "UNKNOWN",
          message: String(comment.message || "").slice(0, 1200),
          createdAt: comment.createdAt || null,
        }));

      const clauseVersions = (versionsByClause.get(clauseId) || [])
        .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0))
        .slice(0, 3)
        .map((version) => ({
          versionNumber: version.versionNumber,
          changeSummary: String(version.changeSummary || "").slice(0, 500),
          previousContent: String(version.previousContent || "").slice(0, 750),
          newContent: String(version.newContent || "").slice(0, 750),
          approvalsReset: Boolean(version.approvalsReset),
          createdAt: version.createdAt || null,
        }));

      return {
        title: String(clause.title || "Untitled clause").slice(0, 300),
        category: String(clause.category || "General").slice(0, 100),
        content: String(clause.contentCurrent || "").slice(0, 6000),
        updatedAt: clause.updatedAt || null,
        partyReview,
        comments: clauseComments,
        versionHistory: clauseVersions,
        moderatorReview: {
          status: String(clause.adminReviewStatus || "NOT_REVIEWED"),
          note: String(clause.adminReviewNote || "").slice(0, 2000),
          reviewedAt: clause.adminReviewedAt || null,
        },
      };
    }),
  });
}

async function requestAgreementReview({
  caseDoc,
  clauses,
  actions = [],
  comments = [],
  versions = [],
  fetchImpl = fetch,
}) {
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
          "Compare the intake with every current clause and identify missing topics, internal conflicts, ambiguous wording, incomplete amounts or dates, unresolved party disagreements, and moderator concerns.",
          "Treat the latest party action as the current approval state. A current rejection or moderator NEEDS_REVISION status must be reported as unresolved.",
          "Comments are collaboration context and may include discussion or rejection feedback; do not treat every comment as an established fact.",
          "Evaluate current clause content. Use version history only to understand changes and whether earlier feedback may remain unresolved.",
          "Final confirmations represent DivorceFlow workflow progress, not legal signatures or legal approval.",
          "Do not decide legal validity, predict court outcomes, invent facts, or provide jurisdiction-specific legal conclusions.",
          "Use an empty string for clauseTitle when an issue applies to the whole agreement.",
          "READY_FOR_HUMAN_REVIEW means the draft has no obvious drafting gaps; it never means legally approved.",
          `AGREEMENT DATA:\n${buildReviewInput({
            caseDoc,
            clauses,
            actions,
            comments,
            versions,
          })}`,
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
