// Phase 3 (catalog) — Joi pins for the variant surface:
// variant create/update schemas, Product.productType on the
// product schemas, and variantOptionKeys on update (attribute keys
// are case-sensitive — Joi must NOT lowercase them, the Phase 2
// lesson). In-process; registry checks live in the controllers.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createVariantSchema,
  updateVariantSchema,
  createProductSchema,
  updateProductSchema,
} = require("../../validators/product.validator");

const validVariant = {
  sku: "SOFA-1-WAL-2",
  options: { color: "#a0522d", seatingCapacity: 2 },
  price: 450,
  stock: 5,
};

test("variants: create schema accepts a well-formed variant (price 0 allowed)", () => {
  const { error, value } = createVariantSchema.validate(validVariant);
  assert.equal(error, undefined);
  assert.equal(value.sku, "SOFA-1-WAL-2");
  const free = createVariantSchema.validate({ ...validVariant, price: 0 });
  assert.equal(free.error, undefined);
});

test("variants: create schema requires sku and price", () => {
  assert.ok(createVariantSchema.validate({ options: {}, price: 1 }).error);
  assert.ok(createVariantSchema.validate({ sku: "ABC-1" }).error);
});

test("variants: create schema rejects malformed SKUs and bad numerics", () => {
  assert.ok(
    createVariantSchema.validate({ ...validVariant, sku: "bad sku!" }).error,
  );
  assert.ok(createVariantSchema.validate({ ...validVariant, sku: "" }).error);
  assert.ok(createVariantSchema.validate({ ...validVariant, price: -1 }).error);
  assert.ok(
    createVariantSchema.validate({ ...validVariant, stock: 1.5 }).error,
  );
  assert.ok(createVariantSchema.validate({ ...validVariant, stock: -2 }).error);
  assert.ok(
    createVariantSchema.validate({ ...validVariant, compareAtPrice: -5 }).error,
  );
});

test("variants: update schema needs at least one field; sku is visible to the service", () => {
  assert.ok(updateVariantSchema.validate({}).error);
  // sku rides the update schema so the SERVICE can enforce
  // immutability with a precise 400 (validate strips unknown keys,
  // so an unlisted sku would vanish silently instead).
  const { error, value } = updateVariantSchema.validate({ sku: "NEW-1" });
  assert.equal(error, undefined);
  assert.equal(value.sku, "NEW-1");
  assert.equal(updateVariantSchema.validate({ price: 10 }).error, undefined);
  assert.equal(
    updateVariantSchema.validate({ enabled: false }).error,
    undefined,
  );
});

test("variants: productType rides create/update product schemas, lowercased", () => {
  const base = {
    name: "Oslo Sofa",
    description: "A sofa",
    category: "64b64c64b64c64b64c64b64c",
    price: 500,
  };
  const created = createProductSchema.validate({
    ...base,
    productType: "SOFA",
  });
  assert.equal(created.error, undefined);
  assert.equal(created.value.productType, "sofa");
  const updated = updateProductSchema.validate({ productType: "Office_Chair" });
  assert.equal(updated.error, undefined);
  assert.equal(updated.value.productType, "office_chair");
  // Clearing is expressible on update ("" / null), per category precedent.
  assert.equal(
    updateProductSchema.validate({ productType: "" }).error,
    undefined,
  );
  assert.equal(
    updateProductSchema.validate({ productType: null }).error,
    undefined,
  );
});

test("variants: variantOptionKeys rides update schema with case preserved", () => {
  const { error, value } = updateProductSchema.validate({
    variantOptionKeys: ["frameMaterial", "color"],
  });
  assert.equal(error, undefined);
  assert.deepEqual(value.variantOptionKeys, ["frameMaterial", "color"]);
  // A JSON-string array (multipart form-data) is also accepted;
  // parsing + registry validation happen in the service.
  assert.equal(
    updateProductSchema.validate({ variantOptionKeys: '["color"]' }).error,
    undefined,
  );
});
