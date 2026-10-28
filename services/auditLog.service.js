// VULN-004: structured audit logging for sensitive admin / payment /
// account actions (see models/auditLog.model.js).
//
// Contract:
//  - record() NEVER throws and NEVER hangs. An audit failure must not
//    break — or stall — the user action that was being audited;
//    failures are surfaced via console.error instead.
//  - The model is required LAZILY (the codebase's getQdrant pattern):
//    controllers load this service at module scope, and several test
//    harnesses stub `mongoose` or individual models — an eager model
//    require would crash those loads. Inside record(), any such
//    failure is caught by the same never-throws contract.
//  - before/after snapshots are redacted before writing: any key
//    whose name matches /token|otp|password|secret|hash/i is dropped
//    (shallow, plus one level of nesting). Tokens, OTPs, passwords
//    and secrets must never reach the audit trail.

const SENSITIVE_KEY = /token|otp|password|secret|hash/i;

const redactValue = (value, depth) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) continue;
    out[key] =
      depth < 1 && val && typeof val === "object" && !Array.isArray(val)
        ? redactValue(val, depth + 1)
        : val;
  }
  return out;
};

const redact = (snapshot) => redactValue(snapshot, 0);

exports.redact = redact; // exported for tests

exports.record = async ({
  actor,
  action,
  targetType,
  targetId,
  before,
  after,
  ip,
} = {}) => {
  try {
    if (!action) return null;
    // Never buffer-and-hang on a disconnected database: with no live
    // connection a Mongoose create would sit in the command buffer
    // and stall the audited request. Skipping is safe — the audited
    // action's own queries need the same connection.
    const mongoose = require("mongoose");
    if (!mongoose.connection || mongoose.connection.readyState !== 1)
      return null;
    const AuditLog = require("../models/auditLog.model");
    return await AuditLog.create({
      actor: actor || undefined,
      action,
      targetType: targetType || undefined,
      targetId: targetId != null ? String(targetId) : undefined,
      before: redact(before),
      after: redact(after),
      ip: ip || undefined,
      at: new Date(),
    });
  } catch (error) {
    console.error(
      "[auditLog] failed to record audit entry:",
      error && error.message,
    );
    return null;
  }
};
