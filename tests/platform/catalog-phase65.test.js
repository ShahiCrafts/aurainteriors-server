// Phase 6.5 (catalog) — server fix batch from the Phase 6 API-gap
// requests (docs/catalog/PHASE6_NOTES.md, SR-P6-1..3).
//
// SR-P6-2: the product-type validator ran attributeKeys through
// the slug-style machineKey schema, lowercasing camelCase keys
// (frameMaterial -> framematerial) that the case-sensitive
// attribute engine then could not resolve. These tests pin the
// keys verbatim at the schema, the stored document, and the
// end-to-end resolution; unknown keys are rejected by name.
// SR-P6-3: the flat category list's productCount virtual counted
// soft-deleted products while the tree rollup excluded them; both
// endpoints must report the same count.
// (SR-P6-1, the admin includeInactive lists, is covered at route
// level by catalog-include-inactive.test.js.)
//
// The DB-backed assertions drive the probe
// (fixtures/catalog-phase65-probe.js) against a real MMS mongod.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");
const {
  createProductTypeSchema,
  updateProductTypeSchema,
} = require("../../validators/catalog.validator");

const ok = (schema, value) => {
  const { error, value: out } = schema.validate(value, {
    abortEarly: false,
    stripUnknown: true,
  });
  assert.equal(error, undefined, error && error.message);
  return out;
};
const bad = (schema, value) => {
  const { error } = schema.validate(value, {
    abortEarly: false,
    stripUnknown: true,
  });
  assert.ok(error, `expected validation error for ${JSON.stringify(value)}`);
};

test("SR-P6-2 validators: attributeKeys keep their case on create and update", () => {
  const created = ok(createProductTypeSchema, {
    key: "lounger",
    label: "Lounger",
    attributeKeys: ["frameMaterial", "seatingCapacity"],
  });
  assert.deepEqual(created.attributeKeys, ["frameMaterial", "seatingCapacity"]);
  const updated = ok(updateProductTypeSchema, {
    attributeKeys: ["frameMaterial"],
  });
  assert.deepEqual(updated.attributeKeys, ["frameMaterial"]);
});

test("SR-P6-2 validators: the type's own key stays a lowercase machine key; malformed attribute keys rejected", () => {
  const created = ok(createProductTypeSchema, {
    key: "Lounger",
    label: "Lounger",
  });
  assert.equal(created.key, "lounger");
  bad(createProductTypeSchema, {
    key: "lounger",
    label: "Lounger",
    attributeKeys: ["frame material"],
  });
  bad(createProductTypeSchema, {
    key: "lounger",
    label: "Lounger",
    attributeKeys: ["__proto__"],
  });
  bad(createProductTypeSchema, {
    key: "lounger",
    label: "Lounger",
    attributeKeys: ["9lives"],
  });
  bad(updateProductTypeSchema, { attributeKeys: ["frame material"] });
});

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "catalog-phase65-probe.js")],
      { timeout: 240000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
    );
  });
}
let cached;
const probe = async () => {
  if (!cached) cached = runProbe();
  return cached;
};
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print RESULT ${prefix}; got: ${out}`);
  return l;
};

test("SR-P6-2: keys pass the schema and are stored verbatim", async () => {
  assert.equal(
    await line("sr2-schema"),
    "RESULT sr2-schema keys=frameMaterial,seatingCapacity",
  );
  assert.equal(await line("sr2-create"), "RESULT sr2-create status=201");
  assert.equal(
    await line("sr2-stored"),
    "RESULT sr2-stored keys=frameMaterial,seatingCapacity",
  );
});

test("SR-P6-2: resolution for a category of the type surfaces the attributes", async () => {
  assert.equal(
    await line("sr2-resolve"),
    "RESULT sr2-resolve frame=true seating=true source=type",
  );
});

test("SR-P6-2: unknown attribute keys are rejected by name on create and update", async () => {
  assert.equal(
    await line("sr2-unknown-create"),
    "RESULT sr2-unknown-create status=400 named=true",
  );
  assert.equal(
    await line("sr2-unknown-update"),
    "RESULT sr2-unknown-update status=400 named=true",
  );
  // The rejected update changed nothing.
  assert.equal(
    await line("sr2-unknown-update stored"),
    "RESULT sr2-unknown-update stored=frameMaterial,seatingCapacity",
  );
});

test("SR-P6-2: a valid update stores keys verbatim", async () => {
  assert.equal(
    await line("sr2-update"),
    "RESULT sr2-update status=200 stored=frameMaterial",
  );
});

test("SR-P6-3: flat list and tree counts agree (soft-deleted products excluded from both)", async () => {
  // Fixture: 1 live + 1 inactive (both non-deleted) + 1 soft-deleted.
  assert.equal(await line("sr3-flat"), "RESULT sr3-flat count=2");
  assert.equal(await line("sr3-tree"), "RESULT sr3-tree count=2");
});
