// AR-11/AR-17: tiny in-process TTL cache for expensive read aggregates.
// Freshness trade-off (see docs/adr/ADR-0003): caching is DISABLED unless
// ANALYTICS_CACHE_TTL_MS is set to a positive number of milliseconds.
// Unset / 0 / non-numeric = no caching = pre-fix behavior (every call
// recomputes). When enabled, figures may be stale by up to the TTL —
// that is the documented, opt-in trade-off. Values are stored as JSON
// strings so callers can never mutate a cached entry by reference.
const store = new Map();

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
  store.set(key, { at: Date.now(), json: JSON.stringify(value) });
}

function clearCache() {
  store.clear();
}

module.exports = { ttlMs, getCached, setCached, clearCache, _store: store };
