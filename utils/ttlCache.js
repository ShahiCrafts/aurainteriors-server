// AR-11/AR-17: tiny in-process TTL cache for expensive read aggregates.
// Freshness trade-off (see docs/adr/ADR-0003): caching is DISABLED unless
// ANALYTICS_CACHE_TTL_MS is set to a positive number of milliseconds.
// Unset / 0 / non-numeric = no caching = pre-fix behavior (every call
// recomputes). When enabled, figures may be stale by up to the TTL —
// that is the documented, opt-in trade-off. Values are stored as JSON
// strings so callers can never mutate a cached entry by reference.
const store = new Map();

// PERF-015 (remediation): the Map is size-bounded so fuzzed query
// strings cannot grow it for the life of the process. The bound is
// read from the plain environment (mirroring utils/catalogCache.js,
// which deliberately avoids the appConfig registry so the pinned
// registry/.env.example key set stays in sync): unset/invalid -> 500.
function maxEntries(env = process.env) {
  const n = Number(env.ANALYTICS_CACHE_MAX_ENTRIES);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 500;
}

// Oldest-first eviction: Map preserves insertion order, and setCached
// re-inserts existing keys so order tracks recency (LRU).
function evictOverflow(env = process.env) {
  const max = maxEntries(env);
  while (store.size > max) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

// Expired-entry sweep: expiry was previously only evaluated when the
// same key was read again. The timer is unref()'d so it can never
// keep the process (or the test runner) alive, and stopSweep() is
// exported for graceful shutdown.
function sweepExpired(now = Date.now()) {
  const ttl = ttlMs();
  if (!ttl) return 0;
  let removed = 0;
  for (const [key, entry] of store) {
    if (now - entry.at > ttl) {
      store.delete(key);
      removed++;
    }
  }
  return removed;
}
const sweepTimer = setInterval(() => {
  try {
    sweepExpired();
  } catch {
    /* sweep must never crash the process */
  }
}, 60 * 1000);
if (typeof sweepTimer.unref === "function") sweepTimer.unref();
function stopSweep() {
  clearInterval(sweepTimer);
}

function ttlMs(envName = "ANALYTICS_CACHE_TTL_MS") {
  const n = parseInt(require("../config/appConfig").getInt(envName), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getCached(key) {
  const ttl = ttlMs();
  if (!ttl) return undefined;
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > ttl) {
    store.delete(key);
    return undefined;
  }
  return JSON.parse(entry.json);
}

function setCached(key, value) {
  if (!ttlMs()) return;
  store.delete(key); // re-insert so insertion order tracks recency
  store.set(key, { at: Date.now(), json: JSON.stringify(value) });
  evictOverflow();
}

function clearCache() {
  store.clear();
}

module.exports = {
  ttlMs,
  getCached,
  setCached,
  clearCache,
  maxEntries,
  sweepExpired,
  stopSweep,
  _store: store,
};
