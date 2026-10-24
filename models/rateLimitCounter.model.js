const mongoose = require("mongoose");

// AR-02 (D-A, D1): shared rate-limit counters for
// RATE_LIMIT_STORE=mongo. One document per (limiter-instance prefix,
// key): hits within the current window and the instant the window
// resets. Windows are enforced by the stored resetAt (see
// middleware/mongoRateLimitStore.js) — the TTL index below is only
// garbage collection for abandoned counters, so correctness never
// depends on the TTL monitor's cadence. NEW collection (created
// empty by definition), so the schema-declared index is safe here
// (the AR-42/AR-16 no-boot-index precedent guards pre-existing
// production collections).
const rateLimitCounterSchema = new mongoose.Schema({
  _id: { type: String },
  hits: { type: Number, default: 0 },
  resetAt: { type: Date, required: true },
});

rateLimitCounterSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RateLimitCounter", rateLimitCounterSchema);
