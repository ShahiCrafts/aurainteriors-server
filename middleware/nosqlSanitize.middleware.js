const AppError = require("../utils/AppError");

// Defense-in-depth against NoSQL operator injection (C-14).
//
// Every endpoint that consumes client input already validates or
// scopes it, and the classic {"$ne": null} login bypass was verified
// NOT exploitable in this codebase - but there was no global net.
// This middleware rejects request bodies, query strings and route
// params that carry Mongo-operator-style KEYS ($-prefixed, dotted, or
// __proto__) at any depth. Values are untouched (a chat message saying
// "costs $5" is fine). Legitimate API payloads never use such keys;
// operators are constructed server-side only.
//
// FA-61 (FRESH) - coverage notes:
// - Depth: structures nested beyond MAX_DEPTH are REJECTED (fail
//   closed); the previous implementation stopped scanning and passed.
// - Multipart: this global pass runs BEFORE multer parses multipart
//   bodies, so upload middlewares re-run the same check after parsing
//   (see the wrappers in middleware/upload.middleware.js and
//   chatUpload.middleware.js). JSON bodies and the query string are
//   covered by the global pass.
const MAX_DEPTH = 10;

const hasOperatorKey = (value, depth = 0) => {
  if (!value || typeof value !== "object") return false;
  if (depth > MAX_DEPTH) return true; // fail closed (FA-61)
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".") || key === "__proto__") return true;
    if (hasOperatorKey(value[key], depth + 1)) return true;
  }
  return false;
};

// F-910-1 (Phase 9+10): the Phase 5 faceted-filter grammar rides
// FLAT dotted query keys (attr.<key>, attr.<key>.min/.max) — the
// app's query parser is the flat "simple" parser, so the dot is
// part of the key string itself, and the blanket dot rule above
// rejected every faceted-filter request before Joi or the filter
// parser could see it. The grammar was only ever exercised below
// this middleware (qs -> Joi -> controller), so the break shipped
// unnoticed until the closing integration pass ran it over HTTP.
//
// Carve-out, deliberately narrow — ALL of: the request is a
// GET/HEAD on the products list path exactly; the key matches the
// grammar's outer shape (one attribute segment of [A-Za-z0-9_],
// one optional .min/.max suffix); the segment is not a pollution
// word; the value is a plain string. Exempted keys reach exactly
// one consumer — services/catalogFilter.service.js — which
// re-validates every key against the attribute registry and its
// own grammar (rejecting $, extra segments, pollution words,
// container values) with 400s, and reads values as literals only.
// Every other dotted key, on every route including this one,
// keeps the C-14 rejection.
const ATTR_QUERY_KEY = /^attr\.[A-Za-z0-9_]+(\.(min|max))?$/;
const POLLUTION_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);
const PRODUCTS_LIST_PATH = /^\/api\/v1\/products\/?$/;

const isExemptAttrKey = (req, key, value) => {
  if (!req || (req.method !== "GET" && req.method !== "HEAD")) return false;
  if (typeof req.path !== "string" || !PRODUCTS_LIST_PATH.test(req.path)) return false;
  if (!ATTR_QUERY_KEY.test(key)) return false;
  if (POLLUTION_SEGMENTS.has(key.split(".")[1])) return false;
  return typeof value === "string";
};

const hasOperatorKeyInQuery = (req) => {
  const query = req.query;
  if (!query || typeof query !== "object") return false;
  for (const key of Object.keys(query)) {
    if (isExemptAttrKey(req, key, query[key])) continue;
    if (key.startsWith("$") || key.includes(".") || key === "__proto__") return true;
    if (hasOperatorKey(query[key], 1)) return true;
  }
  return false;
};

const nosqlSanitize = (req, res, next) => {
  if (hasOperatorKey(req.body) || hasOperatorKeyInQuery(req) || hasOperatorKey(req.params)) {
    return next(new AppError("Invalid request payload", 400));
  }
  return next();
};

module.exports = nosqlSanitize;
module.exports.hasOperatorKey = hasOperatorKey;
