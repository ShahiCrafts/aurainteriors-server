// Phase 1 (catalog) — controllers for the DB-backed catalog
// registries served under /api/v1/catalog: product types (here),
// rooms and collections (added with their models). Public reads are
// mounted before the admin gate in routes/catalog.routes.js; every
// write handler here runs behind protect + restrictTo("admin").
const ProductType = require("../models/productType.model");
const Room = require("../models/room.model");
const Collection = require("../models/collection.model");
const AttributeDefinition = require("../models/attributeDefinition.model");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { catalogPagination, catalogSort } = require("../utils/catalogListQuery");
const { resolveCollectionProducts } = require("../services/collection.service");
const { resolveForCategory, resolveForProductType } = require("../services/attributeResolution.service");
const { computeFacets } = require("../services/catalogFacets.service");
const { definitions: staticDefinitions, productTypes: staticProductTypes, rooms: staticRooms } = require("../config/catalogTaxonomy");
const catalogCache = require("../utils/catalogCache");
const {
  getAttributeDefinitionsCached,
  invalidateAttributeRegistryCache,
} = require("../services/attributeRegistryCache");

// SR-P6-1: registry list filter — active-only for the public; an
// authenticated admin (req.user populated by protectOptional on
// the list routes) may pass ?includeInactive=true to also see
// deactivated entries, so the admin pages that manage these
// registries don't lose sight of entries they deactivate. Every
// other caller's filter is unchanged.
function registryListFilter(req) {
  const includeInactive =
    req.query && req.query.includeInactive === "true" && req.user && req.user.role === "admin";
  return includeInactive ? {} : { active: true };
}

// ------------------------------------------------------------------
// Product types
// ------------------------------------------------------------------

// SR-P6-2: a type's attributeKeys reference AttributeDefinition
// records by (case-sensitive) key; resolution drops unknown keys
// silently, so a typo would strand the attribute with no error
// anywhere. Reject unknown keys at write time, naming them — the
// same strictness the attribute engine applies to product writes.
async function assertAttributeKeysKnown(attributeKeys) {
  if (!attributeKeys || attributeKeys.length === 0) return;
  const unique = [...new Set(attributeKeys)];
  const found = await AttributeDefinition.find({ key: { $in: unique } }).select("key").lean();
  const known = new Set(found.map((definition) => definition.key));
  const unknown = unique.filter((key) => !known.has(key));
  if (unknown.length > 0) {
    throw new AppError(`Unknown attribute key(s): ${unknown.join(", ")}`, 400);
  }
}

// Phase 8 (catalog): the keys a product-type write references — its
// attributeKeys PLUS every attributeAssignments[].attributeKey.
// Assignment keys were shape-validated only (the follow-up recorded
// in PHASE6_5_NOTES): resolution drops unknown assignment keys
// silently, the same failure shape SR-P6-2 fixed for attributeKeys,
// so both lists go through the one existence check and a rejection
// names every unknown key at once.
function referencedAttributeKeys({ attributeKeys, attributeAssignments }) {
  const keys = [...(attributeKeys || [])];
  for (const assignment of attributeAssignments || []) {
    if (assignment && assignment.attributeKey) keys.push(assignment.attributeKey);
  }
  return keys;
}

exports.listProductTypes = catchAsync(async (req, res, next) => {
  const productTypes = await ProductType.find(registryListFilter(req))
    .sort({ sortOrder: 1, label: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: productTypes.length,
    data: {
      productTypes,
    },
  });
});

exports.getProductType = catchAsync(async (req, res, next) => {
  const productType = await ProductType.findOne({
    key: String(req.params.key).toLowerCase(),
    active: true,
  }).lean();

  if (!productType) {
    return next(new AppError("Product type not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      productType,
    },
  });
});

exports.createProductType = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const { key, label, description, categoryKey, attributeKeys, attributeAssignments, active, sortOrder } = req.body;

  const existing = await ProductType.findOne({ key });
  if (existing) {
    return next(new AppError(`Product type "${key}" already exists`, 400));
  }

  await assertAttributeKeysKnown(referencedAttributeKeys({ attributeKeys, attributeAssignments }));

  const productType = await ProductType.create({
    key,
    label,
    description,
    categoryKey,
    attributeKeys: attributeKeys || [],
    attributeAssignments: attributeAssignments || [],
    active: active !== undefined ? active : true,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({
    status: "success",
    data: {
      productType,
    },
  });
});

exports.updateProductType = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const key = String(req.params.key).toLowerCase();
  const { label, description, categoryKey, attributeKeys, attributeAssignments, active, sortOrder } = req.body;

  // Keys are referenced by string from categories (and later
  // products); renaming one would strand those references.
  if (req.body.key !== undefined && req.body.key !== key) {
    return next(new AppError("Product type key is immutable", 400));
  }

  const productType = await ProductType.findOne({ key });
  if (!productType) {
    return next(new AppError("Product type not found", 404));
  }

  if (attributeKeys !== undefined || attributeAssignments !== undefined) {
    await assertAttributeKeysKnown(referencedAttributeKeys({ attributeKeys, attributeAssignments }));
  }

  if (label !== undefined) productType.label = label;
  if (description !== undefined) productType.description = description;
  if (categoryKey !== undefined) productType.categoryKey = categoryKey;
  if (attributeKeys !== undefined) productType.attributeKeys = attributeKeys;
  if (attributeAssignments !== undefined) productType.attributeAssignments = attributeAssignments;
  if (active !== undefined) productType.active = active;
  if (sortOrder !== undefined) productType.sortOrder = sortOrder;

  await productType.save();

  res.status(200).json({
    status: "success",
    data: {
      productType,
    },
  });
});

exports.deleteProductType = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const key = String(req.params.key).toLowerCase();

  const productType = await ProductType.findOne({ key });
  if (!productType) {
    return next(new AppError("Product type not found", 404));
  }

  // Guarded like category deletion: a type in use is disabled
  // (active=false), not deleted out from under its categories.
  const inUse = await Category.countDocuments({ productType: key });
  if (inUse > 0) {
    return next(
      new AppError(
        `Cannot delete product type used by ${inUse} categories. Deactivate it instead.`,
        400
      )
    );
  }

  await ProductType.findByIdAndDelete(productType._id);

  res.status(200).json({
    status: "success",
    message: "Product type deleted successfully",
  });
});

// ------------------------------------------------------------------
// Rooms
// ------------------------------------------------------------------

exports.listRooms = catchAsync(async (req, res, next) => {
  const rooms = await Room.find(registryListFilter(req))
    .sort({ sortOrder: 1, label: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: rooms.length,
    data: {
      rooms,
    },
  });
});

// Room detail + its published products, paginated with the shared
// catalog list machinery. "Published" = the public product
// visibility set (not deleted, status active|out_of_stock), matching
// GET /products for non-admin callers.
exports.getRoom = catchAsync(async (req, res, next) => {
  const slug = String(req.params.slug).toLowerCase();
  const room = await Room.findOne({ slug, active: true }).lean();

  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  const { pageNum, limitNum, skip } = catalogPagination(req.query.page, req.query.limit);
  const filter = {
    roomSlugs: room.slug,
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(catalogSort(req.query.sort))
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      room,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

exports.createRoom = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const { slug, label, description, image, active, sortOrder } = req.body;

  const existing = await Room.findOne({ slug });
  if (existing) {
    return next(new AppError(`Room "${slug}" already exists`, 400));
  }

  const room = await Room.create({
    slug,
    label,
    description,
    image,
    active: active !== undefined ? active : true,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({
    status: "success",
    data: {
      room,
    },
  });
});

exports.updateRoom = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const slug = String(req.params.slug).toLowerCase();
  const { label, description, image, active, sortOrder } = req.body;

  // Slugs are referenced by string from products and categories;
  // renaming one would strand those references.
  if (req.body.slug !== undefined && req.body.slug !== slug) {
    return next(new AppError("Room slug is immutable", 400));
  }

  const room = await Room.findOne({ slug });
  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  if (label !== undefined) room.label = label;
  if (description !== undefined) room.description = description;
  if (image !== undefined) room.image = image;
  if (active !== undefined) room.active = active;
  if (sortOrder !== undefined) room.sortOrder = sortOrder;

  await room.save();

  res.status(200).json({
    status: "success",
    data: {
      room,
    },
  });
});

exports.deleteRoom = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const slug = String(req.params.slug).toLowerCase();

  const room = await Room.findOne({ slug });
  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  // Guarded like product types: products reference the slug, so a
  // room in use is deactivated, not deleted out from under them.
  const inUse = await Product.countDocuments({ roomSlugs: slug, deletedAt: null });
  if (inUse > 0) {
    return next(
      new AppError(
        `Cannot delete room assigned to ${inUse} products. Deactivate it instead.`,
        400
      )
    );
  }

  await Room.findByIdAndDelete(room._id);

  res.status(200).json({
    status: "success",
    message: "Room deleted successfully",
  });
});

// ------------------------------------------------------------------
// Collections
// ------------------------------------------------------------------

// Shared write-path validation for collection payloads, applied to
// the EFFECTIVE (post-merge) values on both create and update:
// manual membership must reference existing products; a rule must
// be complete, and attribute-match must name a known attribute
// definition with a scalar value.
async function validateCollectionPayload({ kind, productIds, rule }) {
  if (kind === "manual") {
    const ids = [...new Set((productIds || []).map(String))];
    if (ids.length > 0) {
      const found = await Product.countDocuments({ _id: { $in: ids } });
      if (found !== ids.length) {
        throw new AppError("Every product in a manual collection must exist", 400);
      }
    }
    return;
  }
  if (!rule || !rule.type) {
    throw new AppError("A rule collection requires a rule type", 400);
  }
  if (rule.type === "attribute-match") {
    const params = rule.params || {};
    // Phase 2: the known-key source is the DB attribute registry
    // (Phase 1 checked the static config).
    const knownDefinition =
      typeof params.key === "string"
        ? await AttributeDefinition.exists({
            key: params.key,
            active: true,
            storage: "catalogAttributes",
          })
        : null;
    if (!knownDefinition) {
      throw new AppError("attribute-match requires params.key naming a known attribute definition", 400);
    }
    if (!["string", "number", "boolean"].includes(typeof params.value)) {
      throw new AppError("attribute-match requires a scalar params.value", 400);
    }
  }
}

exports.listCollections = catchAsync(async (req, res, next) => {
  const collections = await Collection.find(registryListFilter(req))
    .sort({ sortOrder: 1, label: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: collections.length,
    data: {
      collections,
    },
  });
});

// Collection detail + its products, resolved at read time by
// services/collection.service.js (manual order / rule evaluation),
// paginated like the other public catalog lists.
exports.getCollection = catchAsync(async (req, res, next) => {
  const slug = String(req.params.slug).toLowerCase();
  const collection = await Collection.findOne({ slug, active: true }).lean();

  if (!collection) {
    return next(new AppError("Collection not found", 404));
  }

  const { products, pagination } = await resolveCollectionProducts(collection, req.query);

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      collection,
      products,
      pagination,
    },
  });
});

exports.createCollection = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const { slug, label, description, image, kind, productIds, rule, active, sortOrder } = req.body;
  const effectiveKind = kind || "manual";

  const existing = await Collection.findOne({ slug });
  if (existing) {
    return next(new AppError(`Collection "${slug}" already exists`, 400));
  }

  await validateCollectionPayload({
    kind: effectiveKind,
    productIds: productIds || [],
    rule,
  });

  const collection = await Collection.create({
    slug,
    label,
    description,
    image,
    kind: effectiveKind,
    productIds: effectiveKind === "manual" ? [...new Set((productIds || []).map(String))] : [],
    rule: effectiveKind === "rule" ? rule : undefined,
    active: active !== undefined ? active : true,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({
    status: "success",
    data: {
      collection,
    },
  });
});

exports.updateCollection = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const slug = String(req.params.slug).toLowerCase();
  const { label, description, image, kind, productIds, rule, active, sortOrder } = req.body;

  if (req.body.slug !== undefined && req.body.slug !== slug) {
    return next(new AppError("Collection slug is immutable", 400));
  }

  const collection = await Collection.findOne({ slug });
  if (!collection) {
    return next(new AppError("Collection not found", 404));
  }

  const effectiveKind = kind !== undefined ? kind : collection.kind;
  const effectiveProductIds = productIds !== undefined ? productIds : collection.productIds;
  const effectiveRule = rule !== undefined ? rule : collection.rule;
  await validateCollectionPayload({
    kind: effectiveKind,
    productIds: effectiveProductIds,
    rule: effectiveRule,
  });

  if (label !== undefined) collection.label = label;
  if (description !== undefined) collection.description = description;
  if (image !== undefined) collection.image = image;
  if (kind !== undefined) collection.kind = kind;
  if (productIds !== undefined) {
    collection.productIds = [...new Set(productIds.map(String))];
  }
  if (rule !== undefined) collection.rule = rule;
  if (active !== undefined) collection.active = active;
  if (sortOrder !== undefined) collection.sortOrder = sortOrder;

  await collection.save();

  res.status(200).json({
    status: "success",
    data: {
      collection,
    },
  });
});

exports.deleteCollection = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a registry write makes cached lists stale
  const slug = String(req.params.slug).toLowerCase();

  const collection = await Collection.findOne({ slug });
  if (!collection) {
    return next(new AppError("Collection not found", 404));
  }

  // Membership lives on the collection itself, so deletion strands
  // no references (products are never duplicated or owned by it).
  await Collection.findByIdAndDelete(collection._id);

  res.status(200).json({
    status: "success",
    message: "Collection deleted successfully",
  });
});

// ------------------------------------------------------------------
// Attribute definitions (Phase 2)
// ------------------------------------------------------------------

// Does any product carry a value for this definition? Bounded
// existence check (Product.exists resolves the first match only).
async function attributeDefinitionInUse(definition) {
  if ((definition.storage || "catalogAttributes") === "field") {
    if (!definition.fieldPath) return false;
    return Boolean(
      await Product.exists({ [definition.fieldPath]: { $exists: true, $ne: null } })
    );
  }
  return Boolean(
    await Product.exists({ [`catalogAttributes.${definition.key}`]: { $exists: true } })
  );
}

const ATTRIBUTE_EDITABLE_FIELDS = [
  "label",
  "type",
  "unit",
  "acceptedUnits",
  "allowedValues",
  "min",
  "max",
  "step",
  "maxLength",
  "required",
  "filterable",
  "sortable",
  "comparable",
  "displayGroup",
  "sortOrder",
  "active",
  "appliesTo",
  "storage",
  "fieldPath",
];

function assertSaneBounds(body, current) {
  const min = body.min !== undefined ? body.min : current && current.min;
  const max = body.max !== undefined ? body.max : current && current.max;
  if (min !== undefined && min !== null && max !== undefined && max !== null && min > max) {
    throw new AppError("Attribute min cannot exceed max", 400);
  }
}

exports.listAttributeDefinitions = catchAsync(async (req, res, next) => {
  // PERF-B-05 (U-2): registry cached in-process (60s), invalidated
  // by the attribute write handlers above.
  const attributeDefinitions = await getAttributeDefinitionsCached("all:sorted", () =>
    AttributeDefinition.find({}).sort({ sortOrder: 1, key: 1 }).lean()
  );

  res.status(200).json({
    status: "success",
    results: attributeDefinitions.length,
    data: {
      attributeDefinitions,
    },
  });
});

exports.getAttributeDefinition = catchAsync(async (req, res, next) => {
  const attributeDefinition = await AttributeDefinition.findOne({
    key: String(req.params.key),
  }).lean();

  if (!attributeDefinition) {
    return next(new AppError("Attribute definition not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      attributeDefinition,
    },
  });
});

exports.createAttributeDefinition = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); invalidateAttributeRegistryCache(); // PERF-B-01/B-05: registry writes invalidate both caches
  const { key } = req.body;

  const existing = await AttributeDefinition.findOne({ key });
  if (existing) {
    return next(new AppError(`Attribute definition "${key}" already exists`, 400));
  }
  assertSaneBounds(req.body, null);

  const doc = { key };
  for (const field of ATTRIBUTE_EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) doc[field] = req.body[field];
  }
  const attributeDefinition = await AttributeDefinition.create(doc);

  res.status(201).json({
    status: "success",
    data: {
      attributeDefinition,
    },
  });
});

exports.updateAttributeDefinition = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); invalidateAttributeRegistryCache(); // PERF-B-01/B-05: registry writes invalidate both caches
  const key = String(req.params.key);

  // Keys are referenced by string from products, types and
  // category assignments; renaming one would strand them all.
  if (req.body.key !== undefined && req.body.key !== key) {
    return next(new AppError("Attribute key is immutable", 400));
  }

  const attributeDefinition = await AttributeDefinition.findOne({ key });
  if (!attributeDefinition) {
    return next(new AppError("Attribute definition not found", 404));
  }

  // Changing the type or storage of an attribute products already
  // carry values for would silently reinterpret their data.
  const typeChanging = req.body.type !== undefined && req.body.type !== attributeDefinition.type;
  const storageChanging =
    req.body.storage !== undefined &&
    req.body.storage !== (attributeDefinition.storage || "catalogAttributes");
  if ((typeChanging || storageChanging) && (await attributeDefinitionInUse(attributeDefinition))) {
    return next(
      new AppError(
        `Cannot change the type or storage of attribute "${key}" while products carry values for it`,
        400
      )
    );
  }
  assertSaneBounds(req.body, attributeDefinition);

  for (const field of ATTRIBUTE_EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) attributeDefinition[field] = req.body[field];
  }
  await attributeDefinition.save();

  res.status(200).json({
    status: "success",
    data: {
      attributeDefinition,
    },
  });
});

exports.deleteAttributeDefinition = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); invalidateAttributeRegistryCache(); // PERF-B-01/B-05: registry writes invalidate both caches
  const key = String(req.params.key);

  const attributeDefinition = await AttributeDefinition.findOne({ key });
  if (!attributeDefinition) {
    return next(new AppError("Attribute definition not found", 404));
  }

  // Default delete is SOFT (active:false): the definition stops
  // resolving and stops accepting writes, but existing product
  // values keep their meaning and the definition can be restored.
  if (req.query.hard !== "true") {
    attributeDefinition.active = false;
    await attributeDefinition.save();
    return res.status(200).json({
      status: "success",
      message: "Attribute definition deactivated",
      data: {
        attributeDefinition,
      },
    });
  }

  // Hard delete is allowed only for a definition nothing uses:
  // no product values, and no assignment (category or product
  // type) references the key.
  if (await attributeDefinitionInUse(attributeDefinition)) {
    return next(
      new AppError(`Cannot delete attribute "${key}" while products carry values for it`, 400)
    );
  }
  const [categoryRefs, typeRefs] = await Promise.all([
    Category.countDocuments({ "attributeAssignments.attributeKey": key }),
    ProductType.countDocuments({
      $or: [{ attributeKeys: key }, { "attributeAssignments.attributeKey": key }],
    }),
  ]);
  if (categoryRefs > 0 || typeRefs > 0) {
    return next(
      new AppError(
        `Cannot delete attribute "${key}" while assignments reference it (${categoryRefs} categories, ${typeRefs} product types)`,
        400
      )
    );
  }

  await AttributeDefinition.findByIdAndDelete(attributeDefinition._id);

  res.status(200).json({
    status: "success",
    message: "Attribute definition deleted successfully",
  });
});

// ------------------------------------------------------------------
// Attribute resolution reads + schema (Phase 2)
// ------------------------------------------------------------------

// Applicable attributes for a category (slug or ObjectId): the
// merged global + type + ancestor-chain set from the resolution
// service. This is what the admin product form and the storefront
// filter/spec surfaces render from.
exports.getCategoryAttributes = catchAsync(async (req, res, next) => {
  const ref = String(req.params.ref);
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(ref);
  const category = await Category.findOne(isObjectId ? { _id: ref } : { slug: ref }).lean();

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  const attributes = await resolveForCategory(category);

  res.status(200).json({
    status: "success",
    results: attributes.length,
    data: {
      category: { id: category._id, name: category.name, slug: category.slug },
      attributes,
    },
  });
});

// Applicable attributes for a product type (global + type level).
exports.getProductTypeAttributes = catchAsync(async (req, res, next) => {
  const resolved = await resolveForProductType(String(req.params.key).toLowerCase());

  if (!resolved || !resolved.productType.active) {
    return next(new AppError("Product type not found", 404));
  }

  res.status(200).json({
    status: "success",
    results: resolved.attributes.length,
    data: {
      productType: { key: resolved.productType.key, label: resolved.productType.label },
      attributes: resolved.attributes,
    },
  });
});

// One definition as the /catalog/schema payload describes it: the
// static config's { label, type } core plus the engine's richer
// fields when set (an intentional, documented superset — see
// docs/catalog/PHASE2_NOTES.md).
function serializeSchemaDefinition(definition) {
  const out = { label: definition.label, type: definition.type };
  if (definition.unit) out.unit = definition.unit;
  if (definition.acceptedUnits && definition.acceptedUnits.length > 0) {
    out.acceptedUnits = definition.acceptedUnits;
  }
  if (definition.allowedValues && definition.allowedValues.length > 0) {
    out.allowedValues = definition.allowedValues;
  }
  if (definition.min !== undefined && definition.min !== null) out.min = definition.min;
  if (definition.max !== undefined && definition.max !== null) out.max = definition.max;
  if (definition.step !== undefined && definition.step !== null) out.step = definition.step;
  out.required = Boolean(definition.required);
  out.filterable = Boolean(definition.filterable);
  out.sortable = Boolean(definition.sortable);
  out.comparable = Boolean(definition.comparable);
  out.displayGroup = definition.displayGroup || "Specifications";
  out.storage = definition.storage || "catalogAttributes";
  if (definition.fieldPath) out.fieldPath = definition.fieldPath;
  out.appliesTo = definition.appliesTo || "assigned";
  return out;
}

// GET /catalog/schema — now served from the DB registries (the
// Phase 1 note deferred exactly this unification to Phase 2).
// Shape is unchanged: data: { definitions: { key: def },
// productTypes: { key: [attributeKeys] }, rooms: [slug] }.
// If the bootstrap has never run on this database (no definitions
// and no types at all), the static config is served instead so
// the endpoint never returns an empty schema.
exports.getSchema = catchAsync(async (req, res, next) => {
  const [definitions, productTypes, rooms] = await Promise.all([
    AttributeDefinition.find({ active: true }).sort({ sortOrder: 1, key: 1 }).lean(),
    ProductType.find({ active: true }).sort({ sortOrder: 1, label: 1 }).lean(),
    Room.find({ active: true }).sort({ sortOrder: 1, label: 1 }).lean(),
  ]);

  if (definitions.length === 0 && productTypes.length === 0) {
    return res.json({
      status: "success",
      data: { definitions: staticDefinitions, productTypes: staticProductTypes, rooms: staticRooms },
    });
  }

  const definitionMap = {};
  for (const definition of definitions) {
    definitionMap[definition.key] = serializeSchemaDefinition(definition);
  }
  const typeMap = {};
  for (const productType of productTypes) {
    typeMap[productType.key] = productType.attributeKeys || [];
  }

  res.json({
    status: "success",
    data: {
      definitions: definitionMap,
      productTypes: typeMap,
      rooms: rooms.map((room) => room.slug),
    },
  });
});

// ------------------------------------------------------------------
// Category facets (Phase 5 convergence)
// ------------------------------------------------------------------
// GET /catalog/categories/:slug/facets delegates to the SAME
// disjunctive engine as GET /products?facets=1 — the precursor's
// in-JS counting over a <=5,000-product sample is gone; there is
// one faceting implementation. The response keeps the precursor's
// shape ({ category, total, facets: [{ key, label, type,
// options: [{ value, count }] }] }); the recorded changes are
// that options now ALWAYS carry counts (the precursor emitted
// bare { value } entries for colors/materials/style) and that
// range-typed definitions list exact values instead of a single
// { min, max } bucket (the engine's native shape). See
// docs/catalog/PHASE5_NOTES.md.
exports.getCategoryFacets = catchAsync(async (req, res, next) => {
  const slug = String(req.params.slug || "").slice(0, 120);
  const category = await Category.findOne({ slug, status: "active" })
    .select("_id name slug")
    .lean();
  if (!category) {
    return next(new AppError("Category not found", 404));
  }
  const descendantIds = await Category.getDescendantIds([category._id]);
  const { facets, total } = await computeFacets({
    scopeFragments: [{ deletedAt: null }, { status: { $in: ["active", "out_of_stock"] } }],
    categoryFragment: { category: { $in: descendantIds } },
    categoryRoots: [category._id],
  });
  // Precursor order: the field-storage facets (colors, materials,
  // style) first, then the resolved attribute facets in registry
  // order — matching the old handler's field-then-schema layout.
  const FIELD_ORDER = ["colors", "materials", "style"];
  const ordered = [...facets.attributes].sort((a, b) => {
    const ai = FIELD_ORDER.indexOf(a.key);
    const bi = FIELD_ORDER.indexOf(b.key);
    if (ai === -1 && bi === -1) return 0;
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  res.json({
    status: "success",
    data: {
      category: { id: String(category._id), name: category.name, slug: category.slug },
      total,
      facets: ordered.map((facet) => ({
        key: facet.key,
        label: facet.label,
        type: facet.type,
        options: facet.options.map((option) => ({ value: option.value, count: option.count })),
      })),
    },
  });
});
