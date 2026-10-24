// Scalar parameter coercion (CodeQL workstream, class A/B).
//
// Query strings, JSON bodies and route params are attacker-shaped:
// Express happily delivers arrays (?x=1&x=2) and objects (?x[$ne]=1)
// where handlers expect scalars. Feeding those into .split(),
// parseFloat() or a Mongo filter either crashes the handler or,
// worse, changes the query's meaning (type confusion / NoSQL
// injection). These helpers force a value into ONE scalar of the
// expected type or return undefined ("treat as absent"). They are
// deliberately simple typeof checks so both humans and static
// analysis can see the sanitization at the point of use.

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/** The value if it is a string (length-capped), else undefined. */
exports.asString = (value, maxLength = 200) =>
  typeof value === "string" ? value.slice(0, maxLength) : undefined;

/** Finite number from a number or numeric string, else undefined. */
exports.asNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/** true/false from booleans or "true"/"false", else undefined. */
exports.asBoolean = (value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
};

/** The value if it is a string in the allowlist, else undefined. */
exports.asEnum = (value, allowed) =>
  typeof value === "string" && allowed.includes(value) ? value : undefined;

/** The value if it is a 24-hex ObjectId string, else undefined. */
exports.asObjectId = (value) =>
  typeof value === "string" && OBJECT_ID_RE.test(value) ? value : undefined;

/**
 * A comma-separated query value ("a, b ,c") as a list of strings.
 * Anything that is not a string (array, object, number) yields [].
 */
exports.asStringList = (value, { maxItems = 50, maxLength = 100 } = {}) => {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
};
