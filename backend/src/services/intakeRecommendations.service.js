const Clause = require("../models/Clause");

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function textMeansNone(value) {
  const text = normalizeText(value);

  return (
    !text ||
    text === "none" ||
    text === "n/a" ||
    text === "na" ||
    text === "not applicable" ||
    text === "does not apply" ||
    text === "no" ||
    text === "no children" ||
    text === "no dependents"
  );
}

function textIncludesAny(value, words) {
  const text = normalizeText(value);
  return words.some((word) => text.includes(word));
}

function clauseMatches(clause, words) {
  const combined = normalizeText(
    `${clause.title} ${clause.category} ${clause.contentCurrent}`
  );

  return words.some((word) => combined.includes(word));
}

function buildSuggestedClause(id, title, category, reason, contentCurrent, priority = "HIGH") {
  return {
    id,
    title,
    category,
    reason,
    priority,
    contentCurrent,
  };
}

async function buildIntakeRecommendations(caseDoc) {
  const intake = caseDoc?.intake || {};

  const clauses = await Clause.find({ caseId: caseDoc._id }).select(
    "title category contentCurrent"
  );

  const warnings = [];
  const recommendations = [];

  const hasDependents = !textMeansNone(intake.dependents);
  const hasAssets = !textMeansNone(intake.assets);
  const hasDebts = !textMeansNone(intake.debts);
  const hasCustody = !textMeansNone(intake.custodyPreferences);

  const mentionsChildren =
    hasDependents ||
    textIncludesAny(intake.dependents, ["child", "children", "kid", "dependent"]);

  const mentionsChildSupport = textIncludesAny(intake.supportRequirements, [
    "child support",
    "support for child",
    "support for children",
  ]);

  const mentionsSpousalSupport = textIncludesAny(intake.supportRequirements, [
    "spousal",
    "alimony",
    "partner support",
  ]);

  const hasCustodyClause = clauses.some((clause) =>
    clauseMatches(clause, ["custody", "parenting", "decision-making", "parenting time"])
  );

  const hasChildSupportClause = clauses.some((clause) =>
    clauseMatches(clause, ["child support"])
  );

  const hasPropertyClause = clauses.some((clause) =>
    clauseMatches(clause, ["property", "asset", "home", "vehicle", "division"])
  );

  const hasDebtClause = clauses.some((clause) =>
    clauseMatches(clause, ["debt", "loan", "credit card", "liability"])
  );

  const hasSpousalSupportClause = clauses.some((clause) =>
    clauseMatches(clause, ["spousal support", "alimony", "partner support"])
  );

  if (!caseDoc.intake?.completed) {
    warnings.push({
      id: "intake-incomplete",
      title: "Guided intake is incomplete",
      message:
        "Complete all intake sections before final review so the agreement can be checked properly.",
      severity: "HIGH",
    });
  }

  if (mentionsChildren && !hasCustody) {
    warnings.push({
      id: "children-no-custody-preference",
      title: "Children listed but custody marked not applicable",
      message:
        "Dependents were listed, but custody preferences appear empty or not applicable. Parenting time or decision-making may need to be addressed.",
      severity: "HIGH",
    });
  }

  if (mentionsChildren && !hasCustodyClause) {
    recommendations.push(
      buildSuggestedClause(
        "custody-parenting-plan",
        "Custody and Parenting Plan",
        "Custody",
        "Dependents were listed in the guided intake.",
        "Both parties agree to follow a parenting arrangement that supports the best interests of the child or children. Parenting time, decision-making responsibilities, and communication expectations should be clearly documented by both parties."
      )
    );
  }

  if ((mentionsChildren || mentionsChildSupport) && !hasChildSupportClause) {
    recommendations.push(
      buildSuggestedClause(
        "child-support",
        "Child Support",
        "Support",
        "The intake mentions children or child support.",
        "Both parties agree that child support arrangements should be clearly documented. The agreement should identify payment responsibility, payment timing, amount if known, and how future changes will be handled."
      )
    );
  }

  if (hasAssets && !hasPropertyClause) {
    recommendations.push(
      buildSuggestedClause(
        "property-division",
        "Property and Asset Division",
        "Property",
        "Assets were listed in the guided intake.",
        "Both parties agree to divide listed property and assets in a fair and clearly documented manner. This may include the home, vehicles, savings, personal property, and any jointly owned assets."
      )
    );
  }

  if (hasDebts && !hasDebtClause) {
    recommendations.push(
      buildSuggestedClause(
        "debt-responsibility",
        "Debt Responsibility",
        "Debt",
        "Debts were listed in the guided intake.",
        "Both parties agree to identify and assign responsibility for any shared or individual debts. This may include loans, credit cards, mortgages, or other financial obligations."
      )
    );
  }

  if (mentionsSpousalSupport && !hasSpousalSupportClause) {
    recommendations.push(
      buildSuggestedClause(
        "spousal-support",
        "Spousal Support",
        "Support",
        "The intake mentions spousal support or partner support.",
        "Both parties agree to document whether spousal support applies, including payment amount, frequency, duration, and conditions for review or termination."
      )
    );
  }

  if (recommendations.length === 0 && warnings.length === 0) {
    warnings.push({
      id: "no-major-issues",
      title: "No major intake gaps detected",
      message:
        "The current intake and clauses do not show obvious missing sections. Continue reviewing the agreement before finalization.",
      severity: "LOW",
    });
  }

  return {
    intakeCompleted: !!caseDoc.intake?.completed,
    warnings,
    recommendations,
  };
}

module.exports = {
  buildIntakeRecommendations,
};