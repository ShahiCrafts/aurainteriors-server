// AR-26 — FA-47's optimistic-concurrency guard covered addToCart and
// updateCartItem only; removeFromCart / clearCart still wrote with a
// plain save() (whole-array last-writer-wins), and GET /cart performed
// writes (create-on-GET + prune-on-GET). These tests pin:
//   1. remove/clear write through the SAME guarded updateOne helper as
//      add/update (version filter; conflict -> 409, never a silent save).
//   2. CART_GET_READONLY=on: GET /cart performs NO writes at all — no
//      create for a missing cart (responds with an empty cart, _id null)
//      and no persisted prune (the response still excludes stale items).
//   3. Default (flag unset): GET /cart behavior is byte-identical to the
//      pre-fix behavior (create + persisted prune).
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("./helpers");

const product = {
  _id: "64b64c2f4f5a6b7c8d9e0f11",
  name: "Sofa",
  price: 100,
  stock: 10,
  status: "active",
  deletedAt: null,
};

let cart;
let calls;

function freshState({ withCart = true, items = [] } = {}) {
  calls = { create: 0, save: 0, updateOne: [] };
  cart = withCart
    ? {
        _id: "c1",
        user: "u1",
        __v: 5,
        items,
        save: async () => {
          calls.save++;
          return cart;
        },
        populate: async () => cart,
      }
    : null;
}

stubModule("models/product.model", { findOne: async () => product });
stubModule("models/cart.model", {
  findOne: () => makeQuery(cart),
  create: async (doc) => {
    calls.create++;
    cart = {
      _id: "c-new",
      __v: 0,
      items: [],
      save: async () => {
        calls.save++;
        return cart;
      },
      populate: async () => cart,
      ...doc,
    };
    return cart;
  },
  updateOne: async (filter, update) => {
    calls.updateOne.push({ filter, update });
    return { matchedCount: matchedCountSetting };
  },
});
let matchedCountSetting = 1;

const ctrl = require("../../controllers/cart.controller");
const req = (extra = {}) => ({
  user: { _id: "u1" },
  body: {},
  params: {},
  ...extra,
});

async function settle(res, next) {
  await until(() => res.body !== undefined || next.error !== undefined);
}

test("AR-26: removeFromCart writes via the guarded updateOne (no plain save)", async () => {
  freshState({
    items: [
      { _id: "i1", product, quantity: 1 },
      { _id: "i2", product, quantity: 2 },
    ],
  });
  matchedCountSetting = 1;
  const res = mockRes();
  const next = mockNext();
  ctrl.removeFromCart(req({ params: { itemId: "i1" } }), res, next);
  await settle(res, next);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(calls.save, 0, "removeFromCart must not use plain save()");
  assert.equal(calls.updateOne.length, 1, "exactly one guarded write");
  assert.equal(
    calls.updateOne[0].filter.__v,
    5,
    "guard uses the version read at load time",
  );
  assert.equal(calls.updateOne[0].update.$set.items.length, 1);
  assert.equal(res.body.data.cart.totalItems, 2);
});

test("AR-26: removeFromCart conflict surfaces 409 (same contract as add/update)", async () => {
  freshState({ items: [{ _id: "i1", product, quantity: 1 }] });
  matchedCountSetting = 0;
  const res = mockRes();
  const next = mockNext();
  ctrl.removeFromCart(req({ params: { itemId: "i1" } }), res, next);
  await settle(res, next);
  assert.ok(
    next.error,
    "conflict must surface as an error, not a silent overwrite",
  );
  assert.equal(next.error.statusCode, 409);
});

test("AR-26: clearCart writes via the guarded updateOne; conflict -> 409", async () => {
  freshState({ items: [{ _id: "i1", product, quantity: 1 }] });
  matchedCountSetting = 1;
  const res = mockRes();
  const next = mockNext();
  ctrl.clearCart(req(), res, next);
  await settle(res, next);
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.save, 0);
  assert.equal(calls.updateOne.length, 1);
  assert.deepEqual(calls.updateOne[0].update.$set.items, []);

  freshState({ items: [{ _id: "i1", product, quantity: 1 }] });
  matchedCountSetting = 0;
  const res2 = mockRes();
  const next2 = mockNext();
  ctrl.clearCart(req(), res2, next2);
  await settle(res2, next2);
  assert.ok(next2.error, "clearCart conflict must surface");
  assert.equal(next2.error.statusCode, 409);
});

test("AR-26 characterization: GET /cart with flag unset keeps create-on-GET", async () => {
  delete process.env.CART_GET_READONLY;
  freshState({ withCart: false });
  const res = mockRes();
  const next = mockNext();
  ctrl.getCart(req(), res, next);
  await settle(res, next);
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.create, 1, "default behavior: a missing cart is created");
  assert.equal(res.body.data.cart._id, "c-new");
});

test("AR-26: CART_GET_READONLY=on - GET never writes (no create, empty-cart response)", async () => {
  process.env.CART_GET_READONLY = "on";
  try {
    freshState({ withCart: false });
    const res = mockRes();
    const next = mockNext();
    ctrl.getCart(req(), res, next);
    await settle(res, next);
    assert.equal(
      next.error,
      undefined,
      `unexpected error: ${next.error && next.error.message}`,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(calls.create, 0, "GET must not create a cart document");
    assert.equal(calls.save, 0, "GET must not save");
    assert.equal(res.body.data.cart._id, null);
    assert.deepEqual(res.body.data.cart.items, []);
    assert.equal(res.body.data.cart.totalItems, 0);
    assert.equal(res.body.data.cart.subtotal, 0);
  } finally {
    delete process.env.CART_GET_READONLY;
  }
});

test("AR-26: CART_GET_READONLY=on - stale items excluded from response but NOT pruned in storage", async () => {
  process.env.CART_GET_READONLY = "on";
  try {
    freshState({
      items: [
        { _id: "i1", product: null, quantity: 1 },
        { _id: "i2", product, quantity: 2 },
      ],
    });
    const res = mockRes();
    const next = mockNext();
    ctrl.getCart(req(), res, next);
    await settle(res, next);
    assert.equal(next.error, undefined);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.save, 0, "GET must not persist the prune");
    assert.equal(cart.items.length, 2, "stored cart is untouched");
    assert.equal(
      res.body.data.cart.items.length,
      1,
      "response still excludes the stale item",
    );
    assert.equal(res.body.data.cart.subtotal, 200);
  } finally {
    delete process.env.CART_GET_READONLY;
  }
});

test("AR-26 characterization: flag unset - stale items are pruned AND persisted, as before", async () => {
  delete process.env.CART_GET_READONLY;
  freshState({
    items: [
      { _id: "i1", product: null, quantity: 1 },
      { _id: "i2", product, quantity: 2 },
    ],
  });
  const res = mockRes();
  const next = mockNext();
  ctrl.getCart(req(), res, next);
  await settle(res, next);
  assert.equal(next.error, undefined);
  assert.equal(calls.save, 1, "default behavior persists the prune");
  assert.equal(cart.items.length, 1);
  assert.equal(res.body.data.cart.subtotal, 200);
});
