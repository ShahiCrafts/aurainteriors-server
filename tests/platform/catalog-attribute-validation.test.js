// Phase 2 (catalog) — attribute value validation battery.
// In-process unit tests for services/attributeValidation.service.js
// (pure: definitions are plain objects, no database). Every engine
// type gets valid cases plus at least two invalid shapes; the map
// validator gets unknown-key, field-storage-key and prototype-
// pollution cases, including pollution delivered the way an
// attacker would send it (JSON.parse'd payloads, where __proto__
// is a real own property).
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateValue,
  validateCatalogAttributesMap,
  findPollutionKey,
  missingRequiredAttributes,
} = require("../../services/attributeValidation.service");
const { attributeDefinitions } = require("../../config/catalogAttributeData");

const byKey = new Map(attributeDefinitions.map((def) => [def.key, def]));
const def = (key) => byKey.get(key);
const ok = (definition, value) => {
  const result = validateValue(definition, value);
  assert.equal(
    result.ok,
    true,
    `expected ${JSON.stringify(value)} valid for ${definition.key}: ${result.error}`,
  );
  return result.value;
};
const bad = (definition, value) => {
  const result = validateValue(definition, value);
  assert.equal(
    result.ok,
    false,
    `expected ${JSON.stringify(value)} invalid for ${definition.key}`,
  );
  assert.ok(typeof result.error === "string" && result.error.length > 0);
};

test("validation: string trims, caps length, rejects non-strings", () => {
  const care = def("careInstructions");
  assert.equal(ok(care, "  Wipe with a dry cloth. "), "Wipe with a dry cloth.");
  bad(care, 42);
  bad(care, { text: "x" });
  bad(care, "x".repeat(501));
  // Definition-level maxLength override is honored.
  const short = { key: "t", label: "T", type: "string", maxLength: 3 };
  assert.equal(ok(short, "abc"), "abc");
  bad(short, "abcd");
});

test("validation: enum — open vocabulary accepts any string; closed enforces membership", () => {
  const material = def("frameMaterial"); // owner enum: open
  assert.equal(ok(material, "oak"), "oak");
  assert.equal(ok(material, "  walnut "), "walnut");
  bad(material, 7);
  bad(material, ["oak"]);
  const style = def("style"); // field definition with the Product model's closed enum
  assert.equal(ok(style, "scandinavian"), "scandinavian");
  bad(style, "art-deco");
  bad(style, "Modern"); // membership is case-sensitive
});

test("validation: multi-enum dedupes, preserves order, rejects non-arrays and bad members", () => {
  const materials = def("materials"); // open
  assert.deepEqual(ok(materials, [" oak ", "oak", "steel"]), ["oak", "steel"]);
  bad(materials, "oak");
  bad(materials, ["oak", 3]);
  bad(materials, ["oak", ""]);
  const closed = {
    key: "t",
    label: "T",
    type: "multi-enum",
    allowedValues: ["a", "b"],
  };
  assert.deepEqual(ok(closed, ["a", "b", "a"]), ["a", "b"]);
  bad(closed, ["a", "c"]);
  bad(closed, []);
});

test("validation: boolean is strict (no string/number coercion)", () => {
  const extendable = def("extendable");
  assert.equal(ok(extendable, true), true);
  assert.equal(ok(extendable, false), false);
  bad(extendable, "true");
  bad(extendable, 1);
  bad(extendable, null);
});

test("validation: integer requires whole finite numbers and honors min/max/step", () => {
  const seats = def("seatingCapacity"); // min 1
  assert.equal(ok(seats, 3), 3);
  bad(seats, 3.5);
  bad(seats, "3");
  bad(seats, 0); // below min
  bad(seats, Number.NaN);
  const stepped = {
    key: "t",
    label: "T",
    type: "integer",
    min: 0,
    max: 10,
    step: 2,
  };
  assert.equal(ok(stepped, 4), 4);
  bad(stepped, 3); // off step
  bad(stepped, 12); // above max
});

test("validation: decimal accepts fractions, rejects non-finite and out-of-bounds", () => {
  const capacity = def("weightCapacity"); // decimal, unit kg, min 0
  assert.equal(ok(capacity, 120.5), 120.5);
  assert.equal(ok(capacity, 120), 120);
  bad(capacity, Number.POSITIVE_INFINITY);
  bad(capacity, "120.5");
  bad(capacity, -1);
});

test("validation: money is a non-negative finite number", () => {
  const price = def("price");
  assert.equal(ok(price, 0), 0);
  assert.equal(ok(price, 49999.99), 49999.99);
  bad(price, -0.01);
  bad(price, "100");
  bad(price, Number.NaN);
});

test("validation: measurement requires {value, unit} with the definition's unit (or an accepted one)", () => {
  const length = def("extendsLength"); // unit cm, accepts cm/m/in
  assert.deepEqual(ok(length, { value: 40, unit: "cm" }), {
    value: 40,
    unit: "cm",
  });
  assert.deepEqual(ok(length, { value: 1.2, unit: "m" }), {
    value: 1.2,
    unit: "m",
  });
  bad(length, { value: 40, unit: "mm" }); // not accepted
  bad(length, { value: 40 }); // unit missing
  bad(length, { value: 40, unit: "cm", extra: 1 }); // unexpected shape
  bad(length, 40); // bare scalar
  bad(length, { value: -5, unit: "cm" }); // non-positive
  const weight = def("weight"); // field definition, unit kg, accepts kg/lb/g
  assert.deepEqual(ok(weight, { value: 12, unit: "lb" }), {
    value: 12,
    unit: "lb",
  });
  bad(weight, { value: 12, unit: "stone" });
});

test("validation: color normalizes hex; named values only via a closed definition", () => {
  const color = def("color"); // open definition -> hex only
  assert.equal(ok(color, "#F0A"), "#ff00aa");
  assert.equal(ok(color, "#AABBCC"), "#aabbcc");
  assert.equal(ok(color, "#a1b2c3"), "#a1b2c3");
  bad(color, "red"); // named colors need allowedValues
  bad(color, "#12345");
  bad(color, "#gggggg");
  bad(color, 123456);
  const named = {
    key: "t",
    label: "T",
    type: "color",
    allowedValues: ["Ivory", "Charcoal"],
  };
  assert.equal(ok(named, "ivory"), "Ivory"); // normalized to the declared casing
  bad(named, "beige");
});

test("validation: dimensions requires positive length/width/height and a sane unit", () => {
  const dims = def("dimensions");
  assert.deepEqual(
    ok(dims, { length: 200, width: 90, height: 85, unit: "cm" }),
    { length: 200, width: 90, height: 85, unit: "cm" },
  );
  assert.deepEqual(
    ok(dims, { length: 2, width: 1, height: 1 }), // unit defaults to cm
    { length: 2, width: 1, height: 1, unit: "cm" },
  );
  bad(dims, { length: 0, width: 90, height: 85, unit: "cm" }); // not positive
  bad(dims, { length: 200, width: 90, unit: "cm" }); // height missing
  bad(dims, { length: 200, width: 90, height: 85, unit: "yards" });
  bad(dims, { length: 200, width: 90, height: 85, unit: "cm", depth: 40 }); // unexpected shape
  bad(dims, [200, 90, 85]);
});

test("validation: map rejects unknown keys and names them", () => {
  const result = validateCatalogAttributesMap(byKey, {
    frameMaterial: "oak",
    notAKey: 1,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /notAKey/);
});

test("validation: map rejects field-storage keys (they are not catalogAttributes)", () => {
  const result = validateCatalogAttributesMap(byKey, {
    dimensions: { length: 1, width: 1, height: 1 },
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /dimensions/);
});

test("validation: map normalizes values and reports the failing key + reason", () => {
  const good = validateCatalogAttributesMap(byKey, {
    color: "#F0A",
    seatingCapacity: 3,
    frameMaterial: " oak ",
  });
  assert.equal(good.ok, true, good.error);
  assert.deepEqual(good.value, {
    color: "#ff00aa",
    seatingCapacity: 3,
    frameMaterial: "oak",
  });
  const badValue = validateCatalogAttributesMap(byKey, {
    seatingCapacity: "three",
  });
  assert.equal(badValue.ok, false);
  assert.match(badValue.error, /seatingCapacity/);
});

test("validation: prototype-pollution keys are rejected anywhere in the payload", () => {
  const topLevel = JSON.parse('{"__proto__": {"polluted": true}}');
  assert.equal(validateCatalogAttributesMap(byKey, topLevel).ok, false);
  const nested = JSON.parse(
    '{"extendsLength": {"value": 10, "unit": "cm", "__proto__": {"x": 1}}}',
  );
  assert.equal(validateCatalogAttributesMap(byKey, nested).ok, false);
  const ctor = JSON.parse(
    '{"frameMaterial": "oak", "constructor": {"prototype": {}}}',
  );
  assert.equal(validateCatalogAttributesMap(byKey, ctor).ok, false);
  assert.equal(findPollutionKey({ a: [{ b: { prototype: 1 } }] }), "prototype");
  assert.equal(findPollutionKey({ a: { b: 1 } }), null);
  assert.equal({}.polluted, undefined);
});

test("validation: required check lists missing catalogAttributes keys only", () => {
  const resolved = [
    { key: "frameMaterial", storage: "catalogAttributes", required: true },
    { key: "material", storage: "catalogAttributes", required: false },
    { key: "price", storage: "field", required: true }, // field required is not a map concern
  ];
  assert.deepEqual(missingRequiredAttributes(resolved, {}), ["frameMaterial"]);
  assert.deepEqual(
    missingRequiredAttributes(resolved, { frameMaterial: "oak" }),
    [],
  );
  assert.deepEqual(
    missingRequiredAttributes(resolved, { frameMaterial: null }),
    ["frameMaterial"],
  );
});
