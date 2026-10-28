// AR-01 regression test, converted from the architecture review's executed
// PoC (audit/arch/bench/cart-add-poc.js). addToCart's FA-47 guarded write
// referenced `cartVersion`, which was never declared in addToCart (the
// snapshot line exists in getCart and updateCartItem but was not copied
// here), so every add-to-cart that passed the stock checks threw
// ReferenceError: cartVersion is not defined and 500'd.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes, mockNext, until } = require("./helpers");

const product = {
  _id: "64b64c2f4f5a6b7c8d9e0f11",
  name: "Sofa",
  price: 100,
  stock: 10,
  status: "active",
  deletedAt: null,
};

let cart;
let updateOneCalls;
let matchedCount;

function populateStub() {
  for (const item of cart.items) item.product = product;
  return Promise.resolve(cart);
}

stubModule("models/product.model", { findOne: async () => product });
stubModule("models/cart.model", {
  findOne: async () => cart,
  create: async (doc) => {
    cart = { _id: "c-new", __v: 0, items: [], populate: populateStub, ...doc };
    return cart;
  },
  updateOne: async (filter, update) => {
    updateOneCalls.push({ filter, update });
    return { matchedCount };
  },
});

const ctrl = require("../../controllers/cart.controller");

function freshCart() {
  updateOneCalls = [];
  matchedCount = 1;
  cart = { _id: "c1", user: "u1", __v: 3, items: [], populate: populateStub };
}

const req = () => ({
  user: { _id: "u1" },
  body: { productId: product._id, quantity: 1 },
});

test("AR-01: addToCart success path completes the guarded write with the version it read", async () => {
  freshCart();
  const res = mockRes();
  const next = mockNext();
  ctrl.addToCart(req(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `addToCart must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.cart.totalItems, 1);
  assert.equal(updateOneCalls.length, 1, "guarded write executed exactly once");
  assert.equal(
    updateOneCalls[0].filter.__v,
    3,
    "guard uses the version snapshot taken at read time",
  );
  assert.equal(cart.__v, 4, "local version bumped after a matched write");
});

test("AR-01: addToCart returns 409 (not a crash) when the cart changed under it", async () => {
  freshCart();
  matchedCount = 0;
  const res = mockRes();
  const next = mockNext();
  ctrl.addToCart(req(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.ok(next.error, "version conflict must surface as an error");
  assert.equal(next.error.statusCode, 409);
  assert.match(next.error.message, /updated in another request/);
});
