const mongoose = require("mongoose");

const JURISDICTIONS = ["General", "Ontario", "Quebec", "British Columbia", "Alberta"];
const INTAKE_FIELDS = [
  "dependents",
  "assets",
  "debts",
  "supportRequirements",
  "custodyPreferences",
];

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function requiredText(value, label, { min = 1, max = Infinity } = {}) {
  const text = String(value || "").trim();
  if (!text) return `${label} is required`;
  if (text.length < min) return `${label} must be at least ${min} characters`;
  if (text.length > max) return `${label} must be ${max} characters or fewer`;
  return null;
}

function validateRegistration(payload = {}) {
  const fields = {};
  const nameError = requiredText(payload.name, "Full name", { min: 2, max: 80 });
  if (nameError) fields.name = nameError;
  if (!isEmail(payload.email)) fields.email = "Enter a valid email address";
  const password = String(payload.password || "");
  if (!password) fields.password = "Password is required";
  else if (password.length < 8) fields.password = "Password must be at least 8 characters";
  else if (password.length > 128) fields.password = "Password must be 128 characters or fewer";
  return fields;
}

function validateLogin(payload = {}) {
  const fields = {};
  if (!isEmail(payload.email)) fields.email = "Enter a valid email address";
  if (!String(payload.password || "")) fields.password = "Password is required";
  return fields;
}

function validateCaseCreation(payload = {}) {
  const fields = {};
  const titleError = requiredText(payload.title, "Agreement title", { min: 3, max: 120 });
  if (titleError) fields.title = titleError;
  if (!isEmail(payload.partyBEmail)) fields.partyBEmail = "Enter a valid email address";
  if (!JURISDICTIONS.includes(payload.jurisdiction || "General")) {
    fields.jurisdiction = "Select a supported jurisdiction";
  }
  return fields;
}

function validateJoinCase(caseId, payload = {}) {
  const fields = {};
  if (!mongoose.isValidObjectId(caseId)) fields.caseId = "Enter a valid case ID";
  const inviteCode = String(payload.inviteCode || "").trim().toUpperCase();
  if (!/^[A-F0-9]{8}$/.test(inviteCode)) {
    fields.inviteCode = "Invite code must contain 8 letters or numbers";
  }
  return fields;
}

function validateIntake(payload = {}) {
  const fields = {};
  for (const field of INTAKE_FIELDS) {
    if (String(payload[field] || "").trim().length > 5000) {
      fields[field] = "This section must be 5000 characters or fewer";
    }
  }
  return fields;
}

function validateClause(payload = {}, { partial = false } = {}) {
  const fields = {};
  if (!partial || payload.title !== undefined) {
    const error = requiredText(payload.title, "Clause title", { min: 2, max: 150 });
    if (error) fields.title = error;
  }
  if (!partial || payload.category !== undefined) {
    const error = requiredText(payload.category || "General", "Category", { max: 80 });
    if (error) fields.category = error;
  }
  if (!partial || payload.contentCurrent !== undefined) {
    const error = requiredText(payload.contentCurrent, "Clause text", { min: 10, max: 20000 });
    if (error) fields.contentCurrent = error;
  }
  return fields;
}

function validateComment(payload = {}) {
  const fields = {};
  const error = requiredText(payload.message, "Comment", { max: 2000 });
  if (error) fields.message = error;
  return fields;
}

function validateRejection(payload = {}) {
  const fields = {};
  const error = requiredText(payload.comment, "Rejection reason", { min: 3, max: 2000 });
  if (error) fields.comment = error;
  return fields;
}

function sendValidationError(res, fields, message = "Check the highlighted fields") {
  if (!Object.keys(fields).length) return false;
  res.status(400).json({ error: message, code: "VALIDATION_ERROR", fields });
  return true;
}

module.exports = {
  JURISDICTIONS,
  INTAKE_FIELDS,
  isEmail,
  validateRegistration,
  validateLogin,
  validateCaseCreation,
  validateJoinCase,
  validateIntake,
  validateClause,
  validateComment,
  validateRejection,
  sendValidationError,
};
