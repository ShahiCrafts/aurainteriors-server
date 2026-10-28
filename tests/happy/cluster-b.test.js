// Happy-path (success-path) controller tests — cluster B.
//
// Technique (same as tests/audit/*): stubModule() pre-populates require.cache
// BEFORE the controllers are required, so every model / service is a fake and
// no database or network is touched. Controllers wrapped in catchAsync do not
// return their promise, so tests poll with until() until the response (or
// next.error) settles. Address handlers are plain async (req, res) functions
// and are awaited directly.
//
// Models shared by several controllers (Product, Order, User) delegate to
// mutable `*State` objects: each test sets the state it needs before invoking
// its handler (node --test runs top-level tests sequentially).
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("../audit/helpers");

// 24-char hex ids (wishlist addToWishlist feeds these to
// new mongoose.Types.ObjectId(...), so they must be valid ObjectIds).
const USER_ID = "64b64c2f4f5a6b7c8d9e0a01";
const ADMIN_ID = "64b64c2f4f5a6b7c8d9e0a02";
const PRODUCT_ID = "64b64c2f4f5a6b7c8d9e0a03";
const ADDRESS_ID = "64b64c2f4f5a6b7c8d9e0a04";
const REVIEW_ID = "64b64c2f4f5a6b7c8d9e0a05";
const CART_ITEM_ID = "64b64c2f4f5a6b7c8d9e0a06";
const TARGET_USER_ID = "64b64c2f4f5a6b7c8d9e0a07";
const CART_ITEM_2_ID = "64b64c2f4f5a6b7c8d9e0a08";

// ---------------------------------------------------------------------------
// Mutable stub state
// ---------------------------------------------------------------------------
const addressState = { found: null, count: 0 };
const userState = { byId: null, count: 0 };
const productState = { doc: null, count: 0 };
const orderState = { found: null, aggregateResult: [], count: 0 };
const cartState = { cart: null };
const wishlistState = { doc: null, afterAdd: null };
const reviewState = {
  findOneResult: null,
  listResult: [],
  total: 0,
  created: null,
  updated: null,
};

function makeProductDoc() {
  return {
    _id: PRODUCT_ID,
    name: "Sofa",
    slug: "sofa",
    price: 100,
    stock: 10,
    status: "active",
    deletedAt: null,
    rating: { average: 4.5, count: 12 },
  };
}

function makeReviewDoc(overrides = {}) {
  const doc = {
    _id: REVIEW_ID,
    product: PRODUCT_ID,
    user: USER_ID,
    rating: 5,
    title: "Great",
    comment: "Lovely sofa",
    isApproved: false,
    helpfulVotes: [],
    helpfulCount: 0,
    save: async () => doc,
    populate: async () => doc,
    ...overrides,
  };
  return doc;
}

// ---------------------------------------------------------------------------
// Stubs — registered before any controller is required.
// ---------------------------------------------------------------------------
stubModule("models/address.model", {
  findOne: async () => addressState.found,
  countDocuments: async () => addressState.count,
  create: async (doc) => ({ _id: ADDRESS_ID, ...doc }),
  findByIdAndDelete: async () => ({ _id: ADDRESS_ID }),
  // AR-42: the model gained an atomic switchDefault static; the
  // controller routes default-selection through it.
  switchDefault: async () => ({ matchedCount: 1, modifiedCount: 1 }),
});

stubModule("models/user.model", {
  findById: async () => userState.byId,
  countDocuments: async () => userState.count,
});

stubModule("models/product.model", {
  // makeQuery covers both plain `await Product.findOne(...)` (review/cart)
  // and the `.select(...).lean()` chain (wishlist).
  findOne: () => makeQuery(productState.doc),
  countDocuments: async () => productState.count,
});

stubModule("models/order.model", {
  findOne: async () => orderState.found,
  aggregate: async () => orderState.aggregateResult,
  countDocuments: async () => orderState.count,
});

stubModule("models/cart.model", {
  findOne: async () => cartState.cart,
  create: async (doc) => ({ _id: "cart-new", __v: 0, items: [], ...doc }),
  updateOne: async () => ({ matchedCount: 1 }),
});

stubModule("models/wishlist.model", {
  // makeQuery covers `.populate(...)` (getWishlist) and plain await
  // (checkWishlist / clearWishlist resolve to the doc itself).
  findOne: () => makeQuery(wishlistState.doc),
  findOneAndUpdate: () => makeQuery(wishlistState.afterAdd),
  updateOne: async () => ({ matchedCount: 1, modifiedCount: 1 }),
  create: async (doc) => ({ _id: "wl-new", products: [], ...doc }),
});

stubModule("models/review.model", {
  find: () => makeQuery(reviewState.listResult),
  findOne: () => makeQuery(reviewState.findOneResult),
  countDocuments: async () => reviewState.total,
  getRatingBreakdown: async () => ({ 5: 8, 4: 3, 3: 1, 2: 0, 1: 0 }),
  create: async () => reviewState.created,
  findOneAndUpdate: () => makeQuery(reviewState.updated),
  findOneAndDelete: async () => ({ _id: REVIEW_ID }),
});

// The real emitter pulls in notificationService (DB/env); the review
// controller only calls .emit(), which is fire-and-forget for these tests.
stubModule("services/notificationEventEmitter", { emit: () => true });

// system.routes only needs protect/restrictTo to pass an admin through.
stubModule("middleware/auth.middleware", {
  protect: (req, res, next) => {
    req.user = { _id: ADMIN_ID, id: ADMIN_ID, role: "admin" };
    next();
  },
  restrictTo: () => (req, res, next) => next(),
});

const addressCtrl = require("../../controllers/address.controller");
const userCtrl = require("../../controllers/user.controller");
const cartCtrl = require("../../controllers/cart.controller");
const wishlistCtrl = require("../../controllers/wishlist.controller");
const reviewCtrl = require("../../controllers/review.controller");
const analyticsCtrl = require("../../controllers/analytics.controller");
const runtimeContext = require("../../services/runtimeContext"); // AR-33: registry replaces global.keepAliveService
const systemRouter = require("../../routes/system.routes");

// ---------------------------------------------------------------------------
// Shared fixtures / helpers
// ---------------------------------------------------------------------------
const userReq = (extra = {}) => ({
  user: {
    _id: USER_ID,
    id: USER_ID,
    role: "customer",
    firstName: "Asha",
    lastName: "Rai",
  },
  params: {},
  query: {},
  body: {},
  ...extra,
});
const adminReq = (extra = {}) => ({
  user: {
    _id: ADMIN_ID,
    id: ADMIN_ID,
    role: "admin",
    firstName: "Admin",
    lastName: "User",
  },
  params: {},
  query: {},
  body: {},
  ...extra,
});

function makeAddressDoc(overrides = {}) {
  const doc = {
    _id: ADDRESS_ID,
    user: USER_ID,
    label: "Home",
    fullName: "Asha Rai",
    phone: "9800000000",
    addressLine1: "123 Lake St",
    city: "Kathmandu",
    state: "Bagmati",
    postalCode: "44600",
    country: "Nepal",
    isDefault: false,
    save: async () => doc,
    ...overrides,
  };
  return doc;
}

function makeTargetUser(overrides = {}) {
  const doc = {
    _id: TARGET_USER_ID,
    id: TARGET_USER_ID,
    firstName: "Target",
    lastName: "User",
    email: "target@example.com",
    role: "customer",
    isActive: true,
    deletedAt: null,
    save: async () => doc,
    ...overrides,
  };
  return doc;
}

function makeCartDoc() {
  const productObj = { _id: PRODUCT_ID, name: "Chair", price: 250 };
  const items = [
    { _id: CART_ITEM_ID, product: productObj, quantity: 2 },
    { _id: CART_ITEM_2_ID, product: productObj, quantity: 1 },
  ];
  // Emulate the Mongoose subdocument-array helper minimally.
  items.id = (id) => items.find((i) => String(i._id) === String(id)) || null;
  const cart = {
    _id: "cart-1",
    user: USER_ID,
    __v: 0,
    items,
    save: async () => cart,
    populate: async () => cart,
  };
  return cart;
}

// ===========================================================================
// Address — controllers/address.controller.js
// (plain async handlers: awaited directly, no next)
// ===========================================================================

test("HAPPY POST /api/v1/addresses -> createAddress", async () => {
  addressState.count = 1; // not the first address: isDefault comes from body
  const res = mockRes();
  const req = userReq({
    body: {
      label: "Home",
      fullName: "Asha Rai",
      phone: "9800000000",
      addressLine1: "123 Lake St",
      city: "Kathmandu",
      state: "Bagmati",
      postalCode: "44600",
      country: "Nepal",
      isDefault: true,
    },
  });
  await addressCtrl.createAddress(req, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.address._id, ADDRESS_ID);
  assert.equal(res.body.data.address.city, "Kathmandu");
  assert.equal(res.body.data.address.isDefault, true);
});

test("HAPPY GET /api/v1/addresses/:id -> getAddress", async () => {
  addressState.found = makeAddressDoc();
  const res = mockRes();
  await addressCtrl.getAddress(userReq({ params: { id: ADDRESS_ID } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.address._id, ADDRESS_ID);
});

test("HAPPY PATCH /api/v1/addresses/:id -> updateAddress", async () => {
  const doc = makeAddressDoc();
  addressState.found = doc;
  const res = mockRes();
  await addressCtrl.updateAddress(
    userReq({
      params: { id: ADDRESS_ID },
      body: { city: "Pokhara", phone: "9811111111" },
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.address.city, "Pokhara");
  assert.equal(res.body.data.address.phone, "9811111111");
});

test("HAPPY DELETE /api/v1/addresses/:id -> deleteAddress", async () => {
  addressState.found = makeAddressDoc({ isDefault: false });
  const res = mockRes();
  await addressCtrl.deleteAddress(userReq({ params: { id: ADDRESS_ID } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.message, "Address deleted successfully");
});

test("HAPPY PATCH /api/v1/addresses/:id/set-default -> setDefaultAddress", async () => {
  const doc = makeAddressDoc({ isDefault: false });
  addressState.found = doc;
  const res = mockRes();
  await addressCtrl.setDefaultAddress(
    userReq({ params: { id: ADDRESS_ID } }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.address.isDefault, true);
});

// ===========================================================================
// User (admin) — controllers/user.controller.js
// ===========================================================================

test("HAPPY GET /api/v1/users/:id -> getUser", async () => {
  userState.byId = makeTargetUser();
  const res = mockRes();
  const next = mockNext();
  userCtrl.getUser(adminReq({ params: { id: TARGET_USER_ID } }), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getUser must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.user._id, TARGET_USER_ID);
});

test("HAPPY PATCH /api/v1/users/:id/status -> updateUserStatus", async () => {
  const target = makeTargetUser({ isActive: false });
  userState.byId = target;
  const res = mockRes();
  const next = mockNext();
  userCtrl.updateUserStatus(
    adminReq({ params: { id: TARGET_USER_ID }, body: { isActive: true } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `updateUserStatus must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(target.isActive, true);
  assert.equal(res.body.data.user.isActive, true);
});

test("HAPPY DELETE /api/v1/users/:id -> deleteUser", async () => {
  const target = makeTargetUser();
  userState.byId = target;
  const res = mockRes();
  const next = mockNext();
  userCtrl.deleteUser(adminReq({ params: { id: TARGET_USER_ID } }), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `deleteUser must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.message, "User deleted successfully");
  assert.ok(target.deletedAt, "soft delete stamps deletedAt");
  assert.equal(target.isActive, false);
});

// ===========================================================================
// Cart — controllers/cart.controller.js
// ===========================================================================

test("HAPPY DELETE /api/v1/cart/items/:itemId -> removeFromCart", async () => {
  const cart = makeCartDoc();
  cartState.cart = cart;
  const res = mockRes();
  const next = mockNext();
  cartCtrl.removeFromCart(
    userReq({ params: { itemId: CART_ITEM_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `removeFromCart must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Item removed from cart");
  assert.equal(cart.items.length, 1);
  assert.equal(res.body.data.cart.totalItems, 1);
  assert.equal(res.body.data.cart.subtotal, 250);
});

test("HAPPY DELETE /api/v1/cart -> clearCart", async () => {
  const cart = makeCartDoc();
  cartState.cart = cart;
  const res = mockRes();
  const next = mockNext();
  cartCtrl.clearCart(userReq(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `clearCart must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Cart cleared");
  assert.deepEqual(res.body.data.cart.items, []);
  assert.equal(res.body.data.cart.totalItems, 0);
  assert.equal(res.body.data.cart.subtotal, 0);
});

// ===========================================================================
// Wishlist — controllers/wishlist.controller.js
// ===========================================================================

test("HAPPY GET /api/v1/wishlist -> getWishlist", async () => {
  wishlistState.doc = {
    _id: "wl-1",
    user: USER_ID,
    products: [
      {
        _id: "wl-item-1",
        product: { _id: PRODUCT_ID, name: "Sofa", price: 100 },
        addedAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    ],
  };
  const res = mockRes();
  const next = mockNext();
  wishlistCtrl.getWishlist(userReq(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getWishlist must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.wishlist.itemCount, 1);
  assert.equal(res.body.data.wishlist.items[0].product._id, PRODUCT_ID);
});

test("HAPPY POST /api/v1/wishlist -> addToWishlist", async () => {
  productState.doc = makeProductDoc();
  wishlistState.afterAdd = {
    _id: "wl-1",
    products: [
      {
        _id: "wl-item-1",
        product: PRODUCT_ID,
        addedAt: new Date("2026-10-02T00:00:00.000Z"),
      },
    ],
  };
  const res = mockRes();
  const next = mockNext();
  wishlistCtrl.addToWishlist(
    userReq({ body: { productId: PRODUCT_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `addToWishlist must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.inWishlist, true);
  assert.equal(res.body.data.item.product._id, PRODUCT_ID);
});

test("HAPPY GET /api/v1/wishlist/check/:productId -> checkWishlist", async () => {
  wishlistState.doc = {
    _id: "wl-1",
    user: USER_ID,
    products: [{ _id: "wl-item-1", product: PRODUCT_ID, addedAt: new Date() }],
    hasProduct: (pid) => String(pid) === PRODUCT_ID,
  };
  const res = mockRes();
  const next = mockNext();
  wishlistCtrl.checkWishlist(
    userReq({ params: { productId: PRODUCT_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `checkWishlist must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.inWishlist, true);
});

test("HAPPY DELETE /api/v1/wishlist/:productId -> removeFromWishlist", async () => {
  const res = mockRes();
  const next = mockNext();
  wishlistCtrl.removeFromWishlist(
    userReq({ params: { productId: PRODUCT_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `removeFromWishlist must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.inWishlist, false);
});

test("HAPPY DELETE /api/v1/wishlist -> clearWishlist", async () => {
  const doc = {
    _id: "wl-1",
    user: USER_ID,
    products: [{ _id: "wl-item-1", product: PRODUCT_ID, addedAt: new Date() }],
    save: async () => doc,
  };
  wishlistState.doc = doc;
  const res = mockRes();
  const next = mockNext();
  wishlistCtrl.clearWishlist(userReq(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `clearWishlist must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.message, "Wishlist cleared");
  assert.equal(doc.products.length, 0);
});

// ===========================================================================
// Review — controllers/review.controller.js
// ===========================================================================

test("HAPPY GET /api/v1/products/:productId/reviews -> getProductReviews", async () => {
  productState.doc = makeProductDoc();
  reviewState.listResult = [makeReviewDoc()];
  reviewState.total = 1;
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.getProductReviews(
    userReq({ params: { productId: PRODUCT_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getProductReviews must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.reviews.length, 1);
  assert.equal(res.body.data.stats.average, 4.5);
  assert.equal(res.body.data.stats.total, 12);
  assert.equal(res.body.data.pagination.total, 1);
});

test("HAPPY GET /api/v1/products/:productId/reviews/my-review -> getUserReview", async () => {
  reviewState.findOneResult = makeReviewDoc();
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.getUserReview(
    userReq({ params: { productId: PRODUCT_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getUserReview must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.review._id, REVIEW_ID);
});

test("HAPPY GET /api/v1/products/:productId/reviews/can-review -> canReview", async () => {
  reviewState.findOneResult = null; // no existing review
  orderState.found = {
    _id: "order-1",
    user: USER_ID,
    orderStatus: "delivered",
  };
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.canReview(
    userReq({ params: { productId: PRODUCT_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `canReview must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.canReview, true);
  assert.equal(res.body.data.hasReviewed, false);
  assert.equal(res.body.data.hasPurchased, true);
});

test("HAPPY POST /api/v1/products/:productId/reviews -> createReview", async () => {
  productState.doc = makeProductDoc();
  reviewState.findOneResult = null; // no existing review
  orderState.found = {
    _id: "order-1",
    user: USER_ID,
    orderStatus: "delivered",
  };
  reviewState.created = makeReviewDoc();
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.createReview(
    userReq({
      params: { productId: PRODUCT_ID },
      body: { rating: 5, title: "Great", comment: "Lovely sofa" },
    }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `createReview must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.review._id, REVIEW_ID);
});

test("HAPPY PATCH /api/v1/products/:productId/reviews/:reviewId -> updateReview", async () => {
  const doc = makeReviewDoc();
  reviewState.findOneResult = doc;
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.updateReview(
    userReq({
      params: { productId: PRODUCT_ID, reviewId: REVIEW_ID },
      body: { rating: 4, title: "Updated title" },
    }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `updateReview must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.review.rating, 4);
  assert.equal(res.body.data.review.title, "Updated title");
});

test("HAPPY DELETE /api/v1/products/:productId/reviews/:reviewId -> deleteReview", async () => {
  reviewState.findOneResult = makeReviewDoc();
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.deleteReview(
    userReq({ params: { productId: PRODUCT_ID, reviewId: REVIEW_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `deleteReview must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.message, "Review deleted successfully");
});

test("HAPPY POST /api/v1/reviews/:reviewId/response -> addAdminResponse", async () => {
  reviewState.updated = makeReviewDoc({
    adminResponse: {
      comment: "Thanks for your feedback!",
      respondedAt: new Date(),
    },
  });
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.addAdminResponse(
    adminReq({
      params: { reviewId: REVIEW_ID },
      body: { comment: "Thanks for your feedback!" },
    }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `addAdminResponse must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(
    res.body.data.review.adminResponse.comment,
    "Thanks for your feedback!",
  );
});

test("HAPPY PATCH /api/v1/reviews/:reviewId/toggle-approval -> toggleApproval", async () => {
  const doc = makeReviewDoc({ isApproved: false });
  reviewState.findOneResult = doc;
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.toggleApproval(
    adminReq({ params: { reviewId: REVIEW_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `toggleApproval must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.message, "Review approved");
  assert.equal(res.body.data.review.isApproved, true);
});

test("HAPPY GET /api/v1/reviews -> getAllReviews", async () => {
  reviewState.listResult = [makeReviewDoc()];
  reviewState.total = 1;
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.getAllReviews(adminReq(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getAllReviews must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.results, 1);
  assert.equal(res.body.data.reviews.length, 1);
  assert.equal(res.body.data.pagination.total, 1);
});

test("HAPPY GET /api/v1/reviews/:reviewId -> getReview", async () => {
  reviewState.findOneResult = makeReviewDoc();
  const res = mockRes();
  const next = mockNext();
  reviewCtrl.getReview(
    adminReq({ params: { reviewId: REVIEW_ID } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getReview must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.review._id, REVIEW_ID);
});

// ===========================================================================
// Analytics — controllers/analytics.controller.js
// ===========================================================================

test("HAPPY GET /api/v1/analytics/stats -> getDashboardStats", async () => {
  orderState.aggregateResult = [{ _id: null, totalRevenue: 12345 }];
  orderState.count = 42;
  productState.count = 15;
  userState.count = 7;
  const res = mockRes();
  const next = mockNext();
  analyticsCtrl.getDashboardStats(adminReq(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getDashboardStats must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.totalRevenue, 12345);
  assert.equal(res.body.data.totalOrders, 42);
  assert.equal(res.body.data.totalProducts, 15);
  assert.equal(res.body.data.totalUsers, 7);
});

test("HAPPY GET /api/v1/analytics/revenue -> getRevenueAnalytics", async () => {
  orderState.aggregateResult = [
    { _id: "2026-10-20", revenue: 1000, orders: 3 },
    { _id: "2026-10-21", revenue: 2000, orders: 5 },
  ];
  const res = mockRes();
  const next = mockNext();
  analyticsCtrl.getRevenueAnalytics(
    adminReq({ query: { days: "30" } }),
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getRevenueAnalytics must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.deepEqual(res.body.data.chartData, [
    { date: "2026-10-20", revenue: 1000, orders: 3 },
    { date: "2026-10-21", revenue: 2000, orders: 5 },
  ]);
});

test("HAPPY GET /api/v1/analytics/categories -> getCategorySales", async () => {
  orderState.aggregateResult = [{ _id: "Sofas", value: 12, revenue: 6000 }];
  const res = mockRes();
  const next = mockNext();
  analyticsCtrl.getCategorySales(adminReq(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getCategorySales must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.deepEqual(res.body.data.salesByCategory, [
    { name: "Sofas", value: 12, revenue: 6000 },
  ]);
});

test("HAPPY GET /api/v1/analytics/top-products -> getTopProducts", async () => {
  orderState.aggregateResult = [
    {
      _id: PRODUCT_ID,
      name: "Sofa",
      image: "sofa.jpg",
      sales: 9,
      revenue: 9000,
    },
  ];
  const res = mockRes();
  const next = mockNext();
  analyticsCtrl.getTopProducts(adminReq(), res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getTopProducts must not error, got: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.data.topProducts.length, 1);
  assert.equal(res.body.data.topProducts[0].name, "Sofa");
  assert.equal(res.body.data.topProducts[0].sales, 9);
});

// ===========================================================================
// System — GET /api/v1/system/keep-alive-status (inline handler in
// routes/system.routes.js, reads the runtimeContext registry - AR-33)
// ===========================================================================

test("HAPPY GET /api/v1/system/keep-alive-status -> inline handler", async () => {
  runtimeContext.setKeepAliveService({
    getStatus: () => ({ status: "active", uptimeSeconds: 42, lastPing: "ok" }),
  });
  const express = require("express");
  const app = express();
  app.use("/api/v1/system", systemRouter);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  try {
    const { port } = server.address();
    const resp = await fetch(
      `http://127.0.0.1:${port}/api/v1/system/keep-alive-status`,
    );
    assert.equal(resp.status, 200);
    const body = await resp.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "active");
    assert.equal(body.data.uptimeSeconds, 42);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    runtimeContext.reset();
  }
});
