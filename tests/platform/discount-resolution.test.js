// AR-31(a) characterization + regression tests for discount code resolution.
//
// Technique (mirrors tests/happy/controllers-auth-profile.test.js): stubModule() pre-populates
// require.cache BEFORE the controller is required. Unlike controllers-auth-profile, the
// Discount.findOne stub here is QUERY-FAITHFUL: it emulates Mongo matching
// against a stored document whose code is "SAVE10" (codes are stored
// uppercased by createDiscount/updateDiscount and by the schema's
// `uppercase: true`). A lookup only matches when the queried code equals the
// stored code exactly — which is what makes the pre-fix previewDiscount
// divergence (verbatim lookup) observable.
//
// Pre-fix behavior pinned by this file (fail-before evidence):
//   previewDiscount("save10") -> 400 "Invalid discount code"
//   applyDiscount("save10")   -> 200 (lookup uppercases first)
//   validateDiscount("save10")-> 200 valid:true
// Post-fix (sanctioned AR-31(a) change): preview accepts any casing and all
// three endpoints agree across the casing matrix. Every other response
// fixture in this file is byte-identical before/after the refactor.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("../audit/helpers");

// --- Stored discount document (as persisted: code already uppercase) ---
function makeStoredDiscount(overrides = {}) {
  return {
    _id: "discount-1",
    code: "SAVE10",
    description: "10% off",
    discountPercentage: 10,
    minimumOrderAmount: 0,
    maxUsageLimit: null,
    currentUsageCount: 0,
    expiryDate: new Date(Date.now() + 7 * 864e5),
    isActive: true,
    get isExpired() {
      return new Date() > this.expiryDate;
    },
    get isUsageLimitReached() {
      return this.maxUsageLimit
        ? this.currentUsageCount >= this.maxUsageLimit
        : false;
    },
    validateForCart(subtotal) {
      if (!this.isActive)
        return {
          valid: false,
          message: "This discount code is no longer active",
        };
      if (this.isExpired)
        return { valid: false, message: "This discount code has expired" };
      if (this.isUsageLimitReached)
        return {
          valid: false,
          message: "This discount code has reached its usage limit",
        };
      if (subtotal < this.minimumOrderAmount) {
        return {
          valid: false,
          message: `Minimum order amount of NRs. ${this.minimumOrderAmount} required`,
        };
      }
      return { valid: true, message: "Discount code is valid" };
    },
    calculateDiscount(subtotal) {
      return Math.round((subtotal * this.discountPercentage) / 100);
    },
    ...overrides,
  };
}

let storedDiscount = makeStoredDiscount();
const findOneCalls = [];

stubModule("models/discount.model", {
  // Query-faithful: matches only an exact code equality, like Mongo.
  findOne: async (filter) => {
    findOneCalls.push(filter);
    if (storedDiscount && filter && filter.code === storedDiscount.code)
      return storedDiscount;
    return null;
  },
  findById: () => makeQuery(null),
  findByIdAndDelete: async () => null,
  create: async (doc) => ({ _id: "discount-new", ...doc }),
});

const cartDoc = {
  _id: "cart-1",
  user: "u1",
  items: [
    {
      _id: "64b64c2f4f5a6b7c8d9e0f01",
      product: { _id: "64b64c2f4f5a6b7c8d9e0f11", name: "Sofa", price: 100 },
      quantity: 2,
      variant: {},
    },
  ],
};
stubModule("models/cart.model", { findOne: () => makeQuery(cartDoc) });
stubModule("services/checkoutItems.service", {
  prepareOrderItems: async (items) =>
    items.map((item) => ({
      product: item.productId || item.product,
      name: "Sofa",
      price: 100,
      quantity: item.quantity,
      variant: item.variant || {},
    })),
});

const discountCtrl = require("../../controllers/discount.controller");

async function run(handler, req) {
  const res = mockRes();
  const next = mockNext();
  handler(req, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  return { res, next };
}

const CASINGS = ["SAVE10", "save10", "Save10", "sAvE10"];

// ---------- The sanctioned fix: preview must agree with apply/validate ----------
test("AR-31a previewDiscount accepts any casing, identical verdict to apply/validate", async () => {
  storedDiscount = makeStoredDiscount();
  for (const code of CASINGS) {
    const preview = await run(discountCtrl.previewDiscount, {
      body: { code, items: [{ productId: "p1", quantity: 2 }] },
    });
    assert.equal(
      preview.next.error,
      undefined,
      `preview(${code}) must not error, got: ${preview.next.error && preview.next.error.message}`,
    );
    assert.equal(preview.res.statusCode, 200, `preview(${code})`);
    assert.deepEqual(preview.res.body, {
      status: "success",
      data: {
        discount: {
          code: "SAVE10",
          discountPercentage: 10,
          discountAmount: 20,
        },
        cart: { subtotal: 200, discountAmount: 20, total: 180 },
      },
    });

    const apply = await run(discountCtrl.applyDiscount, {
      user: { _id: "u1" },
      body: { code },
    });
    assert.equal(apply.next.error, undefined, `apply(${code}) must not error`);
    assert.equal(apply.res.statusCode, 200, `apply(${code})`);
    assert.equal(apply.res.body.data.discount.code, "SAVE10");
    assert.equal(apply.res.body.data.cart.total, 180);

    const validate = await run(discountCtrl.validateDiscount, {
      user: { _id: "u1" },
      params: { code },
    });
    assert.equal(
      validate.next.error,
      undefined,
      `validate(${code}) must not error`,
    );
    assert.equal(validate.res.statusCode, 200, `validate(${code})`);
    assert.equal(validate.res.body.data.valid, true, `validate(${code})`);
    assert.equal(validate.res.body.data.discount.code, "SAVE10");
  }
});

// ---------- Characterization: shapes/errors that must NOT change ----------
test("AR-31a applyDiscount response shape is pinned", async () => {
  storedDiscount = makeStoredDiscount();
  const { res, next } = await run(discountCtrl.applyDiscount, {
    user: { _id: "u1" },
    body: { code: "SAVE10" },
  });
  assert.equal(next.error, undefined);
  assert.deepEqual(res.body, {
    status: "success",
    data: {
      discount: {
        code: "SAVE10",
        description: "10% off",
        discountPercentage: 10,
        discountAmount: 20,
      },
      cart: { subtotal: 200, discountAmount: 20, total: 180 },
    },
  });
});

test("AR-31a applyDiscount without a code -> 400 'Please provide a discount code'", async () => {
  const { next } = await run(discountCtrl.applyDiscount, {
    user: { _id: "u1" },
    body: {},
  });
  assert.equal(next.error.message, "Please provide a discount code");
  assert.equal(next.error.statusCode, 400);
});

test("AR-31a unknown code -> 400 'Invalid discount code' on all three endpoints", async () => {
  storedDiscount = makeStoredDiscount();
  const apply = await run(discountCtrl.applyDiscount, {
    user: { _id: "u1" },
    body: { code: "NOPE99" },
  });
  assert.equal(apply.next.error.message, "Invalid discount code");
  assert.equal(apply.next.error.statusCode, 400);
  const validate = await run(discountCtrl.validateDiscount, {
    user: { _id: "u1" },
    params: { code: "NOPE99" },
  });
  assert.equal(validate.next.error.message, "Invalid discount code");
  assert.equal(validate.next.error.statusCode, 400);
  const preview = await run(discountCtrl.previewDiscount, {
    body: { code: "NOPE99", items: [{ productId: "p1", quantity: 1 }] },
  });
  assert.equal(preview.next.error.message, "Invalid discount code");
  assert.equal(preview.next.error.statusCode, 400);
});

test("AR-31a validateDiscount with a below-minimum cart -> 200 valid:false, discount:null", async () => {
  storedDiscount = makeStoredDiscount({ minimumOrderAmount: 5000 });
  const { res, next } = await run(discountCtrl.validateDiscount, {
    user: { _id: "u1" },
    params: { code: "SAVE10" },
  });
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: "success",
    data: {
      valid: false,
      message: "Minimum order amount of NRs. 5000 required",
      discount: null,
    },
  });
});

test("AR-31a applyDiscount with a below-minimum cart -> 400 with validateForCart message", async () => {
  storedDiscount = makeStoredDiscount({ minimumOrderAmount: 5000 });
  const { next } = await run(discountCtrl.applyDiscount, {
    user: { _id: "u1" },
    body: { code: "SAVE10" },
  });
  assert.equal(
    next.error.message,
    "Minimum order amount of NRs. 5000 required",
  );
  assert.equal(next.error.statusCode, 400);
});

test("AR-31a previewDiscount with a below-minimum subtotal -> 400 with validateForCart message", async () => {
  storedDiscount = makeStoredDiscount({ minimumOrderAmount: 5000 });
  const { next } = await run(discountCtrl.previewDiscount, {
    body: { code: "SAVE10", items: [{ productId: "p1", quantity: 2 }] },
  });
  assert.equal(
    next.error.message,
    "Minimum order amount of NRs. 5000 required",
  );
  assert.equal(next.error.statusCode, 400);
});

test("AR-31a authenticated previewDiscount response shape is pinned", async () => {
  storedDiscount = makeStoredDiscount();
  const { res, next } = await run(discountCtrl.previewDiscount, {
    user: { _id: "u1" },
    body: { code: "SAVE10", selectedItemIds: ["64b64c2f4f5a6b7c8d9e0f01"] },
  });
  assert.equal(next.error, undefined);
  assert.deepEqual(res.body, {
    status: "success",
    data: {
      discount: { code: "SAVE10", discountPercentage: 10, discountAmount: 20 },
      cart: { subtotal: 200, discountAmount: 20, total: 180 },
    },
  });
});
