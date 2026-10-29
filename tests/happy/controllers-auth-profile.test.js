// Happy-path (success-path) controller tests — cluster A:
//   auth.controller:      getMe, logout, googleCallback
//   profile.controller:   updateProfile, updateAvatar, removeAvatar, updatePreferences
//   discount.controller:  previewDiscount, applyDiscount, validateDiscount,
//                         getDiscount, createDiscount, updateDiscount, deleteDiscount
//   order.controller:     esewaSuccess, esewaFailure, getOrderAdmin,
//                         reconcileRefund, cancelOrder, updateOrderStatus
//
// Technique (mirrors tests/audit/*): stubModule() pre-populates require.cache
// BEFORE the controllers are required, so every model/service is a fake and
// no DB / network is touched. Controllers wrapped in catchAsync do not
// return their promise, so tests poll with until().
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { stubModule, makeQuery, mockNext, until } = require("../audit/helpers");

// --- Environment the handlers need, set BEFORE requiring controllers ---
// (order.controller captures FRONTEND_URL at module load.)
process.env.JWT_SECRET = "happy-path-test-secret";
process.env.FRONTEND_URL = "https://frontend.example";
process.env.BACKEND_URL = "https://backend.example";
process.env.NODE_ENV = "test";
process.env.ESEWA_MERCHANT_ID = "EPAYTEST";
process.env.ESEWA_SECRET_KEY = "happy-path-esewa-secret";

const FRONTEND = "https://frontend.example";

// --- Extended mock response (helpers' mockRes has no cookie/redirect) ---
function mockResEx() {
  return {
    statusCode: undefined,
    body: undefined,
    cookies: {},
    clearedCookies: [],
    redirectUrl: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value, opts) {
      this.cookies[name] = { value, opts };
      return this;
    },
    clearCookie(name, opts) {
      this.clearedCookies.push({ name, opts });
      return this;
    },
    redirect(url) {
      this.redirectUrl = url;
      if (this.statusCode === undefined) this.statusCode = 302;
      return this;
    },
  };
}

// --- Mutable stub state: each test arranges the fakes it needs ---
const state = {
  userById: null,
  userUpdated: null,
  discountFindOne: null,
  discountById: null,
  orderFindOne: null,
  orderById: null,
  orderUpdated: null,
  transitionResult: null,
  deletedFromCloudinary: [],
  revokedUpdateCalls: [],
  emitted: [],
  transitionCalls: [],
};

function makeDiscount(overrides = {}) {
  return {
    _id: "discount-1",
    code: "SAVE10",
    description: "10% off",
    discountPercentage: 10,
    minimumOrderAmount: 0,
    maxUsageLimit: null,
    expiryDate: new Date(Date.now() + 7 * 864e5),
    isActive: true,
    validateForCart: () => ({ valid: true, message: "Discount is valid" }),
    calculateDiscount: (subtotal) => Math.round(subtotal * 0.1),
    save: async function () {
      return this;
    },
    ...overrides,
  };
}

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

function makeOrder(overrides = {}) {
  return {
    _id: "order-mongo-1",
    orderId: "ORD-1001",
    user: "u1",
    isGuestOrder: false,
    guestInfo: {
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
      phone: "9800000000",
    },
    items: [
      {
        product: "64b64c2f4f5a6b7c8d9e0f11",
        name: "Sofa",
        price: 100,
        quantity: 2,
      },
    ],
    subtotal: 200,
    discountAmount: 0,
    shippingCost: 0,
    tax: 0,
    total: 200,
    paymentMethod: "cod",
    paymentStatus: "paid",
    orderStatus: "pending",
    trackingNumber: null,
    ...overrides,
  };
}

// --- Module stubs (must precede every controller require) ---
stubModule("models/user.model", {
  findById: async () => state.userById,
  findByIdAndUpdate: async () => state.userUpdated,
  findOne: async () => state.userById,
  findOneAndUpdate: async () => state.userUpdated,
});
stubModule("models/revokedToken.model", {
  updateOne: async (...args) => {
    state.revokedUpdateCalls.push(args);
    return { matchedCount: 1, upsertedCount: 1 };
  },
  exists: async () => null,
});
stubModule("models/discount.model", {
  findOne: async () => state.discountFindOne,
  findById: () => makeQuery(state.discountById),
  findByIdAndDelete: async () => state.discountById,
  create: async (doc) => ({ _id: "discount-new", ...doc }),
});
stubModule("models/cart.model", {
  findOne: () => makeQuery(cartDoc),
});
stubModule("models/order.model", {
  findOne: async () => state.orderFindOne,
  findById: () => makeQuery(state.orderById),
  findOneAndUpdate: async () => state.orderUpdated,
});
stubModule("models/product.model", {
  findOne: async () => null,
  find: () => makeQuery([]),
});
stubModule("models/address.model", { findOne: async () => null });
stubModule("services/email.service", {
  sendMagicLinkEmail: async () => true,
  sendOtpEmail: async () => true,
  sendOrderConfirmationEmail: async () => true,
});
stubModule("config/cloudinary", {
  deleteFromCloudinary: async (publicId) => {
    state.deletedFromCloudinary.push(publicId);
    return { result: "ok" };
  },
  uploadToCloudinary: async () => ({
    secure_url: "https://cdn.example/uploaded.jpg",
    public_id: "uploads/1",
  }),
});
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
stubModule("services/discountUsage.service", {
  consumeDiscountUsage: async () => true,
});
stubModule("services/orderTransition.service", {
  transitionOrder: async (filter, status, note, customer) => {
    state.transitionCalls.push({ filter, status, note, customer });
    return state.transitionResult;
  },
});
stubModule("services/esewaVerification.service", {
  getEsewaConfig: () => ({
    merchantId: process.env.ESEWA_MERCHANT_ID,
    secretKey: process.env.ESEWA_SECRET_KEY,
    paymentUrl: "https://esewa.example/pay",
    statusUrl: "https://esewa.example/status",
  }),
  verifyEsewaSignature: () => true,
  verifyEsewaPayment: async () => true,
  verifyEsewaRefund: async () => "ESEWA-REF-1",
});
stubModule("services/esewaCapture.service", {
  captureEsewaPayment: async () => ({ outcome: "confirmed", applied: true }),
});
stubModule("services/notificationEventEmitter", {
  emit: (event, payload) => {
    state.emitted.push({ event, payload });
    return true;
  },
});

// --- Controllers under test ---
const authCtrl = require("../../controllers/auth.controller");
const profileCtrl = require("../../controllers/profile.controller");
const discountCtrl = require("../../controllers/discount.controller");
const orderCtrl = require("../../controllers/order.controller");

const baseUser = {
  _id: "u1",
  id: "u1",
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
  role: "customer",
  isActive: true,
  deletedAt: null,
};

// ============================ AUTH ============================

test("HAPPY GET /api/v1/auth/me -> getMe", async () => {
  state.userById = { ...baseUser };
  const res = mockResEx();
  const next = mockNext();
  authCtrl.getMe({ user: { id: "u1" } }, res, next);
  await until(() => res.body !== undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.user.email, "user@example.com");
});

test("HAPPY POST /api/v1/auth/logout -> logout", async () => {
  state.revokedUpdateCalls = [];
  const token = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  });
  const res = mockResEx();
  const next = mockNext();
  authCtrl.logout(
    {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
      user: { id: "u1" },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.message, "Logged out successfully");
  assert.equal(state.revokedUpdateCalls.length, 1, "session token was revoked");
  assert.ok(
    res.clearedCookies.some((c) => c.name === "jwt"),
    "jwt cookie cleared",
  );
});

test("HAPPY GET /api/v1/auth/google/callback -> googleCallback", async () => {
  const res = mockResEx();
  const next = mockNext();
  // req.user is populated by passport before this handler runs.
  authCtrl.googleCallback({ user: { ...baseUser } }, res, next);
  assert.equal(res.redirectUrl, `${FRONTEND}/auth/success`);
  assert.ok(res.cookies.jwt, "jwt cookie attached");
  assert.equal(typeof res.cookies.jwt.value, "string");
  assert.ok(res.cookies.jwt.value.length > 0);
});

// ============================ PROFILE ============================

test("HAPPY PATCH /api/v1/profile -> updateProfile", async () => {
  state.userUpdated = {
    ...baseUser,
    firstName: "Renamed",
    phone: "9811111111",
  };
  const res = mockResEx();
  const next = mockNext();
  profileCtrl.updateProfile(
    { user: { id: "u1" }, body: { firstName: "Renamed", phone: "9811111111" } },
    res,
    next,
  );
  await until(() => res.body !== undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.user.firstName, "Renamed");
  assert.equal(res.body.data.user.phone, "9811111111");
});

test("HAPPY PATCH /api/v1/profile/avatar -> updateAvatar", async () => {
  state.deletedFromCloudinary = [];
  state.userById = {
    ...baseUser,
    avatar: "https://cdn.example/old.jpg",
    avatarPublicId: "avatars/u1-old",
  };
  state.userUpdated = {
    ...baseUser,
    avatar: "https://cdn.example/new.jpg",
    avatarPublicId: "avatars/u1-new",
  };
  const res = mockResEx();
  const next = mockNext();
  // Upload middleware has already run: req.file carries the Cloudinary result.
  profileCtrl.updateAvatar(
    {
      user: { id: "u1" },
      file: {
        cloudinaryUrl: "https://cdn.example/new.jpg",
        cloudinaryPublicId: "avatars/u1-new",
      },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.user.avatar, "https://cdn.example/new.jpg");
  assert.deepEqual(
    state.deletedFromCloudinary,
    ["avatars/u1-old"],
    "previous avatar deleted from Cloudinary",
  );
});

test("HAPPY DELETE /api/v1/profile/avatar -> removeAvatar", async () => {
  state.deletedFromCloudinary = [];
  state.userById = {
    ...baseUser,
    avatar: "https://cdn.example/old.jpg",
    avatarPublicId: "avatars/u1-old",
  };
  state.userUpdated = { ...baseUser, avatar: null, avatarPublicId: null };
  const res = mockResEx();
  const next = mockNext();
  profileCtrl.removeAvatar({ user: { id: "u1" } }, res, next);
  await until(() => res.body !== undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.user.avatar, null);
  assert.deepEqual(
    state.deletedFromCloudinary,
    ["avatars/u1-old"],
    "avatar deleted from Cloudinary",
  );
});

test("HAPPY PATCH /api/v1/profile/preferences -> updatePreferences", async () => {
  state.userUpdated = {
    ...baseUser,
    preferences: {
      newsletter: true,
      smsNotifications: false,
      orderUpdates: true,
      promotionalEmails: false,
      preferredCategories: ["sofas"],
    },
  };
  const res = mockResEx();
  const next = mockNext();
  profileCtrl.updatePreferences(
    {
      user: { id: "u1" },
      body: {
        newsletter: true,
        promotionalEmails: false,
        preferredCategories: ["sofas"],
      },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.user.preferences.newsletter, true);
  assert.deepEqual(res.body.data.user.preferences.preferredCategories, [
    "sofas",
  ]);
});

// ============================ DISCOUNT ============================

test("HAPPY POST /api/v1/discounts/preview -> previewDiscount", async () => {
  state.discountFindOne = makeDiscount();
  const res = mockResEx();
  const next = mockNext();
  discountCtrl.previewDiscount(
    {
      user: { _id: "u1" },
      body: { code: "SAVE10", selectedItemIds: ["64b64c2f4f5a6b7c8d9e0f01"] },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `previewDiscount must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.cart.subtotal, 200);
  assert.equal(res.body.data.cart.discountAmount, 20);
  assert.equal(res.body.data.cart.total, 180);
  assert.equal(res.body.data.discount.code, "SAVE10");
});

test("HAPPY POST /api/v1/discounts/apply -> applyDiscount", async () => {
  state.discountFindOne = makeDiscount();
  const res = mockResEx();
  const next = mockNext();
  discountCtrl.applyDiscount(
    { user: { _id: "u1" }, body: { code: "save10" } },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `applyDiscount must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.discount.code, "SAVE10");
  assert.equal(res.body.data.discount.discountAmount, 20);
  assert.equal(res.body.data.cart.subtotal, 200);
  assert.equal(res.body.data.cart.total, 180);
});

test("HAPPY GET /api/v1/discounts/validate/:code -> validateDiscount", async () => {
  state.discountFindOne = makeDiscount();
  const res = mockResEx();
  const next = mockNext();
  discountCtrl.validateDiscount(
    { user: { _id: "u1" }, params: { code: "SAVE10" } },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `validateDiscount must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.valid, true);
  assert.equal(res.body.data.discount.code, "SAVE10");
  assert.equal(res.body.data.discount.discountAmount, 20);
});

test("HAPPY GET /api/v1/discounts/:id -> getDiscount", async () => {
  state.discountById = makeDiscount();
  const res = mockResEx();
  const next = mockNext();
  discountCtrl.getDiscount({ params: { id: "discount-1" } }, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getDiscount must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.discount.code, "SAVE10");
});

test("HAPPY POST /api/v1/discounts -> createDiscount", async () => {
  state.discountFindOne = null; // no existing code clash
  const res = mockResEx();
  const next = mockNext();
  discountCtrl.createDiscount(
    {
      user: { _id: "admin-1" },
      body: {
        code: "newyear25",
        description: "New Year sale",
        discountPercentage: 25,
        minimumOrderAmount: 500,
        maxUsageLimit: 100,
        expiryDate: new Date(Date.now() + 30 * 864e5),
        isActive: true,
      },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `createDiscount must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.discount.code, "NEWYEAR25");
  assert.equal(res.body.data.discount.discountPercentage, 25);
  assert.equal(res.body.data.discount.createdBy, "admin-1");
});

test("HAPPY PATCH /api/v1/discounts/:id -> updateDiscount", async () => {
  state.discountById = makeDiscount();
  const res = mockResEx();
  const next = mockNext();
  discountCtrl.updateDiscount(
    {
      params: { id: "discount-1" },
      body: { description: "Updated description", discountPercentage: 15 },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `updateDiscount must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.discount.description, "Updated description");
  assert.equal(res.body.data.discount.discountPercentage, 15);
});

test("HAPPY DELETE /api/v1/discounts/:id -> deleteDiscount", async () => {
  state.discountById = makeDiscount();
  const res = mockResEx();
  const next = mockNext();
  discountCtrl.deleteDiscount({ params: { id: "discount-1" } }, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `deleteDiscount must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.message, "Discount code deleted successfully");
});

// ============================ ORDER ============================

test("HAPPY GET /api/v1/orders/esewa/success -> esewaSuccess", async () => {
  const esewaOrder = makeOrder({
    paymentMethod: "esewa",
    paymentStatus: "pending",
  });
  state.orderFindOne = esewaOrder;
  state.orderById = {
    ...esewaOrder,
    paymentStatus: "paid",
    orderStatus: "confirmed",
  };
  const responseData = {
    transaction_code: "TXN-123",
    status: "COMPLETE",
    total_amount: "200.00",
    transaction_uuid: "ORD-1001",
    product_code: "EPAYTEST",
    signed_field_names:
      "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    signature: "stubbed-signature",
  };
  const data = Buffer.from(JSON.stringify(responseData), "utf-8").toString(
    "base64",
  );
  const res = mockResEx();
  const next = mockNext();
  orderCtrl.esewaSuccess({ query: { data } }, res, next);
  await until(() => res.redirectUrl !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `esewaSuccess must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(
    res.redirectUrl,
    `${FRONTEND}/order-confirmation/ORD-1001?emailSent=true`,
  );
});

test("HAPPY GET /api/v1/orders/esewa/failure -> esewaFailure", async () => {
  const res = mockResEx();
  const next = mockNext();
  orderCtrl.esewaFailure({ query: {} }, res, next);
  assert.equal(res.redirectUrl, `${FRONTEND}/checkout/payment-failed`);
});

test("HAPPY GET /api/v1/orders/admin/:id -> getOrderAdmin", async () => {
  state.orderById = makeOrder();
  const res = mockResEx();
  const next = mockNext();
  orderCtrl.getOrderAdmin({ params: { id: "order-mongo-1" } }, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getOrderAdmin must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.order.orderId, "ORD-1001");
});

test("HAPPY POST /api/v1/orders/:id/reconcile-refund -> reconcileRefund", async () => {
  state.orderFindOne = makeOrder({
    paymentMethod: "cod",
    paymentStatus: "paid",
    refundRequest: { status: "pending", requestedAt: new Date() },
  });
  state.orderUpdated = makeOrder({
    paymentMethod: "cod",
    paymentStatus: "refunded",
    refundRequest: { status: "completed", providerReference: "BANK-REF-42" },
  });
  const res = mockResEx();
  const next = mockNext();
  orderCtrl.reconcileRefund(
    {
      user: { _id: "admin-1" },
      params: { id: "order-mongo-1" },
      body: { settlementConfirmed: true, reference: "BANK-REF-42" },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `reconcileRefund must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Refund settlement recorded");
  assert.equal(res.body.data.order.paymentStatus, "refunded");
});

test("HAPPY PATCH /api/v1/orders/:id/cancel -> cancelOrder", async () => {
  state.emitted = [];
  state.transitionCalls = [];
  const cancelled = makeOrder({
    orderStatus: "cancelled",
    user: {
      _id: "u1",
      firstName: "Test",
      lastName: "User",
      email: "user@example.com",
    },
  });
  state.transitionResult = { order: cancelled, previousStatus: "pending" };
  const res = mockResEx();
  const next = mockNext();
  orderCtrl.cancelOrder(
    {
      user: { _id: "u1" },
      params: { id: "order-mongo-1" },
      body: { reason: "Changed my mind" },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `cancelOrder must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Order cancelled successfully");
  assert.equal(res.body.data.order.orderStatus, "cancelled");
  assert.equal(state.transitionCalls.length, 1);
  assert.equal(state.transitionCalls[0].status, "cancelled");
  assert.ok(
    state.emitted.some((e) => e.event === "order.cancelled"),
    "cancellation notification emitted",
  );
});

test("HAPPY PATCH /api/v1/orders/admin/:id/status -> updateOrderStatus", async () => {
  state.emitted = [];
  state.transitionCalls = [];
  const confirmed = makeOrder({ orderStatus: "confirmed" });
  state.transitionResult = { order: confirmed, previousStatus: "pending" };
  const res = mockResEx();
  const next = mockNext();
  orderCtrl.updateOrderStatus(
    {
      params: { id: "order-mongo-1" },
      body: { status: "confirmed", note: "Confirmed by admin" },
    },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `updateOrderStatus must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Order status updated");
  assert.equal(res.body.data.order.orderStatus, "confirmed");
  assert.equal(state.transitionCalls.length, 1);
  assert.equal(state.transitionCalls[0].status, "confirmed");
  assert.ok(
    state.emitted.some((e) => e.event === "order:statusChanged"),
    "status-change notification emitted",
  );
});
