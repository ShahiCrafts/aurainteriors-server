// Phase 1 (catalog) — Joi schema shape pins for the new catalog
// fields. The validate middleware runs every write through these
// schemas with stripUnknown, so a field that is missing here is
// silently dropped before the controller can see it; these tests
// pin that the Phase 1 fields survive validation (and that
// malformed values are rejected at the schema, before any registry
// lookup). Registry VALUE checks (unknown type/room -> 400) are
// covered against a real database by the catalog probes.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} = require("../../validators/category.validator");
const {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
} = require("../../validators/product.validator");
const {
  createProductTypeSchema,
  createRoomSchema,
  createCollectionSchema,
} = require("../../validators/catalog.validator");

const ok = (schema, value) => {
  const { error, value: out } = schema.validate(value, { abortEarly: false, stripUnknown: true });
  assert.equal(error, undefined, error && error.message);
  return out;
};
const bad = (schema, value) => {
  const { error } = schema.validate(value, { abortEarly: false, stripUnknown: true });
  assert.ok(error, `expected validation error for ${JSON.stringify(value)}`);
};

test("validators: category create accepts productType + roomSlugs (array and JSON string)", () => {
  const out = ok(createCategorySchema, {
    name: "Sofas",
    productType: "sofa",
    roomSlugs: ["living-room", "small-spaces"],
  });
  assert.equal(out.productType, "sofa");
  assert.deepEqual(out.roomSlugs, ["living-room", "small-spaces"]);
  const fromForm = ok(createCategorySchema, { name: "Sofas", roomSlugs: "[\"living-room\"]" });
  assert.equal(fromForm.roomSlugs, "[\"living-room\"]"); // parsed by the controller
});

test("validators: category create rejects malformed productType and room slugs", () => {
  bad(createCategorySchema, { name: "Sofas", productType: "Sofa Type!" });
  bad(createCategorySchema, { name: "Sofas", roomSlugs: ["Living Room"] });
  bad(createCategorySchema, { name: "Sofas", roomSlugs: ["living_room"] }); // rooms are hyphen-only
});

test("validators: category update accepts clearing values (null productType, empty roomSlugs)", () => {
  const out = ok(updateCategorySchema, { productType: null, roomSlugs: [] });
  assert.equal(out.productType, null);
  assert.deepEqual(out.roomSlugs, []);
});

test("validators: reorder requires a non-empty unique list of ObjectIds", () => {
  const id = "64b64c64b64c64b64c64b64c";
  ok(reorderCategoriesSchema, { ids: [id] });
  bad(reorderCategoriesSchema, {});
  bad(reorderCategoriesSchema, { ids: [] });
  bad(reorderCategoriesSchema, { ids: [id, id] });
  bad(reorderCategoriesSchema, { ids: ["not-an-id"] });
});

test("validators: product create/update accept roomSlugs; query accepts room", () => {
  const base = {
    name: "Oslo Sofa",
    description: "A sofa.",
    category: "64b64c64b64c64b64c64b64c",
    price: 100,
  };
  const created = ok(createProductSchema, { ...base, roomSlugs: ["living-room"] });
  assert.deepEqual(created.roomSlugs, ["living-room"]);
  bad(createProductSchema, { ...base, roomSlugs: ["Living Room"] });
  const updated = ok(updateProductSchema, { roomSlugs: [] });
  assert.deepEqual(updated.roomSlugs, []);
  const query = ok(getProductsQuerySchema, { room: "living-room,bedroom" });
  assert.equal(query.room, "living-room,bedroom");
});

test("validators: unknown keys are stripped, Phase 1 fields are not", () => {
  const out = ok(createCategorySchema, { name: "Sofas", productType: "sofa", bogusField: 1 });
  assert.equal(out.bogusField, undefined);
  assert.equal(out.productType, "sofa");
});

test("validators: catalog registry schemas pin key/slug shapes", () => {
  ok(createProductTypeSchema, { key: "office_chair", label: "Office Chair" });
  bad(createProductTypeSchema, { key: "Office Chair", label: "Office Chair" });
  ok(createRoomSchema, { slug: "study-corner", label: "Study Corner" });
  bad(createRoomSchema, { slug: "study_corner", label: "Study Corner" });
});

test("validators: collection schema requires a rule for rule collections and preserves rule params", () => {
  const manual = ok(createCollectionSchema, { slug: "picks", label: "Picks" });
  assert.equal(manual.kind, "manual");
  assert.deepEqual(manual.productIds, []);
  bad(createCollectionSchema, { slug: "picks", label: "Picks", kind: "rule" });
  const rule = ok(createCollectionSchema, {
    slug: "oak-picks",
    label: "Oak Picks",
    kind: "rule",
    rule: { type: "attribute-match", params: { key: "frameMaterial", value: "oak" } },
  });
  assert.deepEqual(rule.rule.params, { key: "frameMaterial", value: "oak" });
  bad(createCollectionSchema, {
    slug: "picks",
    label: "Picks",
    kind: "rule",
    rule: { type: "trending", params: {} },
  });
});
