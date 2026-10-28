const mongoose = require("mongoose");

// AR-20: durable email outbox. Every email send outcome is recorded
// here in BOTH modes; in EMAIL_MODE=outbox the row is written in the
// same transaction as the business write and drained with bounded
// retries. Payloads can hold a raw magic-link token / OTP, so the
// payload is WIPED on any terminal state (sent / dead-letter) — it is
// retained only while a retry is still possible.
const emailOutboxSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["order-confirmation", "magic-link", "otp", "newsletter-welcome"],
      required: true,
    },
    to: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["queued", "sending", "sent", "failed"],
      default: "queued",
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    lastError: { type: String, default: null },
    // Optional dedupe, same pattern as the Job model: the field must
    // stay ABSENT (not null) on keyless rows so the partial unique
    // index ignores them.
    dedupeKey: { type: String },
    nextAttemptAt: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

emailOutboxSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);
emailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });

module.exports = mongoose.model("EmailOutbox", emailOutboxSchema);
