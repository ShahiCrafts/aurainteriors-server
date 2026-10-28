// Phase 1 (catalog) — Category materialized ancestry.
// `parent` stays the source of truth; `ancestors` (root-first
// ObjectIds) + `depth` are a derived index maintained by the
// create/update controllers (services/categoryHierarchy.service.js)
// so Phase 5 descendant queries can use an indexed array instead of
// a full-collection BFS per call. The probe
// (fixtures/catalog-ancestors-probe.js) drives the REAL controller +
// models against a real MMS mongod: a 5-deep chain, leaf + subtree
// reparents, a move to root, three cycle shapes, and the delete
// guards. Child-process probe because the maintenance spans multiple
// documents per reparent — only a real store proves the subtree
// rewrite lands completely.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "catalog-ancestors-probe.js")],
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

test("ancestors: root of a chain has no ancestors and depth 0", async () => {
  assert.equal(
    await line("chain root"),
    "RESULT chain root ancestors= depth=0",
  );
});

test("ancestors: 5-deep chain leaf carries the root-first ancestor chain", async () => {
  const l = await line("chain leaf ancestors");
  // ancestors=<idA,idB,idC,idD> depth=4 — ids are runtime ObjectIds,
  // so assert shape: 4 comma-separated 24-hex ids and depth 4.
  const m = l.match(
    /^RESULT chain leaf ancestors=([0-9a-f]{24}(,[0-9a-f]{24}){3}) depth=4$/,
  );
  assert.ok(m, `unexpected leaf line: ${l}`);
  assert.equal(await line("chain leaf order"), "RESULT chain leaf order=true");
});

test("ancestors: reparenting a leaf rewrites its chain", async () => {
  const l = await line("reparent-leaf");
  const m = l.match(
    /^RESULT reparent-leaf ancestors=[0-9a-f]{24},[0-9a-f]{24} depth=2$/,
  );
  assert.ok(m, `unexpected reparent-leaf line: ${l}`);
});

test("ancestors: reparenting a subtree root rewrites descendants too", async () => {
  const root = await line("reparent-subtree root");
  assert.match(
    root,
    /^RESULT reparent-subtree root ancestors=[0-9a-f]{24} depth=1$/,
  );
  const child = await line("reparent-subtree child");
  assert.match(
    child,
    /^RESULT reparent-subtree child ancestors=[0-9a-f]{24},[0-9a-f]{24} depth=2$/,
  );
});

test("ancestors: moving a category to root clears its chain", async () => {
  assert.equal(
    await line("move-to-root"),
    "RESULT move-to-root ancestors= depth=0",
  );
});

test("ancestors: all three cycle shapes are rejected with 400 and change nothing", async () => {
  assert.equal(await line("cycle-self"), "RESULT cycle-self status=400");
  assert.equal(await line("cycle-child"), "RESULT cycle-child status=400");
  assert.equal(
    await line("cycle-grandchild"),
    "RESULT cycle-grandchild status=400",
  );
  assert.equal(
    await line("cycle-untouched"),
    "RESULT cycle-untouched parent=true ancestors=",
  );
});

test("ancestors: delete guards still hold (children, products) and leaf delete works", async () => {
  assert.equal(
    await line("delete-with-children"),
    "RESULT delete-with-children status=400",
  );
  assert.equal(
    await line("delete-with-products"),
    "RESULT delete-with-products status=400",
  );
  assert.equal(await line("delete-leaf"), "RESULT delete-leaf status=200");
});

test("tree: productCount is restored as a subtree rollup of non-deleted products (Q9)", async () => {
  // Fixture: 2 live products in the leaf, 1 in the mid node, 1
  // soft-deleted in the leaf (must NOT count). Root and mid roll up
  // to 3; the leaf reports its own 2.
  assert.equal(
    await line("tree-counts"),
    "RESULT tree-counts root=3 mid=3 leaf=2",
  );
});

test("catalog fields: productType and roomSlugs are writable and registry-validated", async () => {
  assert.equal(
    await line("cat-fields"),
    "RESULT cat-fields status=201 type=sofa rooms=living-room",
  );
  assert.equal(
    await line("cat-type-unknown"),
    "RESULT cat-type-unknown status=400",
  );
  assert.equal(
    await line("cat-rooms-unknown"),
    "RESULT cat-rooms-unknown status=400",
  );
  // Both fields can be cleared again (null / empty list).
  assert.equal(
    await line("cat-fields-clear"),
    "RESULT cat-fields-clear status=200 type=unset rooms=0",
  );
});

test("reorder: same-parent ids take sortOrder from list position; mixed parents and unknown ids are 400", async () => {
  assert.equal(
    await line("reorder status"),
    "RESULT reorder status=200 order=Reorder Three|Reorder One|Reorder Two",
  );
  assert.equal(await line("reorder-mixed"), "RESULT reorder-mixed status=400");
  assert.equal(
    await line("reorder-unknown"),
    "RESULT reorder-unknown status=400",
  );
});
