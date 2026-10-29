// Phase 9+10 (catalog): probe-backed sections — SR-P7-2 list
// payloads, the catalog security battery (injection, authorization
// matrix, guards, mass assignment), perf re-measurement on the
// 2,005-product fixture, and the category-tree N+1 spot check.
// The probe (fixtures/catalog-phase910-probe.js) runs the REAL
// stack: express + qs + nosqlSanitize + the real catalog/product/
// category routers + real protect/restrictTo + the real error
// middleware, over a real MMS mongod.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

const probe = path.resolve(__dirname, "fixtures", "catalog-phase910-probe.js");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [probe],
      { timeout: 300000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(
            new Error(`probe failed: ${err.message}\n${stdout}\n${stderr}`),
          );
          return;
        }
        const results = {};
        for (const line of stdout.split("\n")) {
          if (line.startsWith("RESULT ")) {
            const rest = line.slice("RESULT ".length);
            const eq = rest.indexOf(" ");
            results[rest.slice(0, eq)] = rest.slice(eq + 1);
          }
        }
        resolve(results);
      },
    );
  });
}

let cached;
function probeResults() {
  if (!cached) cached = runProbe();
  return cached;
}

// ---------------------------------------------------------------------
// Probe-backed sections (SR-P7-2, security battery, perf, N+1).
// ---------------------------------------------------------------------
test("SR-P7-2: GET /products list items carry the variant card fields (all read paths)", async () => {
  const r = await probeResults();
  assert.equal(
    r["p72-find"],
    "hasVariants=true priceFrom=450 variants=2 purchasable=true",
  );
  assert.equal(
    r["p72-effective-sort"],
    "hasVariants=true priceFrom=450 variants=2 purchasable=true",
  );
  assert.equal(
    r["p72-cursor"],
    "hasVariants=true priceFrom=450 variants=2 purchasable=true",
  );
  assert.equal(
    r["p72-legacy"],
    "hasVariants=false priceFrom=null variants=0 purchasable=false",
  );
});

test("SR-P7-2: curated card feeds (featured / new-arrivals / related) carry the variant fields", async () => {
  const r = await probeResults();
  assert.equal(
    r["p72-featured"],
    "hasVariants=true priceFrom=450 variants=2 purchasable=true",
  );
  assert.equal(
    r["p72-new-arrivals"],
    "hasVariants=true priceFrom=450 variants=2 purchasable=true",
  );
  assert.equal(
    r["p72-related"],
    "hasVariants=true priceFrom=450 variants=2 purchasable=true",
  );
});

test("battery: operator injection via the products query grammar is rejected or inert", async () => {
  const r = await probeResults();
  // Grammar-shaped operator keys are rejected outright (400).
  assert.equal(r["inj-attr-dollar-key"], "400");
  assert.equal(r["inj-attr-proto"], "400");
  assert.equal(r["inj-attr-container-value"], "400");
  assert.equal(r["inj-attr-deep-dots"], "400");
  // Non-grammar operator keys never reach Mongo: Joi strips the
  // whole key, so the response is the unfiltered baseline.
  assert.equal(r["inj-attr-where"], "200-stripped");
  assert.equal(r["inj-sort-container"], "200-stripped");
  assert.equal(r["inj-categories-container"], "200-stripped");
  assert.equal(r["inj-search-container"], "200-stripped");
  assert.equal(r["inj-collection-dollar"], "200-stripped");
  // The collection dimension itself stays strict: unknown slug 404.
  assert.equal(r["inj-collection-unknown"], "404");
  assert.equal(r["inj-proto-clean"], "clean");
});

test("F-910-1: the attr.* grammar works over real HTTP (C-14 carve-out is scoped)", async () => {
  const r = await probeResults();
  // A legitimate faceted-filter request reaches the engine and the
  // filter demonstrably applies (baseline 5 products -> 1 match).
  assert.equal(r["inj-attr-filter-applies"], "200 total=1");
  // The carve-out is scoped to the products list: a dotted key on
  // any other route is still rejected by the sanitize middleware.
  assert.equal(r["inj-dotted-other-route"], "400");
});

test("SR-P7-1 over HTTP: a coded AppError body carries its code end to end", async () => {
  const r = await probeResults();
  assert.equal(r["p71-http-code"], "VARIANT_REQUIRED");
});

test("battery: registry list includeInactive honors admin only, over HTTP", async () => {
  const r = await probeResults();
  assert.equal(r["authz-types-anon-default"], "active-only");
  assert.equal(r["authz-types-anon-inactive"], "active-only");
  assert.equal(r["authz-types-customer-inactive"], "active-only");
  assert.equal(r["authz-types-admin-inactive"], "with-inactive");
  assert.equal(r["authz-rooms-admin-inactive"], "with-inactive");
  assert.equal(r["authz-collections-admin-inactive"], "with-inactive");
  assert.equal(r["authz-rooms-anon-inactive"], "active-only");
  assert.equal(r["authz-collections-customer-inactive"], "active-only");
});

test("battery: catalog write routes reject anonymous and non-admin callers", async () => {
  const r = await probeResults();
  for (const key of [
    "authz-post-types-anon",
    "authz-post-types-customer",
    "authz-post-rooms-anon",
    "authz-post-rooms-customer",
    "authz-post-collections-anon",
    "authz-post-collections-customer",
    "authz-post-attributes-anon",
    "authz-post-attributes-customer",
    "authz-delete-type-anon",
    "authz-delete-type-customer",
    "authz-post-variant-anon",
    "authz-post-variant-customer",
    "authz-patch-variant-customer",
    "authz-post-category-anon",
    "authz-post-category-customer",
    "authz-reorder-anon",
    "authz-reorder-customer",
    "authz-put-assignments-anon",
    "authz-put-assignments-customer",
  ]) {
    assert.match(
      r[key],
      /^(401|403)$/,
      `${key} expected 401/403, got ${r[key]}`,
    );
  }
  // Admin passes the gate (validation/controller answer, not 401/403).
  assert.equal(r["authz-post-types-admin"], "201");
  assert.equal(r["authz-reorder-admin"], "200");
});

test("battery: mutation guards stay strict (slug in a mutation path is a 400)", async () => {
  const r = await probeResults();
  assert.equal(r["guard-patch-product-slug"], "400");
  assert.equal(r["guard-post-variant-slug"], "400");
  assert.equal(r["guard-delete-category-slug"], "400");
  assert.equal(r["guard-get-product-slug"], "200");
});

test("battery: JSON body pollution + mass assignment on catalog write surfaces", async () => {
  const r = await probeResults();
  assert.equal(r["mass-type-proto"], "clean");
  assert.equal(r["mass-type-extra-fields"], "stripped");
  assert.equal(r["mass-variant-reserved"], "not-settable");
  assert.equal(r["mass-variant-extra-fields"], "stripped");
  assert.equal(r["mass-collection-rule-operator"], "rejected-or-literal");
  assert.equal(r["mass-assignments-proto-key"], "400");
  assert.equal(r["mass-product-catalogattrs-proto"], "400");
});

test("perf: facets + listing + search re-measured on the 2,005-product fixture", async () => {
  const r = await probeResults();
  assert.match(r["perf-fixture"], /^products=2005$/);
  assert.match(r["perf-facets-cold"], /^ms=\d+ total=1001$/);
  assert.match(r["perf-facets-warm"], /^ms=\d+ total=1001$/);
  assert.match(r["perf-listing"], /^ms=\d+ total=1001$/);
  assert.match(r["perf-search"], /^ms=\d+ total=\d+$/);
});

test("perf: category tree + navigation are constant-query (no N+1)", async () => {
  const r = await probeResults();
  assert.equal(r["n1-tree-queries"], "2");
  assert.equal(r["n1-navigation-queries"], "2");
});
