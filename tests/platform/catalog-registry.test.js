// Phase 1 (catalog) — DB-backed registries (product types here;
// rooms and collections follow in the same probe). The bootstrap
// (services/catalogBootstrap.service.js) seeds the canonical
// vocabulary from config/catalogRegistryData.js with $setOnInsert
// semantics: reruns insert nothing and never clobber admin edits.
// The probe (fixtures/catalog-registry-probe.js) drives the real
// bootstrap + catalog controllers + models against a real MMS
// mongod; HTTP/auth wiring follows the repo's established route
// patterns and is covered by the route-level suites.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(__dirname, "fixtures", "catalog-registry-probe.js")],
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

test("registry: bootstrap seeds the full canonical product-type vocabulary", async () => {
  // 13 owner keys from config/catalogTaxonomy.js + 14 brief leaf
  // kinds = 27 (config/catalogRegistryData.js).
  assert.equal(await line("bootstrap-first"), "RESULT bootstrap-first types inserted=27 total=27");
});

test("registry: bootstrap rerun is idempotent (no duplicates, no clobber)", async () => {
  assert.equal(await line("bootstrap-second"), "RESULT bootstrap-second types inserted=0 total=27");
});

test("registry: public list returns all active types; owner keys keep config associations", async () => {
  assert.equal(await line("types-list"), "RESULT types-list status=200 count=27");
  // sofa: department sofas-seating, 6 attribute keys inherited from
  // config/catalogTaxonomy.js verbatim.
  assert.equal(await line("type-get"), "RESULT type-get status=200 department=sofas-seating attrs=6");
  assert.equal(await line("type-get-missing"), "RESULT type-get-missing status=404");
});

test("registry: admin can create a new type without a code change; duplicates rejected", async () => {
  assert.equal(await line("type-create status"), "RESULT type-create status=201");
  assert.equal(await line("type-create-duplicate"), "RESULT type-create-duplicate status=400");
});

test("registry: type update works; the key itself is immutable", async () => {
  assert.equal(await line("type-update"), "RESULT type-update status=200 label-ok=true");
  assert.equal(await line("type-key-change"), "RESULT type-key-change status=400");
});

test("registry: a type referenced by a category cannot be deleted", async () => {
  assert.equal(await line("type-delete-in-use"), "RESULT type-delete-in-use status=400");
  assert.equal(await line("type-delete status"), "RESULT type-delete status=200");
});

test("rooms: bootstrap seeds the brief's 9 rooms, reconciled with the owner's slugs", async () => {
  assert.equal(await line("bootstrap-first rooms"), "RESULT bootstrap-first rooms inserted=9 total=9");
  assert.equal(await line("bootstrap-second rooms"), "RESULT bootstrap-second rooms inserted=0 total=9");
  assert.equal(await line("rooms-list"), "RESULT rooms-list status=200 count=9");
});

test("rooms: room page lists published products only, paginated", async () => {
  // living-room fixtures: 2 published + 1 inactive (excluded).
  assert.equal(await line("room-products status"), "RESULT room-products status=200 total=2 count=2");
  assert.equal(await line("room-products-page"), "RESULT room-products-page total=2 pages=2 count=1");
  assert.equal(await line("room-missing"), "RESULT room-missing status=404");
});

test("rooms: a product in two rooms appears in each, as one record", async () => {
  assert.equal(await line("room-dual"), "RESULT room-dual total=1 same=true");
});

test("rooms: product writes validate roomSlugs against the registry", async () => {
  assert.equal(await line("product-create-rooms status"), "RESULT product-create-rooms status=201");
  assert.equal(await line("product-create-rooms-unknown"), "RESULT product-create-rooms-unknown status=400");
  assert.equal(await line("product-update-rooms-unknown"), "RESULT product-update-rooms-unknown status=400");
  assert.equal(await line("product-update-rooms-clear"), "RESULT product-update-rooms-clear status=200 cleared=true");
});

test("rooms: GET /products?room= filters by room assignment", async () => {
  // Published living-room products at this point: the two fixtures
  // plus the controller-created one = 3; the bedroom product is out.
  assert.equal(await line("products-room-filter"), "RESULT products-room-filter total=3 has-bedroom=false");
});

test("rooms: admin CRUD with duplicate, slug-immutability and in-use guards", async () => {
  assert.equal(await line("room-create status"), "RESULT room-create status=201");
  assert.equal(await line("room-create-duplicate"), "RESULT room-create-duplicate status=400");
  assert.equal(await line("room-slug-change"), "RESULT room-slug-change status=400");
  assert.equal(await line("room-delete-in-use"), "RESULT room-delete-in-use status=400");
  assert.equal(await line("room-delete status"), "RESULT room-delete status=200");
});

test("collections: bootstrap seeds the brief's 10 (4 evaluable rules + 6 manual-empty)", async () => {
  assert.equal(await line("bootstrap-first collections"), "RESULT bootstrap-first collections inserted=10 total=10");
  assert.equal(await line("bootstrap-second collections"), "RESULT bootstrap-second collections inserted=0 total=10");
  assert.equal(await line("collections-list"), "RESULT collections-list status=200 count=10");
});

test("collections: manual membership keeps curated order and drops unpublished products", async () => {
  assert.equal(await line("collection-manual-create"), "RESULT collection-manual-create status=201");
  // Seeded as [B, hidden(inactive), A] — resolves to [B, A], total 2.
  assert.equal(await line("collection-manual total"), "RESULT collection-manual total=2 order=true");
  assert.equal(await line("collection-manual-unknown"), "RESULT collection-manual-unknown status=400");
  // A seeded curated collection starts honestly empty.
  assert.equal(await line("collection-manual-empty"), "RESULT collection-manual-empty total=0");
});

test("collections: on-sale uses the real originalPrice > price relation", async () => {
  assert.equal(await line("collection-onsale"), "RESULT collection-onsale total=1 ok=true");
});

test("collections: featured uses the existing isFeatured flag", async () => {
  assert.equal(await line("collection-featured"), "RESULT collection-featured total=1 ok=true");
});

test("collections: new-arrivals applies the createdAt window (30 days)", async () => {
  assert.equal(await line("collection-newarrivals"), "RESULT collection-newarrivals has-old=false has-fresh=true");
});

test("collections: best-sellers ranks by real order quantities and ignores cancelled orders", async () => {
  assert.equal(await line("collection-bestsellers"), "RESULT collection-bestsellers total=2 order=true has-cancelled=false");
});

test("collections: attribute-match resolves catalogAttributes equality; unknown keys rejected at write", async () => {
  assert.equal(await line("collection-attrmatch-create"), "RESULT collection-attrmatch-create status=201");
  assert.equal(await line("collection-attrmatch total"), "RESULT collection-attrmatch total=1 ok=true");
  assert.equal(await line("collection-attrmatch-badkey"), "RESULT collection-attrmatch-badkey status=400");
});

test("collections: admin guards (duplicate slug, slug immutability, delete)", async () => {
  assert.equal(await line("collection-create-duplicate"), "RESULT collection-create-duplicate status=400");
  assert.equal(await line("collection-slug-change"), "RESULT collection-slug-change status=400");
  assert.equal(await line("collection-delete status"), "RESULT collection-delete status=200");
});
