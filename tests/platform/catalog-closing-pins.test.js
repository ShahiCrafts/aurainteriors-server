// Phase 9+10 (catalog): closing pass — in-process pins: SR-P7-1
// (production error bodies carry the AppError code) and the catalog
// index inventory. The MMS-backed sections (SR-P7-2 payloads, the
// security battery, perf, N+1) live in catalog-security-perf-probe.test.js
// + fixtures/catalog-phase910-probe.js.
const { test } = require("node:test");
const assert = require("node:assert/strict");
// ---------------------------------------------------------------------
// SR-P7-1: production error bodies include the AppError `code`.
// In-process, following the tests/audit/infrastructure-guards.test.js harness.
// ---------------------------------------------------------------------
const errorHandler = require("../../middleware/error.middleware");
const AppError = require("../../utils/AppError");

function mockRes() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}
function runError(err) {
  const res = mockRes();
  errorHandler(err, {}, res, () => {});
  return res;
}

test("SR-P7-1: production body carries the AppError code (VARIANT_*)", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const res = runError(
      new AppError("Please choose a variant", 400, "VARIANT_REQUIRED"),
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.status, "fail");
    assert.equal(res.body.message, "Please choose a variant");
    assert.equal(res.body.code, "VARIANT_REQUIRED");
    assert.equal(res.body.stack, undefined, "no stack in production");
    assert.deepEqual(Object.keys(res.body).sort(), [
      "code",
      "message",
      "status",
    ]);

    const res409 = runError(
      new AppError("Variant unavailable", 409, "VARIANT_UNAVAILABLE"),
    );
    assert.equal(res409.statusCode, 409);
    assert.equal(res409.body.code, "VARIANT_UNAVAILABLE");
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test("SR-P7-1: uncoded operational errors keep the exact legacy prod shape", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const res = runError(new AppError("Product not found", 404));
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
      status: "fail",
      message: "Product not found",
    });

    const boom = runError(new Error("kaboom with internals"));
    assert.equal(boom.statusCode, 500);
    assert.deepEqual(boom.body, {
      status: "error",
      message: "Something went wrong",
    });
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test("SR-P7-1: structured AUTH_REQUIRED / RATE_LIMIT prod shapes are unchanged", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const { AuthRequiredError, RateLimitError } = require("../../utils/errors");
    const auth = runError(new AuthRequiredError());
    assert.equal(auth.body.code, "AUTH_REQUIRED");
    assert.ok(Array.isArray(auth.body.actions));
    const rl = runError(new RateLimitError());
    assert.equal(rl.body.code, "RATE_LIMIT_EXCEEDED");
    assert.equal(typeof rl.body.retryAfter, "number");
  } finally {
    process.env.NODE_ENV = prev;
  }
});

// ---------------------------------------------------------------------
// Index inventory: every index the catalog phases declared exists in
// the model definitions (schema-declared; production builds them via
// the PHASE5_NOTES runbook commands).
// ---------------------------------------------------------------------
test("indexes: product model declares the catalog index set", () => {
  const Product = require("../../models/product.model");
  const declared = Product.schema
    .indexes()
    .map(([keys]) => JSON.stringify(keys));
  const has = (obj) => declared.includes(JSON.stringify(obj));
  assert.ok(has({ "catalogVariants.sku": 1 }), "variant SKU index");
  const skuIdx = Product.schema
    .indexes()
    .find(([k]) => k["catalogVariants.sku"] === 1);
  assert.equal(skuIdx[1].unique, true, "SKU index unique");
  assert.equal(skuIdx[1].sparse, true, "SKU index sparse");
  assert.ok(
    has({ "catalogVariants.combinationKey": 1 }),
    "combinationKey index",
  );
  assert.ok(has({ status: 1, roomSlugs: 1 }), "{status, roomSlugs}");
  assert.ok(
    has({ status: 1, "rating.average": -1 }),
    "{status, rating.average}",
  );
  assert.ok(has({ status: 1, category: 1 }), "{status, category}");
  assert.ok(has({ deletedAt: 1, status: 1 }), "{deletedAt, status}");
  assert.ok(has({ hasVariants: 1 }), "hasVariants field index");
  const slugIdx = Product.schema.indexes().find(([k]) => k.slug === 1);
  assert.ok(slugIdx && slugIdx[1].unique === true, "product slug unique index");
});

test("indexes: category + registry models declare their index set", () => {
  const Category = require("../../models/category.model");
  const declared = Category.schema
    .indexes()
    .map(([keys]) => JSON.stringify(keys));
  const has = (obj) => declared.includes(JSON.stringify(obj));
  assert.ok(has({ ancestors: 1 }), "ancestors index");
  assert.ok(has({ parent: 1 }), "parent index");
  assert.ok(has({ parent: 1, status: 1 }), "{parent, status} tree index");
  const slugIdx = Category.schema.indexes().find(([k]) => k.slug === 1);
  assert.ok(
    slugIdx && slugIdx[1].unique === true,
    "category slug unique index",
  );

  for (const [file, label] of [
    ["attributeDefinition.model", "attribute definitions"],
    ["productType.model", "product types"],
    ["room.model", "rooms"],
    ["collection.model", "collections"],
  ]) {
    const Model = require(`../../models/${file}`);
    const idx = Model.schema.indexes().map(([keys]) => JSON.stringify(keys));
    assert.ok(
      idx.includes(JSON.stringify({ active: 1, sortOrder: 1 })),
      `${label}: {active, sortOrder}`,
    );
  }
});
