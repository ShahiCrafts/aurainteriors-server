// B-27 / C-05 — admin search strings must be treated as literal text,
// not as regular expressions. Before the fix: order search passed the raw
// string to Mongo's $regex, and user search did new RegExp(search) —
// `.*` changes semantics, `[` throws / Mongo-errors, `(a+)+$` is ReDoS.
// The repo's utils/listQuery literalRegex is the correct pattern.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("./helpers");

// ---- order controller (getAllOrders) ----
let orderFilter;
stubModule("models/address.model.js", { findOne: () => makeQuery(null) });
stubModule("models/cart.model.js", { findOne: () => makeQuery(null) });
stubModule("models/product.model.js", {
  bulkWrite: async () => ({ modifiedCount: 0 }),
});
stubModule("models/discount.model.js", { findOne: () => makeQuery(null) });
stubModule("models/order.model.js", {
  findOne: () => makeQuery(null),
  find: (filter) => {
    orderFilter = filter;
    return makeQuery([]);
  },
  countDocuments: async () => 0,
  aggregate: async () => [],
  create: async () => [],
});
stubModule("services/checkoutItems.service.js", {
  prepareOrderItems: async () => [],
});
stubModule("services/discountUsage.service.js", {
  consumeDiscountUsage: async () => {},
});
stubModule("services/orderTransition.service.js", {
  transitionOrder: async () => {},
});
stubModule("services/email.service.js", {
  sendOrderConfirmationEmail: async () => true,
});
stubModule("services/esewaCapture.service.js", {
  captureEsewaPayment: async () => {},
});
stubModule("services/esewaVerification.service.js", {
  getEsewaConfig: () => ({
    secretKey: "test-only",
    merchantId: "TEST",
    paymentUrl: "https://example.invalid/pay",
  }),
  verifyEsewaSignature: () => true,
  verifyEsewaPayment: async () => ({}),
  verifyEsewaRefund: async () => ({}),
});
stubModule("services/notificationEventEmitter.js", { emit: () => {} });
stubModule("mongoose", {
  startSession: async () => ({
    startTransaction() {},
    abortTransaction: async () => {},
    commitTransaction: async () => {},
    inTransaction: () => false,
    endSession: async () => {},
  }),
});
const orderController = require("../../controllers/order.controller");

async function allOrders(query) {
  orderFilter = undefined;
  const res = mockRes();
  const next = mockNext();
  orderController.getAllOrders({ query }, res, next);
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  return res;
}

test("B-27: order search treats metacharacters literally", async () => {
  await allOrders({ search: ".*" });
  const cond = orderFilter.$or[0].orderId;
  assert.ok(
    cond instanceof RegExp,
    "search should be compiled via literalRegex, not sent as a raw $regex string",
  );
  assert.equal(cond.source, "\\.\\*");
  assert.ok(cond.test("a.*b"));
  assert.ok(!cond.test("anything"));
});

test("B-27: order search with a ReDoS pattern is escaped", async () => {
  await allOrders({ search: "(a+)+$" });
  const cond = orderFilter.$or[1]["guestInfo.email"];
  assert.ok(cond instanceof RegExp);
  assert.equal(cond.source, "\\(a\\+\\)\\+\\$");
});

// ---- user controller (getAllUsers) ----
let userFilter;
stubModule("models/user.model.js", {
  find: (filter) => {
    userFilter = filter;
    return makeQuery([]);
  },
  countDocuments: async () => 0,
});
const userController = require("../../controllers/user.controller");

async function allUsers(query) {
  userFilter = undefined;
  const res = mockRes();
  const next = mockNext();
  userController.getAllUsers({ query }, res, next);
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  return { res, next };
}

test("C-05: user search treats metacharacters literally", async () => {
  const { next } = await allUsers({ search: ".*" });
  assert.equal(next.error, undefined);
  const cond = userFilter.$or[0].firstName;
  assert.ok(cond instanceof RegExp);
  assert.equal(cond.source, "\\.\\*");
});

test("C-05: user search for '[' does not throw", async () => {
  const { res, next } = await allUsers({ search: "[" });
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
});
