// Phase 2 (catalog) — attribute definition engine, end to end.
// The probe (fixtures/catalog-attributes-probe.js) drives the real
// bootstrap, models, services and controllers against a real MMS
// mongod; HTTP/auth wiring follows the repo's established route
// patterns and is covered by the route-level suites.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(__dirname, "fixtures", "catalog-attributes-probe.js")],
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

test("attributes: bootstrap seeds the definition registry idempotently; admin edits survive", async () => {
  // 18 owner definitions + 13 brief-vocabulary + 7 field definitions.
  assert.equal(await line("bootstrap-first attributes"), "RESULT bootstrap-first attributes inserted=38 total=38");
  assert.equal(await line("bootstrap-second attributes"), "RESULT bootstrap-second attributes inserted=0 total=38");
  assert.equal(await line("bootstrap-edit-survives"), "RESULT bootstrap-edit-survives ok=true");
});

test("attributes: definition CRUD — create, duplicate, bounds, key immutability", async () => {
  assert.equal(await line("def-create status"), "RESULT def-create status=201");
  assert.equal(await line("def-create-duplicate"), "RESULT def-create-duplicate status=400");
  assert.equal(await line("def-create-bad-bounds"), "RESULT def-create-bad-bounds status=400");
  assert.equal(await line("def-list"), "RESULT def-list status=200 count=39");
  assert.equal(await line("def-get status"), "RESULT def-get status=200");
  assert.equal(await line("def-get-missing"), "RESULT def-get-missing status=404");
  assert.equal(await line("def-update status"), "RESULT def-update status=200");
  assert.equal(await line("def-key-change"), "RESULT def-key-change status=400");
});

test("attributes: type/storage integrity — changes blocked while products carry values", async () => {
  assert.equal(await line("def-type-change-in-use"), "RESULT def-type-change-in-use status=400");
  assert.equal(await line("def-hard-delete-in-use"), "RESULT def-hard-delete-in-use status=400");
});

test("attributes: delete is soft by default; hard delete only when unused and unreferenced", async () => {
  assert.equal(await line("def-soft-delete"), "RESULT def-soft-delete status=200 active=false");
  assert.equal(await line("def-hard-delete status"), "RESULT def-hard-delete status=200 gone=true");
  assert.equal(await line("def-hard-delete-referenced"), "RESULT def-hard-delete-referenced status=400");
});

test("attributes: category assignment endpoints validate keys, defaults and duplicates", async () => {
  assert.equal(await line("assign-unknown"), "RESULT assign-unknown status=400");
  assert.equal(await line("assign-field-key"), "RESULT assign-field-key status=400");
  assert.equal(await line("assign-bad-default"), "RESULT assign-bad-default status=400");
  assert.equal(await line("assign-duplicate"), "RESULT assign-duplicate status=400");
  assert.equal(await line("assign-replace"), "RESULT assign-replace status=200");
  // Replace semantics: the second set fully replaced the first,
  // and the defaultValue was stored (validated + normalized).
  assert.equal(await line("assign-own-list"), "RESULT assign-own-list keys=doorType default=hinged");
});

test("attributes: inheritance — nearest category wins per field; deactivation removes", async () => {
  // Root set frameMaterial { required: true, displayGroup: "Root Group" };
  // mid overrode required only -> deep sees required=false but the
  // root's displayGroup survives (per-field nearest-wins).
  assert.equal(await line("resolve-deep frameMaterial"), "RESULT resolve-deep frameMaterial required=false group=Root Group source=category");
  // Leaf deactivated upholstery (assigned by the sofa type) -> gone.
  assert.equal(await line("resolve-deep upholstery"), "RESULT resolve-deep upholstery absent=true");
  // The sofa type comes from mid, an ancestor (nearest typed
  // ancestor) — deep itself is untyped.
  assert.equal(await line("resolve-deep seatingCapacity source"), "RESULT resolve-deep seatingCapacity source=type required=false");
  assert.equal(await line("resolve-deep material"), "RESULT resolve-deep material source=global");
  // Field definitions ride the unified list.
  assert.equal(await line("resolve-deep price"), "RESULT resolve-deep price storage=field");
});

test("attributes: sibling branches are isolated", async () => {
  // doorType was assigned on the sibling branch only.
  assert.equal(await line("resolve-deep doorType"), "RESULT resolve-deep doorType absent=true");
  // The sibling sees the root assignment unmodified (no mid override).
  assert.equal(await line("resolve-sibling frameMaterial"), "RESULT resolve-sibling frameMaterial required=true source=category");
  assert.equal(await line("resolve-sibling doorType"), "RESULT resolve-sibling doorType required=true default=hinged");
  assert.equal(await line("resolve-sibling bedSize"), "RESULT resolve-sibling bedSize source=type");
  assert.equal(await line("resolve-sibling seatingCapacity"), "RESULT resolve-sibling seatingCapacity absent=true");
});

test("attributes: type-level overrides apply, and category assignments beat them", async () => {
  assert.equal(await line("type-override status"), "RESULT type-override status=200");
  assert.equal(await line("resolve-type seatingCapacity"), "RESULT resolve-type seatingCapacity required=true source=type");
  assert.equal(await line("resolve-mid seatingCapacity"), "RESULT resolve-mid seatingCapacity required=true source=type");
  assert.equal(await line("resolve-deep seatingCapacity-after"), "RESULT resolve-deep seatingCapacity-after required=false source=category");
});

test("attributes: resolution endpoints serve category (slug or id) and product type sets", async () => {
  assert.equal(await line("endpoint-category-attrs status"), "RESULT endpoint-category-attrs status=200 frameMaterial-required=false");
  assert.equal(await line("endpoint-category-attrs-by-id"), "RESULT endpoint-category-attrs-by-id status=200");
  assert.equal(await line("endpoint-category-attrs-missing"), "RESULT endpoint-category-attrs-missing status=404");
  assert.equal(await line("endpoint-type-attrs status"), "RESULT endpoint-type-attrs status=200 has-seating=true has-doorType=false");
  assert.equal(await line("endpoint-type-attrs-missing"), "RESULT endpoint-type-attrs-missing status=404");
});

test("attributes: product create validates + normalizes; failures persist nothing", async () => {
  assert.equal(await line("product-create-attrs"), "RESULT product-create-attrs status=201");
  assert.equal(await line("product-create-normalized"), "RESULT product-create-normalized color=#ff00aa frameMaterial=oak");
  assert.equal(await line("product-create-unknown"), 'RESULT product-create-unknown status=400 msg=Unknown attribute key: "notAKey"');
  assert.equal(await line("product-create-invalid"), "RESULT product-create-invalid status=400");
  assert.equal(await line("product-create-field-key"), "RESULT product-create-field-key status=400");
  assert.equal(await line("product-create-pollution"), "RESULT product-create-pollution status=400 polluted=undefined");
  // Delta is computed against the count before the valid create:
  // the four rejected creates added nothing.
  assert.equal(await line("product-create-failures-persisted"), "RESULT product-create-failures-persisted delta=0");
});

test("attributes: required attributes enforced on create and on touching updates only", async () => {
  assert.equal(await line("product-create-required-missing"), "RESULT product-create-required-missing status=400 msg=Missing required attribute(s) for this category: frameMaterial");
  assert.equal(await line("product-create-required-ok"), "RESULT product-create-required-ok status=201");
  // Price-only update on a product lacking the required attribute: fine.
  assert.equal(await line("product-update-partial"), "RESULT product-update-partial status=200");
  // An update carrying catalogAttributes replaces the map and must
  // satisfy the required set...
  assert.equal(await line("product-update-attrs-required"), "RESULT product-update-attrs-required status=400");
  assert.equal(await line("product-update-attrs status"), "RESULT product-update-attrs status=200");
  // ...and a failing update leaves the stored map untouched.
  assert.equal(await line("product-update-invalid"), "RESULT product-update-invalid status=400 stored=walnut/undefined");
});

test("attributes: category moves cannot strand a product without its required attributes", async () => {
  assert.equal(await line("product-move-blocked"), "RESULT product-move-blocked status=400 stayed=true");
  assert.equal(await line("product-move-ok"), "RESULT product-move-ok status=200");
});

test("attributes: /catalog/schema serves the DB registries in the static shape", async () => {
  assert.equal(await line("schema status"), "RESULT schema status=success seating-type=integer has-probe=true has-soft-deleted=false");
  assert.equal(await line("schema sofa-includes"), "RESULT schema sofa-includes=true rooms-has-living=true");
});

test("attributes: collection attribute-match validates keys against DB definitions", async () => {
  // firmness exists only in the DB registry (not the static config).
  assert.equal(await line("collection-db-key-create"), "RESULT collection-db-key-create status=201");
  assert.equal(await line("collection-db-key-resolve"), "RESULT collection-db-key-resolve total=1 ok=true");
});
