// AR-31(e) characterization: guest vs authenticated checkout in
// controllers/order.controller.js.
//
// Already shared before AR-31(e): prepareOrderItems
// (services/checkoutItems.service), calculateOrderTotals (in-file
// helper), consumeDiscountUsage, replay/idempotency, eSewa payment
// data, notifications. AR-31(e) extracts the two remaining IDENTICAL
// blocks — the eSewa branch and the COD finalize tail (outbox-aware
// confirmation-email dispatch + commit + response) — and routes
// calculateOrderTotals' discount lookup through the AR-31(a) shared
// resolver. This file pins BOTH flows' observable behavior (response
// bodies byte-for-byte, side-effect call pattern, discount verdicts)
// and must pass identically BEFORE and AFTER.
//
// Deliberately NOT unified (divergences documented in the AR-31
// report): guest stock is committed at confirmation via
// commitGuestCodStock (+ AR-25 reservations), authenticated stock is
// deducted at placement via a guarded bulkWrite; guest-only velocity
// limits/item caps; auth-only cart load/clear and address resolution.
// OA-1 (AR-32 completion): FRONTEND_URL/BACKEND_URL have no fallbacks
// any more and the eSewa branch builds payment URLs from BACKEND_URL
// via requireAtUse - set both explicitly. Env-setup only.
process.env.FRONTEND_URL =
  process.env.FRONTEND_URL || "https://frontend.example.test";
process.env.BACKEND_URL =
  process.env.BACKEND_URL || "https://backend.example.test";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("../audit/helpers");

const USER_ID = "111111111111111111111111";
const state = {
  createdOrder: null,
  createPayload: null,
  consumeDiscountCalls: 0,
  commitGuestCodCalls: 0,
  bulkWriteCalls: 0,
  cartSaveCalls: 0,
  dispatchCalls: [],
  outboxMode: false,
  sessionCommits: 0,
};

const storedDiscount = {
  code: "SAVE10",
  discountPercentage: 10,
  isActive: true,
  expiryDate: new Date(Date.now() + 864e5),
  validateForCart: () => ({ valid: true, message: "Discount code is valid" }),
  calculateDiscount: (s) => Math.round(s * 0.1),
};

stubModule("models/address.model.js", { findOne: () => makeQuery(null) });
const cartDoc = {
  items: [
    {
      _id: "cccccccccccccccccccccccc",
      product: "dddddddddddddddddddddddd",
      quantity: 1,
      variant: null,
    },
  ],
  save: async () => {
    state.cartSaveCalls++;
  },
};
stubModule("models/cart.model.js", { findOne: () => makeQuery(cartDoc) });
stubModule("models/product.model.js", {
  bulkWrite: async () => {
    state.bulkWriteCalls++;
    return { modifiedCount: 1 };
  },
});
stubModule("models/discount.model.js", {
  // Query-faithful: matches only the canonical stored code + active/expiry gate.
  findOne: (filter) =>
    makeQuery(
      filter && filter.code === storedDiscount.code && filter.isActive === true
        ? storedDiscount
        : null,
    ),
});
stubModule("models/order.model.js", {
  findOne: () => makeQuery(null), // replayCheckout: no existing order
  countDocuments: async () => 0, // guest velocity checks
  create: async (docs) => {
    state.createPayload = docs[0];
    state.createdOrder = {
      ...docs[0],
      _id: "order-mongo-1",
      orderId: "ORD-TEST-1",
      save: async () => {},
      addStatusHistory() {},
    };
    return [state.createdOrder];
  },
});
stubModule("services/checkoutItems.service.js", {
  prepareOrderItems: async (items) =>
    items.map((i) => ({
      product: i.productId || i.product,
      quantity: i.quantity,
      price: 100,
    })),
});
stubModule("services/discountUsage.service.js", {
  consumeDiscountUsage: async () => {
    state.consumeDiscountCalls++;
  },
});
stubModule("services/orderTransition.service.js", {
  transitionOrder: async () => {},
  commitGuestCodStock: async () => {
    state.commitGuestCodCalls++;
  },
});
stubModule("services/emailOutbox.service.js", {
  isOutboxMode: () => state.outboxMode,
  dispatchEmail: async (message, opts) => {
    state.dispatchCalls.push({ message, opts });
    return { status: "sent" };
  },
});
stubModule("services/stockReservation.service.js", {
  isEnabled: () => false,
  reserveForOrder: async () => {},
  consumeForOrder: async () => {},
});
stubModule("services/esewaCapture.service.js", {
  captureEsewaPayment: async () => {},
});
stubModule("services/esewaVerification.service.js", {
  getEsewaConfig: () => ({
    secretKey: "test-only-secret",
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
    commitTransaction: async () => {
      state.sessionCommits++;
    },
    inTransaction: () => false,
    endSession: async () => {},
  }),
});

const controller = require("../../controllers/order.controller");

function reset() {
  state.createdOrder = null;
  state.createPayload = null;
  state.consumeDiscountCalls = 0;
  state.commitGuestCodCalls = 0;
  state.bulkWriteCalls = 0;
  state.cartSaveCalls = 0;
  state.dispatchCalls = [];
  state.outboxMode = false;
  state.sessionCommits = 0;
  cartDoc.items = [
    {
      _id: "cccccccccccccccccccccccc",
      product: "dddddddddddddddddddddddd",
      quantity: 1,
      variant: null,
    },
  ];
}

const ADDRESS = {
  fullName: "Buy Er",
  phone: "9800000000",
  addressLine1: "1 St",
  city: "Kathmandu",
  postalCode: "44600",
  country: "NP",
};
function guestReq(body) {
  return {
    body: {
      email: "guest@example.test",
      firstName: "Gu",
      lastName: "Est",
      phone: "9800000001",
      items: [{ productId: "dddddddddddddddddddddddd", quantity: 2 }],
      shippingAddress: ADDRESS,
      useSameAddress: true,
      ...body,
    },
    get: (h) =>
      h === "Idempotency-Key" ? "guest-idempotency-key-01" : undefined,
  };
}
function authReq(body) {
  return {
    user: {
      _id: USER_ID,
      email: "buyer@example.test",
      firstName: "Buy",
      lastName: "Er",
      phone: "9800000000",
    },
    body: { shippingAddress: ADDRESS, useSameAddress: true, ...body },
    get: (h) =>
      h === "Idempotency-Key" ? "auth-idempotency-key-01" : undefined,
  };
}
async function run(handler, req) {
  const res = mockRes();
  const next = mockNext();
  handler(req, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  return { res, next };
}

test("AR-31e guest COD (direct email mode): pinned response + side effects", async () => {
  reset();
  const { res, next } = await run(
    controller.guestCheckout,
    guestReq({ paymentMethod: "cod" }),
  );
  assert.equal(
    next.error,
    undefined,
    `unexpected: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    success: true,
    message: "Order placed successfully!",
    data: {
      order: {
        orderId: "ORD-TEST-1",
        orderStatus: "confirmed",
        paymentMethod: "cod",
        total: 200,
        email: "guest@example.test",
      },
      emailSent: true,
    },
  });
  assert.equal(
    state.commitGuestCodCalls,
    1,
    "guest COD commits stock at confirmation",
  );
  assert.equal(
    state.consumeDiscountCalls,
    1,
    "non-eSewa flows call consumeDiscountUsage (the service itself no-ops without a code)",
  );
  assert.equal(state.dispatchCalls.length, 1);
  assert.deepEqual(state.dispatchCalls[0].message, {
    kind: "order-confirmation",
    to: "guest@example.test",
    payload: { orderId: "order-mongo-1" },
    dedupeKey: "order-confirmation:order-mongo-1",
  });
  assert.equal(
    state.dispatchCalls[0].opts,
    undefined,
    "direct mode dispatches without a session, after commit",
  );
  assert.equal(state.sessionCommits, 1);
  assert.equal(state.createdOrder.stockDeducted, true);
  assert.equal(state.createdOrder.orderStatus, "confirmed");
});

test("AR-31e guest COD (outbox mode): email queued in-session, emailSent:false + emailStatus", async () => {
  reset();
  state.outboxMode = true;
  const { res, next } = await run(
    controller.guestCheckout,
    guestReq({ paymentMethod: "cod" }),
  );
  assert.equal(next.error, undefined);
  assert.equal(res.body.data.emailSent, false);
  assert.equal(res.body.data.emailStatus, "queued");
  assert.equal(state.dispatchCalls.length, 1);
  assert.ok(
    state.dispatchCalls[0].opts && state.dispatchCalls[0].opts.session,
    "outbox dispatch carries the transaction session",
  );
});

test("AR-31e guest eSewa: pinned branch response, no stock commit, no usage consume", async () => {
  reset();
  const { res, next } = await run(
    controller.guestCheckout,
    guestReq({ paymentMethod: "esewa", discountCode: "save10" }),
  );
  assert.equal(
    next.error,
    undefined,
    `unexpected: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Order created. Proceed to payment.");
  assert.deepEqual(res.body.data.order, { orderId: "ORD-TEST-1", total: 180 }); // 200 - 10% (lowercase code resolved)
  assert.equal(res.body.data.esewa.transaction_uuid, "ORD-TEST-1");
  assert.equal(res.body.data.esewa.total_amount, "180.00");
  assert.equal(res.body.data.esewa.product_code, "TEST");
  assert.equal(state.commitGuestCodCalls, 0);
  assert.equal(
    state.consumeDiscountCalls,
    0,
    "eSewa consumes discount usage only at capture",
  );
  assert.equal(state.sessionCommits, 1);
  assert.deepEqual(state.createPayload.discountCode, {
    code: "SAVE10",
    percentage: 10,
  });
});

test("AR-31e auth COD: response shape identical to guest COD; stock via bulkWrite; cart cleared", async () => {
  reset();
  const { res, next } = await run(
    controller.authenticatedCheckout,
    authReq({ paymentMethod: "cod" }),
  );
  assert.equal(
    next.error,
    undefined,
    `unexpected: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    success: true,
    message: "Order placed successfully!",
    data: {
      order: {
        orderId: "ORD-TEST-1",
        orderStatus: "confirmed",
        paymentMethod: "cod",
        total: 100,
        email: "buyer@example.test",
      },
      emailSent: true,
    },
  });
  assert.equal(state.bulkWriteCalls, 1, "auth COD deducts stock at placement");
  assert.equal(
    state.commitGuestCodCalls,
    0,
    "auth flow never uses the guest stock commit",
  );
  assert.equal(state.cartSaveCalls, 1);
  assert.equal(cartDoc.items.length, 0, "purchased cart items are cleared");
  assert.equal(state.dispatchCalls.length, 1);
  assert.equal(state.dispatchCalls[0].message.to, "buyer@example.test");
});

test("AR-31e auth eSewa: pinned branch response; no bulkWrite, no cart clear", async () => {
  reset();
  const { res, next } = await run(
    controller.authenticatedCheckout,
    authReq({ paymentMethod: "esewa" }),
  );
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.message, "Order created. Proceed to payment.");
  assert.deepEqual(res.body.data.order, { orderId: "ORD-TEST-1", total: 100 });
  assert.equal(res.body.data.esewa.transaction_uuid, "ORD-TEST-1");
  assert.equal(state.bulkWriteCalls, 0);
  assert.equal(state.cartSaveCalls, 0);
  assert.equal(cartDoc.items.length, 1, "cart is NOT cleared for eSewa");
});

test("AR-31e checkout discount verdicts: lowercase resolves; unknown -> 'Invalid or expired discount code' 400 (both flows)", async () => {
  reset();
  const ok = await run(
    controller.authenticatedCheckout,
    authReq({ paymentMethod: "cod", discountCode: "save10" }),
  );
  assert.equal(ok.next.error, undefined);
  assert.equal(state.createPayload.subtotal, 100);
  assert.equal(state.createPayload.discountAmount, 10);
  assert.equal(state.createPayload.total, 90);
  assert.deepEqual(state.createPayload.discountCode, {
    code: "SAVE10",
    percentage: 10,
  });
  assert.equal(
    state.consumeDiscountCalls,
    1,
    "COD consumes discount usage at placement/confirmation",
  );

  reset();
  const badAuth = await run(
    controller.authenticatedCheckout,
    authReq({ paymentMethod: "cod", discountCode: "nope" }),
  );
  assert.equal(badAuth.next.error.message, "Invalid or expired discount code");
  assert.equal(badAuth.next.error.statusCode, 400);

  reset();
  const badGuest = await run(
    controller.guestCheckout,
    guestReq({ paymentMethod: "cod", discountCode: "nope" }),
  );
  assert.equal(badGuest.next.error.message, "Invalid or expired discount code");
  assert.equal(badGuest.next.error.statusCode, 400);
});
