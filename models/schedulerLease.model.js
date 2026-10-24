const mongoose = require("mongoose");

// Phase 3 (AR-02, decision D-A): scheduler leases on MongoDB. One
// document per named schedule; whoever holds an unexpired lease is
// the only instance that runs that schedule. Expiry is evaluated by
// the acquisition filter (expiresAt <= now), not by a TTL index, so
// nothing is ever auto-deleted. See services/schedulerLease.service.js.
const schedulerLeaseSchema = new mongoose.Schema({
  _id: { type: String }, // the schedule name, e.g. "scheduled-content"
  holderId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SchedulerLease", schedulerLeaseSchema);
