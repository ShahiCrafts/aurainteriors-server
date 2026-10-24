// Canonical regex-escaping helpers (CodeQL workstream, class C).
//
// Any user-supplied text that goes into a RegExp or a $regex MUST be
// escaped first: unescaped input is regex injection ("(a+)+$" is a
// ReDoS, ".*" defeats the filter, "[" throws a 500). escapeRegExp is
// the single definition for the whole codebase - utils/listQuery
// re-exports it, and handlers import it directly so the sanitization
// is visible at the point of use. Inputs are length-capped at 100
// characters, matching the historical behavior of the helpers this
// module replaces.

const REGEX_METACHARS = /[.*+?^${}()|[\]\\]/g;

const escapeRegExp = (value) =>
  String(value).slice(0, 100).replace(REGEX_METACHARS, "\\$&");

/** Case-insensitive RegExp that matches the value as literal text. */
const literalRegExp = (value, flags = "i") => new RegExp(escapeRegExp(value), flags);

module.exports = { escapeRegExp, escapeRegex: escapeRegExp, literalRegExp };
