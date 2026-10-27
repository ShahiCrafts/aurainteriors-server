"use strict";
// PERF-B-05 (U-2/U-3/U-4): the attribute-definition registry is a
// small, admin-curated collection that several hot paths used to
// load in full on every request (catalog list with attr.* filters,
// attribute resolution, the admin definitions list). This helper
// caches loader results in-process for 60s per cache key.
//
// The model is deliberately NOT required here: callers pass a loader
// that performs their existing (sometimes lazy) model require and
// query, preserving each call site's stub/lazy-loading behaviour.
// Values are stored as JSON strings so a caller can never mutate a
// cached entry by reference (same pattern as utils/ttlCache.js).
// Attribute-definition writes in catalog.controller invalidate.
const TTL_MS = 60000;
const entries = new Map();

async function getAttributeDefinitionsCached(cacheKey, loader) {
  const now = Date.now();
  const entry = entries.get(cacheKey);
  if (entry && now - entry.at < TTL_MS) {
    return JSON.parse(entry.json);
  }
  const value = await loader();
  entries.set(cacheKey, { at: now, json: JSON.stringify(value) });
  return value;
}

function invalidateAttributeRegistryCache() {
  entries.clear();
}

module.exports = {
  getAttributeDefinitionsCached,
  invalidateAttributeRegistryCache,
  TTL_MS,
  _entries: entries,
};
