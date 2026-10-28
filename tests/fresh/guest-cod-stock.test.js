// Commit-audit C-2 regression: FA-09 deferred guest COD stock deduction
// to "confirmation" via transitionOrder's pending->confirmed hook. But
// guestCheckout's COD branch confirms the order IN PLACE at placement
// (orderStatus = "confirmed") without passing through transitionOrder,
// so the hook can never fire: guest COD orders were confirmed with
// stockDeducted=false and their stock was NEVER deducted (unbounded
// oversell), and a later cancel restored nothing. The confirmation point
// for a guest COD order is the checkout itself, so the guarded deduction
// must run there, inside the checkout transaction.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("../audit/helpers");

const PRODUCT_ID = "dddddddddddddddddddddddd";
let productUpdates;
let createdOrder;
let sessionState;
let stockAvailable = true;

function installStubs() {
  productUpdates = [];
  createdOrder = undefined;
  sessionState = { aborted: false, committed: false };
  stubModule("models/product.model.js", {
    bulkWrite: async () => ({ modifiedCount: 1 }),
    updateOne: async (filter, update, opts) => {
      productUpdates.push({ filter, update, opts });
      return stockAvailable
        ? { matchedCount: 1, modifiedCount: 1 }
        : { matchedCount: 0, modifiedCount: 0 };
    },
  });
  stubModule("models/order.model.js", {
    findOne: () => makeQuery(null), // replayCheckout: no existing order
    countDocuments: async () => 0, // FA-09 velocity limits
    create: async (docs) => {
      createdOrder = {
        ...docs[0],
        orderId: "ORD-GUEST-1",
        save: async () => {},
        addStatusHistory() {},
      };
      return [createdOrder];
    },
  });
  stubModule("models/cart.model.js", { findOne: () => makeQuery(null) });
  stubModule("models/address.model.js", { findOne: () => makeQuery(null) });
  stubModule("models/discount.model.js", { findOne: () => makeQuery(null) });
  stubModule("services/checkoutItems.service.js", {
    prepareOrderItems: async (items) =>
      items.map((i) => ({
        product: i.productId,
        quantity: i.quantity,
        price: 100,
      })),
  });
  stubModule("services/discountUsage.service.js", {
    consumeDiscountUsage: async () => {},
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
      abortTransaction: async () => {
        sessionState.aborted = true;
      },
      commitTransaction: async () => {
        sessionState.committed = true;
      },
      inTransaction: () =>
        sessionState.committed === false && sessionState.aborted === false,
      endSession: async () => {},
    }),
  });
}

installStubs();
// NOTE: services/orderTransition.service.js is deliberately NOT stubbed -
// the real module (and its shared stock-commit helper) is under test.
const controller = require("../../controllers/order.controller");

function guestCodReq() {
  return {
    body: {
      email: "guest@example.test",
      firstName: "Guest",
      lastName: "Buyer",
      phone: "9800000009",
      items: [{ productId: PRODUCT_ID, quantity: 2 }],
      shippingAddress: {
        fullName: "Guest Buyer",
        phone: "9800000009",
        addressLine1: "1 Guest St",
        city: "Kathmandu",
        postalCode: "44600",
        country: "NP",
      },
      useSameAddress: true,
      paymentMethod: "cod",
    },
    get: (h) =>
      h === "Idempotency-Key" ? "guest-idempotency-0001" : undefined,
  };
}

test("C-2: guest COD checkout deducts stock with the FA-09 guard and marks stockDeducted", async () => {
  stockAvailable = true;
  const res = mockRes();
  const next = mockNext();
  controller.guestCheckout(guestCodReq(), res, next);
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(createdOrder.orderStatus, "confirmed");
  assert.equal(
    createdOrder.stockDeducted,
    true,
    "a confirmed guest COD order must have its stock committed - FA-09's deferral ends at confirmation, and checkout IS the confirmation",
  );
  const deduction = productUpdates.find(
    (u) => u.update && u.update.$inc && u.update.$inc.stock === -2,
  );
  assert.ok(
    deduction,
    "expected a guarded per-item stock deduction of 2 units",
  );
  assert.equal(deduction.filter._id, PRODUCT_ID);
  assert.deepEqual(
    deduction.filter.stock,
    { $gte: 2 },
    "the FA-09 atomic availability guard must be kept",
  );
  assert.ok(
    deduction.opts && deduction.opts.session,
    "the deduction must run inside the checkout transaction session",
  );
  assert.equal(sessionState.committed, true);
  assert.equal(sessionState.aborted, false);
});

test("C-2: guest COD checkout aborts when stock can no longer cover the order", async () => {
  stockAvailable = false;
  productUpdates = [];
  createdOrder = undefined;
  sessionState = { aborted: false, committed: false };
  const res = mockRes();
  const next = mockNext();
  controller.guestCheckout(guestCodReq(), res, next);
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.ok(
    next.error,
    "an unfulfillable guest COD order must not be confirmed",
  );
  assert.equal(next.error.statusCode, 409);
  assert.equal(
    res.statusCode,
    undefined,
    "no success response for an unfulfillable order",
  );
  assert.equal(
    sessionState.aborted,
    true,
    "the checkout transaction must abort",
  );
  assert.equal(sessionState.committed, false);
});
