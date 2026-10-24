// AR-31(b): shared catalog list-filter builder, used by
// product.controller.getAllProducts and category.controller.getCategoryProducts.
//
// Before AR-31 the two handlers carried drifted copies of the same
// list logic (the FA-49 coercion fix landed in one copy first). The
// parts that were genuinely the same operation now live here:
//   - $text search
//   - price range ($gte/$lte from already-coerced numbers)
//   - colors/materials as anchored case-insensitive regex $in lists
//   - minimum rating
//   - pagination bounds + skip (utils/listQuery)
//   - the safeSort allowlist (identical at both call sites)
//
// Deliberately NOT unified (pre-existing divergences, pinned by
// tests/platform/catalog-list-query.test.js — see the AR-31 report):
//   D1. getCategoryProducts treats a 0 price/rating bound as ABSENT
//       (truthiness check); getAllProducts applies it (!== undefined).
//       The category handler therefore passes `value || undefined`
//       into this builder, preserving its semantics exactly.
//   D2. List coercion differs: getAllProducts uses asStringList
//       (trim, 100 chars/item, cap 50); getCategoryProducts splits the
//       raw string itself (no trim, cap 20). Each handler keeps its
//       own coercion and passes the resulting string list here.
//   D3. Search length cap differs (200 vs 100) — coercion stays at
//       the call sites for the same reason.
//   D4. getAllProducts reads with .lean(); getCategoryProducts does not.
//   D5. Base/status filters and response shapes are endpoint-owned.
const { boundedLimit, boundedPage, safeSort } = require("./listQuery");
const { escapeRegExp } = require("./escapeRegex");

const CATALOG_SORT_FIELDS = [
  "createdAt",
  "price",
  "originalPrice",
  "name",
  "stock",
  "rating.average",
];

const catalogSort = (sort) => safeSort(sort, CATALOG_SORT_FIELDS);

// Anchored, case-insensitive exact-match $in list (values escaped so
// client input can never become a regex pattern — C-01).
const caseInsensitiveExactIn = (values) => ({
  $in: values.map((value) => new RegExp(`^${escapeRegExp(value)}$`, "i")),
});

// Apply the shared optional filters onto a caller-built base filter.
// Presence semantics: a value applies iff it is not undefined (search:
// iff truthy, matching both original handlers). Returns the filter.
const applyCatalogListFilters = (
  filter,
  { search, minPrice, maxPrice, colorValues, materialValues, minRating } = {},
) => {
  if (search) {
    filter.$text = { $search: search };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  if (colorValues && colorValues.length > 0) {
    filter.colors = caseInsensitiveExactIn(colorValues);
  }

  if (materialValues && materialValues.length > 0) {
    filter.materials = caseInsensitiveExactIn(materialValues);
  }

  if (minRating !== undefined) {
    filter["rating.average"] = { $gte: minRating };
  }

  return filter;
};

// Bounded page/limit + skip, identical at both call sites.
const catalogPagination = (page, limit, fallbackLimit = 20) => {
  const pageNum = boundedPage(page);
  const limitNum = boundedLimit(limit, fallbackLimit);
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

module.exports = {
  CATALOG_SORT_FIELDS,
  catalogSort,
  caseInsensitiveExactIn,
  applyCatalogListFilters,
  catalogPagination,
};
