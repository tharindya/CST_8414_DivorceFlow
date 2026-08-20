const Clause = require("../models/Clause");
const ClauseAction = require("../models/ClauseAction");
const ClauseVersion = require("../models/ClauseVersion");
const { recomputeCaseStatus } = require("./approval.controller");
const { recordAuditLog } = require("../services/audit.service");
const { requestClauseRewrite } = require("../services/aiClauseRewrite.service");
const { clearFinalConfirmations } = require("../services/signing.service");
const { validateClause, sendValidationError } = require("../services/validation.service");

async function listClauses(req, res, next) {
  try {
    const { caseId } = req.params;

    const clauses = await Clause.find({ caseId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .populate("adminReviewedBy", "name email")
      .select(
        "_id caseId title category orderIndex contentCurrent templateId templateTitle templateJurisdiction templateReviewStatus templateReviewedBy templateReviewedOn templateDisclaimer adminReviewStatus adminReviewNote adminReviewedBy adminReviewedAt updatedAt updatedBy"
      );

    res.json({ clauses });
  } catch (err) {
    next(err);
  }
}

async function createClause(req, res, next) {
  try {
    const { caseId } = req.params;
    const {
      title,
      category,
      contentCurrent,
      templateId,
      templateTitle,
      templateJurisdiction,
      templateReviewStatus,
      templateReviewedBy,
      templateReviewedOn,
      templateDisclaimer,
    } = req.body;

    if (sendValidationError(res, validateClause(req.body))) return;

    const last = await Clause.findOne({ caseId })
      .sort({ orderIndex: -1 })
      .select("orderIndex");

    const nextIndex = last ? last.orderIndex + 1 : 1;

    const clause = await Clause.create({
      caseId,
      title: title.trim(),
      category: category?.trim() || "General",
      orderIndex: nextIndex,
      contentCurrent: typeof contentCurrent === "string" ? contentCurrent : "",

      templateId: templateId || null,
      templateTitle: templateTitle || null,
      templateJurisdiction: templateJurisdiction || null,
      templateReviewStatus: templateReviewStatus || null,
      templateReviewedBy: templateReviewedBy || null,
      templateReviewedOn: templateReviewedOn || null,
      templateDisclaimer: templateDisclaimer || null,

      adminReviewStatus: "NOT_REVIEWED",
      adminReviewNote: "",
      adminReviewedBy: null,
      adminReviewedAt: null,

      updatedBy: req.user.id,
    });

    const confirmationsReset = await clearFinalConfirmations(caseId);
    await recomputeCaseStatus(caseId);

    await recordAuditLog({
      caseId,
      clauseId: clause._id,
      userId: req.user.id,
      type: "CLAUSE_CREATED",
      title: `Clause created: ${clause.title}`,
      message: `${clause.title} was added to the agreement.`,
      metadata: {
        category: clause.category,
        orderIndex: clause.orderIndex,
        source: clause.templateId ? "template" : "manual",
      },
    });

    if (confirmationsReset) {
      await recordAuditLog({
        caseId,
        clauseId: clause._id,
        userId: req.user.id,
        type: "SIGNING_CONFIRMATIONS_RESET",
        title: "Final confirmations reset",
        message: "A clause was added, so both parties must confirm the final review again.",
        metadata: { confirmationsReset },
      });
    }

    res.status(201).json({ clause });
  } catch (err) {
    next(err);
  }
}

async function updateClause(req, res, next) {
  try {
    const { clauseId } = req.params;
    const { title, category, contentCurrent } = req.body;

    const clause = await Clause.findById(clauseId);
    if (!clause) return res.status(404).json({ error: "Clause not found" });

    if (sendValidationError(res, validateClause(req.body, { partial: true }))) return;

    const nextTitle =
      typeof title === "string" ? title.trim() : clause.title;

    const nextCategory =
      typeof category === "string" ? category.trim() : clause.category;

    const nextContent =
      typeof contentCurrent === "string" ? contentCurrent : clause.contentCurrent;

    const previousTitle = clause.title;
    const previousCategory = clause.category;
    const previousContent = clause.contentCurrent;

    const materialChanged =
      nextTitle !== previousTitle ||
      nextCategory !== previousCategory ||
      nextContent !== previousContent;

    clause.title = nextTitle;
    clause.category = nextCategory;
    clause.contentCurrent = nextContent;
    clause.updatedBy = req.user.id;

    if (materialChanged) {
      clause.adminReviewStatus = "NOT_REVIEWED";
      clause.adminReviewNote = "";
      clause.adminReviewedBy = null;
      clause.adminReviewedAt = null;
    }

    await clause.save();

    let approvalsReset = false;

    if (materialChanged) {
      const versionNumber = (await ClauseVersion.countDocuments({ clauseId: clause._id })) + 1;

      await ClauseVersion.create({
        caseId: clause.caseId,
        clauseId: clause._id,
        versionNumber,
        previousTitle,
        previousCategory,
        previousContent,
        newTitle: nextTitle,
        newCategory: nextCategory,
        newContent: nextContent,
        editedBy: req.user.id,
        changeSummary: "Clause was edited. Previous approvals and moderator review were reset.",
        approvalsReset: true,
      });

      const confirmationsReset = await clearFinalConfirmations(clause.caseId);
      await ClauseAction.deleteMany({ clauseId: clause._id });
      await recomputeCaseStatus(clause.caseId);
      approvalsReset = true;

      await recordAuditLog({
        caseId: clause.caseId,
        clauseId: clause._id,
        userId: req.user.id,
        type: "CLAUSE_UPDATED",
        title: `Clause updated: ${nextTitle}`,
        message: `${nextTitle} was edited. Previous approvals were reset so both parties can review the latest version.`,
        metadata: {
          versionNumber,
          previousTitle,
          newTitle: nextTitle,
          previousCategory,
          newCategory: nextCategory,
        },
      });

      if (confirmationsReset) {
        await recordAuditLog({
          caseId: clause.caseId,
          clauseId: clause._id,
          userId: req.user.id,
          type: "SIGNING_CONFIRMATIONS_RESET",
          title: "Final confirmations reset",
          message: "A clause changed, so both parties must confirm the final review again.",
          metadata: { confirmationsReset },
        });
      }
    }

    res.json({ clause, approvalsReset });
  } catch (err) {
    next(err);
  }
}

async function previewClauseRewrite(req, res, next) {
  try {
    const clause = await Clause.findById(req.params.clauseId).select(
      "_id caseId title contentCurrent"
    );
    if (!clause) return res.status(404).json({ error: "Clause not found" });

    const mode = String(req.body.mode || "CLEAR").toUpperCase();
    const sourceContent =
      typeof req.body.content === "string" ? req.body.content : clause.contentCurrent;
    const result = await requestClauseRewrite({ content: sourceContent, mode });

    res.json({
      clauseId: clause._id,
      mode,
      originalContent: sourceContent,
      rewrittenContent: result.rewrittenContent,
      changed: result.rewrittenContent !== sourceContent,
      provider: "Gemini",
      model: result.model,
      disclaimer:
        "This AI-assisted rewrite is a drafting preview. Review it before saving and do not treat it as legal advice.",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listClauses, createClause, updateClause, previewClauseRewrite };
