function buildMockReview({ caseDoc, clauses, statusRows, exportCheck }) {
  const issues = [];
  const suggestions = [];

  const totalClauses = clauses.length;
  const approvedCount = statusRows.filter((row) => row.isApprovedByBoth).length;
  const rejectedRows = statusRows.filter((row) => row.overallState === "REJECTED");
  const templateClauseCount = clauses.filter((c) => !!c.templateId).length;
  const unreviewedTemplateClauses = clauses.filter(
    (c) =>
      !!c.templateId &&
      (!c.templateReviewStatus ||
        c.templateReviewStatus === "REVIEW_REQUIRED" ||
        c.templateReviewStatus === "UNKNOWN")
  );

  if (totalClauses === 0) {
    issues.push({
      severity: "warning",
      title: "No clauses have been drafted",
      message: "Add at least one clause before treating the agreement as ready for review.",
    });
  }

  if (approvedCount < totalClauses && totalClauses > 0) {
    issues.push({
      severity: "info",
      title: "Some clauses are still pending approval",
      message: `${approvedCount} of ${totalClauses} clauses are fully approved by both parties.`,
    });
  }

  if (rejectedRows.length > 0) {
    issues.push({
      severity: "warning",
      title: "There are rejected clauses",
      message: `${rejectedRows.length} clause(s) are currently rejected and may need revision before finalization.`,
    });
    suggestions.push("Resolve rejected clauses before treating the agreement as final.");
  }

  if (exportCheck?.warnings?.length) {
    for (const warning of exportCheck.warnings) {
      issues.push({
        severity: "warning",
        title: "Drafting completeness warning",
        message: warning,
      });
    }

    if (
      exportCheck.missingCategories?.includes("Debt") &&
      !suggestions.includes(
        "Consider adding a debt-handling section or stating that no relevant debts exist."
      )
    ) {
      suggestions.push(
        "Consider adding a debt-handling section or stating that no relevant debts exist."
      );
    }

    if (
      exportCheck.missingCategories?.includes("Custody") &&
      !suggestions.includes("Review whether parenting or custody arrangements need to be addressed.")
    ) {
      suggestions.push("Review whether parenting or custody arrangements need to be addressed.");
    }

    if (
      exportCheck.missingCategories?.includes("Child Support") &&
      !suggestions.includes("Confirm whether child support terms need to be included.")
    ) {
      suggestions.push("Confirm whether child support terms need to be included.");
    }
  }

  if (templateClauseCount > 0 && unreviewedTemplateClauses.length > 0) {
    issues.push({
      severity: "info",
      title: "Template-based clauses may need legal review",
      message: `${unreviewedTemplateClauses.length} template-based clause(s) still show review status as REVIEW_REQUIRED or UNKNOWN.`,
    });
    suggestions.push("Review template-based clauses before relying on them in a final agreement.");
  }

  if (!suggestions.length) {
    suggestions.push("Confirm that the drafted clauses match the parties' actual intentions.");
    suggestions.push("Review the final wording carefully before signing or sharing.");
  }

  let summary = "The agreement is still in progress and may need further drafting review.";

  if (caseDoc?.status === "READY" && issues.every((issue) => issue.severity !== "warning")) {
    summary = "The agreement appears close to completion based on current workflow and drafting checks.";
  } else if (caseDoc?.status === "READY") {
    summary = "The agreement is workflow-ready, but the review found drafting items that may still need attention.";
  } else if (rejectedRows.length > 0) {
    summary = "The review found disputed sections that should be resolved before finalization.";
  }

  return {
    reviewType: "MOCK_LEGAL_REVIEW",
    caseStatus: caseDoc?.status || "DRAFT",
    jurisdiction: caseDoc?.jurisdiction || "General",
    summary,
    issues,
    suggestions,
    disclaimer:
      "This is a simulated review for product demonstration only. It does not provide legal advice or determine legal sufficiency.",
  };
}

module.exports = {
  buildMockReview,
};