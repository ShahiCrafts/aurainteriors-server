// SSRF + content class: B-08 (fetch private-IP guard),
// B-09 (ingestion fetch bounds), B-29 (return-request
// conditional writes).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("./helpers");

// ---------- B-08 ----------
const { isPrivateIp, assertPublicHost } = require("../../utils/guardedFetch");

test("B-08: private/reserved IP ranges are recognised", () => {
  for (const ip of [
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "127.0.0.1",
    "169.254.1.1",
    "0.0.0.0",
    "::1",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "224.0.0.1",
  ]) {
    assert.equal(isPrivateIp(ip), true, `${ip} should be non-public`);
  }
  for (const ip of [
    "8.8.8.8",
    "1.1.1.1",
    "172.15.0.1",
    "172.32.0.1",
    "193.168.1.1",
    "2606:4700:4700::1111",
  ]) {
    assert.equal(isPrivateIp(ip), false, `${ip} should be public`);
  }
});

test("B-08: assertPublicHost rejects loopback hosts and IP literals", async () => {
  await assert.rejects(() => assertPublicHost("localhost"), /SSRF guard/);
  await assert.rejects(() => assertPublicHost("127.0.0.1"), /SSRF guard/);
  await assert.rejects(() => assertPublicHost("192.168.0.10"), /SSRF guard/);
  await assertPublicHost("8.8.8.8"); // public literal passes without DNS
});

// ---------- B-29 ----------
let orderFindOneAndUpdate;
let orderDoc;
function orderQuery(doc) {
  return makeQuery(doc);
}
stubModule("models/order.model.js", {
  findOne: () => orderQuery(orderDoc),
  findById: () => orderQuery(orderDoc),
  findOneAndUpdate: (filter, update, options) => {
    orderFindOneAndUpdate = { filter, update, options };
    return orderQuery(
      orderDoc
        ? {
            ...orderDoc,
            returnRequest: {
              ...(orderDoc.returnRequest || {}),
              status: "requested",
            },
          }
        : null,
    );
  },
});
stubModule("models/cart.model.js", {});
stubModule("models/product.model.js", {});
stubModule("models/discount.model.js", {});
stubModule("models/address.model.js", {});
stubModule("services/discountUsage.service.js", {
  consumeDiscountUsage: async () => {},
});
stubModule("services/orderTransition.service.js", {
  transitionOrder: async () => {},
});
stubModule("services/email.service.js", {
  sendOrderConfirmationEmail: async () => {},
});
stubModule("services/esewaCapture.service.js", {
  captureEsewaPayment: async () => {},
});
const orderController = require("../../controllers/order.controller");

function deliveredOrder() {
  return {
    _id: "507f1f77bcf86cd799439011",
    orderId: "ORD-1",
    user: {
      _id: "507f1f77bcf86cd799439012",
      firstName: "A",
      lastName: "B",
      email: "a@example.com",
    },
    orderStatus: "delivered",
    deliveredAt: new Date(),
    updatedAt: new Date(),
    returnRequest: { status: "none" },
    paymentStatus: "paid",
    async save() {
      this._saved = true;
      return this;
    },
    addStatusHistory() {},
  };
}

test("B-29: requesting a return is a conditional atomic write guarded by order state", async () => {
  orderDoc = deliveredOrder();
  orderFindOneAndUpdate = undefined;
  const res = mockRes();
  const next = mockNext();
  orderController.requestReturn(
    {
      params: { id: orderDoc._id },
      user: { _id: orderDoc.user._id },
      body: { reason: "Changed mind" },
    },
    res,
    next,
  );
  await until(() => res.statusCode !== undefined || next.error);
  assert.equal(next.error, undefined, next.error && next.error.message);
  assert.equal(res.statusCode, 200);
  assert.ok(
    orderFindOneAndUpdate,
    "the write must go through findOneAndUpdate",
  );
  assert.equal(
    orderFindOneAndUpdate.filter.orderStatus,
    "delivered",
    "the state guard must be in the write filter",
  );
  assert.ok(
    JSON.stringify(orderFindOneAndUpdate.filter).includes(
      "returnRequest.status",
    ),
    "the no-pending-return guard must be in the write filter",
  );
  assert.equal(
    orderDoc._saved,
    undefined,
    "the pre-read document must not be save()d back",
  );
});

test("B-29: processing a return is a conditional atomic write (no double-processing)", async () => {
  orderDoc = deliveredOrder();
  orderDoc.returnRequest = {
    status: "requested",
    reason: "Changed mind",
    requestedAt: new Date(),
  };
  orderFindOneAndUpdate = undefined;
  const res = mockRes();
  const next = mockNext();
  orderController.processReturnRequest(
    {
      params: { id: orderDoc._id },
      body: { status: "approved", adminNote: "OK" },
    },
    res,
    next,
  );
  await until(() => res.statusCode !== undefined || next.error);
  assert.equal(next.error, undefined, next.error && next.error.message);
  assert.equal(res.statusCode, 200);
  assert.ok(
    orderFindOneAndUpdate,
    "the write must go through findOneAndUpdate",
  );
  assert.equal(
    orderFindOneAndUpdate.filter["returnRequest.status"],
    "requested",
    "the pending-state guard must be in the write filter",
  );
  assert.equal(
    orderFindOneAndUpdate.update.$set["returnRequest.status"],
    "approved",
  );
  assert.equal(
    orderFindOneAndUpdate.update.$set.refundRequest.status,
    "pending",
    "paid orders get a pending refund request on approval",
  );
  assert.equal(
    orderDoc._saved,
    undefined,
    "the pre-read document must not be save()d back",
  );
});
