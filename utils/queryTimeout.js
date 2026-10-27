"use strict";
// PERF-B-11: per-query maxTimeMS bounds outside the chat-tool path.
// Before this, a slow list query or aggregation on the catalog
// paths ran until the 45s Mongo socket timeout, holding a pool
// connection the whole time. The helper is duck-typed on purpose:
// it applies .maxTimeMS only when the query object supports it, so
// stubbed queries in tests (and non-query thenables) pass through
// untouched.
//
// Env (plain environment, no appConfig registry key — see the note
// in utils/catalogCache.js about the pinned registry key set):
//   MAX_TIME_LIST_MS  default 10000  (find / countDocuments)
//   MAX_TIME_AGG_MS   default 20000  (aggregations)
// A non-positive or non-numeric value falls back to the default.
function maxTimeFor(kind = "list", env = process.env) {
  const raw = kind === "agg" ? env.MAX_TIME_AGG_MS : env.MAX_TIME_LIST_MS;
  const fallback = kind === "agg" ? 20000 : 10000;
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function applyMaxTime(query, kind = "list", env = process.env) {
  try {
    if (query && typeof query.maxTimeMS === "function") {
      query.maxTimeMS(maxTimeFor(kind, env));
    }
  } catch {
    // A timeout hint must never break the query it annotates.
  }
  return query;
}

module.exports = { maxTimeFor, applyMaxTime };
