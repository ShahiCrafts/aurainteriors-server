// B-24 — saved billing address is ignored at authenticated checkout.
// Root cause: the billing Address.findOne spreads `...identity` AFTER
// `_id: billingAddressId`; checkoutIdentity() returns its own `_id`
// (plus idempotencyKey/requestHash, which are not Address fields),
// so the query can never match a real Address and the code silently
// falls back to billing = shipping.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery, mockRes, mockNext, until } = require("./helpers");

const USER_ID = "111111111111111111111111";
const SHIP_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const BILL_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

const addresses = [
  { _id: SHIP_ID, user: USER_ID, fullName: "Ship Person", phone: "9800000001", addressLine1: "1 Ship St", city: "Kathmandu", postalCode: "44600", country: "NP" },
  { _id: BILL_ID, user: USER_ID, fullName: "Bill Person", phone: "9800000002", addressLine1: "9 Bill Ave", city: "Pokhara", postalCode: "33700", country: "NP" },
];

// Emulates real DB matching: a document matches only if EVERY filter
// field equals the document's field (extra filter fields match nothing).
function matches(doc, filter) {
  return Object.entries(filter).every(([k, v]) => doc[k] === v);
}

let createdOrder;
stubModule("models/address.model.js", {
  findOne: (filter) => makeQuery(addresses.find((a) => matches(a, filter)) || null),
});
stubModule("models/cart.model.js", {
  findOne: () => makeQuery({
    items: [{ _id: "cccccccccccccccccccccccc", product: "dddddddddddddddddddddddd", quantity: 1, variant: null }],
    save: async () => {},
  }),
});
stubModule("models/product.model.js", { bulkWrite: async () => ({ modifiedCount: 1 }) });
stubModule("models/discount.model.js", { findOne: () => makeQuery(null) });
stubModule("models/order.model.js", {
  findOne: () => makeQuery(null), // replayCheckout: no existing order
  create: async (docs) => {
    createdOrder = {
      ...docs[0],
      orderId: "ORD-TEST-1",
      save: async () => {},
      addStatusHistory() {},
    };
    return [createdOrder];
  },
});
stubModule("services/checkoutItems.service.js", {
  prepareOrderItems: async (items) => items.map((i) => ({ product: i.productId, quantity: i.quantity, price: 100 })),
});
stubModule("services/discountUsage.service.js", { consumeDiscountUsage: async () => {} });
stubModule("services/orderTransition.service.js", { transitionOrder: async () => {} });
stubModule("services/email.service.js", { sendOrderConfirmationEmail: async () => true });
stubModule("services/esewaCapture.service.js", { captureEsewaPayment: async () => {} });
stubModule("services/esewaVerification.service.js", {
  getEsewaConfig: () => ({ secretKey: "test-only", merchantId: "TEST", paymentUrl: "https://example.invalid/pay" }),
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

const controller = require("../../controllers/order.controller");

function checkoutReq(body) {
  return {
    user: { _id: USER_ID, email: "buyer@example.test", firstName: "Buy", lastName: "Er", phone: "9800000000" },
    body,
    get: (h) => (h === "Idempotency-Key" ? "test-idempotency-key-0001" : undefined),
  };
}

test("B-24: distinct saved billing address is used at checkout", async () => {
  createdOrder = undefined;
  const res = mockRes(); const next = mockNext();
  controller.authenticatedCheckout(
    checkoutReq({ shippingAddressId: SHIP_ID, billingAddressId: BILL_ID, useSameAddress: false, paymentMethod: "cod" }),
    res, next,
  );
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined, `unexpected error: ${next.error && next.error.message}`);
  assert.equal(res.statusCode, 201);
  assert.ok(createdOrder, "order should have been created");
  assert.equal(createdOrder.shippingAddress.fullName, "Ship Person");
  assert.equal(createdOrder.billingAddress.fullName, "Bill Person",
    "billing address must be the saved billing address, not a copy of shipping");
  assert.equal(createdOrder.billingAddress.addressLine1, "9 Bill Ave");
});

test("B-24: unknown billingAddressId is rejected, not silently replaced by shipping", async () => {
  createdOrder = undefined;
  const res = mockRes(); const next = mockNext();
  controller.authenticatedCheckout(
    checkoutReq({ shippingAddressId: SHIP_ID, billingAddressId: "eeeeeeeeeeeeeeeeeeeeeeee", useSameAddress: false, paymentMethod: "cod" }),
    res, next,
  );
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.ok(next.error, "expected an error for a billing address that does not exist");
  assert.equal(next.error.statusCode, 404);
  assert.equal(createdOrder, undefined, "no order should be created");
});

test("characterization: useSameAddress=true bills to the shipping address", async () => {
  createdOrder = undefined;
  const res = mockRes(); const next = mockNext();
  controller.authenticatedCheckout(
    checkoutReq({ shippingAddressId: SHIP_ID, useSameAddress: true, paymentMethod: "cod" }),
    res, next,
  );
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(createdOrder.billingAddress.fullName, "Ship Person");
});
