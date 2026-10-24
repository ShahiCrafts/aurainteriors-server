// Owner-approved changes, 2026-10-23: FA-09 guest COD stock deferral.
// (FA-02 / FA-18 / FA-33 / FA-21 contract updates live in the batch 6,
// batch 2 and batch 9 files respectively.)
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const { stubModule, makeQuery } = require("../audit/helpers");

function loadTransition({ orderDoc, updateOneImpl }) {
  const calls = { updateOne: [], saved: false };
  const session = { withTransaction: async (fn) => { await fn(); }, endSession: async () => {} };
  const mongoosePath = stubModule("mongoose", { startSession: async () => session });
  const orderPath = stubModule("models/order.model.js", {
    findOne: () => makeQuery(orderDoc),
  });
  const productPath = stubModule("models/product.model.js", {
    updateOne: async (filter, update) => { calls.updateOne.push({ filter, update }); return updateOneImpl(filter, update); },
  });
  delete require.cache[path.join(repo, "services/orderTransition.service.js")];
  const svc = require(path.join(repo, "services/orderTransition.service.js"));
  return { svc, calls, cleanup() {
    delete require.cache[mongoosePath];
    delete require.cache[orderPath];
    delete require.cache[productPath];
    delete require.cache[path.join(repo, "services/orderTransition.service.js")];
  } };
}

function deferredGuestCodOrder() {
  return {
    _id: "o1", orderStatus: "pending", paymentMethod: "cod", paymentStatus: "pending",
    isGuestOrder: true, stockDeducted: false,
    items: [
      { product: "p1", quantity: 2 },
      { product: "p2", quantity: 1 },
    ],
    addStatusHistory(status) { this.orderStatus = status; },
    async save() { this._saved = true; },
  };
}

test("FA-09: confirming a deferred guest COD order deducts stock at confirmation", async () => {
  const orderDoc = deferredGuestCodOrder();
  const { svc, calls, cleanup } = loadTransition({ orderDoc, updateOneImpl: async () => ({ matchedCount: 1 }) });
  try {
    const { order } = await svc.transitionOrder({ _id: "o1" }, "confirmed", "verified by phone");
    assert.equal(calls.updateOne.length, 2, "one guarded deduction per item");
    assert.deepEqual(calls.updateOne[0].filter, { _id: "p1", stock: { $gte: 2 } });
    assert.deepEqual(calls.updateOne[0].update, { $inc: { stock: -2 } });
    assert.equal(order.stockDeducted, true);
    assert.equal(order._saved, true);
  } finally { cleanup(); }
});

test("FA-09: confirmation aborts with 409 when stock no longer suffices - nothing is saved", async () => {
  const orderDoc = deferredGuestCodOrder();
  const { svc, cleanup } = loadTransition({ orderDoc, updateOneImpl: async () => ({ matchedCount: 0 }) });
  try {
    await assert.rejects(() => svc.transitionOrder({ _id: "o1" }, "confirmed"), /Insufficient stock to confirm/);
    assert.equal(orderDoc._saved, undefined, "order was not saved");
  } finally { cleanup(); }
});

test("FA-09: cancelling a deferred guest COD order restores nothing (nothing was deducted)", async () => {
  const orderDoc = deferredGuestCodOrder();
  const { svc, calls, cleanup } = loadTransition({ orderDoc, updateOneImpl: async () => ({ matchedCount: 1 }) });
  try {
    await svc.transitionOrder({ _id: "o1" }, "cancelled", "customer asked");
    assert.equal(calls.updateOne.length, 0, "no stock movements for a never-deducted order");
    assert.equal(orderDoc.stockDeducted, false);
  } finally { cleanup(); }
});

test("FA-09: an already-deducted order is untouched by the confirmation hook", async () => {
  const orderDoc = deferredGuestCodOrder();
  orderDoc.isGuestOrder = false; // authenticated COD: deducted at placement
  orderDoc.stockDeducted = true;
  const { svc, calls, cleanup } = loadTransition({ orderDoc, updateOneImpl: async () => ({ matchedCount: 1 }) });
  try {
    await svc.transitionOrder({ _id: "o1" }, "confirmed");
    assert.equal(calls.updateOne.length, 0, "no second deduction");
  } finally { cleanup(); }
});
