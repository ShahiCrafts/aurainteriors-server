const mongoose = require("mongoose");

// Phase 3 (AR-02 groundwork): durable job queue, in-repo on MongoDB
// (owner decision D-A: no new services, no Redis). A job is claimed
// atomically (findOneAndUpdate), stays invisible to other workers
// while its heartbeat is fresh, and dead-letters once its attempts
// are exhausted. See services/jobQueue.service.js.
const jobSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "dead"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    runAt: { type: Date, default: Date.now },
    // Optional dedupe: a second enqueue with the same key returns the
    // existing job instead of creating a duplicate. Deliberately NO
    // default: the field must stay ABSENT (not null) on keyless jobs
    // so the partial unique index below ignores them.
    idempotencyKey: { type: String },
    claimedBy: { type: String, default: null },
    claimedAt: { type: Date, default: null },
    heartbeatAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// New collection (created empty by definition), so schema-declared
// indexes are safe here - the no-boot-index precedent (AR-42/AR-16)
// guards PRE-EXISTING production collections whose builds can fail or
// lock on legacy data.
jobSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);
jobSchema.index({ status: 1, runAt: 1 });
jobSchema.index({ type: 1, status: 1, runAt: 1 });

module.exports = mongoose.model("Job", jobSchema);
