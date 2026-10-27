// Phase 3 (catalog) — product + variant architecture, end to end.
// The probe (fixtures/catalog-variants-probe.js) drives the real
// models, services and controllers against a real MMS mongod;
// HTTP/auth wiring follows the repo's established route patterns
// and is covered by the route-level suites.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(__dirname, "fixtures", "catalog-variants-probe.js")],
      { timeout: 240000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => { if (err && !stdout) return reject(err); resolve(String(stdout)); });
  });
}
let cached;
const probe = async () => { if (!cached) cached = runProbe(); return cached; };
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print RESULT ${prefix}; got: ${out}`);
  return l;
};

test("variants: Product.productType is writable, registry-validated, clearable", async () => {
  assert.equal(await line("create-producttype"), "RESULT create-producttype status=201 stored=sofa");
  assert.equal(await line("create-producttype-bogus"), "RESULT create-producttype-bogus status=400");
  assert.equal(await line("producttype-clear"), "RESULT producttype-clear status=200 stored=empty");
});

test("variants: legacy products keep their detail/list shape (additive fields only)", async () => {
  assert.equal(await line("legacy-detail"), "RESULT legacy-detail hasVariants=false priceFrom=null variants=0");
  assert.equal(await line("legacy-list"), "RESULT legacy-list hasVariants=false priceFrom=null variants=0");
});

test("variants: resolution — a product's own type beats its category's type", async () => {
  // Category typed sofa; product typed office_chair: lumbarSupport
  // (office_chair-only) resolves from the type level, the sofa-only
  // chaiseOrientation is gone.
  assert.equal(await line("resolve-product-type"), "RESULT resolve-product-type status=200 lumbar=type chaise=absent");
  assert.equal(await line("resolve-category-type"), "RESULT resolve-category-type chaise=present lumbar=absent");
});

test("variants: variantOptionKeys — validated against the registry", async () => {
  assert.equal(await line("optionkeys-set"), "RESULT optionkeys-set status=200 stored=color,seatingCapacity");
  assert.equal(await line("optionkeys-unknown"), "RESULT optionkeys-unknown status=400");
  assert.equal(await line("optionkeys-field"), "RESULT optionkeys-field status=400");
  assert.equal(await line("optionkeys-measurement"), "RESULT optionkeys-measurement status=400");
  assert.equal(await line("optionkeys-multienum"), "RESULT optionkeys-multienum status=400");
});

test("variants: creation enforces option key set, engine values and SKU shape", async () => {
  assert.equal(await line("create-missing-key"), "RESULT create-missing-key status=400");
  assert.equal(await line("create-extra-key"), "RESULT create-extra-key status=400");
  assert.equal(await line("create-bad-value"), "RESULT create-bad-value status=400");
  assert.equal(await line("create-bad-color"), "RESULT create-bad-color status=400");
  assert.equal(await line("create-bad-sku"), "RESULT create-bad-sku status=400");
  // Values are stored NORMALIZED (hex lowercased; numbers stringified
  // into the options Map of String); the combination key is the
  // canonical sorted encoding.
  assert.equal(
    await line("create-v1"),
    "RESULT create-v1 status=201 combo=color=%23a0522d&seatingCapacity=2 color=#a0522d seats=2 hasVariants=true priceFrom=450"
  );
});

test("variants: SKU uniqueness — combinations, case, other products; own SKU allowed", async () => {
  assert.equal(await line("create-dup-combo"), "RESULT create-dup-combo status=409");
  assert.equal(await line("create-dup-sku"), "RESULT create-dup-sku status=409");
  assert.equal(await line("create-dup-sku-case"), "RESULT create-dup-sku-case status=409");
  assert.equal(await line("create-sku-product"), "RESULT create-sku-product status=409");
  // A variant MAY carry its own product's SKU (the default-variant
  // identity Phase 8's migration relies on).
  assert.equal(await line("create-sku-own"), "RESULT create-sku-own status=201");
});

test("variants: concurrent duplicate submits settle as exactly one 201 + one 409", async () => {
  assert.equal(await line("create-concurrent-combo"), "RESULT create-concurrent-combo statuses=201,409");
  assert.equal(await line("create-concurrent-sku"), "RESULT create-concurrent-sku statuses=201,409");
});

test("variants: option keys are locked while variants exist; the same set passes", async () => {
  assert.equal(await line("optionkeys-locked"), "RESULT optionkeys-locked status=400");
  assert.equal(await line("optionkeys-same-set"), "RESULT optionkeys-same-set status=200");
});

test("variants: priceFrom tracks the min ENABLED price across create/update/delete", async () => {
  assert.equal(await line("pricefrom-disabled"), "RESULT pricefrom-disabled status=201 priceFrom=450");
  assert.equal(await line("pricefrom-enable"), "RESULT pricefrom-enable priceFrom=400");
  assert.equal(await line("pricefrom-after-v2-price"), "RESULT pricefrom-after-v2-price priceFrom=450");
  assert.equal(await line("pricefrom-after-v1-price"), "RESULT pricefrom-after-v1-price priceFrom=475");
  assert.equal(await line("delete-v2"), "RESULT delete-v2 priceFrom=500");
  assert.equal(await line("delete-v1"), "RESULT delete-v1 priceFrom=600 hasVariants=true");
  assert.equal(await line("delete-last"), "RESULT delete-last hasVariants=false priceFrom=null");
});

test("variants: updates — SKU immutable, unknown variant 404, reservedStock not API-writable", async () => {
  assert.equal(await line("update-sku-immutable"), "RESULT update-sku-immutable status=400");
  assert.equal(await line("update-missing-variant"), "RESULT update-missing-variant status=404");
  assert.equal(await line("update-reserved-ignored"), "RESULT update-reserved-ignored status=200 reserved=0");
});

test("variants: closed-enum option values validate through the Phase 2 engine", async () => {
  assert.equal(await line("create-bad-enum"), "RESULT create-bad-enum status=400");
  assert.equal(await line("create-closed-enum"), "RESULT create-closed-enum status=201");
});

test("variants: ensureDefaultVariant builds the legacy default and is idempotent", async () => {
  assert.equal(
    await line("default-variant"),
    'RESULT default-variant created=true sku=LEG-1 price=100 compareAt=150 stock=7 comboKey="" images=2'
  );
  assert.equal(
    await line("default-variant-again"),
    "RESULT default-variant-again created=false count=1 hasVariants=true priceFrom=100"
  );
  assert.equal(await line("default-availability"), "RESULT default-availability purchasable=1 any=true");
  assert.equal(await line("default-keys-error"), "RESULT default-keys-error status=400");
  assert.equal(await line("default-nosku"), "RESULT default-nosku status=400");
});

test("variants: a product's own type drives required-attribute enforcement on create", async () => {
  assert.equal(await line("create-type-required"), "RESULT create-type-required status=400");
  assert.equal(await line("create-type-required-ok"), "RESULT create-type-required-ok status=201");
});

test("variants: public detail carries variants additively", async () => {
  assert.equal(
    await line("detail-with-variants"),
    "RESULT detail-with-variants variants=1 hasVariants=true priceFrom=100"
  );
});
