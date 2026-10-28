// B-26 / C-04 — list endpoints passed the client's raw `sort` string to
// Mongoose .sort() (and the chat model computed a sort key from raw
// input). Clients could sort by any schema path. safeSort parses the
// Express-style sort syntax against a per-endpoint allowlist.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes, until } = require("./helpers");

const listQuery = require("../../utils/listQuery");
const ALLOWED = ["createdAt", "price", "name", "rating.average"];

test("B-26: safeSort keeps allowlisted fields and directions", () => {
  assert.equal(typeof listQuery.safeSort, "function");
  assert.deepEqual(listQuery.safeSort("-createdAt", ALLOWED), {
    createdAt: -1,
  });
  assert.deepEqual(listQuery.safeSort("price", ALLOWED), { price: 1 });
  assert.deepEqual(listQuery.safeSort("-price,name", ALLOWED), {
    price: -1,
    name: 1,
  });
  assert.deepEqual(listQuery.safeSort("-rating.average", ALLOWED), {
    "rating.average": -1,
  });
});

test("B-26: safeSort drops unknown and dangerous fields, falling back safely", () => {
  assert.deepEqual(listQuery.safeSort("passwordHash", ALLOWED), {
    createdAt: -1,
  });
  assert.deepEqual(listQuery.safeSort("-__proto__", ALLOWED), {
    createdAt: -1,
  });
  assert.deepEqual(listQuery.safeSort("$where", ALLOWED), { createdAt: -1 });
  assert.deepEqual(listQuery.safeSort("-createdAt,passwordHash", ALLOWED), {
    createdAt: -1,
  });
  assert.deepEqual(listQuery.safeSort(undefined, ALLOWED), { createdAt: -1 });
  assert.deepEqual(listQuery.safeSort({ $gt: "" }, ALLOWED), { createdAt: -1 });
  assert.deepEqual(
    listQuery.safeSort(
      "-publishedAt",
      ["createdAt", "publishedAt"],
      "-publishedAt",
    ),
    { publishedAt: -1 },
  );
  // A fallback outside the allowlist degrades to -createdAt, never to {}.
  assert.deepEqual(listQuery.safeSort("nope", ALLOWED, "-publishedAt"), {
    createdAt: -1,
  });
});

// Handler level: getAllProducts must hand Mongoose an allowlisted
// sort OBJECT, not the raw client string.
let capturedSort;
function queryChain(result) {
  const chain = {
    populate: () => chain,
    sort: (s) => {
      capturedSort = s;
      return chain;
    },
    skip: () => chain,
    limit: () => Promise.resolve(result),
  };
  return chain;
}
stubModule("models/product.model.js", {
  find: () => queryChain([]),
  countDocuments: async () => 0,
});
stubModule("models/category.model.js", {
  find: () => ({ select: async () => [] }),
});
const productController = require("../../controllers/product.controller");

async function runProducts(query) {
  capturedSort = undefined;
  const res = mockRes();
  productController.getAllProducts({ query }, res, () => {});
  await until(() => capturedSort !== undefined || res.statusCode !== undefined);
  return capturedSort;
}

test("B-26: product list converts sort=-price to an allowlisted object", async () => {
  const sort = await runProducts({ sort: "-price" });
  assert.deepEqual(sort, { price: -1 });
});

test("B-26: product list falls back instead of sorting by an arbitrary field", async () => {
  const sort = await runProducts({ sort: "secretField" });
  assert.deepEqual(sort, { createdAt: -1 });
});
