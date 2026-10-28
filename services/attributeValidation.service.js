// Phase 2 (catalog) — attribute value validation.
//
// Pure validation/normalization for catalog attribute values,
// driven by AttributeDefinition records (models/
// attributeDefinition.model.js). No database access: callers pass
// definition objects (or a key->definition Map) in. Two surfaces:
//
//   validateValue(definition, value)
//     -> { ok: true, value } with the NORMALIZED value, or
//        { ok: false, error } with a precise, human reason.
//
//   validateCatalogAttributesMap(definitionsByKey, attrs)
//     -> validates a whole Product.catalogAttributes payload:
//        prototype-pollution keys anywhere in the payload are
//        rejected first (before anything is copied), unknown keys
//        and field-storage keys are rejected BY NAME, and every
//        value goes through validateValue. Returns the normalized
//        plain object on success.
//
// Type semantics (a definition's type/unit/allowedValues are the
// contract; assignments can never widen them):
//   string      string, trimmed, length-capped (def.maxLength || 500)
//   enum        string; if allowedValues is non-empty the value must
//               be a member (case-sensitive); empty = open vocabulary
//   multi-enum  array of strings, deduped in order, each a member
//               when allowedValues is non-empty; never empty
//   boolean     strictly typeof boolean (no "true"/1 coercion)
//   integer     finite whole number within min/max and on step
//   decimal     finite number within min/max and on step
//   money       finite number, >= max(0, def.min)
//   measurement { value, unit } exactly; value positive (or >=
//               def.min when set); unit must equal def.unit or be
//               in def.acceptedUnits (unconstrained only when the
//               definition declares neither)
//   color       hex #RGB/#RRGGBB normalized to lowercase #rrggbb;
//               when the definition declares allowedValues those
//               named values are the vocabulary instead (matched
//               case-insensitively, stored with declared casing)
//   dimensions  { length, width, height, unit? } exactly; each
//               dimension a positive finite number; unit defaults
//               to def.unit || "cm" and must be a known length unit

const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ATTRIBUTE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const MAX_ATTRIBUTES = 100;
const DEFAULT_STRING_MAX = 500;
const MAX_MULTI_VALUES = 50;
const LENGTH_UNITS = ["cm", "m", "in"];

const fail = (error) => ({ ok: false, error });
const pass = (value) => ({ ok: true, value });

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Deep scan for prototype-pollution keys. Returns the offending
// key name or null. Runs BEFORE any copying/validation so a
// hostile payload is never merged into a live object.
function findPollutionKey(value, depth = 0) {
  if (depth > 10 || typeof value !== "object" || value === null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPollutionKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const key of Object.keys(value)) {
    if (POLLUTION_KEYS.has(key)) return key;
    const found = findPollutionKey(value[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function checkBounds(definition, value) {
  if (
    definition.min !== undefined &&
    definition.min !== null &&
    value < definition.min
  ) {
    return `must be at least ${definition.min}`;
  }
  if (
    definition.max !== undefined &&
    definition.max !== null &&
    value > definition.max
  ) {
    return `must be at most ${definition.max}`;
  }
  if (definition.step) {
    const base = definition.min ?? 0;
    const quotient = (value - base) / definition.step;
    if (Math.abs(quotient - Math.round(quotient)) > 1e-9) {
      return `must be a multiple of ${definition.step}`;
    }
  }
  return null;
}

function validateEnumMembership(definition, value) {
  const allowed = definition.allowedValues || [];
  if (allowed.length > 0 && !allowed.includes(value)) {
    return `must be one of: ${allowed.join(", ")}`;
  }
  return null;
}

function validateValue(definition, value) {
  if (!definition || !definition.type)
    return fail("Unknown attribute definition");
  switch (definition.type) {
    case "string": {
      if (typeof value !== "string") return fail("must be a string");
      const trimmed = value.trim();
      const cap = definition.maxLength || DEFAULT_STRING_MAX;
      if (trimmed.length > cap)
        return fail(`must be at most ${cap} characters`);
      return pass(trimmed);
    }
    case "enum": {
      if (typeof value !== "string") return fail("must be a string");
      const trimmed = value.trim();
      if (!trimmed) return fail("must not be empty");
      const membership = validateEnumMembership(definition, trimmed);
      if (membership) return fail(membership);
      return pass(trimmed);
    }
    case "multi-enum": {
      if (!Array.isArray(value)) return fail("must be an array of strings");
      if (value.length === 0) return fail("must contain at least one value");
      if (value.length > MAX_MULTI_VALUES)
        return fail(`must contain at most ${MAX_MULTI_VALUES} values`);
      const seen = new Set();
      const out = [];
      for (const item of value) {
        if (typeof item !== "string")
          return fail("must be an array of strings");
        const trimmed = item.trim();
        if (!trimmed) return fail("must not contain empty values");
        const membership = validateEnumMembership(definition, trimmed);
        if (membership) return fail(membership);
        if (!seen.has(trimmed)) {
          seen.add(trimmed);
          out.push(trimmed);
        }
      }
      return pass(out);
    }
    case "boolean": {
      if (typeof value !== "boolean") return fail("must be a boolean");
      return pass(value);
    }
    case "integer": {
      if (typeof value !== "number" || !Number.isFinite(value))
        return fail("must be a number");
      if (!Number.isInteger(value)) return fail("must be a whole number");
      const bounds = checkBounds(definition, value);
      if (bounds) return fail(bounds);
      return pass(value);
    }
    case "decimal": {
      if (typeof value !== "number" || !Number.isFinite(value))
        return fail("must be a number");
      const bounds = checkBounds(definition, value);
      if (bounds) return fail(bounds);
      return pass(value);
    }
    case "money": {
      if (typeof value !== "number" || !Number.isFinite(value))
        return fail("must be a number");
      const floor = Math.max(0, definition.min ?? 0);
      if (value < floor) return fail(`must be at least ${floor}`);
      if (
        definition.max !== undefined &&
        definition.max !== null &&
        value > definition.max
      ) {
        return fail(`must be at most ${definition.max}`);
      }
      return pass(value);
    }
    case "measurement": {
      if (!isPlainObject(value))
        return fail("must be an object { value, unit }");
      const keys = Object.keys(value);
      if (keys.some((k) => k !== "value" && k !== "unit")) {
        return fail("must be an object { value, unit } with no other keys");
      }
      if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
        return fail("measurement value must be a number");
      }
      const floor = definition.min ?? null;
      if (floor !== null ? value.value < floor : value.value <= 0) {
        return fail(
          floor !== null
            ? `measurement value must be at least ${floor}`
            : "measurement value must be positive",
        );
      }
      if (typeof value.unit !== "string" || !value.unit.trim()) {
        return fail("measurement unit is required");
      }
      const unit = value.unit.trim();
      const accepted = definition.unit
        ? [definition.unit, ...(definition.acceptedUnits || [])]
        : definition.acceptedUnits || [];
      if (accepted.length > 0 && !accepted.includes(unit)) {
        return fail(`unit must be one of: ${accepted.join(", ")}`);
      }
      if (unit.length > 20) return fail("unit is too long");
      return pass({ value: value.value, unit });
    }
    case "color": {
      if (typeof value !== "string") return fail("must be a color string");
      const trimmed = value.trim();
      const allowed = definition.allowedValues || [];
      if (allowed.length > 0) {
        const match = allowed.find(
          (name) => name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (!match) return fail(`must be one of: ${allowed.join(", ")}`);
        return pass(match);
      }
      const hex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
      if (!hex) return fail("must be a hex color (#RGB or #RRGGBB)");
      let digits = trimmed.slice(1).toLowerCase();
      if (digits.length === 3)
        digits = digits
          .split("")
          .map((c) => c + c)
          .join("");
      return pass(`#${digits}`);
    }
    case "dimensions": {
      if (!isPlainObject(value))
        return fail("must be an object { length, width, height, unit }");
      const keys = Object.keys(value);
      if (
        keys.some((k) => !["length", "width", "height", "unit"].includes(k))
      ) {
        return fail(
          "must be an object { length, width, height, unit } with no other keys",
        );
      }
      const out = {};
      for (const part of ["length", "width", "height"]) {
        const partValue = value[part];
        if (
          typeof partValue !== "number" ||
          !Number.isFinite(partValue) ||
          partValue <= 0
        ) {
          return fail(`${part} must be a positive number`);
        }
        out[part] = partValue;
      }
      const accepted =
        definition.acceptedUnits && definition.acceptedUnits.length > 0
          ? definition.acceptedUnits
          : definition.unit
            ? [definition.unit]
            : LENGTH_UNITS;
      const unit =
        value.unit === undefined ? definition.unit || "cm" : value.unit;
      if (typeof unit !== "string" || !accepted.includes(unit)) {
        return fail(`unit must be one of: ${accepted.join(", ")}`);
      }
      out.unit = unit;
      return pass(out);
    }
    default:
      return fail(`Unsupported attribute type: ${definition.type}`);
  }
}

// Validate a whole catalogAttributes payload against the ACTIVE
// definition set. `definitionsByKey` is a Map of key -> definition
// (definitions of BOTH storages, so a field key earns its precise
// error instead of "unknown"). Returns { ok, value } with the
// normalized plain object, or { ok: false, error } naming the
// first failing key and its reason.
function validateCatalogAttributesMap(definitionsByKey, attrs) {
  if (!isPlainObject(attrs)) return fail("catalogAttributes must be an object");
  const pollution = findPollutionKey(attrs);
  if (pollution)
    return fail(`catalogAttributes contains a forbidden key: "${pollution}"`);
  const keys = Object.keys(attrs);
  if (keys.length > MAX_ATTRIBUTES)
    return fail(
      `catalogAttributes cannot hold more than ${MAX_ATTRIBUTES} attributes`,
    );
  const normalized = {};
  for (const key of keys) {
    if (!ATTRIBUTE_KEY_PATTERN.test(key)) {
      return fail(`Invalid attribute key: "${key}"`);
    }
    const definition = definitionsByKey.get(key);
    if (!definition) {
      return fail(`Unknown attribute key: "${key}"`);
    }
    // `storage` defaults to "catalogAttributes" on the model; a
    // plain-object definition without the field means the same.
    if ((definition.storage || "catalogAttributes") !== "catalogAttributes") {
      return fail(
        `Attribute "${key}" is a product field, not a catalog attribute`,
      );
    }
    const result = validateValue(definition, attrs[key]);
    if (!result.ok) {
      return fail(`Attribute "${key}": ${result.error}`);
    }
    normalized[key] = result.value;
  }
  return pass(normalized);
}

// Keys from a resolved attribute set (services/
// attributeResolution.service.js) that are required, live in
// catalogAttributes, and are absent (or null) in the given values.
function missingRequiredAttributes(resolvedAttributes, attrs) {
  const values = attrs || {};
  return (resolvedAttributes || [])
    .filter(
      (entry) =>
        entry.required &&
        entry.storage === "catalogAttributes" &&
        (values[entry.key] === undefined || values[entry.key] === null),
    )
    .map((entry) => entry.key);
}

module.exports = {
  validateValue,
  validateCatalogAttributesMap,
  findPollutionKey,
  missingRequiredAttributes,
  ATTRIBUTE_KEY_PATTERN,
};
