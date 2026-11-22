// Batch 4 (Store Operations) — order-side tests:
//   (1) Order.buildOrderId: no prefix = the historical format
//       ("AU" + base36 timestamp + 8-char CSPRNG suffix); a configured
//       prefix is prepended to that same generated id.
//   (2) calculateOrderTotals PARITY at default settings: the same
//       fixture totals the pre-Batch-4 hardcoded logic produced
//       (shippingCost 0, tax 0, total = subtotal - discount).
//   (3) calculateOrderTotals with configured commerce: zone delivery
//       fees, free-shipping threshold boundary, VAT on/off, minimum
//       order rejection, discount interaction.
//
// The controller is loaded with its heavy dependencies stubbed
// through require.cache (tests/audit/helpers pattern), no mongod.
process.env.FRONTEND_URL =
  process.env.FRONTEND_URL || "https://frontend.example.test";
process.env.BACKEND_URL =
  process.env.BACKEND_URL || "https://backend.example.test";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const repo = path.resolve(__dirname, "../..");
const abs = (rel) => path.join(repo, rel);
const { stubModule } = require("../audit/helpers");
const { DEFAULT_SETTINGS } = require(abs("services/settings/defaults"));

// ---------- (1) order id ----------

test("buildOrderId: default format is AU + base36 timestamp + 8-char suffix", () => {
  const Order = require(abs("models/order.model"));
  const id = Order.buildOrderId("");
  assert.match(id, /^AU[0-9A-Z]{8}[0-9A-Z]{8}$/);
  const prefixed = Order.buildOrderId("#GUC");
  assert.ok(prefixed.startsWith("#GUCAU"));
  assert.equal(prefixed.length, id.length + 4);
  // Suffixes are random per call.
  assert.notEqual(Order.buildOrderId(""), Order.buildOrderId(""));
});

// ---------- controller seam ----------
// models/order.model.js is deliberately NOT stubbed: the controller
// only touches Order.buildOrderId in the seam under test, and the
// real static is what the prefix assertions should exercise.
stubModule("models/cart.model.js", {});
stubModule("models/product.model.js", {});
stubModule("models/address.model.js", {});
stubModule("utils/checkoutIdentity.js", { checkoutIdentity: () => null });
stubModule("services/discountUsage.service.js", {
  consumeDiscountUsage: async () => {},
});
stubModule("services/orderTransition.service.js", {
  transitionOrder: async () => {},
  commitGuestCodStock: async () => {},
});
stubModule("services/emailOutbox.service.js", { dispatchEmail: async () => {} });
stubModule("services/stockReservation.service.js", {
  isEnabled: () => false,
  reserveForOrder: async () => {},
  consumeForOrder: async () => {},
});
stubModule("services/esewaCapture.service.js", {
  captureEsewaPayment: async () => {},
});
stubModule("services/notificationEventEmitter.js", { emit: () => {} });
stubModule("services/esewaVerification.service.js", {
  getEsewaConfig: () => ({}),
  getEsewaConfigAsync: async () => ({}),
  verifyEsewaSignature: () => true,
  verifyEsewaPayment: async () => ({}),
  verifyEsewaRefund: async () => ({}),
});
stubModule("services/checkoutItems.service.js", {
  prepareOrderItems: async (items) => items,
});
stubModule("services/discountResolution.service.js", {
  resolveDiscountForCheckout: async (code) => ({
    code,
    discountPercentage: 10,
  }),
  evaluateDiscount: (discount, subtotal) => ({
    validation: { valid: true },
    discountAmount: Math.round((subtotal * discount.discountPercentage) / 100),
  }),
});

const controller = require(abs("controllers/order.controller"));
const { calculateOrderTotals, orderIdForCommerce } = controller._internal;

const ITEMS = [
  { price: 1000, quantity: 2 },
  { price: 500, quantity: 1 },
]; // subtotal 2500
const VALLEY = { city: "Kathmandu", state: "Bagmati", country: "Nepal" };
const ELSEWHERE = { city: "Pokhara", state: "Gandaki", country: "Nepal" };

const commerceWith = (overrides = {}) => {
  const base = structuredClone(DEFAULT_SETTINGS.commerce);
  return {
    ...base,
    ...overrides,
    shipping: { ...base.shipping, ...(overrides.shipping || {}) },
    tax: { ...base.tax, ...(overrides.tax || {}) },
    orders: { ...base.orders, ...(overrides.orders || {}) },
  };
};
const pricedCommerce = () =>
  commerceWith({
    freeShippingThreshold: 5000,
    shipping: {
      zones: [
        { name: "Kathmandu Valley", rate: 150, enabled: true },
        { name: "Other Nepal", rate: 300, enabled: true },
        { name: "International", rate: 1000, enabled: false },
      ],
    },
  });

// ---------- (2) parity at defaults ----------

test("PARITY: default settings reproduce the pre-Batch-4 totals exactly", async () => {
  // No commerce passed and no DB: the resolver falls back to the
  // shipped defaults — the exact path production takes before an
  // admin saves anything.
  const totals = await calculateOrderTotals(ITEMS, null, null, VALLEY);
  assert.deepEqual(totals, {
    subtotal: 2500,
    discountAmount: 0,
    discountInfo: null,
    shippingCost: 0,
    tax: 0,
    total: 2500,
  });

  // Explicit default commerce: same numbers for a non-valley address.
  const explicit = await calculateOrderTotals(
    ITEMS,
    null,
    null,
    ELSEWHERE,
    structuredClone(DEFAULT_SETTINGS.commerce),
  );
  assert.deepEqual(explicit, totals);
});

test("PARITY: discount at defaults — total = subtotal - discount, nothing else", async () => {
  const totals = await calculateOrderTotals(
    ITEMS,
    "SAVE10",
    null,
    VALLEY,
    structuredClone(DEFAULT_SETTINGS.commerce),
  );
  assert.equal(totals.discountAmount, 250);
  assert.equal(totals.shippingCost, 0);
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 2250);
});

// ---------- (3) configured commerce ----------

test("totals: zone delivery fee by address, free at the threshold boundary", async () => {
  const c = pricedCommerce();
  const valley = await calculateOrderTotals(ITEMS, null, null, VALLEY, c);
  assert.equal(valley.shippingCost, 150);
  assert.equal(valley.total, 2650);

  const other = await calculateOrderTotals(ITEMS, null, null, ELSEWHERE, c);
  assert.equal(other.shippingCost, 300);

  const bigOrder = [{ price: 5000, quantity: 1 }];
  const free = await calculateOrderTotals(bigOrder, null, null, VALLEY, c);
  assert.equal(free.shippingCost, 0);
  const justBelow = [{ price: 4999, quantity: 1 }];
  const paid = await calculateOrderTotals(justBelow, null, null, VALLEY, c);
  assert.equal(paid.shippingCost, 150);
});

test("totals: VAT applies to the discounted goods amount when enabled", async () => {
  const c = commerceWith({
    tax: { vatEnabled: true, vatRate: 13 },
    shipping: { zones: pricedCommerce().shipping.zones },
    freeShippingThreshold: 5000,
  });
  const totals = await calculateOrderTotals(ITEMS, null, null, VALLEY, c);
  assert.equal(totals.tax, 325); // 13% of 2500
  assert.equal(totals.total, 2500 + 150 + 325);

  const discounted = await calculateOrderTotals(ITEMS, "SAVE10", null, VALLEY, c);
  assert.equal(discounted.tax, 292.5); // 13% of (2500 - 250)
});

test("totals: minimum order amount rejects below, allows at the boundary", async () => {
  const c = commerceWith({ orders: { minimumOrderAmount: 2500 } });
  await assert.rejects(
    calculateOrderTotals([{ price: 100, quantity: 1 }], null, null, VALLEY, c),
    (err) => err.statusCode === 400 && /Minimum order amount/.test(err.message),
  );
  const atBoundary = await calculateOrderTotals(ITEMS, null, null, VALLEY, c);
  assert.equal(atBoundary.total, 2500);
});

test("orderIdForCommerce: no prefix → undefined (model hook decides); prefix → prefixed id", () => {
  assert.equal(orderIdForCommerce(structuredClone(DEFAULT_SETTINGS.commerce)), undefined);
  assert.equal(orderIdForCommerce(commerceWith({})), undefined);
  const prefixed = orderIdForCommerce(
    commerceWith({ orders: { orderPrefix: "#GUC" } }),
  );
  assert.match(prefixed, /^#GUCAU[0-9A-Z]{16}$/);
});
