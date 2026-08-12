const MODES = ["CLEAR", "CONCISE", "FORMAL"];

function normalizeContent(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
}

function replaceTerms(content, replacements) {
  const rewritten = replacements.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    content
  );
  return rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
}

function rewriteClause(content, mode = "CLEAR") {
  const source = normalizeContent(content);
  const normalizedMode = String(mode || "CLEAR").toUpperCase();

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

  const replacements = {
    CLEAR: [
      [/\bprior to\b/gi, "before"], [/\bpursuant to\b/gi, "under"],
      [/\bin the event that\b/gi, "if"],
      [/\bshall be responsible for\b/gi, "is responsible for"],
      [/\bcommence\b/gi, "begin"],
    ],
    CONCISE: [
      [/\bin order to\b/gi, "to"], [/\bat this point in time\b/gi, "now"],
      [/\bfor the purpose of\b/gi, "for"], [/\bshall be required to\b/gi, "must"],
      [/\bdue to the fact that\b/gi, "because"],
    ],
    FORMAL: [
      [/\bdoesn't\b/gi, "does not"], [/\bcan't\b/gi, "cannot"],
      [/\bwon't\b/gi, "shall not"], [/\bwill\b/gi, "shall"], [/\bcan\b/gi, "may"],
    ],
  };

  return replaceTerms(source, replacements[normalizedMode]);
}

module.exports = { MODES, rewriteClause };
