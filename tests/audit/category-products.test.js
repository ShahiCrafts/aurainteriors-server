// C-01 — category products: colors/materials go into new RegExp() UNESCAPED
// on a public endpoint. `colors=.*` defeats the exact-match filter,
// `colors=[` throws a 500, `(a+)+$` is a ReDoS pattern for Mongo's engine.
// Sibling product.controller.js already uses escapeRegex — this copy missed it.
// C-06 — same handler's pagination is unbounded (see pagination.test.js).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery, mockRes, mockNext, until } = require("./helpers");

let productRecord; let lastFilter;
stubModule("models/category.model.js", {
  findOne: () => makeQuery({ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Chairs", slug: "chairs" }),
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
