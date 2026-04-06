function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function includesAny(text, values) {
  return values.some((value) => text.includes(value));
}

function classifyClause(clause) {
  const templateId = normalizeText(clause.templateId);
  const templateTitle = normalizeText(clause.templateTitle);
  const category = normalizeText(clause.category);
  const title = normalizeText(clause.title);
  const content = normalizeText(clause.contentCurrent);

  const labelText = [templateId, templateTitle, category, title]
    .filter(Boolean)
    .join(" ");

  const fullText = `${labelText} ${content}`.trim();

  const isProperty =
    includesAny(labelText, [
      "property",
      "matrimonial home",
      "asset division",
      "property division",
    ]) ||
    includesAny(templateId, [
      "general-property-division",
      "ontario-matrimonial-home",
    ]);

  const isDebt =
    includesAny(labelText, ["debt", "liability", "loan", "credit"]) ||
    includesAny(templateId, ["general-debt-division"]);

  const isCustody =
    includesAny(labelText, [
      "custody",
      "parenting",
      "parenting plan",
      "decision-making",
      "parenting time",
    ]) ||
    includesAny(templateId, ["ontario-parenting-plan"]);

  const isChildSupport =
    includesAny(labelText, ["child support"]) ||
    includesAny(templateId, ["general-child-support"]) ||
    (!includesAny(labelText, ["spousal support", "alimony"]) &&
      includesAny(fullText, ["child support"]));

  const isSpousalSupport =
    includesAny(labelText, ["spousal support", "alimony"]) ||
    includesAny(templateId, ["ontario-spousal-support"]) ||
    includesAny(fullText, ["spousal support", "alimony"]);

  const impliesChildContext =
    isCustody ||
    isChildSupport ||
    includesAny(fullText, [
      "child",
      "children",
      "parenting",
      "decision-making responsibility",
      "parenting time",
      "best interests of the child",
    ]);

  return {
    isProperty,
    isDebt,
    isCustody,
    isChildSupport,
    isSpousalSupport,
    impliesChildContext,
  };
}

function buildExportCheck(caseDoc, clauses) {
  const detected = {
    hasProperty: false,
    hasDebt: false,
    hasCustody: false,
    hasChildSupport: false,
    hasSpousalSupport: false,
    hasChildContext: false,
  };

  for (const clause of clauses) {
    const result = classifyClause(clause);

    if (result.isProperty) detected.hasProperty = true;
    if (result.isDebt) detected.hasDebt = true;
    if (result.isCustody) detected.hasCustody = true;
    if (result.isChildSupport) detected.hasChildSupport = true;
    if (result.isSpousalSupport) detected.hasSpousalSupport = true;
    if (result.impliesChildContext) detected.hasChildContext = true;
  }

  const missingCategories = [];
  const warnings = [];

  if (!detected.hasProperty) {
    missingCategories.push("Property");
    warnings.push("No property-related clause was found.");
  }

  if (!detected.hasDebt) {
    missingCategories.push("Debt");
    warnings.push("No debt-related clause was found.");
  }

  if (detected.hasChildContext && !detected.hasCustody) {
    missingCategories.push("Custody");
    warnings.push(
      "Child-related drafting was detected, but no custody or parenting clause was found."
    );
  }

  if (detected.hasChildContext && !detected.hasChildSupport) {
    missingCategories.push("Child Support");
    warnings.push(
      "Child-related drafting was detected, but no child support clause was found."
    );
  }

  return {
    jurisdiction: caseDoc?.jurisdiction || "General",
    caseStatus: caseDoc?.status || "DRAFT",
    caseStatusAllowsExport: caseDoc?.status === "READY",
    completenessOk: missingCategories.length === 0,
    missingCategories,
    warnings,
    detected,
    disclaimer:
      "This is a drafting completeness check only. It does not determine legal sufficiency.",
  };
}

module.exports = {
  classifyClause,
  buildExportCheck,
};