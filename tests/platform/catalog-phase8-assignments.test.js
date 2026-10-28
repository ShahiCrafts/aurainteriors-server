// Phase 8 (catalog), scope item 3 — the SR-P6-2 follow-up recorded
// in PHASE6_5_NOTES: `attributeAssignments[].attributeKey` on
// product types was shape-validated but never existence-checked, so
// resolution dropped unknown assignment keys silently. Create and
// update now route assignment keys through the same
// assertAttributeKeysKnown helper as `attributeKeys`; a rejected
// write persists nothing.
//
// DB assertions drive fixtures/catalog-phase8-assignments-probe.js
// against a real MMS mongod (real schemas, controller, models).
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "catalog-phase8-assignments-probe.js")],
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

test("P8 assignments: create with an unknown assignment key is a named 400 and persists nothing", async () => {
  assert.equal(
    await line("create-unknown"),
    "RESULT create-unknown status=400 named=true",
  );
  assert.equal(
    await line("create-unknown persisted"),
    "RESULT create-unknown persisted=false",
  );
});

test("P8 assignments: unknown keys in attributeKeys and assignments are named together", async () => {
  assert.equal(
    await line("create-both"),
    "RESULT create-both status=400 names=true",
  );
  assert.equal(
    await line("create-both persisted"),
    "RESULT create-both persisted=false",
  );
});

test("P8 assignments: a known assignment key is accepted and stored verbatim", async () => {
  assert.equal(
    await line("create-known status"),
    "RESULT create-known status=201",
  );
  assert.equal(
    await line("create-known stored"),
    "RESULT create-known stored=frameMaterial",
  );
});

test("P8 assignments: update with an unknown assignment key is a named 400 and leaves the stored doc unchanged", async () => {
  assert.equal(
    await line("update-unknown"),
    "RESULT update-unknown status=400 named=true",
  );
  assert.equal(
    await line("update-unknown stored"),
    "RESULT update-unknown stored=frameMaterial",
  );
});

test("P8 assignments: update with a known assignment key passes", async () => {
  assert.equal(
    await line("update-known status"),
    "RESULT update-known status=200",
  );
  assert.equal(
    await line("update-known stored"),
    "RESULT update-known stored=seatingCapacity",
  );
});
