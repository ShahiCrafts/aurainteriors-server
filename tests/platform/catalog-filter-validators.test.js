// Phase 5 (catalog) — the GET /products query schema admits the
// new faceted-filter surface: `attr.*` keys pass Joi's
// stripUnknown as STRINGS (the engine parser owns the strict
// grammar), `collection` and `facets` are first-class params, and
// container values under an attr.* key fail validation with a 400
// instead of reaching Mongo as operators.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getProductsQuerySchema,
} = require("../../validators/product.validator");

const validateQuery = (query) =>
  getProductsQuerySchema.validate(query, {
    abortEarly: false,
    stripUnknown: true,
  });

test("filter validators: attr.* string keys survive query validation", () => {
  const { error, value } = validateQuery({
    "attr.color": "#ff0000",
    "attr.seatingCapacity.min": "2",
    "attr.seatingCapacity.max": "6",
    facets: "1",
    collection: "new-arrivals",
  });
  assert.equal(error, undefined);
  assert.equal(value["attr.color"], "#ff0000");
  assert.equal(value["attr.seatingCapacity.min"], "2");
  assert.equal(value["attr.seatingCapacity.max"], "6");
  assert.equal(value.facets, "1");
  assert.equal(value.collection, "new-arrivals");
});

test("filter validators: container values under attr.* keys are rejected", () => {
  const { error } = validateQuery({ "attr.color": { $ne: "red" } });
  assert.ok(error, "an object value under attr.color must fail validation");
  const { error: arrayError } = validateQuery({
    "attr.color": ["red", "blue"],
  });
  assert.ok(arrayError, "an array value under attr.color must fail validation");
});

test("filter validators: facets accepts only the documented switches; unknown keys still strip", () => {
  const { error } = validateQuery({ facets: "yes" });
  assert.ok(error);
  const { error: okError, value } = validateQuery({
    facets: "0",
    bogusParam: "x",
  });
  assert.equal(okError, undefined);
  assert.equal(value.facets, "0");
  assert.equal(value.bogusParam, undefined);
});

test("filter validators: dotted junk passes Joi shape but is the parser's 400", () => {
  // Joi admits any `attr.`-prefixed string key; the engine parser
  // (catalogFilter.service) owns the full grammar and rejects
  // extra segments — the two layers are pinned separately so
  // neither silently swallows malformed input.
  const { error, value } = validateQuery({ "attr.color.extra": "red" });
  assert.equal(error, undefined);
  assert.equal(value["attr.color.extra"], "red");
});
