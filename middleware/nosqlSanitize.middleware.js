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

const nosqlSanitize = (req, res, next) => {
  if (hasOperatorKey(req.body) || hasOperatorKey(req.query) || hasOperatorKey(req.params)) {
    return next(new AppError("Invalid request payload", 400));
  }
  return next();
};

module.exports = nosqlSanitize;
module.exports.hasOperatorKey = hasOperatorKey;
