// Phase 3 (catalog) — product variant service.
//
// ALL writes to Product.catalogVariants go through this module
// (the admin variant controllers and, later, the Phase 8
// migration). It enforces the variant invariants:
//
//   1. A variant's option key set equals the product's
//      variantOptionKeys EXACTLY (missing or extra key -> 400).
//   2. Option values validate through the Phase 2 engine
//      (services/attributeValidation.service.js) against their
//      AttributeDefinitions; the normalized value is stored
//      stringified (options is the precursor's Map of String).
//      Only scalar-typed definitions are variant-suitable
//      (VARIANT_OPTION_TYPES): a variant axis needs one canonical
//      string per value, so multi-enum / dimensions / measurement
//      objects cannot be axes.
//   3. combinationKey — the canonical encoding of the normalized
//      options (sorted, URI-escaped key=value pairs) — is unique
//      per product; duplicates -> 409. Enforced by a guarded
//      atomic $push (the guard fails if a concurrent write won
//      the combination) on top of the pre-checks.
//   4. SKU is globally unique: no other variant on ANY product
//      and no OTHER product's Product.sku may equal it
//      (case-insensitive — SKUs are normalized to uppercase,
//      matching both schemas' `uppercase: true`). The one
//      sanctioned overlap is a variant carrying its OWN
//      product's SKU: that is the default-variant identity
//      ensureDefaultVariant creates and Phase 8's migration
//      relies on. Enforced by pre-checks + the sparse unique
//      multikey index on catalogVariants.sku (E11000 -> 409).
//   5. SKU is immutable after creation (order snapshots —
//      Phase 4 — will reference it); an update naming a
//      different SKU -> 400.
//   6. Derived fields are recomputed from a fresh read after
//      every write: hasVariants (>= 1 variant) and priceFrom
//      (min price across ENABLED variants, else null — a display
//      floor). Product.price is NEVER rewritten here. Product
//      .stock was Phase 3's open decision point; Phase 4 settled
//      it as a MIRROR of the variant counters (see the Phase 4
//      inventory section below) maintained via syncDerived.
//   7. reservedStock is NOT writable through the variant API —
//      Phase 4's reservation/checkout machinery owns it.
//
// Reads are plain data: variantPurchasable /
// productVariantAvailability are pure helpers exported for
// Phase 4 (checkout) and Phase 5 (filtering) reuse.
const mongoose = require("mongoose");
const Product = require("../models/product.model");
const AppError = require("../utils/AppError");
const {
  validateValue,
  findPollutionKey,
} = require("./attributeValidation.service");
const { loadActiveDefinitions } = require("./attributeResolution.service");

const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_SKU_LENGTH = 64;
const VARIANT_OPTION_TYPES = [
  "string",
  "enum",
  "boolean",
  "integer",
  "decimal",
  "money",
  "color",
];
const MAX_VARIANT_IMAGES = 20;
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// ----------------------------------------------------------------
// Pure helpers
// ----------------------------------------------------------------

// SKUs are stored uppercase (both Product.sku and the variant
// subdoc declare `uppercase: true`), so normalization IS the
// case-insensitive comparison: "abc-1" and "ABC-1" are one SKU.
function normalizeSku(raw) {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toUpperCase();
  return normalized ? normalized : null;
}

function assertValidSku(raw) {
  if (
    raw === undefined ||
    raw === null ||
    (typeof raw === "string" && !raw.trim())
  ) {
    throw new AppError("Variant SKU is required", 400);
  }
  const sku = normalizeSku(raw);
  if (!sku) throw new AppError("Variant SKU is required", 400);
  if (sku.length > MAX_SKU_LENGTH) {
    throw new AppError(
      `Variant SKU cannot exceed ${MAX_SKU_LENGTH} characters`,
      400,
    );
  }
  if (!SKU_PATTERN.test(sku)) {
    throw new AppError(
      "Variant SKU must start with a letter or digit and contain only letters, digits, '.', '_' or '-'",
      400,
    );
  }
  return sku;
}

// Canonical combination encoding: option entries sorted by key,
// each side URI-escaped so separators inside values can never
// alias a different combination. {} (the default variant) -> "".
function computeCombinationKey(normalizedOptions) {
  const options = normalizedOptions || {};
  return Object.keys(options)
    .sort()
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(options[key]))}`,
    )
    .join("&");
}

function variantPurchasable(variant) {
  if (!variant) return false;
  const enabled = variant.enabled !== false;
  const stock = variant.stock || 0;
  const reserved = variant.reservedStock || 0;
  return enabled && stock - reserved > 0;
}

function computePriceFrom(variants) {
  let min = null;
  for (const variant of variants || []) {
    if (variant.enabled === false) continue;
    if (typeof variant.price !== "number") continue;
    if (min === null || variant.price < min) min = variant.price;
  }
  return min;
}

function computeDerived(variants) {
  const list = variants || [];
  return {
    hasVariants: list.length > 0,
    priceFrom: computePriceFrom(list),
  };
}

function productVariantAvailability(product) {
  const variants = Array.isArray(product)
    ? product
    : (product && product.catalogVariants) || [];
  const purchasableCount = variants.filter(variantPurchasable).length;
  return {
    hasVariants: variants.length > 0,
    variantCount: variants.length,
    purchasableCount,
    anyPurchasable: purchasableCount > 0,
    priceFrom: computePriceFrom(variants),
  };
}

// ----------------------------------------------------------------
// Validation helpers (throw AppError)
// ----------------------------------------------------------------

const parseJsonField = (field) => {
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
};

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A variant axis must be an ACTIVE definition, stored in
// catalogAttributes, of a scalar type (see invariant 2).
function variantOptionDefinition(definitionsByKey, key) {
  const definition = definitionsByKey.get(key);
  if (!definition) {
    throw new AppError(`Unknown variant option attribute: "${key}"`, 400);
  }
  if ((definition.storage || "catalogAttributes") !== "catalogAttributes") {
    throw new AppError(
      `Attribute "${key}" is a product field, not a catalog attribute, and cannot define variants`,
      400,
    );
  }
  if (!VARIANT_OPTION_TYPES.includes(definition.type)) {
    throw new AppError(
      `Attribute "${key}" of type "${definition.type}" cannot define variants (variant options must be scalar: ${VARIANT_OPTION_TYPES.join(", ")})`,
      400,
    );
  }
  return definition;
}

// Validates a variantOptionKeys payload (array, or a JSON-string
// array from multipart form-data) against the registry. Returns
// the deduped key list in the caller's order.
async function validateVariantOptionKeys(raw) {
  const parsed = parseJsonField(raw);
  if (!Array.isArray(parsed)) {
    throw new AppError(
      "variantOptionKeys must be an array of attribute keys",
      400,
    );
  }
  const definitionsByKey = await loadActiveDefinitions();
  const keys = [];
  const seen = new Set();
  for (const item of parsed) {
    if (typeof item !== "string" || !item.trim()) {
      throw new AppError(
        "variantOptionKeys must contain attribute key strings",
        400,
      );
    }
    const key = item.trim();
    variantOptionDefinition(definitionsByKey, key);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

// Product-update-path writer for variantOptionKeys: validates the
// list, then LOCKS it while variants exist — a different key set
// would orphan every existing combination (admins delete the
// variants first, then change the keys). The same set (any order)
// is a no-op acceptance. Mutates the product document; the
// caller's save persists it.
async function applyVariantOptionKeys(product, raw) {
  const keys = await validateVariantOptionKeys(raw);
  const current = product.variantOptionKeys || [];
  const variants = product.catalogVariants || [];
  if (variants.length > 0) {
    const sameSet =
      keys.length === current.length &&
      keys.every((key) => current.includes(key));
    if (!sameSet) {
      throw new AppError(
        "variantOptionKeys cannot change while the product has variants; delete the variants first",
        400,
      );
    }
  }
  product.variantOptionKeys = keys;
  return keys;
}

// Validates a variant options payload against the product's
// variantOptionKeys (exact set — invariant 1) and the Phase 2
// engine (invariant 2). Returns the normalized options as a plain
// object of STRINGS (the options Map of String storage form).
function validateVariantOptions(product, rawOptions, definitionsByKey) {
  const parsed = parseJsonField(rawOptions);
  const options = parsed === undefined || parsed === null ? {} : parsed;
  if (!isPlainObject(options)) {
    throw new AppError(
      "Variant options must be an object of attribute key/value pairs",
      400,
    );
  }
  const pollution = findPollutionKey(options);
  if (pollution) {
    throw new AppError(
      `Variant options contain a forbidden key: "${pollution}"`,
      400,
    );
  }
  const expected = product.variantOptionKeys || [];
  const provided = Object.keys(options);
  const missing = expected.filter((key) => !provided.includes(key));
  const extra = provided.filter((key) => !expected.includes(key));
  if (missing.length > 0) {
    throw new AppError(
      `Variant is missing option(s): ${missing.join(", ")}`,
      400,
    );
  }
  if (extra.length > 0) {
    throw new AppError(
      `Variant has option(s) not declared in variantOptionKeys: ${extra.join(", ")}`,
      400,
    );
  }
  const normalized = {};
  for (const key of expected) {
    const definition = variantOptionDefinition(definitionsByKey, key);
    const result = validateValue(definition, options[key]);
    if (!result.ok) {
      throw new AppError(`Variant option "${key}": ${result.error}`, 400);
    }
    normalized[key] = String(result.value);
  }
  return normalized;
}

// SKU collision checks (invariant 4). `product` is the variant's
// own product: its OWN Product.sku is exempt (default-variant
// identity); every other product's SKU and every other variant's
// SKU in the catalog is not.
async function assertSkuAvailable(product, sku) {
  for (const sibling of product.catalogVariants || []) {
    if (normalizeSku(sibling.sku) === sku) {
      throw new AppError(
        `SKU "${sku}" is already used by a variant of this product`,
        409,
      );
    }
  }
  const otherVariant = await Product.findOne({
    _id: { $ne: product._id },
    "catalogVariants.sku": sku,
  })
    .select("_id")
    .lean();
  if (otherVariant) {
    throw new AppError(
      `SKU "${sku}" is already used by a variant of another product`,
      409,
    );
  }
  const otherProduct = await Product.findOne({ _id: { $ne: product._id }, sku })
    .select("_id")
    .lean();
  if (otherProduct) {
    throw new AppError(
      `SKU "${sku}" is already used as another product's SKU`,
      409,
    );
  }
}

function assertNonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AppError(`${label} must be a number >= 0`, 400);
  }
  return value;
}

function validateVariantImages(raw) {
  if (!Array.isArray(raw))
    throw new AppError("Variant images must be an array of URLs", 400);
  if (raw.length > MAX_VARIANT_IMAGES) {
    throw new AppError(
      `Variant cannot have more than ${MAX_VARIANT_IMAGES} images`,
      400,
    );
  }
  return raw.map((item) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new AppError("Variant images must be non-empty URL strings", 400);
    }
    return item.trim();
  });
}

function validateVariantWeight(raw) {
  if (!isPlainObject(raw))
    throw new AppError("Variant weight must be an object { value, unit }", 400);
  assertNonNegativeNumber(raw.value, "Variant weight value");
  const unit = raw.unit === undefined ? "kg" : raw.unit;
  if (!["kg", "lb", "g"].includes(unit)) {
    throw new AppError("Variant weight unit must be one of: kg, lb, g", 400);
  }
  return { value: raw.value, unit };
}

function validateVariantDimensions(raw) {
  if (!isPlainObject(raw))
    throw new AppError("Variant dimensions must be an object", 400);
  const out = {};
  for (const part of ["width", "height", "depth"]) {
    if (raw[part] !== undefined) {
      out[part] = assertNonNegativeNumber(
        raw[part],
        `Variant dimensions ${part}`,
      );
    }
  }
  const unit = raw.unit === undefined ? "cm" : raw.unit;
  if (!["cm", "m", "in"].includes(unit)) {
    throw new AppError(
      "Variant dimensions unit must be one of: cm, m, in",
      400,
    );
  }
  out.unit = unit;
  return out;
}

// Builds the validated, storage-ready variant fields from a
// create payload. Throws AppError(400) on any problem.
async function buildNewVariant(product, payload) {
  if (!isPlainObject(payload))
    throw new AppError("Variant payload must be an object", 400);
  const pollution = findPollutionKey(payload);
  if (pollution) {
    throw new AppError(
      `Variant payload contains a forbidden key: "${pollution}"`,
      400,
    );
  }
  const definitionsByKey = await loadActiveDefinitions();
  const sku = assertValidSku(payload.sku);
  const options = validateVariantOptions(
    product,
    payload.options,
    definitionsByKey,
  );
  if (payload.price === undefined || payload.price === null) {
    throw new AppError("Variant price is required", 400);
  }
  const variant = {
    _id: new mongoose.Types.ObjectId(),
    sku,
    options,
    combinationKey: computeCombinationKey(options),
    price: assertNonNegativeNumber(payload.price, "Variant price"),
    stock: 0,
    reservedStock: 0,
    enabled: true,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (payload.compareAtPrice !== undefined && payload.compareAtPrice !== null) {
    variant.compareAtPrice = assertNonNegativeNumber(
      payload.compareAtPrice,
      "Variant compareAtPrice",
    );
  }
  if (payload.stock !== undefined) {
    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      throw new AppError("Variant stock must be a whole number >= 0", 400);
    }
    variant.stock = payload.stock;
  }
  if (payload.enabled !== undefined) {
    if (typeof payload.enabled !== "boolean") {
      throw new AppError("Variant enabled must be a boolean", 400);
    }
    variant.enabled = payload.enabled;
  }
  if (payload.images !== undefined)
    variant.images = validateVariantImages(payload.images);
  if (payload.weight !== undefined && payload.weight !== null) {
    variant.weight = validateVariantWeight(payload.weight);
  }
  if (payload.dimensions !== undefined && payload.dimensions !== null) {
    variant.dimensions = validateVariantDimensions(payload.dimensions);
  }
  if (
    payload.modelUrl !== undefined &&
    payload.modelUrl !== null &&
    payload.modelUrl !== ""
  ) {
    if (typeof payload.modelUrl !== "string") {
      throw new AppError("Variant modelUrl must be a string", 400);
    }
    variant.modelUrl = payload.modelUrl.trim();
  }
  return variant;
}

// ----------------------------------------------------------------
// Writes
// ----------------------------------------------------------------

function isDuplicateKeyError(err) {
  return Boolean(err) && (err.code === 11000 || err.code === 11001);
}

// Recomputes hasVariants/priceFrom from a FRESH read and persists
// them when they moved. Called after every variant mutation so
// the derived fields converge on the true array contents even
// when writes race. Returns the fresh derived state + variants.
async function syncDerived(productId) {
  const fresh = await Product.findById(productId)
    .select("catalogVariants hasVariants priceFrom")
    .lean();
  if (!fresh) return null;
  const variants = fresh.catalogVariants || [];
  const derived = computeDerived(variants);
  if (
    fresh.hasVariants !== derived.hasVariants ||
    fresh.priceFrom !== derived.priceFrom
  ) {
    await Product.updateOne(
      { _id: productId },
      {
        $set: {
          hasVariants: derived.hasVariants,
          priceFrom: derived.priceFrom,
        },
      },
    );
  }
  // Phase 4: an admin variant write is an inventory mutation too
  // (it can set a variant's stock), so the product-level stock
  // mirror converges here as well. Commerce flows call
  // refreshStockMirror directly, inside their transaction.
  await refreshStockMirror(productId);
  return { ...derived, variants };
}

// ----------------------------------------------------------------
// Phase 4 (catalog) — variant inventory operations.
//
// For a variant product, variant.stock / variant.reservedStock
// are AUTHORITATIVE and Product.stock / Product.reservedStock are
// a MIRROR (their sums) that keeps list inStock filters and admin
// views truthful. Every inventory mutation below is a guarded
// atomic update on the embedded variant, and every commerce
// caller pairs it with refreshStockMirror in the same flow (same
// transaction session), so the two never drift apart. A failed
// guard means insufficient stock — never a partial write.
// ----------------------------------------------------------------

async function refreshStockMirror(productId, { session } = {}) {
  let query = Product.findById(productId)
    .select("catalogVariants stock reservedStock status")
    .lean();
  if (session) query = query.session(session);
  const fresh = await query;
  if (!fresh) return null;
  const variants = fresh.catalogVariants || [];
  if (!variants.length) return null; // variant-less: the product counters are authoritative
  const stock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const reservedStock = variants.reduce(
    (sum, v) => sum + (v.reservedStock || 0),
    0,
  );
  const set = {};
  if (fresh.stock !== stock) set.stock = stock;
  if ((fresh.reservedStock || 0) !== reservedStock)
    set.reservedStock = reservedStock;
  // A variant product is born with the not-yet-meaningful scalar
  // stock 0, which the model's save hook reads as out_of_stock.
  // Once variants carry real stock the product is sellable again,
  // so the mirror revives it. The reverse flip is deliberately NOT
  // done here: guarded updateOne deductions never flipped a
  // legacy product's status on sell-out either — availability
  // checks read the counters, not the status, at that point.
  if (stock > 0 && fresh.status === "out_of_stock") set.status = "active";
  if (Object.keys(set).length > 0) {
    await Product.updateOne(
      { _id: productId },
      { $set: set },
      session ? { session } : {},
    );
  }
  return { stock, reservedStock };
}

const NO_MATCH = { matchedCount: 0, modifiedCount: 0 };

// Deduct sold units from a variant: the $elemMatch guard makes
// the update match only while the variant holds >= quantity
// stock, so matchedCount !== 1 IS the insufficient-stock signal.
// sellableOnly adds the product-level conditions the capture
// path has always required (not deleted, active).
async function deductVariantStock(
  productId,
  variantId,
  quantity,
  { session, sellableOnly = false } = {},
) {
  if (!OBJECT_ID_PATTERN.test(String(variantId || ""))) return { ...NO_MATCH };
  const vid = new mongoose.Types.ObjectId(String(variantId));
  const filter = {
    _id: productId,
    catalogVariants: { $elemMatch: { _id: vid, stock: { $gte: quantity } } },
  };
  if (sellableOnly) {
    filter.deletedAt = null;
    filter.status = "active";
  }
  return Product.updateOne(
    filter,
    { $inc: { "catalogVariants.$[v].stock": -quantity } },
    { arrayFilters: [{ "v._id": vid }], ...(session ? { session } : {}) },
  );
}

// Restore sold units to a variant (cancellation of a deducted
// order). modifiedCount !== 1 means the variant no longer exists
// — the caller decides how to reconcile (orderTransition flags
// the order inventoryReviewRequired rather than failing the
// cancellation).
async function restoreVariantStock(
  productId,
  variantId,
  quantity,
  { session } = {},
) {
  if (!OBJECT_ID_PATTERN.test(String(variantId || ""))) return { ...NO_MATCH };
  const vid = new mongoose.Types.ObjectId(String(variantId));
  return Product.updateOne(
    { _id: productId, "catalogVariants._id": vid },
    { $inc: { "catalogVariants.$[v].stock": quantity } },
    { arrayFilters: [{ "v._id": vid }], ...(session ? { session } : {}) },
  );
}

// Hold units on a variant (guest reservation): the $expr gate —
// evaluated against the matched variant element via $filter —
// requires stock >= reservedStock + quantity, mirroring the
// product-level gate in stockReservation.service.
async function reserveVariantStock(
  productId,
  variantId,
  quantity,
  { session } = {},
) {
  if (!OBJECT_ID_PATTERN.test(String(variantId || ""))) return { ...NO_MATCH };
  const vid = new mongoose.Types.ObjectId(String(variantId));
  return Product.updateOne(
    {
      _id: productId,
      deletedAt: null,
      status: "active",
      $expr: {
        $let: {
          vars: {
            v: {
              $first: {
                $filter: {
                  input: { $ifNull: ["$catalogVariants", []] },
                  as: "cv",
                  cond: { $eq: ["$$cv._id", vid] },
                },
              },
            },
          },
          in: {
            $lte: [
              { $add: [{ $ifNull: ["$$v.reservedStock", 0] }, quantity] },
              { $ifNull: ["$$v.stock", 0] },
            ],
          },
        },
      },
    },
    { $inc: { "catalogVariants.$[v].reservedStock": quantity } },
    { arrayFilters: [{ "v._id": vid }], ...(session ? { session } : {}) },
  );
}

// Settle a hold on a variant: decrement its reservedStock behind
// the same $gte floor guard the product-level settle uses — a
// guard miss (counter already lower, or variant deleted) leaves
// the counter untouched and the caller logs drift, exactly the
// conservative direction of the legacy path.
async function releaseVariantReserved(
  productId,
  variantId,
  quantity,
  { session } = {},
) {
  if (!OBJECT_ID_PATTERN.test(String(variantId || ""))) return { ...NO_MATCH };
  const vid = new mongoose.Types.ObjectId(String(variantId));
  return Product.updateOne(
    { _id: productId, "catalogVariants._id": vid },
    { $inc: { "catalogVariants.$[v].reservedStock": -quantity } },
    {
      arrayFilters: [{ "v._id": vid, "v.reservedStock": { $gte: quantity } }],
      ...(session ? { session } : {}),
    },
  );
}

function plainVariant(variant) {
  if (!variant) return variant;
  const plain =
    typeof variant.toObject === "function"
      ? variant.toObject()
      : { ...variant };
  if (plain.options instanceof Map)
    plain.options = Object.fromEntries(plain.options);
  return plain;
}

async function createVariant(product, payload) {
  const variant = await buildNewVariant(product, payload);
  // Pre-checks give precise errors on the common path; the
  // guarded push + the unique index close the race behind them.
  for (const sibling of product.catalogVariants || []) {
    if (sibling.combinationKey === variant.combinationKey) {
      throw new AppError(
        "A variant with this option combination already exists for this product",
        409,
      );
    }
  }
  await assertSkuAvailable(product, variant.sku);
  // Optimistic derived values from the loaded product; syncDerived
  // re-converges them from a fresh read immediately after.
  const optimistic = computeDerived([
    ...(product.catalogVariants || []),
    variant,
  ]);
  let result;
  try {
    result = await Product.updateOne(
      {
        _id: product._id,
        deletedAt: null,
        "catalogVariants.combinationKey": { $ne: variant.combinationKey },
        "catalogVariants.sku": { $ne: variant.sku },
      },
      {
        $push: { catalogVariants: variant },
        $set: { hasVariants: true, priceFrom: optimistic.priceFrom },
      },
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(`SKU "${variant.sku}" is already in use`, 409);
    }
    throw err;
  }
  if (!result.matchedCount) {
    throw new AppError(
      "A variant with this SKU or option combination already exists for this product",
      409,
    );
  }
  const synced = await syncDerived(product._id);
  const stored = (synced.variants || []).find(
    (v) => String(v._id) === String(variant._id),
  );
  return {
    variant: plainVariant(stored || variant),
    hasVariants: synced.hasVariants,
    priceFrom: synced.priceFrom,
  };
}

async function updateVariant(product, variantId, payload) {
  if (!OBJECT_ID_PATTERN.test(String(variantId || ""))) {
    throw new AppError("Variant not found", 404);
  }
  const existing = (product.catalogVariants || []).find(
    (variant) => String(variant._id) === String(variantId),
  );
  if (!existing) throw new AppError("Variant not found", 404);
  if (!isPlainObject(payload))
    throw new AppError("Variant payload must be an object", 400);
  const pollution = findPollutionKey(payload);
  if (pollution) {
    throw new AppError(
      `Variant payload contains a forbidden key: "${pollution}"`,
      400,
    );
  }

  // Invariant 5: the SKU never changes. Naming the same SKU
  // (any case) is a no-op; a different one is a 400.
  if (
    payload.sku !== undefined &&
    normalizeSku(payload.sku) !== normalizeSku(existing.sku)
  ) {
    throw new AppError("Variant SKU is immutable and cannot be changed", 400);
  }

  // Dotted-path field updates (NOT a whole-subdoc $set: Mongoose
  // stamps the subdoc's updatedAt as its own path on update, and a
  // whole-element replacement that also carries updatedAt is a
  // MongoDB path conflict). null clears an optional field ($unset).
  const sets = {};
  const unsets = {};
  const setField = (field, value) => {
    sets[`catalogVariants.$.${field}`] = value;
  };
  const unsetField = (field) => {
    unsets[`catalogVariants.$.${field}`] = "";
  };

  if (payload.options !== undefined) {
    const definitionsByKey = await loadActiveDefinitions();
    const options = validateVariantOptions(
      product,
      payload.options,
      definitionsByKey,
    );
    const combinationKey = computeCombinationKey(options);
    const clash = (product.catalogVariants || []).find(
      (variant) =>
        String(variant._id) !== String(variantId) &&
        variant.combinationKey === combinationKey,
    );
    if (clash) {
      throw new AppError(
        "A variant with this option combination already exists for this product",
        409,
      );
    }
    setField("options", options);
    setField("combinationKey", combinationKey);
  }
  if (payload.price !== undefined) {
    setField("price", assertNonNegativeNumber(payload.price, "Variant price"));
  }
  if (payload.compareAtPrice !== undefined) {
    if (payload.compareAtPrice === null) unsetField("compareAtPrice");
    else
      setField(
        "compareAtPrice",
        assertNonNegativeNumber(
          payload.compareAtPrice,
          "Variant compareAtPrice",
        ),
      );
  }
  if (payload.stock !== undefined) {
    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      throw new AppError("Variant stock must be a whole number >= 0", 400);
    }
    setField("stock", payload.stock);
  }
  if (payload.enabled !== undefined) {
    if (typeof payload.enabled !== "boolean") {
      throw new AppError("Variant enabled must be a boolean", 400);
    }
    setField("enabled", payload.enabled);
  }
  if (payload.images !== undefined)
    setField("images", validateVariantImages(payload.images));
  if (payload.weight !== undefined) {
    if (payload.weight === null) unsetField("weight");
    else setField("weight", validateVariantWeight(payload.weight));
  }
  if (payload.dimensions !== undefined) {
    if (payload.dimensions === null) unsetField("dimensions");
    else setField("dimensions", validateVariantDimensions(payload.dimensions));
  }
  if (payload.modelUrl !== undefined) {
    if (payload.modelUrl === null || payload.modelUrl === "") {
      unsetField("modelUrl");
    } else if (typeof payload.modelUrl !== "string") {
      throw new AppError("Variant modelUrl must be a string", 400);
    } else {
      setField("modelUrl", payload.modelUrl.trim());
    }
  }
  // reservedStock is deliberately NOT updatable here (invariant 7).

  const update = {};
  if (Object.keys(sets).length > 0) update.$set = sets;
  if (Object.keys(unsets).length > 0) update.$unset = unsets;
  if (Object.keys(update).length > 0) {
    const result = await Product.updateOne(
      { _id: product._id, "catalogVariants._id": existing._id },
      update,
    );
    if (!result.matchedCount) throw new AppError("Variant not found", 404);
  }
  const synced = await syncDerived(product._id);
  const stored = (synced.variants || []).find(
    (v) => String(v._id) === String(variantId),
  );
  return {
    variant: plainVariant(stored || existing),
    hasVariants: synced.hasVariants,
    priceFrom: synced.priceFrom,
  };
}

async function deleteVariant(product, variantId) {
  if (!OBJECT_ID_PATTERN.test(String(variantId || ""))) {
    throw new AppError("Variant not found", 404);
  }
  const existing = (product.catalogVariants || []).find(
    (variant) => String(variant._id) === String(variantId),
  );
  if (!existing) throw new AppError("Variant not found", 404);
  const result = await Product.updateOne(
    { _id: product._id },
    { $pull: { catalogVariants: { _id: existing._id } } },
  );
  if (!result.modifiedCount) throw new AppError("Variant not found", 404);
  const synced = await syncDerived(product._id);
  return { hasVariants: synced.hasVariants, priceFrom: synced.priceFrom };
}

// Creates the single default variant for a legacy (variant-less)
// product: the product's own purchasable form, carrying its SKU,
// price, compare-at price, stock and image URLs. Idempotent — a
// product that already has variants is returned untouched. This
// is the Phase 8 migration's per-product step.
async function ensureDefaultVariant(product) {
  if (!product || !product._id) {
    throw new AppError("ensureDefaultVariant requires a product", 400);
  }
  const fresh = (await Product.findById(product._id)) || product;
  const existing = fresh.catalogVariants || [];
  if (existing.length > 0) {
    return { created: false, variant: plainVariant(existing[0]) };
  }
  if ((fresh.variantOptionKeys || []).length > 0) {
    throw new AppError(
      "Cannot create a default variant: the product declares variantOptionKeys, so its variants need explicit options",
      400,
    );
  }
  if (!fresh.sku) {
    throw new AppError(
      "Cannot create a default variant: the product has no SKU to carry over",
      400,
    );
  }
  const images = (fresh.images || [])
    .map((image) => (typeof image === "string" ? image : image && image.url))
    .filter(Boolean);
  const { variant } = await createVariant(fresh, {
    sku: fresh.sku,
    options: {},
    price: fresh.price,
    compareAtPrice: fresh.originalPrice,
    stock: fresh.stock || 0,
    images,
  });
  return { created: true, variant };
}

module.exports = {
  SKU_PATTERN,
  MAX_SKU_LENGTH,
  VARIANT_OPTION_TYPES,
  normalizeSku,
  assertValidSku,
  computeCombinationKey,
  variantPurchasable,
  computePriceFrom,
  productVariantAvailability,
  validateVariantOptionKeys,
  applyVariantOptionKeys,
  validateVariantOptions,
  assertSkuAvailable,
  createVariant,
  updateVariant,
  deleteVariant,
  ensureDefaultVariant,
  syncDerived,
  refreshStockMirror,
  deductVariantStock,
  restoreVariantStock,
  reserveVariantStock,
  releaseVariantReserved,
};
