// AR-02 (D-A, D1): MongoDB-backed store for express-rate-limit v8,
// used when RATE_LIMIT_STORE=mongo (default: the per-process
// MemoryStore, i.e. limits multiply by N instances). Counters live in
// the `ratelimitcounters` collection (models/rateLimitCounter.model)
// so every instance increments the SAME document and the configured
// limit holds across the fleet.
//
// Each limiter instance gets its OWN store instance with a unique
// prefix (see storeFor in middleware/rateLimit.middleware.js): with
// MemoryStore each limiter has its own bucket space, and factory
// limiters (public/user) must not merge buckets across call sites —
// the prefix preserves that isolation exactly, in the document _id.
//
// Window semantics: a counter is live while resetAt > now. increment
// first tries the atomic live-window $inc; on a miss (no counter yet,
// or the window expired) it upserts a fresh window (hits=1, resetAt =
// now + windowMs). The upsert can lose a create race (duplicate key
// 11000) when two instances create the same counter concurrently —
// the loser retries the live-window $inc once, which then succeeds
// against the winner's fresh window.
const RateLimitCounter = require("../models/rateLimitCounter.model");

class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix || "rl";
    // Keys are shared across instances by design (that is the point
    // of the store) — express-rate-limit's double-count check keys
    // off this flag.
    this.localKeys = false;
    this.windowMs = 15 * 60 * 1000;
  }

  init(options) {
    if (options && Number.isFinite(options.windowMs) && options.windowMs > 0) {
      this.windowMs = options.windowMs;
    }
  }

  fullKey(key) {
    return `${this.prefix}:${key}`;
  }

  async increment(key) {
    const _id = this.fullKey(key);
    const now = new Date();
    // (1) Live window: atomic increment.
    const live = await RateLimitCounter.findOneAndUpdate(
      { _id, resetAt: { $gt: now } },
      { $inc: { hits: 1 } },
      { new: true },
    );
    if (live) return { totalHits: live.hits, resetTime: live.resetAt };
    // (2) No counter / expired window: upsert a fresh window.
    try {
      const fresh = await RateLimitCounter.findOneAndUpdate(
        { _id },
        { $set: { hits: 1, resetAt: new Date(now.getTime() + this.windowMs) } },
        { upsert: true, new: true },
      );
      return { totalHits: fresh.hits, resetTime: fresh.resetAt };
    } catch (error) {
      // (3) Create race lost to a concurrent instance: its fresh
      // window is live now, so the live-window increment succeeds.
      if (error && error.code === 11000) {
        const retried = await RateLimitCounter.findOneAndUpdate(
          { _id, resetAt: { $gt: new Date() } },
          { $inc: { hits: 1 } },
          { new: true },
        );
        if (retried)
          return { totalHits: retried.hits, resetTime: retried.resetAt };
      }
      throw error;
    }
  }

  async decrement(key) {
    await RateLimitCounter.findOneAndUpdate(
      { _id: this.fullKey(key), hits: { $gt: 0 } },
      { $inc: { hits: -1 } },
      { new: true },
    );
  }

  async resetKey(key) {
    await RateLimitCounter.deleteOne({ _id: this.fullKey(key) });
  }

  async resetAll() {
    await RateLimitCounter.deleteMany({});
  }

  async get(key) {
    const doc = await RateLimitCounter.findById(this.fullKey(key)).lean();
    if (!doc) return undefined;
    return { totalHits: doc.hits, resetTime: doc.resetAt };
  }
}

module.exports = MongoRateLimitStore;
