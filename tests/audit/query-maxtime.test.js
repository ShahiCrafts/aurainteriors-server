// AR-37 — chatV2 tool timeouts used to ABANDON work without
// CANCELLING it: registry handlers dropped the ctx, so dbTools queries
// ran to completion server-side after the 1,500 ms race fired. The fix
// threads the tool's timeout budget through the registry ctx into
// dbTools as maxTimeMS on every Mongoose query. These stubbed tests
// capture the options each query is issued with; the real-mongod fault
// injection lives in tests/platform/query-maxtime.test.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

const records = {
  orderFind: null,
  orderFindOne: null,
  productFind: null,
  categoryFindOne: null,
};

function capturingQuery(result, record) {
  const q = {
    sort() {
      return q;
    },
    limit() {
      return q;
    },
    select() {
      return q;
    },
    lean() {
      return q;
    },
    populate() {
      return q;
    },
    maxTimeMS(n) {
      record.maxTimeMS = n;
      return q;
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return Promise.resolve(result).catch(onRejected);
    },
  };
  return q;
}

const anOrder = {
  orderId: "ORD-1",
  orderStatus: "pending",
  paymentMethod: "cod",
  paymentStatus: "pending",
  total: 10,
  shippingAddress: {},
  items: [],
  createdAt: new Date(),
};
stubModule("models/order.model", {
  find: () => {
    records.orderFind = {};
    return capturingQuery([anOrder], records.orderFind);
  },
  findOne: () => {
    records.orderFindOne = {};
    return capturingQuery(anOrder, records.orderFindOne);
  },
});
stubModule("models/product.model", {
  find: () => {
    records.productFind = {};
    return capturingQuery([], records.productFind);
  },
});
stubModule("models/category.model", {
  findOne: () => {
    records.categoryFindOne = {};
    return capturingQuery(null, records.categoryFindOne);
  },
});
stubModule("models/address.model", {
  findOne: () => capturingQuery(null, {}),
  find: () => capturingQuery([], {}),
});
stubModule("models/user.model", { findById: () => capturingQuery(null, {}) });

const dbTools = require("../../services/dbTools");
const registry = require("../../services/chatV2/tools/registry");

test("AR-37: registry threads its timeout budget into getOrderHistory as maxTimeMS", async () => {
  records.orderFind = null;
  await registry.execute(
    "getOrderHistory",
    {},
    { userId: "user-1", chatId: "c1" },
    { timeoutMs: 1234 },
  );
  assert.ok(records.orderFind, "getOrderHistory must query Order.find");
  assert.equal(
    records.orderFind.maxTimeMS,
    1234,
    "the registry timeoutMs must reach the query as maxTimeMS",
  );
});

test("AR-37: registry threads its timeout budget into getOrderStatus as maxTimeMS", async () => {
  records.orderFindOne = null;
  await registry.execute(
    "getOrderStatus",
    { orderId: "ORD-1" },
    { userId: "user-1", chatId: "c1" },
    { timeoutMs: 777 },
  );
  assert.ok(
    records.orderFindOne,
    "getOrderStatus (specific order) must query Order.findOne",
  );
  assert.equal(records.orderFindOne.maxTimeMS, 777);
});

test("AR-37: registry threads its timeout budget into searchProducts as maxTimeMS", async () => {
  records.productFind = null;
  await registry.execute(
    "searchProducts",
    { query: "sofa" },
    { chatId: "c1" },
    { timeoutMs: 555 },
  );
  assert.ok(records.productFind, "searchProducts must query Product.find");
  assert.equal(records.productFind.maxTimeMS, 555);
});

test("AR-37: dbTools applies maxTimeMS only when an opts budget is supplied", async () => {
  records.orderFind = null;
  await dbTools.getOrderHistory({ userId: "user-1" }, { maxTimeMS: 42 });
  assert.equal(
    records.orderFind.maxTimeMS,
    42,
    "an explicit opts budget is applied",
  );
  records.orderFind = null;
  await dbTools.getOrderHistory({ userId: "user-1" });
  assert.equal(
    records.orderFind.maxTimeMS,
    undefined,
    "callers without a budget (legacy orchestrator) keep unbounded-by-default queries, as before",
  );
});

test("AR-37: the registry's default tool budget is the existing 1500 ms timeout", async () => {
  records.orderFind = null;
  await registry.execute(
    "getOrderHistory",
    {},
    { userId: "user-1", chatId: "c1" },
  );
  assert.equal(
    records.orderFind.maxTimeMS,
    1500,
    "with no explicit timeoutMs, queries are bounded by the registry default (1500 ms)",
  );
});
