// AR-36 — dbTools.getOrderHistory loaded a user's ENTIRE order
// history (no limit). It must be bounded to the most recent 20 orders
// (ORDER_HISTORY_LIMIT), lean, with a projection covering only the
// fields _formatOrder emits. AR-37 unit coverage lives in
// ar37-maxtime.test.js (same stubbing technique).
//
// The Order stub below emulates Mongo semantics for limit: the query
// records limit(n) and applies it when the query resolves.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

function makeOrder(i) {
  // i = age rank: 0 is the NEWEST order. createdAt descends with i.
  return {
    orderId: `ORD-${String(i).padStart(3, "0")}`,
    orderStatus: "delivered",
    paymentMethod: "cod",
    paymentStatus: "paid",
    total: 1000 + i,
    shippingAddress: {
      fullName: "Fixture User", phone: "9800000000", addressLine1: "1 Main St",
      addressLine2: "", city: "Kathmandu", country: "Nepal",
    },
    items: [{ name: `Item ${i}`, quantity: 1, price: 1000 + i }],
    createdAt: new Date(Date.UTC(2025, 5, 1) - i * 60000),
    // Fields the formatter must NOT leak even though the raw doc has them:
    paymentDetails: { transactionId: "should-not-leak" },
    adminNote: "internal",
  };
}

const MANY = Array.from({ length: 25 }, (_, i) => makeOrder(i)); // newest first
const FEW = [makeOrder(0), makeOrder(1), makeOrder(2)];
let fixture = MANY;
let lastFindRecord = null;
let lastFindOneRecord = null;

function capturingQuery(getRows, record) {
  const q = {
    sort() { record.sort = true; return q; },
    limit(n) { record.limit = n; return q; },
    select() { record.select = true; return q; },
    lean() { record.lean = true; return q; },
    populate() { return q; },
    maxTimeMS(n) { record.maxTimeMS = n; return q; },
    then(onFulfilled, onRejected) {
      let rows = getRows();
      if (Array.isArray(rows) && typeof record.limit === "number") rows = rows.slice(0, record.limit);
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
    catch(onRejected) { return Promise.resolve(getRows()).catch(onRejected); },
  };
  return q;
}

stubModule("models/order.model", {
  find: () => { lastFindRecord = {}; return capturingQuery(() => fixture, lastFindRecord); },
  findOne: () => { lastFindOneRecord = {}; return capturingQuery(() => fixture[0], lastFindOneRecord); },
});
stubModule("models/product.model", {});
stubModule("models/category.model", {});
stubModule("models/address.model", {});
stubModule("models/user.model", {});

const dbTools = require("../../services/dbTools");

test("AR-36: getOrderHistory is bounded to the 20 most recent orders", async () => {
  fixture = MANY;
  const out = await dbTools.getOrderHistory({ userId: "user-many" });
  assert.equal(lastFindRecord.limit, 20, "the query must carry limit(20)");
  assert.equal(lastFindRecord.lean, true, "the query must stay lean");
  assert.equal(out.length, 20, "a 25-order user gets exactly 20 orders back");
  assert.equal(out[0].orderId, "ORD-000", "newest order first");
  assert.equal(out[19].orderId, "ORD-019", "the 20 returned are the NEWEST 20");
});

test("AR-36: formatted output for a user with <=20 orders is byte-identical to the pre-fix formatter output", async () => {
  fixture = FEW;
  const out = await dbTools.getOrderHistory({ userId: "user-few" });
  const expected = FEW.map((o) => ({
    orderId: o.orderId,
    status: o.orderStatus,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    total: o.total,
    shippingAddress: {
      fullName: o.shippingAddress.fullName,
      phone: o.shippingAddress.phone,
      addressLine1: o.shippingAddress.addressLine1,
      addressLine2: o.shippingAddress.addressLine2,
      city: o.shippingAddress.city,
      country: o.shippingAddress.country,
    },
    items: o.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
    createdAt: o.createdAt,
  }));
  assert.equal(JSON.stringify(out), JSON.stringify(expected), "byte-identical formatted output for <=20 orders");
  assert.equal(out.length, 3);
});

test("AR-36: getOrderHistory still requires a user context", async () => {
  const out = await dbTools.getOrderHistory({ userId: null });
  assert.deepEqual(out, { error: "User context not available." });
});
