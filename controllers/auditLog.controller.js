const catchAsync = require("../utils/catchAsync");
const AuditLog = require("../models/auditLog.model");
const { boundedLimit, boundedPage } = require("../utils/listQuery");
const auditLogService = require("../services/auditLog.service");

// Batch 5: admin audit-log viewer (admin + manager — see the role
// matrix in routes/adminHandover.routes.js).
//
// The writer (services/auditLog.service.js) already redacts
// secret-ish keys before storing; as defence in depth the response
// mapper runs every before/after snapshot through the same redact()
// again, so a legacy or hand-written row can never surface a
// token/OTP/password/secret/hash field through this endpoint.
const redactSnapshot =
  typeof auditLogService.redact === "function"
    ? auditLogService.redact
    : (value) => value;

const SECRETISH_KEY = /token|otp|password|secret|hash/i;

function stripSecretish(value) {
  const redacted = redactSnapshot(value);
  if (!redacted || typeof redacted !== "object" || Array.isArray(redacted)) {
    return redacted;
  }
  const out = {};
  for (const [key, val] of Object.entries(redacted)) {
    if (SECRETISH_KEY.test(key)) continue;
    out[key] = val;
  }
  return out;
}

/** GET /api/v1/admin/audit-logs?page&limit&action */
exports.getAuditLogs = catchAsync(async (req, res) => {
  const page = boundedPage(req.query.page);
  const limit = boundedLimit(req.query.limit, 20);
  const skip = (page - 1) * limit;

  const filter = {};
  if (typeof req.query.action === "string" && req.query.action) {
    filter.action = req.query.action;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ at: -1 })
      .populate("actor", "firstName lastName email role")
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const safeLogs = logs.map((log) => ({
    ...log,
    before: stripSecretish(log.before),
    after: stripSecretish(log.after),
  }));

  res.status(200).json({
    status: "success",
    results: safeLogs.length,
    data: {
      logs: safeLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});
