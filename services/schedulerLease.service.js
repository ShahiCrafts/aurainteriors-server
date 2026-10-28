// Phase 3 step 2 (AR-02, decision D-A): scheduler leases on MongoDB.
// Every periodic task in services/backgroundTasks.js runs under a
// named lease, so with N web instances exactly one runs a given
// schedule per period; with one instance the lease is always acquired
// and behavior is identical to the pre-lease code.
//
// Semantics:
//   tryAcquire(name, holderId, ttlMs) - atomic findOneAndUpdate: wins
//   only if no lease exists, the existing lease has expired, or the
//   caller already holds it (re-acquire extends). Concurrent racers:
//   exactly one wins; the upsert losers get a duplicate-key and lose.
//   withLease(name, ttlMs, fn, { holderId }) - acquire; if not
//   acquired, skip and return false. If acquired, run fn while a
//   refresher renews the lease at ttl/3. The lease is NOT released
//   early on completion: it lapses at its TTL, which is what makes
//   "once per period per fleet" hold when instances tick out of
//   phase. If the holder crashes, the lease expires within the TTL
//   and another instance takes the next period.
const crypto = require("crypto");
const os = require("os");
const mongoose = require("mongoose");
const SchedulerLease = require("../models/schedulerLease.model");

const DEFAULT_HOLDER_ID = `${os.hostname()}:${process.pid}:${crypto.randomBytes(4).toString("hex")}`;

// The lease collection lives in the SAME MongoDB as all application
// data, so "lease store unreachable" is only possible when the app
// database itself is unreachable (or not yet connected - unit tests,
// stubbed boots) - in which case the scheduled work cannot touch the
// database either. In that state acquisition degrades to a local,
// per-process grant so single-process and disconnected behavior stay
// exactly what they were before leases existed. While CONNECTED, an
// operation error is a real failure and propagates (callers fail
// closed: they skip the run).
const isConnected = () => mongoose.connection.readyState === 1;

async function tryAcquire(name, holderId, ttlMs) {
  const now = new Date();
  if (!isConnected())
    return {
      _id: name,
      holderId,
      expiresAt: new Date(now.getTime() + ttlMs),
      local: true,
    };
  const expiresAt = new Date(now.getTime() + ttlMs);
  try {
    const doc = await SchedulerLease.findOneAndUpdate(
      { _id: name, $or: [{ expiresAt: { $lte: now } }, { holderId }] },
      { $set: { holderId, expiresAt, updatedAt: now } },
      { upsert: true, new: true },
    );
    return doc && doc.holderId === holderId ? doc : null;
  } catch (error) {
    // Upsert race: another holder inserted first - that is a loss,
    // not an error.
    if (error && error.code === 11000) return null;
    throw error;
  }
}

async function renew(name, holderId, ttlMs) {
  if (!isConnected()) return true;
  const now = new Date();
  const res = await SchedulerLease.updateOne(
    { _id: name, holderId },
    { $set: { expiresAt: new Date(now.getTime() + ttlMs), updatedAt: now } },
  );
  return res.matchedCount === 1;
}

async function release(name, holderId) {
  if (!isConnected()) return true;
  const res = await SchedulerLease.deleteOne({ _id: name, holderId });
  return res.deletedCount === 1;
}

async function withLease(
  name,
  ttlMs,
  fn,
  { holderId = DEFAULT_HOLDER_ID, releaseOnDone = false } = {},
) {
  const lease = await tryAcquire(name, holderId, ttlMs);
  if (!lease) return false;
  const refresher = setInterval(
    () => {
      renew(name, holderId, ttlMs).catch(() => {});
    },
    Math.max(250, Math.floor(ttlMs / 3)),
  );
  refresher.unref?.();
  try {
    await fn();
    return true;
  } finally {
    clearInterval(refresher);
    if (releaseOnDone) await release(name, holderId).catch(() => {});
  }
}

module.exports = {
  tryAcquire,
  acquire: tryAcquire, // alias - reads better at setup call sites
  renew,
  release,
  withLease,
  holderId: () => DEFAULT_HOLDER_ID,
};
