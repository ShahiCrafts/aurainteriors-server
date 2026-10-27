// Phase 5 (catalog): disjunctive facets over a real mongod —
// derivation of applicable attribute facets per category context,
// disjunctive counts (a facet's own filter removed from its pool,
// all others applied), category subtree rollups, room/price/
// availability/rating facets, the converged
// /catalog/categories/:slug/facets endpoint, and a ~2,000-product
// perf smoke (latency measured + printed by the probe and
// recorded in PHASE5_NOTES; no threshold asserted here).
// Fixture: sofas S1 (red, cap 3, firmness soft, 4.5*), S2 (blue,
// cap 2, firm, 3.0*), S3 (red, cap 2, firm, 4.0*), one table, one
// chair, one inactive sofa (never counted).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

const probe = path.resolve(__dirname, "fixtures", "catalog-facets-probe.js");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [probe],
      { timeout: 240000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`probe failed: ${err.message}\n${stdout}\n${stderr}`));
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
      }
    );
  });
}

test("catalog facets: derivation, disjunctive counts, converged endpoint, perf smoke", async () => {
  const r = await runProbe();

  // Derivation: the sofas scope exposes sofa attributes (and not
  // table/bed ones); the tables scope is the mirror image; an
  // unscoped request unions the types present in scope.
  assert.equal(r["sofa-keys"], "has-seating=true has-cushion=true has-extendable=false has-bedsize=false");
  assert.equal(r["table-keys"], "has-extendable=true has-shape=true has-cushion=false");
  assert.equal(r["unscoped-keys"], "has-extendable=true has-cushion=true");

  // Unfiltered facet values in the sofas scope.
  assert.equal(r["sofa-color"], "red=2 blue=1");
  assert.equal(r["sofa-category"], "options=probe2-sofas:3:true");
  assert.equal(r["sofa-price"], "min=600 max=1200");
  assert.equal(r["sofa-availability"], "count=3 selected=false");
  assert.equal(r["sofa-rating"], "t4=2 t3=3");
  assert.equal(r["sofa-room"], "living=2 bedroom=1");
  assert.equal(r["unscoped-category"], "living=4 sofas=3 dining=1");

  // Disjunctive counting: with color=red selected, the product
  // total reflects red (2) but blue's facet count still reflects
  // the red-excluded pool (1, i.e. all blue sofas) — while the
  // seating facet, a DIFFERENT facet, is narrowed by red.
  assert.equal(r["disj-total"], "total=2");
  assert.equal(r["disj-color"], "red=2:true blue=1:false");
  assert.equal(r["disj-seating"], "v3=1 v2=1");
  assert.equal(r["disj-price"], "min=600 max=800");
  assert.equal(r["disj-category"], "options=probe2-sofas:2:true");

  // Room facet is disjunctive in the same way; rating thresholds
  // mark the active minRating.
  assert.equal(r["room-total"], "total=1");
  assert.equal(r["room-facet"], "living=1:true bedroom=1");
  assert.equal(r["rating-selected"], "t4=true t3=false");

  // Converged endpoint: precursor shape, counts now present on
  // the field facets too, unknown slug 404.
  assert.equal(r.endpoint, "status=200 total=3 slug=probe2-sofas");
  assert.equal(r["endpoint-facets"], "first3=colors|materials|style colors-red=2 seat3=1");
  assert.equal(r["endpoint-404"], "status=404");

  // Perf smoke: the faceted, attribute-filtered call over ~2,000
  // products returned the right total; the measured latency is
  // recorded in PHASE5_NOTES (asserted numeric here only).
  assert.match(r.perf, /^facets-ms=\d+ total=1001 facet-keys=\d+$/);
});
