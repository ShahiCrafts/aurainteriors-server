"use strict";

// ------------------------------------------------------------------
// Phase 5 (catalog): disjunctive facet computation for GET /products
// and (by delegation) GET /catalog/categories/:slug/facets — the
// ONE faceting implementation in the codebase.
//
// Disjunctive rule: the counts for facet F are computed over the
// pool of products matching every current filter EXCEPT F's own —
// so selecting color=red keeps blue's count visible (blue counted
// in the red-excluded pool) while the product total reflects red.
//
// Implementation: ONE Product.aggregate. A first $match applies
// the scope that must hold for every pool (visibility, search
// text, collection membership — $text is only legal as the first
// pipeline stage, so it lives here and never inside a subpipeline),
// then a $facet stage runs one subpipeline per facet, each with
// its own $match pool assembled from the SAME fragments the list
// filter was built from (the controller passes them in), minus
// the excluded dimension. Variant-aware conditions are rebuilt
// per pool through buildVariantAwareClause with the excluded key
// removed, so the same-variant rule holds inside facet pools too.
//
// Facet values are grouped by their STRING form ($toString): a
// value stored typed at product level (3) and stringified on a
// variant ("3") is one facet value with exact distinct-product
// counts ($addToSet of _id), and is rendered back to the
// definition's type for the response.
// ------------------------------------------------------------------

const mongoose = require("mongoose");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Room = require("../models/room.model");
const {
  loadActiveDefinitions,
  resolveForCategory,
  resolveForProductType,
} = require("./attributeResolution.service");
const {
  buildVariantAwareClause,
  EFFECTIVE_PRICE_EXPR,
  AXIS_TYPES,
} = require("./catalogFilter.service");

const FACET_VALUE_CAP = 50;
const RATING_THRESHOLDS = [4, 3, 2, 1];
// Attribute keys with a dedicated facet (price range / room list);
// they never also appear as attribute facets.
const DEDICATED_KEYS = new Set(["price", "roomSlugs"]);
// Legacy field params that ARE the same conceptual facet as the
// field-storage attribute of the same key: the facet pool for
// attr.colors also drops the legacy colors= fragment (and vice
// versa), so the two spellings never double-restrict a facet.
const LEGACY_FIELD_KEYS = ["style", "colors", "materials"];

function combine(fragments) {
  const list = (fragments || []).filter(Boolean);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return { $and: list };
}

function matchStage(fragments) {
  const match = combine(fragments);
  return match ? [{ $match: match }] : [];
}

// Distinct-product counts per value: project the value(s) a
// product carries for the facet, unwind, group by string form.
function countByValuePipeline(pool, valueExpr) {
  return [
    ...matchStage(pool),
    { $project: { v: valueExpr } },
    { $unwind: "$v" },
    { $group: { _id: { $toString: "$v" }, ids: { $addToSet: "$_id" } } },
    { $project: { _id: 1, count: { $size: "$ids" } } },
  ];
}

// Expression for "the values this product carries for a scalar
// attribute": a one-element array, or [] when unset. For
// variant-axis keys on products that use the key as an axis, the
// values come from the ENABLED variants instead (a facet must not
// advertise values no purchasable variant carries).
function scalarValuesExpr(definition) {
  const path =
    definition.storage === "field"
      ? `$${definition.fieldPath}`
      : definition.type === "measurement"
        ? `$catalogAttributes.${definition.key}.value`
        : `$catalogAttributes.${definition.key}`;
  const productExpr = {
    $cond: [{ $eq: [{ $type: path }, "missing"] }, [], [path]],
  };
  if (definition.storage !== "catalogAttributes" || !definition.axisCapable) {
    return productExpr;
  }
  const variantValues = {
    $filter: {
      input: {
        $map: {
          input: {
            $filter: {
              input: { $ifNull: ["$catalogVariants", []] },
              as: "v",
              cond: { $eq: ["$$v.enabled", true] },
            },
          },
          as: "v",
          in: `$$v.options.${definition.key}`,
        },
      },
      as: "x",
      cond: { $ne: ["$$x", null] },
    },
  };
  return {
    $cond: [
      { $in: [definition.key, { $ifNull: ["$variantOptionKeys", []] }] },
      variantValues,
      productExpr,
    ],
  };
}

function valuesExprFor(definition) {
  if (definition.type === "multi-enum") {
    const path =
      definition.storage === "field"
        ? `$${definition.fieldPath}`
        : `$catalogAttributes.${definition.key}`;
    return { $ifNull: [path, []] };
  }
  return scalarValuesExpr(definition);
}

// Render a grouped string value back to the definition's type.
function typedFacetValue(definition, raw) {
  if (definition.type === "boolean") return raw === "true";
  if (
    ["integer", "decimal", "money", "measurement"].includes(definition.type)
  ) {
    const num = Number(raw);
    return Number.isFinite(num) ? num : raw;
  }
  return raw;
}

// Sort (count desc, value asc), cap at FACET_VALUE_CAP, and always
// include the selected values (with their true count, or 0 when
// the value does not occur in the pool at all).
function capOptions(rows, selectedValues) {
  const selected = new Set((selectedValues || []).map(String));
  const sorted = [...rows].sort(
    (a, b) =>
      b.count - a.count || String(a.value).localeCompare(String(b.value)),
  );
  const capped = sorted.slice(0, FACET_VALUE_CAP);
  const inCap = new Set(capped.map((row) => String(row.value)));
  for (const row of sorted) {
    if (selected.has(String(row.value)) && !inCap.has(String(row.value))) {
      capped.push(row);
      inCap.add(String(row.value));
    }
  }
  for (const value of selectedValues || []) {
    if (!sorted.some((row) => String(row.value) === String(value))) {
      capped.push({ value, count: 0 });
    }
  }
  return capped.map((row) => ({
    value: row.value,
    count: row.count,
    selected: selected.has(String(row.value)),
  }));
}

// Union of resolved attribute entries across contexts (the
// resolution service returns { attributes: [entries] }). When two
// contexts disagree on filterable for a key, the filterable entry
// wins (the facet exists if it applies anywhere in scope).
function unionResolved(entryLists) {
  const byKey = new Map();
  for (const entries of entryLists) {
    for (const entry of entries || []) {
      const existing = byKey.get(entry.key);
      if (
        !existing ||
        (existing.filterable !== true && entry.filterable === true)
      ) {
        byKey.set(entry.key, entry);
      }
    }
  }
  return byKey;
}

async function applicableAttributeFacets({
  categoryRoots,
  scopeMatch,
  definitions,
}) {
  let resolved;
  if (categoryRoots.length > 0) {
    // PERF-B-06: roots are independent — resolve them in parallel.
    // Promise.all preserves root order, so unionResolved sees the
    // lists in exactly the old sequence.
    const perRoot = await Promise.all(
      categoryRoots.map(async (rootId) => {
        // resolveForCategory takes a category DOCUMENT (an id alone
        // silently resolves globals-only — the chain walk needs the
        // document), and returns the resolved entries array.
        const doc = await Category.findById(rootId).lean();
        if (!doc) return null;
        const entries = await resolveForCategory(doc);
        return Array.isArray(entries) ? entries : null;
      }),
    );
    const lists = perRoot.filter(Boolean);
    resolved = unionResolved(lists);
  } else {
    // No category selected: attributes applicable to ANY product
    // type present in scope (a product's own type, or its
    // category's type when the product carries none).
    const typeRows = await Product.aggregate([
      { $match: scopeMatch },
      { $group: { _id: "$productType" } },
    ]);
    const types = new Set(typeRows.map((row) => row._id).filter(Boolean));
    const catRows = await Product.aggregate([
      { $match: scopeMatch },
      { $group: { _id: "$category" } },
    ]);
    const catIds = catRows.map((row) => row._id).filter(Boolean);
    if (catIds.length > 0) {
      const cats = await Category.find({ _id: { $in: catIds } })
        .select("productType")
        .lean();
      for (const cat of cats) {
        if (cat.productType) types.add(cat.productType);
      }
    }
    // PERF-B-06: types are independent — resolve in parallel,
    // preserving the Set's iteration order in the resulting lists.
    const perType = await Promise.all(
      [...types].map(async (typeKey) => {
        const result = await resolveForProductType(typeKey);
        return result ? result.attributes : null;
      }),
    );
    const lists = perType.filter(Boolean);
    // Globals (appliesTo "all") always apply, even when the scope
    // carries no typed products at all.
    lists.push(
      [...definitions.values()].filter(
        (definition) => definition.appliesTo === "all",
      ),
    );
    resolved = unionResolved(lists);
  }
  return [...resolved.values()]
    .filter(
      (entry) => entry.filterable === true && !DEDICATED_KEYS.has(entry.key),
    )
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.key.localeCompare(b.key),
    );
}

// Category facet: direct per-category counts from the aggregation
// are rolled up to subtree counts in JS over the active category
// list. Scope roots are the selected categories, or every
// parentless category when none is selected.
function rollupCategoryFacet(directCounts, categories, categoryRoots) {
  const byId = new Map(categories.map((cat) => [String(cat._id), cat]));
  const children = new Map();
  for (const cat of categories) {
    if (cat.parent) {
      const parentKey = String(cat.parent);
      if (!children.has(parentKey)) children.set(parentKey, []);
      children.get(parentKey).push(cat);
    }
  }
  const selectedIds = new Set(categoryRoots.map(String));
  const roots =
    categoryRoots.length > 0
      ? categories.filter((cat) => selectedIds.has(String(cat._id)))
      : categories.filter(
          (cat) => !cat.parent || !byId.has(String(cat.parent)),
        );

  const memo = new Map();
  const subtreeCount = (cat) => {
    const key = String(cat._id);
    if (memo.has(key)) return memo.get(key);
    memo.set(key, 0); // cycle guard
    let total = directCounts.get(key) || 0;
    for (const child of children.get(key) || []) total += subtreeCount(child);
    memo.set(key, total);
    return total;
  };

  const options = [];
  const seen = new Set();
  const walk = (cat) => {
    const key = String(cat._id);
    if (seen.has(key)) return;
    seen.add(key);
    const count = subtreeCount(cat);
    const selected = selectedIds.has(key);
    if (count > 0 || selected) {
      options.push({
        value: cat.slug,
        id: key,
        name: cat.name,
        count,
        selected,
      });
    }
    for (const child of children.get(key) || []) walk(child);
  };
  for (const root of roots) walk(root);
  options.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return options;
}

async function computeFacets({
  scopeFragments,
  conditions = [],
  priceRange = null,
  inStock = false,
  categoryFragment = null,
  categoryRoots = [],
  roomFragment = null,
  ratingFragment = null,
  minRating = undefined,
  fieldFragments = {},
  availabilityFragments = [],
}) {
  const definitions = await loadActiveDefinitions();
  // The list filter carries category ids as STRINGS (the
  // descendant expansion stringifies them; Mongoose casts them
  // back in find(), but aggregation $match does not cast) — re-type
  // 24-hex strings to ObjectIds for the facet pools, or every pool
  // containing the category fragment would silently match nothing.
  if (categoryFragment && Array.isArray(categoryFragment.category?.$in)) {
    categoryFragment = {
      category: {
        $in: categoryFragment.category.$in.map((id) =>
          typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
            ? new mongoose.Types.ObjectId(id)
            : id,
        ),
      },
    };
  }
  const byKey = (key) => conditions.find((c) => c.key === key);
  const conditionsMinus = (key) => conditions.filter((c) => c.key !== key);
  const engine = (list, range, stock) =>
    buildVariantAwareClause({
      conditions: list,
      priceRange: range,
      inStock: stock,
    });

  // $text may only appear as the first pipeline stage: it is part
  // of the stage-1 scope match and is stripped from every pool.
  const poolBase = (scopeFragments || []).filter(
    (fragment) => !Object.prototype.hasOwnProperty.call(fragment, "$text"),
  );
  const dim = {
    category: categoryFragment ? [categoryFragment] : [],
    room: roomFragment ? [roomFragment] : [],
    rating: ratingFragment ? [ratingFragment] : [],
    style: fieldFragments.style ? [fieldFragments.style] : [],
    colors: fieldFragments.colors ? [fieldFragments.colors] : [],
    materials: fieldFragments.materials ? [fieldFragments.materials] : [],
  };
  const allDims = () => [
    ...dim.category,
    ...dim.room,
    ...dim.rating,
    ...dim.style,
    ...dim.colors,
    ...dim.materials,
  ];
  const dimsExcept = (...keys) => {
    const skip = new Set(keys);
    return Object.entries(dim)
      .filter(([key]) => !skip.has(key))
      .flatMap(([, fragments]) => fragments);
  };
  // Pool for an attribute facet: everything except that
  // attribute's own condition (and, for field-storage keys, the
  // legacy fragment of the same facet).
  const attrPool = (key) => [
    ...poolBase,
    ...dimsExcept(...(LEGACY_FIELD_KEYS.includes(key) ? [key] : [])),
    ...availabilityFragments,
    ...engine(conditionsMinus(key), priceRange, inStock),
  ];

  const stageOne = combine(scopeFragments || []) || { deletedAt: null };
  const scopeForTypes = combine([
    ...(scopeFragments || []),
    ...dim.category,
  ]) || { deletedAt: null };
  const applicable = await applicableAttributeFacets({
    categoryRoots,
    scopeMatch: scopeForTypes,
    definitions,
  });

  const facetPipelines = {};
  facetPipelines._total = [
    ...matchStage([
      ...poolBase,
      ...allDims(),
      ...availabilityFragments,
      ...engine(conditions, priceRange, inStock),
    ]),
    { $count: "n" },
  ];
  facetPipelines.category = [
    ...matchStage([
      ...poolBase,
      ...dimsExcept("category"),
      ...availabilityFragments,
      ...engine(conditions, priceRange, inStock),
    ]),
    { $group: { _id: "$category", n: { $sum: 1 } } },
  ];
  facetPipelines.room = countByValuePipeline(
    [
      ...poolBase,
      ...dimsExcept("room"),
      ...availabilityFragments,
      ...engine(conditionsMinus("roomSlugs"), priceRange, inStock),
    ],
    { $ifNull: ["$roomSlugs", []] },
  );
  facetPipelines.price = [
    ...matchStage([
      ...poolBase,
      ...allDims(),
      ...availabilityFragments,
      ...engine(conditionsMinus("price"), null, inStock),
    ]),
    {
      $group: {
        _id: null,
        min: { $min: EFFECTIVE_PRICE_EXPR },
        max: { $max: EFFECTIVE_PRICE_EXPR },
      },
    },
  ];
  facetPipelines.availability = [
    ...matchStage([
      ...poolBase,
      ...allDims(),
      ...availabilityFragments,
      ...engine(conditions, priceRange, true),
    ]),
    { $count: "n" },
  ];
  const ratingGroup = { _id: null };
  for (const threshold of RATING_THRESHOLDS) {
    ratingGroup[`t${threshold}`] = {
      $sum: { $cond: [{ $gte: ["$rating.average", threshold] }, 1, 0] },
    };
  }
  facetPipelines.rating = [
    ...matchStage([
      ...poolBase,
      ...dimsExcept("rating"),
      ...availabilityFragments,
      ...engine(conditions, priceRange, inStock),
    ]),
    { $group: ratingGroup },
  ];
  for (const definition of applicable) {
    // The value expression needs the full definition (storage,
    // fieldPath) plus axis capability, which is derived from
    // storage + type exactly as in catalogFilter.service.
    const full = definitions.get(definition.key) || definition;
    const facetDef = {
      ...full,
      axisCapable:
        full.storage === "catalogAttributes" && AXIS_TYPES.has(full.type),
    };
    facetPipelines[`attr:${definition.key}`] = countByValuePipeline(
      attrPool(definition.key),
      valuesExprFor(facetDef),
    );
  }
  for (const key of LEGACY_FIELD_KEYS) {
    // A legacy field param (colors=, materials=, style=) without a
    // filterable registry definition still deserves its facet when
    // it is actively filtering — its pool is the attr pool of the
    // same key (legacy fragment + attr condition both excluded).
    if (dim[key].length > 0 && !applicable.some((entry) => entry.key === key)) {
      const definition = definitions.get(key);
      if (definition) {
        facetPipelines[`attr:${key}`] = countByValuePipeline(
          attrPool(key),
          valuesExprFor(definition),
        );
      }
    }
  }

  const [result] = await Product.aggregate([
    { $match: stageOne },
    { $facet: facetPipelines },
  ]);
  const rows = result || {};

  const total = rows._total?.[0]?.n || 0;

  const directCounts = new Map(
    (rows.category || [])
      .filter((row) => row._id)
      .map((row) => [String(row._id), row.n]),
  );
  const categories = await Category.find({ status: "active" })
    .select("name slug parent")
    .lean();
  const categoryOptions = rollupCategoryFacet(
    directCounts,
    categories,
    categoryRoots,
  );

  const rooms = await Room.find({ active: true }).select("slug name").lean();
  const roomNames = new Map(rooms.map((room) => [room.slug, room.name]));
  const roomSelected = roomFragment?.roomSlugs?.$in || [];
  const roomOptions = capOptions(
    (rows.room || []).map((row) => ({ value: row._id, count: row.count })),
    roomSelected,
  ).map((option) => ({
    ...option,
    label: roomNames.get(option.value) || option.value,
  }));

  const priceRow = rows.price?.[0];
  const availabilityCount = rows.availability?.[0]?.n || 0;
  const ratingRow = rows.rating?.[0] || {};

  const attributeFacets = [];
  const facetKeys = new Set([
    ...applicable.map((entry) => entry.key),
    ...Object.keys(rows)
      .filter((key) => key.startsWith("attr:"))
      .map((key) => key.slice("attr:".length)),
  ]);
  for (const key of facetKeys) {
    const definition = definitions.get(key);
    if (!definition) continue;
    const condition = byKey(key);
    const selectedValues = condition ? condition.exactValues : [];
    const options = capOptions(
      (rows[`attr:${key}`] || []).map((row) => ({
        value: typedFacetValue(definition, row._id),
        count: row.count,
      })),
      selectedValues,
    );
    const facet = {
      key,
      label: definition.label || key,
      type: definition.type,
      options,
    };
    if (
      condition &&
      (condition.min !== undefined || condition.max !== undefined)
    ) {
      facet.selectedRange = {
        min: condition.min ?? null,
        max: condition.max ?? null,
      };
    }
    attributeFacets.push(facet);
  }
  const sortIndex = new Map(applicable.map((entry, i) => [entry.key, i]));
  attributeFacets.sort(
    (a, b) => (sortIndex.get(a.key) ?? 999) - (sortIndex.get(b.key) ?? 999),
  );

  return {
    total,
    facets: {
      category: {
        key: "category",
        label: "Category",
        type: "category",
        options: categoryOptions,
      },
      room: { key: "room", label: "Room", type: "enum", options: roomOptions },
      price: {
        key: "price",
        label: "Price",
        type: "money",
        min: priceRow && priceRow.min !== undefined ? priceRow.min : null,
        max: priceRow && priceRow.max !== undefined ? priceRow.max : null,
        selected: {
          min:
            priceRange && priceRange.min !== undefined ? priceRange.min : null,
          max:
            priceRange && priceRange.max !== undefined ? priceRange.max : null,
        },
      },
      availability: {
        key: "availability",
        label: "Availability",
        type: "boolean",
        options: [
          { value: "inStock", count: availabilityCount, selected: inStock },
        ],
      },
      rating: {
        key: "rating",
        label: "Rating",
        type: "rating",
        options: RATING_THRESHOLDS.map((threshold) => ({
          value: threshold,
          count: ratingRow[`t${threshold}`] || 0,
          selected: minRating !== undefined && minRating === threshold,
        })),
      },
      attributes: attributeFacets,
    },
  };
}

module.exports = { computeFacets, FACET_VALUE_CAP };
