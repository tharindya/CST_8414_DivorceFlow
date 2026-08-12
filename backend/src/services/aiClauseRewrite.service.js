const MODES = ["CLEAR", "CONCISE", "FORMAL"];

function extractOutputText(responseBody) {
  if (responseBody?.output_text) return String(responseBody.output_text).trim();

  for (const output of responseBody?.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === "output_text" && content.text) return content.text.trim();
    }
  }
  return "";
}

async function requestClauseRewrite({ content, mode = "CLEAR", fetchImpl = fetch }) {
  const source = String(content || "").trim();
  const normalizedMode = String(mode || "CLEAR").toUpperCase();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!MODES.includes(normalizedMode)) {
    const error = new Error("mode must be CLEAR, CONCISE, or FORMAL");
    error.statusCode = 400;
    throw error;
  }
  if (source.length < 10) {
    const error = new Error("Clause content must contain at least 10 characters");
    error.statusCode = 400;
    throw error;
  }
  if (!apiKey || !model) {
    const error = new Error("GEMINI_API_KEY and GEMINI_MODEL must be configured");
    error.statusCode = 503;
    throw error;
  }

  const style = {
    CLEAR: "Use plain, clear language while preserving every obligation and condition.",
    CONCISE: "Make the clause shorter while preserving every obligation and condition.",
    FORMAL: "Use consistent formal agreement language while preserving every obligation and condition.",
  }[normalizedMode];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetchImpl("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          "You rewrite one clause from a divorce agreement.",
          "Preserve names, amounts, dates, responsibilities, exceptions, and legal meaning.",
          "Do not add legal advice, new obligations, commentary, headings, or quotation marks.",
          "Return only the rewritten clause text.",
          style,
          `CLAUSE TO REWRITE:\n${source}`,
        ].join("\n\n"),
        generation_config: {
          thinking_level: "low",
          max_output_tokens: 600,
        },
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body?.error?.message || "Gemini rewrite request failed");
      error.statusCode = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    const rewrittenContent = extractOutputText(body);
    if (!rewrittenContent) {
      const error = new Error("Gemini returned an empty rewrite");
      error.statusCode = 502;
      throw error;
    }

    return { rewrittenContent, model };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Gemini rewrite request timed out");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { MODES, extractOutputText, requestClauseRewrite };
