// B-25 / C-06 — list endpoints must bound page/limit.
// Before the fix: getMyOrders and listDocuments pass raw query values to
// skip/limit — limit=0 means UNLIMITED in MongoDB, limit=abc / page=-1
// produce NaN/negative skip and 500s. The repo's own utils/listQuery
// boundedPage/boundedLimit are the correct pattern.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("./helpers");

// ---- order controller stubs (module load pulls many services) ----
let orderRecord;
stubModule("models/address.model.js", { findOne: () => makeQuery(null) });
stubModule("models/cart.model.js", { findOne: () => makeQuery(null) });
stubModule("models/product.model.js", {
  bulkWrite: async () => ({ modifiedCount: 0 }),
});
stubModule("models/discount.model.js", { findOne: () => makeQuery(null) });
stubModule("models/order.model.js", {
  findOne: () => makeQuery(null),
  find: () => makeQuery([], orderRecord),
  countDocuments: async () => 7,
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

async function myOrders(query) {
  orderRecord = {};
  const res = mockRes();
  const next = mockNext();
  orderController.getMyOrders(
    { user: { _id: "111111111111111111111111" }, query },
    res,
    next,
  );
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  return res;
}

test("B-25: getMyOrders limit=0 must not mean unlimited", async () => {
  const res = await myOrders({ limit: "0" });
  assert.equal(
    orderRecord.limit,
    10,
    "limit=0 should fall back to the default 10",
  );
  assert.equal(res.body.data.pagination.pages, 1);
});

test("B-25: getMyOrders caps an oversized limit at 100", async () => {
  const res = await myOrders({ limit: "100000" });
  assert.equal(orderRecord.limit, 100);
  assert.equal(res.body.data.pagination.limit, 100);
});

test("B-25: getMyOrders rejects NaN/negative pagination instead of 500ing", async () => {
  const res = await myOrders({ limit: "abc", page: "-1" });
  assert.equal(orderRecord.limit, 10);
  assert.equal(orderRecord.skip, 0);
  assert.ok(Number.isFinite(res.body.data.pagination.pages));
});

test("characterization: getMyOrders normal pagination is unchanged", async () => {
  const res = await myOrders({ page: "2", limit: "5" });
  assert.equal(orderRecord.skip, 5);
  assert.equal(orderRecord.limit, 5);
  assert.equal(res.body.data.pagination.pages, 2); // ceil(7/5)
  assert.equal(res.body.data.pagination.page, 2);
});

// ---- document controller ----
let docRecord;
stubModule("models/document.model.js", {
  find: () => makeQuery([], docRecord),
  countDocuments: async () => 3,
});
stubModule("services/backgroundTasks.js", {
  runDocumentIngestion: () => {},
  startBackgroundTasks: () => {},
  stopBackgroundTasks: () => {},
});
stubModule("middleware/upload.middleware.js", { deleteFile: async () => {} });
const documentController = require("../../controllers/document.controller");

async function listDocs(query) {
  docRecord = {};
  const res = mockRes();
  const next = mockNext();
  await documentController.listDocuments({ query }, res, next);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  return res;
}

test("B-25: listDocuments limit=0 must not mean unlimited", async () => {
  const res = await listDocs({ limit: "0" });
  assert.equal(
    docRecord.limit,
    20,
    "limit=0 should fall back to the default 20",
  );
  assert.ok(Number.isFinite(res.body.data.pagination.totalPages));
});

test("B-25: listDocuments caps limit and survives limit=abc", async () => {
  await listDocs({ limit: "100000" });
  assert.equal(docRecord.limit, 100);
  const res = await listDocs({ limit: "abc", page: "-2" });
  assert.equal(docRecord.limit, 20);
  assert.equal(docRecord.skip, 0);
  assert.ok(Number.isFinite(res.body.data.pagination.totalPages));
});

// ---- admin users list (same class; found by grepping the class, not one instance) ----
let userRecord;
stubModule("models/user.model.js", {
  find: () => makeQuery([], userRecord),
  countDocuments: async () => 4,
});
const userController = require("../../controllers/user.controller");

async function allUsers(query) {
  userRecord = {};
  const res = mockRes();
  const next = mockNext();
  userController.getAllUsers({ query }, res, next);
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  return res;
}

test("B-25: getAllUsers bounds pagination", async () => {
  await allUsers({ limit: "0" });
  assert.equal(userRecord.limit, 20);
  await allUsers({ limit: "abc", page: "-1" });
  assert.equal(userRecord.limit, 20);
  assert.equal(userRecord.skip, 0);
});

// ---- admin discounts list (same class) ----
let discountRecord;
stubModule("models/discount.model.js", {
  find: () => makeQuery([], discountRecord),
  countDocuments: async () => 2,
});
const discountController = require("../../controllers/discount.controller");

async function allDiscounts(query) {
  discountRecord = {};
  const res = mockRes();
  const next = mockNext();
  discountController.getAllDiscounts({ query }, res, next);
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  return res;
}

test("B-25: getAllDiscounts bounds pagination", async () => {
  await allDiscounts({ limit: "100000" });
  assert.equal(discountRecord.limit, 100);
  await allDiscounts({ limit: "0" });
  assert.equal(discountRecord.limit, 20);
});
