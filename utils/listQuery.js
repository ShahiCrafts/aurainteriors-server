exports.boundedLimit = (value, fallback = 20) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, 100) : fallback;
};
exports.boundedPage = value => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, 10000) : 1;
};
// AR-19: additive keyset (cursor) pagination. A cursor is the opaque
// base64url encoding of the last returned item's sort key:
// { c: createdAt ISO string, id: _id string } for the house sort
// (createdAt desc, _id desc tiebreak). Decoding anything malformed
// yields null, and callers treat null as "start from the top" so a
// garbage cursor degrades to the first page instead of a 500.
exports.encodeCursor = (doc) => {
  if (!doc || !doc.createdAt || doc._id === undefined) return null;
  const payload = { c: new Date(doc.createdAt).toISOString(), id: String(doc._id) };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
};
exports.decodeCursor = (value) => {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const when = new Date(parsed.c);
    if (!parsed.id || Number.isNaN(when.getTime())) return null;
    return { createdAt: when, _id: parsed.id };
  } catch { return null; }
};
// Mongo filter matching items strictly AFTER the cursor in
// (createdAt desc, _id desc) order. Returned as a $or clause so the
// caller can $and it with any existing filter (including a search $or).
exports.cursorAfterFilter = (cursor) => {
  let id = cursor._id;
  // Real collections store ObjectId _ids; a string comparison would
  // never match, so a 24-hex cursor id is converted back to ObjectId.
  if (typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)) {
    try { id = new (require("mongoose").Types.ObjectId)(id); } catch { /* keep string */ }
  }
  return {
    $or: [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: { $eq: cursor.createdAt }, _id: { $lt: id } },
    ],
  };
};

const { escapeRegExp, literalRegExp } = require("./escapeRegex");
exports.literalRegex = literalRegExp;
exports.escapeRegex = escapeRegExp;

// Parse an Express-style sort string ("-createdAt", "price,-name") into
// a Mongoose sort object, keeping only allowlisted fields (B-26/C-04).
// Unknown fields, $-operators, prototype keys and non-string input are
// dropped; if nothing valid remains, the fallback (parsed against the
// same allowlist) is used. List endpoints previously handed the raw
// client string to .sort(), exposing every schema path as a sort key.
exports.safeSort = (value, allowedFields, fallback = "-createdAt") => {
  const allowed = new Set(allowedFields);
  const parse = (input) => {
    const out = {};
    if (typeof input !== "string") return out;
    for (const token of input.split(",").slice(0, 5)) {
      const trimmed = token.trim();
      if (!trimmed) continue;
      const desc = trimmed.startsWith("-");
      const field = desc ? trimmed.slice(1) : trimmed;
      if (allowed.has(field)) out[field] = desc ? -1 : 1;
    }
    return out;
  };
  const parsed = parse(value);
  if (Object.keys(parsed).length > 0) return parsed;
  const fallbackParsed = parse(fallback);
  // Last resort if a caller passes a fallback outside its own allowlist.
  return Object.keys(fallbackParsed).length > 0 ? fallbackParsed : { createdAt: -1 };
};
