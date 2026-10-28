// Phase 8 (catalog) — seed smoke test. The canonical seed path
// (scripts/seed.js runSeeder) runs against an EMPTY MMS mongod in
// fixtures/catalog-phase8-seed-probe.js; this file asserts the
// fresh-install contract from its RESULT lines: registry counts,
// 36 categories with populated ancestors/depth, VOCABULARY §3
// wiring on categories and products, source price/stock preserved,
// sane nonzero facets for a leaf category, and an idempotent
// second run (upsert creates nothing new).
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "catalog-phase8-seed-probe.js")],
      { timeout: 600000, maxBuffer: 4 * 1024 * 1024 },
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

test("P8 seed: first run creates the full catalog and reports the wiring it applied", async () => {
  assert.equal(
    await line("seed-first created"),
    "RESULT seed-first created=36/324 updated=0/0",
  );
  // 9 single-type leaves typed; 24 categories carry pinned rooms;
  // 216 products inherit pinned rooms from their leaf category.
  assert.equal(
    await line("seed-first wiring"),
    "RESULT seed-first wiring=9/24/216",
  );
});

test("P8 seed: registry bootstrap and demo accounts land on a fresh install", async () => {
  assert.equal(
    await line("registry counts"),
    "RESULT registry counts=27/9/10/38",
  );
  assert.equal(await line("users"), "RESULT users=2");
});

test("P8 seed: all 36 categories carry populated ancestors/depth", async () => {
  assert.equal(await line("categories count"), "RESULT categories count=36");
  assert.equal(
    await line("categories ancestry"),
    "RESULT categories ancestry roots=true leaves=true",
  );
});

test("P8 seed: VOCABULARY §3 wiring on categories — pinned aspects set, open aspects unset", async () => {
  assert.equal(
    await line("wiring sofas"),
    "RESULT wiring sofas=sofa/living-room",
  );
  assert.equal(
    await line("wiring desks"),
    "RESULT wiring desks=desk/home-office,study-corner",
  );
  assert.equal(
    await line("wiring tables"),
    "RESULT wiring tables=none/living-room",
  );
  assert.equal(await line("wiring lighting"), "RESULT wiring lighting=none/0");
  assert.equal(await line("wiring kitchen"), "RESULT wiring kitchen=none/0");
});

test("P8 seed: products keep source prices/stock and inherit pinned rooms only", async () => {
  assert.equal(await line("products count"), "RESULT products count=324");
  assert.equal(
    await line("products source-values"),
    "RESULT products source-values=true",
  );
  assert.equal(
    await line("products sofa-rooms"),
    "RESULT products sofa-rooms=living-room",
  );
  assert.equal(
    await line("products lighting-rooms"),
    "RESULT products lighting-rooms=0",
  );
});

test("P8 seed: a leaf category's facets response is sane and nonzero", async () => {
  assert.equal(
    await line("facets bed-frames"),
    "RESULT facets bed-frames total=12 facets=10 maxcount=6",
  );
});

test("P8 seed: second run is an upsert no-op (creates nothing, counts stable)", async () => {
  assert.equal(
    await line("seed-second created"),
    "RESULT seed-second created=0/0 updated=36/324",
  );
  assert.equal(
    await line("after-second counts"),
    "RESULT after-second counts=36/324/27",
  );
});
