// Phase 3 (catalog) — product variant service, pure helpers.
// In-process: no database. The service module is loaded for its
// pure functions only (combination keys, SKU normalization,
// purchasability math); DB-backed behaviour is covered by the
// MMS probe in tests/platform/catalog-variants.test.js.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeSku,
  computeCombinationKey,
  variantPurchasable,
  productVariantAvailability,
  computePriceFrom,
  SKU_PATTERN,
} = require("../../services/productVariant.service");

test("variants: normalizeSku trims and uppercases; junk becomes null", () => {
  assert.equal(normalizeSku(" abc-1 "), "ABC-1");
  assert.equal(normalizeSku("sofa-1-wal-2"), "SOFA-1-WAL-2");
  assert.equal(normalizeSku(""), null);
  assert.equal(normalizeSku("   "), null);
  assert.equal(normalizeSku(undefined), null);
  assert.equal(normalizeSku(42), null);
});

test("variants: SKU pattern accepts catalog SKUs and rejects malformed ones", () => {
  assert.ok(SKU_PATTERN.test("SOFA-1-WAL-2"));
  assert.ok(SKU_PATTERN.test("A"));
  assert.ok(SKU_PATTERN.test("LEG_1.5"));
  assert.ok(!SKU_PATTERN.test("bad sku!"));
  assert.ok(!SKU_PATTERN.test("-LEADING-DASH"));
  assert.ok(!SKU_PATTERN.test(""));
  assert.ok(!SKU_PATTERN.test("HAS SPACE"));
});

test("variants: combinationKey is deterministic and order-insensitive", () => {
  const a = computeCombinationKey({ color: "#a0522d", seatingCapacity: "2" });
  const b = computeCombinationKey({ seatingCapacity: "2", color: "#a0522d" });
  assert.equal(a, b);
  assert.equal(a, "color=%23a0522d&seatingCapacity=2");
});

test("variants: combinationKey escapes separators inside values", () => {
  assert.equal(computeCombinationKey({ finish: "a&b=c" }), "finish=a%26b%3Dc");
  assert.equal(computeCombinationKey({}), "");
});

test("variants: variantPurchasable = enabled and stock above reserved", () => {
  assert.equal(
    variantPurchasable({ enabled: true, stock: 5, reservedStock: 0 }),
    true,
  );
  assert.equal(
    variantPurchasable({ enabled: true, stock: 5, reservedStock: 4 }),
    true,
  );
  assert.equal(
    variantPurchasable({ enabled: true, stock: 5, reservedStock: 5 }),
    false,
  );
  assert.equal(
    variantPurchasable({ enabled: true, stock: 0, reservedStock: 0 }),
    false,
  );
  assert.equal(
    variantPurchasable({ enabled: false, stock: 5, reservedStock: 0 }),
    false,
  );
  // Legacy-shaped variants lacking the Phase 3 fields degrade sanely.
  assert.equal(variantPurchasable({ stock: 3 }), true);
  assert.equal(variantPurchasable({}), false);
  assert.equal(variantPurchasable(null), false);
});

test("variants: computePriceFrom is the min ENABLED variant price, else null", () => {
  assert.equal(computePriceFrom([]), null);
  assert.equal(computePriceFrom([{ price: 10, enabled: false }]), null);
  assert.equal(
    computePriceFrom([
      { price: 450, enabled: true },
      { price: 400, enabled: false },
      { price: 475, enabled: true },
    ]),
    450,
  );
});

test("variants: productVariantAvailability summarizes a variant list", () => {
  const summary = productVariantAvailability({
    catalogVariants: [
      { price: 100, enabled: true, stock: 2, reservedStock: 0 },
      { price: 90, enabled: true, stock: 1, reservedStock: 1 },
      { price: 80, enabled: false, stock: 9, reservedStock: 0 },
    ],
  });
  assert.deepEqual(summary, {
    hasVariants: true,
    variantCount: 3,
    purchasableCount: 1,
    anyPurchasable: true,
    priceFrom: 90,
  });
  assert.deepEqual(productVariantAvailability({ catalogVariants: [] }), {
    hasVariants: false,
    variantCount: 0,
    purchasableCount: 0,
    anyPurchasable: false,
    priceFrom: null,
  });
  assert.deepEqual(productVariantAvailability(null), {
    hasVariants: false,
    variantCount: 0,
    purchasableCount: 0,
    anyPurchasable: false,
    priceFrom: null,
  });
});
