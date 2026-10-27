// Phase 2 Worker C — AR-11/17/47/19/18 stubbed fixture tests.
// Technique: tests/audit/helpers.js stubModule pattern, with a lazy
// query stub whose result is computed AFTER the controller has chained
// skip/limit/sort/lean/select, so pagination/cursor walks are real.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes, mockNext, until } = require("../audit/helpers");

let ttlCache = { clearCache() {} };
try { ttlCache = require("../../utils/ttlCache"); } catch { /* pre-fix: module absent */ }

// ---- lazy query stub -------------------------------------------------------
function Q(compute, rec = {}) {
  const q = {
    _rec: rec,
    session() { return q; },
    populate(arg) { rec.populate = arg; return q; },
    select(arg) { rec.select = arg; return q; },
    sort(arg) { rec.sort = arg; return q; },
    lean() { rec.lean = true; return q; },
    skip(n) { rec.skip = n; return q; },
    limit(n) { rec.limit = n; return q; },
    then(onF, onR) { return Promise.resolve().then(() => compute(rec)).then(onF, onR); },
    catch(onR) { return Promise.resolve().then(() => compute(rec)).catch(onR); },
  };
  return q;
}
const fixed = (value, rec) => Q(() => value, rec);

// ---- shared mutable state --------------------------------------------------
const S = {
  orderAggResult: [{ totalRevenue: 100, totalOrders: 3, pendingRevenue: 10, refundedAmount: 5 }],
  orderAggCalls: 0, orderFindCalls: 0, orderCountCalls: 0,
  orderAggGate: null, // optional deferred promise for the parallel test
  dashAggResult: [{ _id: null, totalRevenue: 100 }],
  dashAggCalls: 0,
  blogAggCalls: 0, blogCountCalls: 0, blogCount: 2, blogAggResult: [{ _id: "news", count: 2 }],
  blogViewsResult: [{ _id: null, total: 42 }],
  lastBlogFilter: null, lastBlogRec: null,
  lastProductRec: null, lastUserRec: null, lastCartPopulate: undefined, lastPrepSelect: undefined,
};

const T0 = new Date("2026-01-05T00:00:00Z").getTime();
const oid = (n) => String(n).padStart(24, "0");
// products: ids 5..1, createdAt ties for ids 3 and 2 (tiebreak check)
const productDocs = [5, 4, 3, 2, 1].map((n) => ({
  _id: oid(n), name: `P${n}`, slug: `p${n}`, price: 100 + n, status: "active", deletedAt: null,
  description: `desc ${n}`, modelFiles: [{ url: "m" + n, format: "glb" }],
  createdAt: new Date(T0 + (n >= 2 && n <= 3 ? 2000 : n * 1000)),
  category: oid(99),
}));
const orderDocs = [5, 4, 3, 2, 1].map((n) => ({
  _id: oid(100 + n), orderId: `ORD${n}`, total: n * 10, paymentStatus: "paid", orderStatus: "delivered",
  createdAt: new Date(T0 + (n >= 2 && n <= 3 ? 2000 : n * 1000)),
}));

function cursorCondOf(filter) {
  const ands = filter && filter.$and ? filter.$and : [];
  for (const a of ands) if (a && a.$or) return a.$or;
  return null;
}
function applyCursor(docs, filter) {
  const cond = cursorCondOf(filter);
  if (!cond) return docs;
  const lt = cond[0].createdAt.$lt; const eq = cond[1].createdAt.$eq; const idLt = cond[1]._id.$lt;
  return docs.filter((d) => d.createdAt < lt || (d.createdAt.getTime() === new Date(eq).getTime() && String(d._id) < String(idLt)));
}
function sortDocs(docs, sort) {
  const out = [...docs];
  if (sort && sort.createdAt === -1) out.sort((a, b) => (b.createdAt - a.createdAt) || (String(b._id) < String(a._id) ? -1 : 1));
  return out;
}
function pageSlice(docs, rec) {
  let out = docs;
  if (rec.skip) out = out.slice(rec.skip);
  if (rec.limit !== undefined) out = out.slice(0, rec.limit);
  return out;
}

// ---- model / service stubs (before any controller require) -----------------
stubModule("models/order.model.js", {
  aggregate: async (pipeline) => {
    S.orderAggCalls++; S.dashAggCalls++;
    S.lastAggPipeline = pipeline;
    if (S.orderAggGate) await S.orderAggGate;
    // dashboard aggregate has $group totalRevenue only; getAllOrders has totalOrders too
    const grp = JSON.stringify(pipeline);
    return grp.includes("totalOrders") ? S.orderAggResult : S.dashAggResult;
  },
  find: (filter) => { S.orderFindCalls++; S.lastOrderFilter = filter; const rec = {}; S.lastOrderRec = rec;
    return Q((r) => pageSlice(sortDocs(applyCursor(orderDocs, filter), r.sort), r), rec); },
  countDocuments: async () => { S.orderCountCalls++; return orderDocs.length; },
  findOne: () => fixed(null),
  findById: () => fixed(null),
  create: async (docs) => [{ ...docs[0], _id: oid(777), orderId: "ORD777", save: async function () { return this; }, addStatusHistory() {} }],
});
stubModule("models/product.model.js", {
  aggregate: async () => [],
  find: (filter) => { const rec = {}; S.lastProductRec = rec; S.lastProductFilter = filter;
    if (filter && filter._id && filter._id.$in) { S.lastPrepSelect = rec; return Q(() => prepProducts, rec); }
    return Q((r) => pageSlice(sortDocs(applyCursor(productDocs, filter), r.sort), r), rec); },
  findOne: () => fixed(null),
  countDocuments: async () => 15,
  bulkWrite: async (ops) => ({ modifiedCount: ops.length }),
});
stubModule("models/user.model.js", {
  find: () => { const rec = {}; S.lastUserRec = rec; return Q(() => [{ _id: oid(1), firstName: "A" }], rec); },
  countDocuments: async () => 7,
  findById: () => fixed(null),
});
stubModule("models/category.model.js", { find: () => Q(() => []), findById: () => fixed(null) });
// Phase 1 (catalog): product.controller now also requires the Room
// registry model (roomSlugs write validation). The harness's fake
// mongoose cannot load the real model; this stub provides the only
// surface the controller touches (find().select().lean(), and only
// when a write carries roomSlugs — none of these tests send any).
stubModule("models/room.model.js", { find: () => Q(() => []) });
// Phase 2 (catalog): product.controller now also reaches the
// attribute engine (services/productAttributes.service.js ->
// services/attributeResolution.service.js), which requires the
// AttributeDefinition and ProductType registry models. Same
// disposition as Room above: the fake mongoose cannot load the
// real models, and these tests exercise no attribute writes (the
// stubbed Category.findById returns null, so resolution is never
// reached with a category). The stubs provide the surfaces the
// services touch if they ever are.
stubModule("models/attributeDefinition.model.js", { find: () => Q(() => []) });
stubModule("models/productType.model.js", { find: () => Q(() => []), findOne: () => fixed(null) });
const prepProducts = [{ _id: oid(5), name: "P5", price: 105, stock: 10, status: "active", images: [{ url: "img5", isPrimary: true }] }];
stubModule("models/cart.model.js", {
  findOne: () => { const rec = {}; return Q(() => {
    const cart = { _id: "cart1", user: oid(1), items: [{ _id: oid(501), product: oid(5), quantity: 2, variant: {} }], save: async function () { return this; } };
    S.lastCartPopulate = rec.populate; return cart;
  }, rec); },
});
stubModule("models/address.model.js", { findOne: () => fixed({ fullName: "A", phone: "1", addressLine1: "x", city: "K", postalCode: "1", country: "NP" }) });
stubModule("models/discount.model.js", { findOne: () => fixed(null) });
stubModule("models/blog.model.js", {
  find: (filter) => { S.lastBlogFilter = filter; const rec = {}; S.lastBlogRec = rec; return Q(() => [{ _id: oid(9), title: "Sofa guide", content: "BODY" }], rec); },
  countDocuments: async () => { S.blogCountCalls++; return S.blogCount; },
  aggregate: async () => { S.blogAggCalls++; return S.blogAggResult; },
  findOne: () => fixed(null),
  getPopular: async () => [], getFeatured: async () => [],
});
stubModule("models/blogEngagement.model.js", { create: async () => ({}) });
stubModule("models/announcement.model.js", {
  find: () => { const rec = {}; S.lastAnnRec = rec; return Q(() => [], rec); },
  countDocuments: async () => 0,
});
stubModule("models/promotion.model.js", {
  find: () => { const rec = {}; S.lastPromoRec = rec; return Q(() => [], rec); },
  countDocuments: async () => 0,
});
stubModule("services/notificationService.js", class { static async createNotification() {} });
stubModule("services/rssFeedService.js", { fetchAllFeeds: async () => ({}), getFeedSources: () => [{ name: "FeedA", url: "https://x" }], updateFeaturedArticles: async () => {} });
stubModule("services/discountUsage.service.js", { consumeDiscountUsage: async () => {} });
stubModule("services/orderTransition.service.js", { transitionOrder: async () => ({}), commitGuestCodStock: async () => {} });
stubModule("services/email.service.js", { sendOrderConfirmationEmail: async () => true });
stubModule("services/esewaCapture.service.js", { captureEsewaPayment: async () => {} });
stubModule("services/esewaVerification.service.js", {
  getEsewaConfig: () => ({ secretKey: "test-only", merchantId: "TEST", paymentUrl: "https://example.invalid/pay" }),
  verifyEsewaSignature: () => true, verifyEsewaPayment: async () => ({}), verifyEsewaRefund: async () => ({}),
});
stubModule("services/notificationEventEmitter.js", { emit: () => {} });
stubModule("middleware/upload.middleware.js", { deleteFile: async () => ({}), deleteFiles: async () => [] });
stubModule("mongoose", {
  startSession: async () => ({ startTransaction() {}, abortTransaction: async () => {}, commitTransaction: async () => {}, inTransaction: () => true, endSession: async () => {} }),
  Types: { ObjectId: class { constructor(v) { this.v = v; } toString() { return String(this.v); } } },
});

const analytics = require("../../controllers/analytics.controller");
const orderCtrl = require("../../controllers/order.controller");
const blogCtrl = require("../../controllers/blog.controller");
const productCtrl = require("../../controllers/product.controller");
const userCtrl = require("../../controllers/user.controller");
const announcementSvc = require("../../services/announcementService");
const promotionSvc = require("../../services/promotionService");
const { prepareOrderItems } = require("../../services/checkoutItems.service");

async function call(handler, req) {
  const res = mockRes(); const next = mockNext();
  handler(req, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined, `handler error: ${next.error && next.error.message}`);
  return res;
}
function resetCacheEnv(ttl) {
  if (ttl === undefined) delete process.env.ANALYTICS_CACHE_TTL_MS; else process.env.ANALYTICS_CACHE_TTL_MS = String(ttl);
  ttlCache.clearCache();
}

// ================= AR-11 =====================================================
test("AR-11: getAllOrders runs stats aggregate, page find and count concurrently", async () => {
  resetCacheEnv(undefined);
  let release; S.orderAggGate = new Promise((r) => { release = r; });
  S.orderFindCalls = 0; S.orderCountCalls = 0;
  const res = mockRes(); const next = mockNext();
  orderCtrl.getAllOrders({ query: {} }, res, next);
  await new Promise((r) => setTimeout(r, 25));
  const concurrent = S.orderFindCalls > 0 && S.orderCountCalls > 0;
  release(); S.orderAggGate = null;
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined);
  assert.ok(concurrent, "find/count must start before the stats aggregate resolves (sequential await = fail-before)");
  assert.equal(res.body.data.stats.totalRevenue, 100);
});

test("AR-11: analytics cache — stale within TTL, fresh when flag unset, keys don't collide", async () => {
  resetCacheEnv(60000); S.dashAggCalls = 0; S.dashAggResult = [{ _id: null, totalRevenue: 100 }];
  const r1 = await call(analytics.getDashboardStats, { query: {} });
  assert.equal(r1.body.data.totalRevenue, 100);
  S.dashAggResult = [{ _id: null, totalRevenue: 200 }]; // dataset mutation
  const r2 = await call(analytics.getDashboardStats, { query: {} });
  assert.equal(r2.body.data.totalRevenue, 100, "within TTL the cached (stale) figure is the documented trade-off");
  assert.equal(S.dashAggCalls, 1, "second call within TTL must not re-aggregate");
  resetCacheEnv(undefined);
  const r3 = await call(analytics.getDashboardStats, { query: {} });
  assert.equal(r3.body.data.totalRevenue, 200, "flag unset: fresh figure immediately");
  // key separation by query shape
  resetCacheEnv(60000); S.dashAggCalls = 0; S.orderAggCalls = 0;
  await call(analytics.getRevenueAnalytics, { query: { days: "30" } });
  await call(analytics.getRevenueAnalytics, { query: { days: "7" } });
  const callsAfterTwoKeys = S.dashAggCalls + S.orderAggCalls;
  await call(analytics.getRevenueAnalytics, { query: { days: "30" } });
  assert.equal(S.dashAggCalls + S.orderAggCalls, callsAfterTwoKeys, "repeat of days=30 must hit its own cache entry");
  assert.ok(callsAfterTwoKeys >= 2, "different filters must not collide");
});

test("AR-11: getAllOrders stats are cached under the same flag, keyed by filter", async () => {
  resetCacheEnv(60000); S.orderAggCalls = 0;
  S.orderAggResult = [{ totalRevenue: 111, totalOrders: 3, pendingRevenue: 1, refundedAmount: 0 }];
  const a = await call(orderCtrl.getAllOrders, { query: {} });
  assert.equal(a.body.data.stats.totalRevenue, 111);
  S.orderAggResult = [{ totalRevenue: 222, totalOrders: 4, pendingRevenue: 1, refundedAmount: 0 }];
  const b = await call(orderCtrl.getAllOrders, { query: {} });
  assert.equal(b.body.data.stats.totalRevenue, 111, "stats stale within TTL");
  assert.equal(S.orderAggCalls, 1);
  const c = await call(orderCtrl.getAllOrders, { query: { status: "delivered" } });
  assert.equal(c.body.data.stats.totalRevenue, 222, "different filter = different cache key");
  resetCacheEnv(undefined);
});

test("AR-11: revenue days param is clamped to 1..365 (behavior-correcting)", async () => {
  resetCacheEnv(undefined);
  await call(analytics.getRevenueAnalytics, { query: { days: "10000" } });
  const gte = S.lastAggPipeline[0].$match.createdAt.$gte;
  const ageDays = (Date.now() - new Date(gte).getTime()) / 86400000;
  assert.ok(ageDays <= 366 && ageDays >= 364, `days=10000 must clamp to 365, got age ${ageDays.toFixed(1)}d (unbounded = fail-before)`);
});

// ================= AR-17 =====================================================
test("AR-17: blog stats/categories cached under ANALYTICS_CACHE_TTL_MS; mutation visible after flag off", async () => {
  resetCacheEnv(60000); S.blogAggCalls = 0; S.blogCountCalls = 0;
  S.blogAggResult = [{ _id: "news", count: 2 }];
  const s1 = await call(blogCtrl.getBlogStats, { query: {} });
  assert.equal(s1.body.data.totalBlogs, 2);
  const aggAfterFirst = S.blogAggCalls;
  S.blogAggResult = [{ _id: "news", count: 9 }]; S.blogCount = 9; // RSS insert changes count + aggregates
  const s2 = await call(blogCtrl.getBlogStats, { query: {} });
  assert.equal(s2.body.data.totalBlogs, 2, "within TTL the stale figure is served");
  assert.equal(S.blogAggCalls, aggAfterFirst, "no re-aggregation within TTL");
  const c1 = await call(blogCtrl.getBlogCategories, { query: {} });
  assert.equal(c1.body.data.categories[0].count, 9, "categories use their own cache key, computed fresh on first call");
  resetCacheEnv(undefined);
  const s3 = await call(blogCtrl.getBlogStats, { query: {} });
  assert.equal(s3.body.data.totalBlogs, 9, "flag unset: new article visible immediately");
});

// ================= AR-47 =====================================================
test("AR-47: product list uses .lean() and the body is byte-identical to the fixture", async () => {
  const res = await call(productCtrl.getAllProducts, { query: {}, user: { role: "customer" } });
  assert.equal(S.lastProductRec.lean, true, "product list query must be lean");
  const expected = { status: "success", results: 5, data: { products: productDocs, pagination: { page: 1, limit: 20, total: 5, pages: 1 } } };
  // total comes from the Product stub countDocuments=15 in the unified stub; align:
  expected.data.pagination.total = 15; expected.data.pagination.pages = 1;
  assert.equal(JSON.stringify(res.body), JSON.stringify(expected), "lean must not change the body");
});

test("AR-47: admin user list uses .lean()", async () => {
  await call(userCtrl.getAllUsers, { query: {} });
  assert.equal(S.lastUserRec.lean, true);
});

test("AR-47: checkout populate selects only audited fields; prepareOrderItems projects and totals match", async () => {
  const items = await prepareOrderItems([{ productId: oid(5), quantity: 2 }], null);
  assert.ok(S.lastPrepSelect && /stock/.test(String(S.lastPrepSelect.select)) && /price/.test(String(S.lastPrepSelect.select)), "prepareOrderItems must project the fields it reads");
  assert.deepEqual(items.map((i) => [i.name, i.price, i.quantity, i.image]), [["P5", 105, 2, "img5"]]);

  const res = await call(orderCtrl.authenticatedCheckout, {
    user: { _id: oid(1), email: "a@x.com", firstName: "A", lastName: "B", phone: "1" },
    get: () => "testkey1234567890",
    body: { idempotencyKey: "testkey1234567890", shippingAddress: { fullName: "A", phone: "1", addressLine1: "x", city: "K", postalCode: "1", country: "NP" }, useSameAddress: true, paymentMethod: "cod" },
    query: {}, headers: {}, ip: "127.0.0.1",
  });
  assert.equal(res.statusCode, 201);
  const pop = JSON.stringify(S.lastCartPopulate || "");
  assert.ok(/items\.product/.test(pop) && /price/.test(pop), `cart populate must carry a field select, got: ${pop}`);
  assert.equal(res.body.data.order.total, 210, "totals fixture: 105 x 2");
});

// ================= AR-19 =====================================================
test("AR-19: announcement + promotion pagination is bounded (limit=100000 clamps to 100, NaN falls back)", async () => {
  const a = await announcementSvc.getAllAnnouncements({ page: 1, limit: 100000 });
  assert.equal(S.lastAnnRec.limit, 100, "announcement limit must clamp to the house max (100000 = fail-before)");
  assert.equal(a.pagination.limit, 100);
  const ap = await announcementSvc.getPublicAnnouncements({ page: 1, limit: 100000 });
  assert.equal(S.lastAnnRec.limit, 100); assert.equal(ap.pagination.limit, 100);
  const p = await promotionSvc.getAllPromotions({ page: 1, limit: 100000 });
  assert.equal(S.lastPromoRec.limit, 100, "promotion limit must clamp to the house max");
  assert.equal(p.pagination.limit, 100);
  const nan = await announcementSvc.getAllAnnouncements({ page: NaN, limit: NaN });
  assert.ok(Number.isFinite(nan.pagination.limit) && Number.isFinite(nan.pagination.page), "NaN page/limit must not reach skip/limit");
});

test("AR-19: cursor walk on products equals page walk; absent cursor is byte-identical, nextCursor only in cursor mode", async () => {
  const pageIds = [];
  for (let page = 1; page <= 3; page++) {
    const r = await call(productCtrl.getAllProducts, { query: { page: String(page), limit: "2" }, user: { role: "customer" } });
    assert.ok(!("nextCursor" in r.body.data), "no nextCursor field without cursor mode");
    pageIds.push(...r.body.data.products.map((p) => p._id));
  }
  const plain = await call(productCtrl.getAllProducts, { query: { limit: "2" }, user: { role: "customer" } });
  const cursorIds = []; let cursor = ""; let guard = 0;
  while (guard++ < 10) {
    const r = await call(productCtrl.getAllProducts, { query: { limit: "2", cursor }, user: { role: "customer" } });
    cursorIds.push(...r.body.data.products.map((p) => p._id));
    if (!r.body.data.nextCursor) break;
    cursor = r.body.data.nextCursor;
  }
  assert.deepEqual(cursorIds, pageIds, "keyset walk must yield the page-walk id sequence (incl. createdAt ties)");
  assert.equal(JSON.stringify(plain.body.data.products), JSON.stringify(productDocs.slice(0, 2).sort((a, b) => (b.createdAt - a.createdAt) || (String(b._id) < String(a._id) ? -1 : 1))));
});

test("AR-19: cursor walk on admin orders equals page walk", async () => {
  resetCacheEnv(undefined);
  const pageIds = [];
  for (let page = 1; page <= 3; page++) {
    const r = await call(orderCtrl.getAllOrders, { query: { page: String(page), limit: "2" } });
    pageIds.push(...r.body.data.orders.map((o) => o._id));
  }
  const cursorIds = []; let cursor = ""; let guard = 0;
  while (guard++ < 10) {
    const r = await call(orderCtrl.getAllOrders, { query: { limit: "2", cursor } });
    assert.ok("nextCursor" in r.body.data, "cursor mode must expose nextCursor (null at the end)");
    cursorIds.push(...r.body.data.orders.map((o) => o._id));
    if (!r.body.data.nextCursor) break;
    cursor = r.body.data.nextCursor;
  }
  assert.deepEqual(cursorIds, pageIds);
});

// ================= AR-18 =====================================================
test("AR-18: blog search — regex mode is the default; text mode uses $text", async () => {
  delete process.env.BLOG_SEARCH_MODE;
  await call(blogCtrl.getAllBlogs, { query: { search: "sofa" } });
  assert.ok(S.lastBlogFilter.$or, "default (regex) mode keeps the $or regex search");
  assert.equal(S.lastBlogFilter.$text, undefined);
  process.env.BLOG_SEARCH_MODE = "text";
  try {
    await call(blogCtrl.getAllBlogs, { query: { search: "sofa" } });
    assert.deepEqual(S.lastBlogFilter.$text, { $search: "sofa" }, "text mode must query the scoped text index");
    assert.equal(S.lastBlogFilter.$or, undefined);
  } finally { delete process.env.BLOG_SEARCH_MODE; }
});
