// Phase 5 (catalog): faceted-filter LIST semantics over a real
// mongod — attr.* grammar, the same-variant rule, hybrid legacy
// matching, effective price (+ same-variant binding), variant
// availability with reserved-stock exclusion, the collection
// dimension, the injection battery through the real
// qs -> Joi -> controller stack, cursor composition, and
// effective-price sorting. Runs the child-process probe
// (tests/platform/fixtures/catalog-filtering-probe.js) against MMS
// and asserts its RESULT lines (fixture inventory:
//   sofas: Alpha (#ff0000, cap 3, finish "a+b"), Beta (#0000ff,
//          cap 2, on sale), Gamma (#00ff00, cap 5, stock 0)
//   beds:  Delta variants [red/King 1000 x5, blue/Single 500 x3],
//          product price 9999; Epsilon variants [green/Queen 300
//          fully reserved, red/Queen 700 x1, black/King DISABLED];
//          Zeta legacy (bedSize King, color #ff0000, price 450)
//   tables: Eta (extendable, depth 120cm, features a/b),
//          Theta (depth 80cm)
//   + one inactive and one soft-deleted red sofa (never visible))
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

const probe = path.resolve(__dirname, "fixtures", "catalog-filtering-probe.js");

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

test("catalog faceted filtering: attr semantics, price, availability, collections, injection, cursor, sort", async () => {
  const r = await runProbe();

  // Baseline: 8 published products, facets only when requested.
  assert.equal(r.plain, "status=200 total=8 names=Alpha Sofa|Beta Sofa|Delta Bed|Epsilon Bed|Eta Table|Gamma Sofa|Theta Table|Zeta Bed");
  assert.equal(r["plain-facets"], "facets-key=absent");

  // Attribute matching across storage + variant levels (hybrid).
  assert.equal(r["color-red"], "status=200 total=4 names=Alpha Sofa|Delta Bed|Epsilon Bed|Zeta Bed");
  assert.equal(r["bedsize-king"], "status=200 total=2 names=Delta Bed|Zeta Bed");
  assert.equal(r["or-within"], "status=200 total=5 names=Alpha Sofa|Beta Sofa|Delta Bed|Epsilon Bed|Zeta Bed");
  assert.equal(r["and-across"], "status=200 total=1 names=Alpha Sofa");

  // Same-variant rule: red+Single must NOT match Delta (red is
  // King, blue is Single); red+King and blue+Single DO.
  assert.equal(r["same-variant-cross"], "status=200 total=0 names=");
  assert.equal(r["same-variant-hit"], "status=200 total=2 names=Delta Bed|Zeta Bed");
  assert.equal(r["same-variant-blue"], "status=200 total=1 names=Delta Bed");

  // Typed value parsing.
  assert.equal(r["extendable-true"], "status=200 total=1 names=Eta Table");
  assert.equal(r["extendable-yes"], "status=400");
  assert.equal(r["seating-min"], "status=200 total=2 names=Alpha Sofa|Gamma Sofa");
  assert.equal(r["depth-min"], "status=200 total=1 names=Eta Table");
  assert.equal(r["depth-exact"], "status=200 total=1 names=Theta Table");
  assert.equal(r["features-a"], "status=200 total=1 names=Eta Table");
  assert.equal(r["features-c"], "status=200 total=0 names=");

  // Field-storage attributes: literal, case-sensitive (unlike the
  // legacy colors param, whose behavior is pinned unchanged).
  assert.equal(r["field-style"], "status=200 total=1 names=Eta Table");
  assert.equal(r["field-colors-exact"], "status=200 total=1 names=Alpha Sofa");
  assert.equal(r["field-colors-literal-case"], "status=200 total=0 names=");
  assert.equal(r["legacy-colors"], "status=200 total=1 names=Alpha Sofa");
  // Regex metacharacters in values are data, never patterns.
  assert.equal(r["finish-literal"], "status=200 total=1 names=Alpha Sofa");
  assert.equal(r["finish-dot-nomatch"], "status=200 total=0 names=");

  // Effective price: Delta matches through its 500 variant
  // (product.price 9999 is out of range); Epsilon's disabled
  // 100-variant never counts; price binds to the axis variant
  // when both are present (blue+900..1100 misses, red+900..1100
  // hits Delta's red/King 1000 variant).
  assert.equal(r["price-range"], "status=200 total=3 names=Delta Bed|Gamma Sofa|Zeta Bed");
  assert.equal(r["price-bound-miss"], "status=200 total=0 names=");
  assert.equal(r["price-bound-hit"], "status=200 total=1 names=Delta Bed");

  // Availability: Epsilon's green variant is fully reserved, so
  // green+inStock finds nothing (Gamma is stock 0); red+inStock
  // still finds Epsilon through its red variant.
  assert.equal(r.instock, "status=200 total=7 names=Alpha Sofa|Beta Sofa|Delta Bed|Epsilon Bed|Eta Table|Theta Table|Zeta Bed");
  assert.equal(r["instock-green"], "status=200 total=0 names=");
  assert.equal(r["instock-red"], "status=200 total=4 names=Alpha Sofa|Delta Bed|Epsilon Bed|Zeta Bed");

  // Collection dimension (manual + rule), unknown slug -> 404.
  assert.equal(r["collection-manual"], "status=200 total=2 names=Alpha Sofa|Delta Bed");
  assert.equal(r["collection-rule"], "status=200 total=1 names=Beta Sofa");
  assert.equal(r["collection-unknown"], "status=404");

  // Registry discipline + injection battery.
  assert.equal(r["unknown-key"], "status=400");
  assert.equal(r["not-filterable"], "status=400");
  assert.equal(r["injection-operator"], "status=400");
  assert.equal(r["injection-proto"], "status=400");
  assert.equal(r["injection-dotted"], "status=400");

  // Cursor mode composes with attribute filters (driven at the
  // controller level, like the AR-19 tests: the Joi schema strips
  // `cursor` from the HTTP stack — pre-existing, pinned here).
  assert.equal(r["cursor-stack"], "stripped=true");
  assert.equal(r["cursor-walk"], "match=true names=Alpha Sofa|Delta Bed|Epsilon Bed|Zeta Bed");

  // Effective-price sort orders by priceFrom ?? price, and the
  // aggregation body is field-for-field identical to find()'s.
  assert.equal(
    r["sort-effective"],
    "names=Theta Table|Epsilon Bed|Eta Table|Zeta Bed|Delta Bed|Gamma Sofa|Alpha Sofa|Beta Sofa"
  );
  assert.equal(r["sort-shape-parity"], "ok=true");
});
