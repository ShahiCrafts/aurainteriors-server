const mongoose = require("mongoose");

// VULN-004: append-only audit trail for sensitive admin / payment /
// account actions. Rows are written by services/auditLog.service.js
// AFTER the action succeeds; nothing in the codebase updates or
// deletes rows (append-only by convention — enforce at the database
// level with a restricted user if the deployment supports it).
// before/after hold small status snapshots only; the service redacts
// any token/OTP/password/secret/hash keys before writing.
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  targetType: { type: String },
  targetId: { type: String },
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
  at: { type: Date, default: Date.now },
});

auditLogSchema.index({ targetType: 1, targetId: 1, at: -1 });
auditLogSchema.index({ actor: 1, at: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
