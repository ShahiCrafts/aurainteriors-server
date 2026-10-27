// Phase 0.5 — GET /products category filters must include DESCENDANT
// categories (live bug: parent-category storefront listings were
// empty because getAllProducts resolved `categories` slugs /
// `category` ids to those categories only, while the owner's
// getCategoryProducts already lists the whole subtree — Q1 in
// docs/catalog/PHASE0_AUDIT.md §5.4: server-side expansion in the list
// endpoint, response shape unchanged).
//
// Driven through a recording-stub harness in the style of
// catalog-list-query.test.js. The Category stub's getDescendantIds is
// a faithful port of models/category.model.js:93 over the fixture
// tree below; the Product stub records the exact filter the handler
// hands to Mongoose, which is the behavior under test.
//
// Fixture tree:
//   living-room ─┬─ sofas ─── 3-seater-sofas
//                └─ chairs
//   bedroom ─────── beds
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes, mockNext, until } = require("../audit/helpers");

function recordingQuery(result, record) {
  const q = {
    populate() { return q; },
    select() { return q; },
    session() { return q; },
    sort(s) { record.sort = s; return q; },
    skip(n) { record.skip = n; return q; },
    limit(n) { record.limit = n; return q; },
    lean() { record.lean = true; return q; },
    then(onF, onR) { return Promise.resolve(result).then(onF, onR); },
    catch(onR) { return Promise.resolve(result).catch(onR); },
  };
  return q;
}

const CATS = [
  { _id: "c-living", slug: "living-room", parent: null },
  { _id: "c-sofas", slug: "sofas", parent: "c-living" },
  { _id: "c-3seat", slug: "3-seater-sofas", parent: "c-sofas" },
  { _id: "c-chairs", slug: "chairs", parent: "c-living" },
  { _id: "c-bedroom", slug: "bedroom", parent: null },
  { _id: "c-beds", slug: "beds", parent: "c-bedroom" },
];

const DOCS = [
  { _id: "p1", createdAt: new Date("2026-01-03T00:00:00Z") },
  { _id: "p2", createdAt: new Date("2026-01-02T00:00:00Z") },
  { _id: "p3", createdAt: new Date("2026-01-01T00:00:00Z") },
];

const calls = { productFind: [] };

stubModule("models/category.model", {
  find: (filter) => {
    if (filter && filter.slug && Array.isArray(filter.slug.$in)) {
      const wanted = new Set(filter.slug.$in);
      return recordingQuery(CATS.filter((c) => wanted.has(c.slug)), {});
    }
    return recordingQuery(CATS, {});
  },
  getDescendantIds: async function (id) {
    const categories = await this.find({}, "_id parent").lean();
    const children = new Map();
    for (const category of categories) {
      const key = String(category.parent || "");
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(String(category._id));
    }
    const seen = new Set();
    const queue = [String(id)];
    while (queue.length) {
      const current = queue.shift();
      if (seen.has(current)) continue;
      seen.add(current);
      queue.push(...(children.get(current) || []));
    }
    return [...seen];
  },
});
stubModule("models/product.model", {
  find: (filter) => { calls.productFind.push(filter); return recordingQuery(DOCS, {}); },
  countDocuments: async () => DOCS.length,
});
stubModule("middleware/upload.middleware", {
  deleteFile: async () => {},
  deleteFiles: async () => {},
});

const productCtrl = require("../../controllers/product.controller");

async function runProducts(query) {
  calls.productFind = [];
  const res = mockRes(); const next = mockNext();
  productCtrl.getAllProducts({ query }, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined, `getAllProducts errored: ${next.error && next.error.message}`);
  assert.equal(res.statusCode, 200);
  return { res, filter: calls.productFind[0] };
}

const asSet = (ids) => [...ids].map(String).sort();
const LIVING_SUBTREE = ["c-3seat", "c-chairs", "c-living", "c-sofas"];

test("descendants: parent slug includes child and grandchild categories", async () => {
  const { filter } = await runProducts({ categories: "living-room" });
  assert.deepEqual(asSet(filter.category.$in), LIVING_SUBTREE);
});

test("descendants: leaf slug stays a single-category filter", async () => {
  const { filter } = await runProducts({ categories: "3-seater-sofas" });
  assert.deepEqual(asSet(filter.category.$in), ["c-3seat"]);
});

test("descendants: multiple slugs union their subtrees", async () => {
  const { filter } = await runProducts({ categories: "sofas,beds" });
  assert.deepEqual(asSet(filter.category.$in), ["c-3seat", "c-beds", "c-sofas"]);
});

test("descendants: a resolvable slug wins over a bogus one in the same list", async () => {
  const { filter } = await runProducts({ categories: "sofas,no-such-slug" });
  assert.deepEqual(asSet(filter.category.$in), ["c-3seat", "c-sofas"]);
});

test("descendants: nonexistent slug keeps current behavior (param ignored, no category filter)", async () => {
  const { filter } = await runProducts({ categories: "no-such-slug" });
  assert.equal(filter.category, undefined);
});

test("descendants: legacy category id param expands to the subtree too", async () => {
  const { filter } = await runProducts({ category: "c-living" });
  assert.deepEqual(asSet(filter.category.$in), LIVING_SUBTREE);
});

test("descendants: legacy category id for a leaf stays a single-category filter", async () => {
  const { filter } = await runProducts({ category: "c-beds" });
  assert.deepEqual(asSet(filter.category.$in), ["c-beds"]);
});

test("descendants: categories (slugs) still overwrites category (ids) when a slug resolves", async () => {
  const { filter } = await runProducts({ category: "c-beds", categories: "sofas" });
  assert.deepEqual(asSet(filter.category.$in), ["c-3seat", "c-sofas"]);
});

test("descendants: cursor mode applies the expanded filter and still returns nextCursor", async () => {
  const { res, filter } = await runProducts({ categories: "living-room", cursor: "", limit: "2" });
  assert.deepEqual(asSet(filter.category.$in), LIVING_SUBTREE);
  assert.equal(res.body.data.products.length, 2);
  assert.equal(typeof res.body.data.nextCursor, "string");
  assert.ok(res.body.data.nextCursor.length > 0);
});
