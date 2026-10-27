// Phase 5 (catalog) — faceted filter engine, pure layer: the
// attr.* grammar parser, per-type value parsing, clause shapes,
// and the effective-price sort parser. In-process, no database —
// the registry is a hand-built Map of definition objects with the
// same fields the DB documents carry. End-to-end matching
// semantics live in the MMS probe (catalog-facets.test.js).
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AXIS_TYPES,
  parseAttributeFilters,
  conditionProductFragment,
  buildVariantAwareClause,
  parseEffectiveSort,
} = require("../../services/catalogFilter.service");
const { VARIANT_OPTION_TYPES } = require("../../services/productVariant.service");

const DEFS = new Map(
  [
    { key: "color", type: "color", storage: "catalogAttributes", filterable: true, active: true },
    { key: "seatingCapacity", type: "integer", storage: "catalogAttributes", filterable: true, active: true },
    { key: "extendable", type: "boolean", storage: "catalogAttributes", filterable: true, active: true },
    { key: "cushionFirmness", type: "enum", storage: "catalogAttributes", filterable: true, active: true },
    { key: "features", type: "multi-enum", storage: "catalogAttributes", filterable: true, active: true },
    { key: "probeDepth", type: "measurement", unit: "cm", storage: "catalogAttributes", filterable: true, active: true },
    { key: "dims", type: "dimensions", storage: "catalogAttributes", filterable: true, active: true },
    { key: "shelfCount", type: "integer", storage: "catalogAttributes", filterable: false, active: true },
    { key: "ghost", type: "enum", storage: "catalogAttributes", filterable: true, active: false },
    { key: "weight", type: "measurement", storage: "field", fieldPath: "weight", filterable: true, active: true },
    { key: "style", type: "enum", storage: "field", fieldPath: "style", filterable: true, active: true },
    { key: "colors", type: "multi-enum", storage: "field", fieldPath: "colors", filterable: true, active: true },
    { key: "price", type: "money", storage: "field", fieldPath: "price", filterable: true, active: true },
  ].map((def) => [def.key, def])
);

const parse = (query) => parseAttributeFilters(query, DEFS);
const throws400 = (query, pattern) =>
  assert.throws(
    () => parse(query),
    (err) => err.statusCode === 400 && pattern.test(err.message),
    `expected a 400 matching ${pattern} for ${JSON.stringify(query)}`
  );

test("filter parser: enum values are literal OR lists (regex metachars stay data)", () => {
  const [cond] = parse({ "attr.cushionFirmness": "soft,extra firm" });
  assert.deepEqual(cond.exactValues, ["soft", "extra firm"]);
  const [meta] = parse({ "attr.cushionFirmness": "a+b.*" });
  assert.deepEqual(meta.exactValues, ["a+b.*"]);
});

test("filter parser: unknown / non-filterable / inactive keys are 400s naming the key", () => {
  throws400({ "attr.nope": "x" }, /Unknown attribute filter "nope"/);
  throws400({ "attr.shelfCount": "3" }, /"shelfCount" is not filterable/);
  throws400({ "attr.ghost": "x" }, /"ghost" is not active/);
});

test("filter parser: boolean accepts only 'true'/'false'", () => {
  const [cond] = parse({ "attr.extendable": "true" });
  assert.deepEqual(cond.exactValues, [true]);
  assert.deepEqual(cond.exactStrings, ["true"]);
  throws400({ "attr.extendable": "yes" }, /boolean/);
  throws400({ "attr.extendable": "1" }, /boolean/);
});

test("filter parser: integer values are strict; variant strings are canonical", () => {
  const [cond] = parse({ "attr.seatingCapacity": "2,04" });
  assert.deepEqual(cond.exactValues, [2, 4]);
  assert.deepEqual(cond.exactStrings, ["2", "4"]);
  throws400({ "attr.seatingCapacity": "2.5" }, /integer/);
  throws400({ "attr.seatingCapacity": "two" }, /integer/);
});

test("filter parser: color hex normalizes like the write path; names stay literal", () => {
  const [cond] = parse({ "attr.color": "#F00,#FF0000,Walnut" });
  assert.deepEqual(cond.exactValues, ["#ff0000", "#ff0000", "Walnut"]);
  assert.deepEqual(cond.exactStrings, ["#ff0000", "#ff0000", "Walnut"]);
});

test("filter parser: ranges only on numeric types, bounds parsed and ordered", () => {
  const [cond] = parse({ "attr.seatingCapacity.min": "2", "attr.seatingCapacity.max": "6" });
  assert.equal(cond.min, 2);
  assert.equal(cond.max, 6);
  assert.equal(cond.exactValues, null);
  throws400({ "attr.seatingCapacity.min": "6", "attr.seatingCapacity.max": "2" }, /min greater than max/);
  throws400({ "attr.seatingCapacity.min": "abc" }, /numeric/);
  throws400({ "attr.cushionFirmness.min": "1" }, /does not accept range/);
  throws400({ "attr.extendable.max": "1" }, /does not accept range/);
});

test("filter parser: exact + range combine on one key", () => {
  const [cond] = parse({ "attr.seatingCapacity": "4", "attr.seatingCapacity.min": "2" });
  assert.deepEqual(cond.exactValues, [4]);
  assert.equal(cond.min, 2);
});

test("filter parser: grammar rejects $-keys, extra dots, pollution segments, junk suffixes", () => {
  throws400({ "attr.co$lor": "red" }, /Invalid attribute filter/);
  throws400({ "attr.color.extra.deep": "red" }, /Invalid attribute filter/);
  throws400({ "attr.color.foo": "red" }, /Invalid attribute filter/);
  throws400({ "attr.__proto__": "red" }, /Invalid attribute filter/);
  throws400({ "attr.constructor": "red" }, /Invalid attribute filter/);
  throws400({ "attr.prototype": "red" }, /Invalid attribute filter/);
});

test("filter parser: container values and empty items are 400s (injection posture)", () => {
  throws400({ "attr.color": { $ne: "red" } }, /must be a string/);
  throws400({ "attr.color": ["red"] }, /must be a string/);
  throws400({ "attr.color": "" }, /empty value/);
  throws400({ "attr.color": "red," }, /empty value/);
});

test("filter parser: dimensions-typed attributes cannot be filtered by value", () => {
  throws400({ "attr.dims": "10" }, /cannot be filtered by value/);
});

test("filter parser: measurement matches the stored .value on both storages", () => {
  const [mapCond] = parse({ "attr.probeDepth": "120" });
  assert.deepEqual(conditionProductFragment(mapCond), {
    "catalogAttributes.probeDepth.value": { $in: [120] },
  });
  const [fieldCond] = parse({ "attr.weight.min": "5" });
  assert.deepEqual(conditionProductFragment(fieldCond), { "weight.value": { $gte: 5 } });
});

test("filter parser: field-storage fragments read the field path", () => {
  const [style] = parse({ "attr.style": "modern,classic" });
  assert.deepEqual(conditionProductFragment(style), { style: { $in: ["modern", "classic"] } });
  const [colors] = parse({ "attr.colors": "Red" });
  assert.deepEqual(conditionProductFragment(colors), { colors: { $in: ["Red"] } });
  const [capacity] = parse({ "attr.seatingCapacity.min": "2", "attr.seatingCapacity.max": "6" });
  assert.deepEqual(conditionProductFragment(capacity), {
    "catalogAttributes.seatingCapacity": { $gte: 2, $lte: 6 },
  });
});

test("filter parser: axis capability follows the variant-option type list", () => {
  const [color] = parse({ "attr.color": "red" });
  const [features] = parse({ "attr.features": "x" });
  const [style] = parse({ "attr.style": "modern" });
  const [depth] = parse({ "attr.probeDepth": "10" });
  assert.equal(color.axisCapable, true); // scalar + map storage
  assert.equal(features.axisCapable, false); // multi-enum is never an axis
  assert.equal(style.axisCapable, false); // field storage is never an axis
  assert.equal(depth.axisCapable, false); // measurement is never an axis
  assert.deepEqual([...AXIS_TYPES].sort(), [...VARIANT_OPTION_TYPES].sort());
});

test("filter clauses: pure legacy when nothing variant-aware is requested", () => {
  assert.deepEqual(buildVariantAwareClause({}), []);
  assert.deepEqual(buildVariantAwareClause({ conditions: [] }), []);
  const [style] = parse({ "attr.style": "modern" });
  assert.deepEqual(buildVariantAwareClause({ conditions: [style] }), [
    { style: { $in: ["modern"] } },
  ]);
});

test("filter clauses: price-only becomes the effective-price $or", () => {
  const clauses = buildVariantAwareClause({ priceRange: { min: 100, max: 500 } });
  assert.equal(clauses.length, 1);
  const [branch, variantBranch] = clauses[0].$or;
  assert.deepEqual(branch, { hasVariants: { $ne: true }, price: { $gte: 100, $lte: 500 } });
  assert.ok(variantBranch.$expr, "variant branch is the purchasable-unit expression");
  const conds = variantBranch.$expr.$gt[0].$size.$filter.cond.$and;
  assert.ok(conds.some((c) => c.$gte && c.$gte[0] === "$$v.price" && c.$gte[1] === 100));
  assert.ok(conds.some((c) => c.$lte && c.$lte[0] === "$$v.price" && c.$lte[1] === 500));
});

test("filter clauses: an axis condition builds the two-branch same-variant clause", () => {
  const [color] = parse({ "attr.color": "#F00" });
  const clauses = buildVariantAwareClause({ conditions: [color] });
  assert.equal(clauses.length, 1);
  const [productBranch, variantBranch] = clauses[0].$or;
  // Product branch: value at product level + the product must not
  // route the filtered key to variants.
  const parts = productBranch.$and;
  assert.ok(parts.some((p) => p["catalogAttributes.color"] && p["catalogAttributes.color"].$in[0] === "#ff0000"));
  assert.ok(parts.some((p) => Array.isArray(p.variantOptionKeys?.$nin) && p.variantOptionKeys.$nin.includes("color")));
  // Variant branch: the option read targets the same element the
  // enabled check reads ($filter over catalogVariants).
  const conds = variantBranch.$expr.$gt[0].$size.$filter.cond.$and;
  assert.ok(conds.some((c) => c.$eq && c.$eq[0] === "$$v.enabled"));
  assert.ok(
    conds.some(
      (c) => c.$in && c.$in[0] === "$$v.options.color" && c.$in[1].includes("#ff0000")
    )
  );
});

test("filter clauses: availability binds into the variant expression", () => {
  const clauses = buildVariantAwareClause({ inStock: true });
  const [, variantBranch] = clauses[0].$or;
  const conds = variantBranch.$expr.$gt[0].$size.$filter.cond.$and;
  assert.ok(conds.some((c) => c.$gt && Array.isArray(c.$gt[0].$subtract)));
});

test("effective sort parser: tokens, mixing, and fallback behavior", () => {
  assert.deepEqual(parseEffectiveSort("effectivePriceAsc"), { effectivePrice: 1 });
  assert.deepEqual(parseEffectiveSort("effectivePriceDesc"), { effectivePrice: -1 });
  assert.deepEqual(parseEffectiveSort("-createdAt,effectivePriceAsc"), {
    createdAt: -1,
    effectivePrice: 1,
  });
  assert.equal(parseEffectiveSort("price"), null); // legacy token: find() path
  assert.equal(parseEffectiveSort("-price"), null);
  assert.equal(parseEffectiveSort("secretField"), null);
  assert.equal(parseEffectiveSort(undefined), null);
  // Unknown fields are dropped, the effective token still applies.
  assert.deepEqual(parseEffectiveSort("secretField,effectivePriceAsc"), { effectivePrice: 1 });
});
