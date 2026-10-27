// Phase 8 (catalog) — the four catalog migrations against a
// legacy-shaped fixture on a real MMS mongod
// (fixtures/catalog-phase8-migrations-probe.js):
//   (a) category ancestors backfill — equivalent to
//       rebuildAllAncestors(), reported per category;
//   (b) SR-P6-2 lowercased attributeKeys repair on product types —
//       uniquely-mappable keys rewritten, dangling/ambiguous keys
//       flagged and left, attributeAssignments scanned report-only;
//   (c) default variants via Phase 3's ensureDefaultVariant —
//       skipped products listed with reasons, SKUs never invented;
//   (d) VOCABULARY §3 category wiring — single-type leaves typed,
//       mixed-kind leaves and lighting/decor flagged, untouched.
// Every migration is pinned dry-run-first: the dry run writes
// NOTHING and reports the same counts the real run then applies;
// a second real run changes nothing (idempotent).
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

const { categoryWiring } = require("../../config/catalogSeedWiring");
const { data } = require("../../scripts/seed");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(__dirname, "fixtures", "catalog-phase8-migrations-probe.js")],
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

test("P8 wiring data: covers exactly the seed category slugs, types/rooms resolve against the registry data", () => {
  const seedSlugs = data.categories.map((c) => c.slug).sort();
  assert.deepEqual(Object.keys(categoryWiring).sort(), seedSlugs);
});

test("P8 ancestors: dry run reports without writing; real run backfills; rerun is a no-op; equals rebuildAllAncestors", async () => {
  assert.equal(await line("ancestors-dry"), "RESULT ancestors-dry examined=5 changed=2 skipped=3 flagged=0");
  assert.equal(await line("ancestors-dry untouched"), "RESULT ancestors-dry untouched=true");
  assert.equal(await line("ancestors-real"), "RESULT ancestors-real examined=5 changed=2 skipped=3 flagged=0");
  assert.equal(await line("ancestors-real child"), "RESULT ancestors-real child=true");
  assert.equal(await line("ancestors-again"), "RESULT ancestors-again changed=0");
  assert.equal(await line("ancestors-equivalence"), "RESULT ancestors-equivalence true");
});

test("P8 wiring: pinned type/rooms applied; mixed-kind leaf, lighting and unmapped slugs flagged, not forced", async () => {
  assert.equal(await line("wiring-dry"), "RESULT wiring-dry examined=5 changed=3 skipped=0 flagged=3");
  assert.equal(await line("wiring-dry untouched"), "RESULT wiring-dry untouched=true");
  assert.equal(await line("wiring-real"), "RESULT wiring-real examined=5 changed=3 skipped=0 flagged=3");
  assert.equal(await line("wiring-real sofas"), "RESULT wiring-real sofas=sofa/living-room");
  assert.equal(await line("wiring-real root"), "RESULT wiring-real root=none/living-room");
  assert.equal(await line("wiring-real tables"), "RESULT wiring-real tables=roomSlugs flags=1");
  assert.equal(await line("wiring-real lighting"), "RESULT wiring-real lighting changes=0 flags=true");
  assert.equal(await line("wiring-real mystery"), "RESULT wiring-real mystery=true");
  assert.equal(await line("wiring-real lighting-untouched"), "RESULT wiring-real lighting-untouched=true");
  assert.equal(await line("wiring-again"), "RESULT wiring-again changed=0 flagged=3");
});

test("P8 key repair: uniquely-mappable keys rewritten; dangling/ambiguous flagged; assignments report-only", async () => {
  assert.equal(await line("keys-dry"), "RESULT keys-dry examined=29 changed=1 skipped=27 flagged=2");
  assert.equal(await line("keys-dry untouched"), "RESULT keys-dry untouched=true");
  assert.equal(await line("keys-real"), "RESULT keys-real examined=29 changed=1 skipped=27 flagged=2");
  assert.equal(await line("keys-real repair changes"), "RESULT keys-real repair changes=framematerial->frameMaterial,seatingcapacity->seatingCapacity");
  assert.equal(await line("keys-real repair flagged"), "RESULT keys-real repair flagged=notakey");
  assert.equal(await line("keys-real repair findings"), "RESULT keys-real repair findings=framematerial:remap-candidate,ghostkey:dangling");
  assert.equal(await line("keys-real ambig"), "RESULT keys-real ambig=P8CASEKEY changes=0");
  assert.equal(await line("keys-real stored"), "RESULT keys-real stored=frameMaterial,notakey,seatingCapacity");
  assert.equal(await line("keys-real assignments-untouched"), "RESULT keys-real assignments-untouched=true");
  assert.equal(await line("keys-again"), "RESULT keys-again changed=0");
});

test("P8 default variants: created only for SKU-bearing variant-less products; skips carry reasons; rerun no-op", async () => {
  assert.equal(await line("variants-dry"), "RESULT variants-dry examined=4 changed=1 skipped=3 flagged=0");
  assert.equal(await line("variants-dry untouched"), "RESULT variants-dry untouched=true");
  assert.equal(await line("variants-dry reason-nosku"), "RESULT variants-dry reason-nosku=true");
  assert.equal(await line("variants-dry reason-axes"), "RESULT variants-dry reason-axes=true");
  assert.equal(await line("variants-dry reason-has"), "RESULT variants-dry reason-has=true");
  assert.equal(await line("variants-real"), "RESULT variants-real examined=4 changed=1 skipped=3 flagged=0");
  assert.equal(await line("variants-real variant"), "RESULT variants-real variant=P8-SKU-OK/12345/7 hasVariants=true");
  assert.equal(await line("variants-again"), "RESULT variants-again changed=0 skipped=4");
});
