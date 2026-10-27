// Phase 1 (catalog) — collection product resolution.
//
// A Collection (models/collection.model.js) never stores product
// documents: manual collections store ordered product references;
// rule collections store a rule that this service evaluates at read
// time. Every path returns PUBLISHED products only (not deleted,
// status active|out_of_stock — the same visibility set the public
// product endpoints use) plus a total, in the collection's response
// order:
//
//   manual          the productIds order (curated). Unpublished or
//                   deleted references are dropped BEFORE pagination,
//                   so totals never leak unpublished items.
//   new-arrivals    createdAt within params.windowDays (default 30,
//                   clamped 1..365), newest first (or ?sort).
//   best-sellers    ranked by total units across NON-CANCELLED
//                   orders' items (the only sales signal the data
//                   carries — Order.items[].quantity), ties broken
//                   by most recent sale; capped at params.limit
//                   (default 20, clamped 1..100). Products with no
//                   sales never appear. Pagination slices the rank.
//   featured        isFeatured = true.
//   on-sale         originalPrice present and > price (the fields
//                   the discountPercentage virtual already uses).
//   attribute-match catalogAttributes[params.key] equals
//                   params.value (array values match on containment,
//                   per Mongo equality semantics). The key must be a
//                   known attribute definition — enforced at write
//                   time and re-checked here, so a rule written
//                   outside the API resolves empty instead of
//                   querying an arbitrary path. Phase 2: "known"
//                   means an ACTIVE AttributeDefinition in the
//                   database (storage catalogAttributes); Phase 1
//                   checked the static config.
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const AttributeDefinition = require("../models/attributeDefinition.model");
const { catalogPagination, catalogSort } = require("../utils/catalogListQuery");

const PUBLISHED = { deletedAt: null, status: { $in: ["active", "out_of_stock"] } };

const ATTRIBUTE_KEY_PATTERN = /^[A-Za-z0-9_]+$/;

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

// Intersect an ordered id list with the published set, preserving
// order — shared by manual collections, best-sellers, and the
// Phase 5 list dimension (resolveCollectionProductIds). Ids keep
// their original type (ObjectId): Mongoose casts strings in
// find() filters, but aggregation $match (Phase 5 facets) does
// not, so stringifying here would silently empty facet pools.
async function publishedIntersection(orderedIds) {
  const byString = new Map();
  for (const id of orderedIds || []) {
    const key = String(id);
    if (!byString.has(key)) byString.set(key, id);
  }
  const wanted = [...byString.keys()];
  if (wanted.length === 0) return [];
  const published = await Product.find({ _id: { $in: wanted }, ...PUBLISHED })
    .select("_id")
    .lean();
  const publishedIds = new Set(published.map((doc) => String(doc._id)));
  return wanted.filter((key) => publishedIds.has(key)).map((key) => byString.get(key));
}

// Ordered-id resolution shared by manual collections and
// best-sellers: intersect the ordered ids with the published set
// (preserving order), then return the requested page of full docs.
async function pageByOrderedIds(orderedIds, pageNum, limitNum) {
  const visibleOrdered = await publishedIntersection(orderedIds);
  if (visibleOrdered.length === 0) return { products: [], total: 0 };

  const total = visibleOrdered.length;
  const pageIds = visibleOrdered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  if (pageIds.length === 0) return { products: [], total };

  const docs = await Product.find({ _id: { $in: pageIds } })
    .populate("category", "name slug")
    .lean();
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  return { products: pageIds.map((id) => byId.get(String(id))).filter(Boolean), total };
}

async function pageByFilter(filter, query, pageNum, limitNum) {
  const skip = (pageNum - 1) * limitNum;
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(catalogSort(query.sort))
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return { products, total };
}

async function bestSellerIds(limit) {
  const rows = await Order.aggregate([
    { $match: { orderStatus: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        units: { $sum: "$items.quantity" },
        lastSoldAt: { $max: "$createdAt" },
      },
    },
    { $sort: { units: -1, lastSoldAt: -1 } },
    { $limit: limit },
  ]);
  return rows.map((row) => row._id);
}

// The Mongo filter for the filter-based rule types, or null when
// the rule is not filter-based (manual / best-sellers) or must
// resolve empty (unknown rule type, attribute-match naming an
// unknown/inactive definition). Shared by resolveCollectionProducts
// and resolveCollectionProductIds so both evaluate identical
// membership.
async function ruleFilterFor(collection) {
  const ruleType = collection.rule && collection.rule.type;
  const params = (collection.rule && collection.rule.params) || {};
  switch (ruleType) {
    case "new-arrivals": {
      const windowDays = clampInt(params.windowDays, 30, 1, 365);
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
      return { ...PUBLISHED, createdAt: { $gte: since } };
    }
    case "featured":
      return { ...PUBLISHED, isFeatured: true };
    case "on-sale":
      return { ...PUBLISHED, $expr: { $gt: ["$originalPrice", "$price"] } };
    case "attribute-match": {
      const key = typeof params.key === "string" ? params.key : "";
      const value = params.value;
      const scalar = ["string", "number", "boolean"].includes(typeof value);
      const knownDefinition =
        scalar && ATTRIBUTE_KEY_PATTERN.test(key)
          ? await AttributeDefinition.exists({
              key,
              active: true,
              storage: "catalogAttributes",
            })
          : null;
      return knownDefinition ? { ...PUBLISHED, [`catalogAttributes.${key}`]: value } : null;
    }
    default:
      return null;
  }
}

async function resolveCollectionProducts(collection, query = {}) {
  const { pageNum, limitNum } = catalogPagination(query.page, query.limit);
  let result;

  if (collection.kind === "manual") {
    result = await pageByOrderedIds(collection.productIds || [], pageNum, limitNum);
  } else {
    const ruleType = collection.rule && collection.rule.type;
    const params = (collection.rule && collection.rule.params) || {};
    if (ruleType === "best-sellers") {
      const limit = clampInt(params.limit, 20, 1, 100);
      result = await pageByOrderedIds(await bestSellerIds(limit), pageNum, limitNum);
    } else {
      const filter = await ruleFilterFor(collection);
      result = filter
        ? await pageByFilter(filter, query, pageNum, limitNum)
        : { products: [], total: 0 };
    }
  }

  return {
    products: result.products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      pages: Math.ceil(result.total / limitNum),
    },
  };
}

// Phase 5 (catalog): the collection's published product ids, in
// the collection's own order — the products list endpoint's
// `collection=<slug>` dimension consumes this so list membership
// is defined by exactly the same evaluation as the collection
// page (manual order / best-seller rank preserved; filter rules
// read the same filter).
async function resolveCollectionProductIds(collection) {
  if (collection.kind === "manual") {
    return publishedIntersection(collection.productIds || []);
  }
  const ruleType = collection.rule && collection.rule.type;
  const params = (collection.rule && collection.rule.params) || {};
  if (ruleType === "best-sellers") {
    const limit = clampInt(params.limit, 20, 1, 100);
    return publishedIntersection(await bestSellerIds(limit));
  }
  const filter = await ruleFilterFor(collection);
  if (!filter) return [];
  const docs = await Product.find(filter).select("_id").lean();
  return docs.map((doc) => doc._id);
}

module.exports = { resolveCollectionProducts, resolveCollectionProductIds };
