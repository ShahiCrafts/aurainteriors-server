"use strict";
// PERF-B-01: in-process TTL cache for the anonymous product-list
// response (controllers/product.controller.js getAllProducts).
//
// Deliberately NOT wired through config/appConfig.js: the registry
// key-set is pinned by tests/platform/app-config.test.js against
// .env.example AND the .env.development/.env.production templates,
// and those template files are absent from this tree — adding a
// registry key here would desynchronise that pinned set. The TTL is
// therefore read from the plain environment, mirroring the semantics
// of ANALYTICS_CACHE_TTL_MS in utils/ttlCache.js:
//   CATALOG_CACHE_TTL_MS unset      -> 45000 (45s default)
//   CATALOG_CACHE_TTL_MS=0          -> caching disabled
//   CATALOG_CACHE_TTL_MS=<positive> -> that many milliseconds
// Values are stored as JSON strings so callers can never mutate a
// cached entry by reference (same pattern as utils/ttlCache.js).
const store = new Map();

function ttlMs(env = process.env) {
  const raw = env.CATALOG_CACHE_TTL_MS;
  if (raw === undefined || raw === "") return 45000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 45000;
  return n;
}

// PERF-015 (remediation): size bound for the store Map, same plain-env
// pattern as the TTL above (CATALOG_CACHE_MAX_ENTRIES, default 500),
// with oldest-first (LRU) eviction plus an unref()'d expired-entry
// sweep — previously entries were only expired when re-read, and the
// Map could grow unboundedly on fuzzed query strings.
function maxEntries(env = process.env) {
  const n = Number(env.CATALOG_CACHE_MAX_ENTRIES);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 500;
}

function evictOverflow(env = process.env) {
  const max = maxEntries(env);
  while (store.size > max) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

function sweepExpired(now = Date.now(), env = process.env) {
  const ttl = ttlMs(env);
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

// A request may be served from / stored to this cache only when it
// carries no credential of any kind: the list handler personalises
// visibility by req.user (draft statuses for admins), so any
// authenticated or cookie-bearing request bypasses the cache in
// both directions.
function isAnonymousRequest(req) {
  if (!req) return false;
  if (req.user) return false;
  const headers = req.headers || {};
  if (headers.authorization) return false;
  const cookieHeader = headers.cookie || "";
  if (/(?:^|;\s*)jwt=/.test(cookieHeader)) return false;
  return true;
}

// Canonical key: query entries sorted by key (recursively for plain
// objects) so ?a=1&b=2 and ?b=2&a=1 share one entry. Array order is
// significant (repeated params) and preserved.
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}

function keyFor(query) {
  return `products:${JSON.stringify(canonicalize(query || {}))}`;
}

function get(key, env = process.env) {
  const ttl = ttlMs(env);
  if (!ttl) return undefined;
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > ttl) {
    store.delete(key);
    return undefined;
  }
  return JSON.parse(entry.json);
}

function set(key, value, env = process.env) {
  if (!ttlMs(env)) return;
  store.delete(key); // re-insert so insertion order tracks recency
  store.set(key, { at: Date.now(), json: JSON.stringify(value) });
  evictOverflow(env);
}

// Called from the admin write handlers for products, categories,
// collections and attribute definitions (product/category/catalog
// controllers): any such write makes every cached list stale.
function invalidateCatalogCache() {
  store.clear();
}

module.exports = {
  ttlMs,
  maxEntries,
  sweepExpired,
  stopSweep,
  isAnonymousRequest,
  canonicalize,
  keyFor,
  get,
  set,
  invalidateCatalogCache,
  _store: store,
};
