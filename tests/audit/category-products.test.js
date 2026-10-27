// C-01 — category products: colors/materials go into new RegExp() UNESCAPED
// on a public endpoint. `colors=.*` defeats the exact-match filter,
// `colors=[` throws a 500, `(a+)+$` is a ReDoS pattern for Mongo's engine.
// Sibling product.controller.js already uses escapeRegex — this copy missed it.
// C-06 — same handler's pagination is unbounded (see pagination.test.js).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery, mockRes, mockNext, until } = require("./helpers");

let productRecord; let lastFilter;
// Phase 0.5 (Cluster A): getCategoryProducts now calls
// Category.getDescendantIds (owner change; models/category.model.js:93).
// The stub below carries a faithful port of the model's BFS, reading
// this harness's fixture universe (one root category, no children)
// through the same find({}, '_id parent').lean() access pattern, so the
// descendant set it returns is exactly what the real model returns for
// this fixture: the category itself.
const CATEGORY_FIXTURE = [{ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", parent: null }];
stubModule("models/category.model.js", {
  findOne: () => makeQuery({ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Chairs", slug: "chairs" }),
  find: () => makeQuery(CATEGORY_FIXTURE),
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
stubModule("models/product.model.js", {
  find: (filter) => { lastFilter = filter; return makeQuery([], productRecord); },
  countDocuments: async () => 0,
});
stubModule("middleware/upload.middleware.js", { deleteFile: async () => {} });
const categoryController = require("../../controllers/category.controller");

async function categoryProducts(query) {
  productRecord = {}; lastFilter = undefined;
  const res = mockRes(); const next = mockNext();
  categoryController.getCategoryProducts({ params: { id: "chairs" }, query }, res, next);
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  return { res, next };
}

test("C-01: colors=.* is treated literally, not as a wildcard", async () => {
  const { res, next } = await categoryProducts({ colors: ".*" });
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  const re = lastFilter.colors.$in[0];
  assert.ok(re instanceof RegExp);
  assert.equal(re.source, "^\\.\\*$", "the dot-star must be escaped so it matches only the literal colour '.*'");
  assert.ok(re.test(".*"));
  assert.ok(!re.test("red"));
});

test("C-01: colors=[ must not throw a 500", async () => {
  const { res, next } = await categoryProducts({ colors: "[" });
  assert.equal(next.error, undefined, `unexpected error: ${next.error && next.error.message}`);
  assert.equal(res.statusCode, 200);
});

test("C-01: materials with regex metacharacters are escaped too", async () => {
  const { res } = await categoryProducts({ materials: "oak+teak" });
  assert.equal(res.statusCode, 200);
  assert.equal(lastFilter.materials.$in[0].source, "^oak\\+teak$");
});

test("C-06: category products pagination is bounded", async () => {
  await categoryProducts({ limit: "100000" });
  assert.equal(productRecord.limit, 100);
  const { res } = await categoryProducts({ limit: "abc", page: "-1" });
  assert.equal(productRecord.limit, 20);
  assert.equal(productRecord.skip, 0);
  assert.equal(res.statusCode, 200);
});
