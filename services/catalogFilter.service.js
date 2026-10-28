// Phase 5 (catalog) — server-side faceted filter engine: the
// `attr.*` query grammar for GET /products, per-type value parsing
// against the Phase 2 AttributeDefinition registry, and the Mongo
// clause builder that gives attribute / price / availability
// conditions variant-aware semantics over the Phase 3/4 data model.
//
// PURE module by design: no model requires (the Phase 4 lesson —
// commerce and list controllers lazy-load anything that pulls in
// model files, so stub harnesses never see them). Callers inject
// the registry as a Map of key -> definition (lean documents or
// plain objects with the definition fields).
//
// GRAMMAR (all keys live in the `attr.` namespace; the namespace
// is new in Phase 5, has no legacy clients, and is STRICT —
// malformed input is a 400, never a silent ignore):
//   attr.<key>=v1,v2        exact values; comma = OR within the
//                            attribute, distinct keys AND across.
//   attr.<key>.min=<n>      range lower bound (numeric types).
//   attr.<key>.max=<n>      range upper bound (numeric types).
// <key> must be a registered attribute key whose definition is
// active and filterable. Values are parsed per definition type:
//   enum / multi-enum / string / color — literal string matches
//     (NEVER turned into a regex — the legacy colors/materials
//     params keep their own case-insensitive behavior untouched);
//     color hex values are normalized exactly like the write path
//     (lowercase #rrggbb) so hex filters match stored values.
//   boolean — only the literals 'true' / 'false'.
//   integer / decimal / money / measurement — finite numbers;
//     exact matches the stored scalar (measurement: the stored
//     { value, unit } object's `value`, expressed in the
//     definition's unit); ranges compare the same scalar.
//   dimensions — no scalar grammar exists; filtering by value is
//     rejected (400) rather than silently ignored.
//
// INJECTION POSTURE: the parser only ever sees string values —
// container values (?attr.color[$ne]=x arrives as an object) are
// 400s. Keys containing '$', extra dot segments, or prototype-
// pollution segments (__proto__ / constructor / prototype) are
// 400s. Nothing user-shaped reaches a Mongo operator position:
// paths are built from registry keys, values stay literal data.
const AppError = require("../utils/AppError");
const { CATALOG_SORT_FIELDS } = require("../utils/catalogListQuery");

const POLLUTION_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);
const ATTRIBUTE_KEY_PATTERN = /^[A-Za-z0-9_]+$/;
const NUMERIC_TYPES = new Set(["integer", "decimal", "money", "measurement"]);
// Mirror of services/productVariant.service.js VARIANT_OPTION_TYPES
// (the scalar types a variant option may carry). Duplicated here
// to keep this module model-free; a unit test pins the two lists
// equal so they cannot drift.
const AXIS_TYPES = new Set([
  "string",
  "enum",
  "boolean",
  "integer",
  "decimal",
  "money",
  "color",
]);
const MAX_RAW_VALUE_LENGTH = 2000;
const MAX_ITEMS = 50;
const MAX_ITEM_LENGTH = 200;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const badRequest = (message) => new AppError(message, 400);

// Mirrors services/attributeValidation.service.js color
// normalization (the write path): #RGB/#RRGGBB in any case ->
// lowercase #rrggbb. Non-hex values (named colors on definitions
// that declare them) pass through literally.
function normalizeColorValue(value) {
  if (!HEX_COLOR_PATTERN.test(value)) return value;
  let hex = value.slice(1).toLowerCase();
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  return `#${hex}`;
}

function parseNumericItem(key, item) {
  const parsed = Number(item);
  if (!Number.isFinite(parsed)) {
    throw badRequest(
      `Attribute filter "${key}" expects a numeric value, got "${item}"`,
    );
  }
  return parsed;
}

function parseExactItems(key, definition, items) {
  switch (definition.type) {
    case "boolean":
      return items.map((item) => {
        if (item === "true") return true;
        if (item === "false") return false;
        throw badRequest(
          `Attribute filter "${key}" is boolean; only 'true' or 'false' are accepted, got "${item}"`,
        );
      });
    case "integer":
      return items.map((item) => {
        if (!/^-?\d+$/.test(item) || !Number.isSafeInteger(Number(item))) {
          throw badRequest(
            `Attribute filter "${key}" expects an integer value, got "${item}"`,
          );
        }
        return Number(item);
      });
    case "decimal":
    case "money":
    case "measurement":
      return items.map((item) => parseNumericItem(key, item));
    case "color":
      return items.map(normalizeColorValue);
    case "dimensions":
      throw badRequest(
        `Attribute "${key}" has type "dimensions" and cannot be filtered by value`,
      );
    default:
      // string / enum / multi-enum: literal.
      return items;
  }
}

// Parse every `attr.*` key in a (validated) query object into
// typed conditions. `definitionsByKey` is a Map of ALL definitions
// (active or not) so errors can name inactive keys precisely.
// Throws AppError(400) on any grammar/registry/value violation.
function parseAttributeFilters(query, definitionsByKey) {
  const grouped = new Map(); // attributeKey -> { exactRaw, minRaw, maxRaw }
  for (const rawKey of Object.keys(query || {})) {
    if (!rawKey.startsWith("attr.")) continue;
    if (rawKey.includes("$")) {
      throw badRequest(`Invalid attribute filter "${rawKey}"`);
    }
    const parts = rawKey.slice("attr.".length).split(".");
    if (parts.length > 2) {
      throw badRequest(`Invalid attribute filter "${rawKey}"`);
    }
    const [key, suffix] = parts;
    if (!ATTRIBUTE_KEY_PATTERN.test(key) || POLLUTION_SEGMENTS.has(key)) {
      throw badRequest(`Invalid attribute filter "${rawKey}"`);
    }
    if (suffix !== undefined && suffix !== "min" && suffix !== "max") {
      throw badRequest(`Invalid attribute filter "${rawKey}"`);
    }
    const value = query[rawKey];
    if (typeof value !== "string") {
      throw badRequest(`Attribute filter "${rawKey}" must be a string value`);
    }
    if (value.length > MAX_RAW_VALUE_LENGTH) {
      throw badRequest(`Attribute filter "${rawKey}" is too long`);
    }
    const group = grouped.get(key) || {};
    if (suffix === "min") group.minRaw = value;
    else if (suffix === "max") group.maxRaw = value;
    else group.exactRaw = value;
    grouped.set(key, group);
  }

  const conditions = [];
  for (const [key, group] of grouped) {
    const definition = definitionsByKey.get(key);
    if (!definition) {
      throw badRequest(`Unknown attribute filter "${key}"`);
    }
    if (definition.active === false) {
      throw badRequest(`Attribute "${key}" is not active`);
    }
    if (definition.filterable !== true) {
      throw badRequest(`Attribute "${key}" is not filterable`);
    }

    const condition = {
      key,
      definition,
      exactValues: null,
      exactStrings: null,
      min: undefined,
      max: undefined,
      axisCapable:
        (definition.storage || "catalogAttributes") === "catalogAttributes" &&
        AXIS_TYPES.has(definition.type),
    };

    if (group.minRaw !== undefined || group.maxRaw !== undefined) {
      if (!NUMERIC_TYPES.has(definition.type)) {
        throw badRequest(
          `Attribute "${key}" of type "${definition.type}" does not accept range filters (.min/.max)`,
        );
      }
      if (group.minRaw !== undefined)
        condition.min = parseNumericItem(key, group.minRaw.trim());
      if (group.maxRaw !== undefined)
        condition.max = parseNumericItem(key, group.maxRaw.trim());
      if (
        condition.min !== undefined &&
        condition.max !== undefined &&
        condition.min > condition.max
      ) {
        throw badRequest(`Attribute filter "${key}" has min greater than max`);
      }
    }

    if (group.exactRaw !== undefined) {
      const items = group.exactRaw.split(",").map((item) => item.trim());
      if (items.length > MAX_ITEMS) {
        throw badRequest(
          `Attribute filter "${key}" accepts at most ${MAX_ITEMS} values`,
        );
      }
      for (const item of items) {
        if (item === "") {
          throw badRequest(`Attribute filter "${key}" contains an empty value`);
        }
        if (item.length > MAX_ITEM_LENGTH) {
          throw badRequest(
            `Attribute filter "${key}" contains a value that is too long`,
          );
        }
      }
      condition.exactValues = parseExactItems(key, definition, items);
      if (condition.axisCapable) {
        // Variant options store engine-normalized values STRINGIFIED
        // (Phase 3): String() of the typed value reproduces that
        // canonical form ('4', 'true', '#ff0000', '2.5').
        condition.exactStrings = condition.exactValues.map((value) =>
          String(value),
        );
      }
    }

    conditions.push(condition);
  }
  return conditions;
}

// The storage path a condition reads at PRODUCT level. Field
// definitions read their fieldPath; map definitions read
// catalogAttributes.<key>; measurement values live in the stored
// object's `value` subfield on both storages.
function conditionPath(condition) {
  const { definition, key } = condition;
  if ((definition.storage || "catalogAttributes") === "field") {
    return definition.type === "measurement"
      ? `${definition.fieldPath}.value`
      : definition.fieldPath;
  }
  return definition.type === "measurement"
    ? `catalogAttributes.${key}.value`
    : `catalogAttributes.${key}`;
}

// One condition rendered as a plain product-level Mongo fragment
// (exact values as $in, range bounds as $gte/$lte — both may
// combine on the same path). Used for non-axis conditions, for
// the product-level branch of axis conditions, and by the facet
// service.
function conditionProductFragment(condition) {
  const ops = {};
  if (condition.exactValues) ops.$in = condition.exactValues;
  if (condition.min !== undefined) ops.$gte = condition.min;
  if (condition.max !== undefined) ops.$lte = condition.max;
  return { [conditionPath(condition)]: ops };
}

function rangeOps(priceRange) {
  const ops = {};
  if (priceRange.min !== undefined) ops.$gte = priceRange.min;
  if (priceRange.max !== undefined) ops.$lte = priceRange.max;
  return ops;
}

// Aggregation/matcher expression: at least one ENABLED variant of
// the product satisfies every given variant-level condition —
// option exact matches (same variant, by construction: all the
// checks read fields of the SAME filtered element), the price
// range (when given), and purchasability (stock - reservedStock
// > 0, the Phase 4 availability counters) when `availability` is
// set. Expressed as $expr + $filter because purchasability
// compares two fields of the same element, which plain query
// operators cannot do.
function variantExistsExpr({
  optionConds = [],
  priceRange = null,
  availability = false,
} = {}) {
  const conds = [{ $eq: ["$$v.enabled", true] }];
  for (const condition of optionConds) {
    conds.push({
      $in: [`$$v.options.${condition.key}`, condition.exactStrings],
    });
  }
  if (priceRange) {
    if (priceRange.min !== undefined)
      conds.push({ $gte: ["$$v.price", priceRange.min] });
    if (priceRange.max !== undefined)
      conds.push({ $lte: ["$$v.price", priceRange.max] });
  }
  if (availability) {
    conds.push({
      $gt: [
        {
          $subtract: [
            { $ifNull: ["$$v.stock", 0] },
            { $ifNull: ["$$v.reservedStock", 0] },
          ],
        },
        0,
      ],
    });
  }
  return {
    $expr: {
      $gt: [
        {
          $size: {
            $filter: {
              input: { $ifNull: ["$catalogVariants", []] },
              as: "v",
              cond: conds.length === 1 ? conds[0] : { $and: conds },
            },
          },
        },
        0,
      ],
    },
  };
}

// Build the variant-aware clause list for the products list query
// from parsed attribute conditions + the effective price range +
// the availability (inStock) flag. Returns an array of Mongo
// clause objects to AND with the base filter ([] = no clause,
// pure legacy behavior).
//
// Semantics (docs/catalog/PHASE5_NOTES.md has the full record):
// - Non-axis conditions apply at product level, always.
// - Axis conditions (exact values on a scalar map attribute) are
//   routed PER PRODUCT: a product that does not declare the key
//   as a variant axis (variantOptionKeys) matches at product
//   level — this is what keeps legacy, variant-less products
//   visible in a hybrid catalog; a product that DOES route the
//   keys to variants matches only when ONE enabled variant
//   satisfies ALL axis conditions together (the same-variant
//   rule), with the price range and availability bound to that
//   same variant when present.
// - Effective price (no axis conditions): a non-variant product
//   matches on Product.price; a variant product matches when any
//   enabled variant's price is in range (purchasable too, when
//   availability is requested).
function buildVariantAwareClause({
  conditions = [],
  priceRange = null,
  inStock = false,
} = {}) {
  const clauses = [];
  const axisConds = conditions.filter((c) => c.axisCapable && c.exactValues);
  const axisKeys = axisConds.map((c) => c.key);
  const nonAxis = conditions.filter((c) => !axisConds.includes(c));
  for (const condition of nonAxis)
    clauses.push(conditionProductFragment(condition));

  // The price/availability condition as it applies to a product
  // that matched at product level: variant products must satisfy
  // it through a variant (any enabled variant in range /
  // purchasable), non-variant products through the product fields.
  const productLevelPriceOrStock = () => {
    if (priceRange) {
      return {
        $or: [
          { hasVariants: { $ne: true }, price: rangeOps(priceRange) },
          variantExistsExpr({ priceRange, availability: inStock }),
        ],
      };
    }
    if (inStock) {
      return {
        $or: [
          { hasVariants: { $ne: true } },
          variantExistsExpr({ availability: true }),
        ],
      };
    }
    return null;
  };

  if (axisConds.length === 0) {
    const clause = productLevelPriceOrStock();
    if (clause) clauses.push(clause);
    return clauses;
  }

  const productBranchParts = axisConds.map((condition) =>
    conditionProductFragment(condition),
  );
  productBranchParts.push({ variantOptionKeys: { $nin: axisKeys } });
  const priceOrStock = productLevelPriceOrStock();
  if (priceOrStock) productBranchParts.push(priceOrStock);
  const productBranch =
    productBranchParts.length === 1
      ? productBranchParts[0]
      : { $and: productBranchParts };
  const variantBranch = variantExistsExpr({
    optionConds: axisConds,
    priceRange,
    availability: inStock,
  });
  clauses.push({ $or: [productBranch, variantBranch] });
  return clauses;
}

// Effective price in aggregation expressions: the maintained
// priceFrom (min price across enabled variants) when present,
// else the product's own price. Shared by the effective-price
// sort and the price facet so both agree by construction.
const EFFECTIVE_PRICE_EXPR = { $ifNull: ["$priceFrom", "$price"] };

// The list sort grammar gains two tokens Phase 5: effectivePriceAsc
// / effectivePriceDesc sort on EFFECTIVE_PRICE_EXPR (variant
// products by their priceFrom, others by price) — the existing
// allowlist sorts Product.price only. Returns the aggregation
// $sort object when the sort string uses an effective token (and
// at least one token survives the allowlist), else null and the
// caller keeps the plain find() path. Unknown fields are dropped
// exactly like utils/listQuery.safeSort drops them.
function parseEffectiveSort(sort) {
  if (typeof sort !== "string") return null;
  const tokens = sort
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (
    !tokens.some((t) => t === "effectivePriceAsc" || t === "effectivePriceDesc")
  )
    return null;
  const out = {};
  for (const token of tokens) {
    if (token === "effectivePriceAsc") out.effectivePrice = 1;
    else if (token === "effectivePriceDesc") out.effectivePrice = -1;
    else {
      const desc = token.startsWith("-");
      const field = desc ? token.slice(1) : token;
      if (CATALOG_SORT_FIELDS.includes(field)) out[field] = desc ? -1 : 1;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

module.exports = {
  AXIS_TYPES,
  NUMERIC_TYPES,
  parseAttributeFilters,
  conditionPath,
  conditionProductFragment,
  rangeOps,
  variantExistsExpr,
  buildVariantAwareClause,
  EFFECTIVE_PRICE_EXPR,
  parseEffectiveSort,
};
