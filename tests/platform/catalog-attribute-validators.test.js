// Phase 2 (catalog) — Joi shape pins for the attribute engine's
// write surfaces. Registry VALUE checks (definition exists, value
// validates, required satisfied) are covered against a real
// database by tests/platform/catalog-attributes.test.js; these pin
// that the Phase 2 fields survive the validate middleware's
// stripUnknown and that malformed shapes die at the schema.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAttributeDefinitionSchema,
  updateAttributeDefinitionSchema,
  createProductTypeSchema,
  updateProductTypeSchema,
} = require("../../validators/catalog.validator");
const { setCategoryAttributeAssignmentsSchema } = require("../../validators/category.validator");
const { createProductSchema, updateProductSchema } = require("../../validators/product.validator");
const { ATTRIBUTE_TYPES } = require("../../models/attributeDefinition.model");

const ok = (schema, value) => {
  const { error, value: out } = schema.validate(value, { abortEarly: false, stripUnknown: true });
  assert.equal(error, undefined, error && error.message);
  return out;
};
const bad = (schema, value) => {
  const { error } = schema.validate(value, { abortEarly: false, stripUnknown: true });
  assert.ok(error, `expected validation error for ${JSON.stringify(value)}`);
};

test("attribute validators: definition create accepts every engine type", () => {
  for (const type of ATTRIBUTE_TYPES) {
    const out = ok(createAttributeDefinitionSchema, {
      key: "probeAttr",
      label: "Probe",
      type,
      ...(type === "measurement" ? {} : {}),
    });
    assert.equal(out.type, type);
  }
});

test("attribute validators: definition create rejects bad shapes", () => {
  bad(createAttributeDefinitionSchema, { key: "not a key!", label: "X", type: "enum" });
  bad(createAttributeDefinitionSchema, { key: "__proto__", label: "X", type: "enum" });
  bad(createAttributeDefinitionSchema, { key: "probeAttr", label: "X", type: "number" }); // owner vocabulary, not an engine type
  bad(createAttributeDefinitionSchema, { key: "probeAttr", type: "enum" }); // label required
  bad(createAttributeDefinitionSchema, { key: "probeAttr", label: "X", type: "enum", appliesTo: "sometimes" });
  bad(createAttributeDefinitionSchema, { key: "probeAttr", label: "X", type: "enum", storage: "elsewhere" });
  bad(createAttributeDefinitionSchema, { key: "probeAttr", label: "X", type: "enum", min: "low" });
});

test("attribute validators: field-storage definitions require fieldPath", () => {
  bad(createAttributeDefinitionSchema, { key: "probeAttr", label: "X", type: "string", storage: "field" });
  const out = ok(createAttributeDefinitionSchema, {
    key: "probeAttr",
    label: "X",
    type: "string",
    storage: "field",
    fieldPath: "someField",
  });
  assert.equal(out.fieldPath, "someField");
});

test("attribute validators: definition update requires at least one field; key is a valid identifier", () => {
  bad(updateAttributeDefinitionSchema, {});
  const out = ok(updateAttributeDefinitionSchema, { label: "Renamed" });
  assert.equal(out.label, "Renamed");
  bad(updateAttributeDefinitionSchema, { key: "bad key" });
});

test("attribute validators: product type schemas accept attributeAssignments overrides", () => {
  const created = ok(createProductTypeSchema, {
    key: "sofa",
    label: "Sofa",
    attributeAssignments: [{ attributeKey: "seatingCapacity", required: true, sortOrder: 5 }],
  });
  assert.deepEqual(created.attributeAssignments, [
    { attributeKey: "seatingCapacity", required: true, sortOrder: 5 },
  ]);
  const updated = ok(updateProductTypeSchema, {
    attributeAssignments: [{ attributeKey: "frameMaterial", displayGroup: "Materials" }],
  });
  assert.equal(updated.attributeAssignments.length, 1);
  bad(createProductTypeSchema, {
    key: "sofa",
    label: "Sofa",
    attributeAssignments: [{ required: true }], // attributeKey required
  });
  bad(createProductTypeSchema, {
    key: "sofa",
    label: "Sofa",
    attributeAssignments: [{ attributeKey: "bad key!" }],
  });
});

test("attribute validators: category assignment schema pins the replace-list shape", () => {
  const out = ok(setCategoryAttributeAssignmentsSchema, {
    assignments: [
      { attributeKey: "frameMaterial", required: true, defaultValue: "oak", active: true },
      { attributeKey: "upholstery", active: false },
    ],
  });
  assert.equal(out.assignments.length, 2);
  bad(setCategoryAttributeAssignmentsSchema, {});
  bad(setCategoryAttributeAssignmentsSchema, { assignments: "frameMaterial" });
  bad(setCategoryAttributeAssignmentsSchema, { assignments: [{ attributeKey: "__proto__" }] });
  bad(setCategoryAttributeAssignmentsSchema, { assignments: [{ attributeKey: "frameMaterial", sortOrder: "first" }] });
});

test("attribute validators: product schemas pass catalogAttributes through (object or JSON string)", () => {
  const base = {
    name: "Oslo Sofa",
    description: "A sofa.",
    category: "64b64c64b64c64b64c64b64c",
    price: 100,
  };
  const asObject = ok(createProductSchema, { ...base, catalogAttributes: { frameMaterial: "oak" } });
  assert.deepEqual(asObject.catalogAttributes, { frameMaterial: "oak" });
  const asString = ok(createProductSchema, { ...base, catalogAttributes: '{"frameMaterial":"oak"}' });
  assert.equal(asString.catalogAttributes, '{"frameMaterial":"oak"}');
  const updated = ok(updateProductSchema, { catalogAttributes: { seatingCapacity: 3 } });
  assert.deepEqual(updated.catalogAttributes, { seatingCapacity: 3 });
  // Arrays and scalars are not attribute maps.
  bad(createProductSchema, { ...base, catalogAttributes: [1, 2] });
  bad(updateProductSchema, { catalogAttributes: 42 });
});
