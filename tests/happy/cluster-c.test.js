// Happy-path (success-path) controller tests — Cluster C:
// controllers/document, category, product, blog, newsletter,
// announcement, promotion and contact controllers.
//
// Technique (see tests/audit/helpers.js): stubModule() pre-populates
// require.cache BEFORE the controllers are required, so every model /
// service beneath them is a fake — no DB, no network. Most handlers are
// wrapped in catchAsync (which does not return its promise), so their
// completion is polled with until(); the document and newsletter
// handlers are plain async functions, and the same polling works for
// them because they settle by writing the response (or calling next).
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery, mockRes, mockNext, until } = require("../audit/helpers");

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const ADMIN_ID = "64b64c2f4f5a6b7c8d9e0f01";
const DOC_ID = "64b64c2f4f5a6b7c8d9e0f10";
const CAT_ID = "64b64c2f4f5a6b7c8d9e0f20";
const PROD_ID = "64b64c2f4f5a6b7c8d9e0f21";
const BLOG_ID = "64b64c2f4f5a6b7c8d9e0f30";
const CONTACT_ID = "64b64c2f4f5a6b7c8d9e0f40";
const CONTACT_ID_2 = "64b64c2f4f5a6b7c8d9e0f41";
const ANN_ID = "64b64c2f4f5a6b7c8d9e0f50";
const PROMO_ID = "64b64c2f4f5a6b7c8d9e0f60";

const paginationFixture = { total: 1, page: 1, limit: 20, totalPages: 1 };

// ---------------------------------------------------------------------------
// Stubs — shared upload helper (document / category / product controllers)
// ---------------------------------------------------------------------------
stubModule("middleware/upload.middleware", {
  deleteFile: async () => ({}),
  deleteFiles: async () => {},
});

// ---------------------------------------------------------------------------
// Stubs — document cluster
// ---------------------------------------------------------------------------
let ingestionCalls = [];
const retryDoc = {
  _id: DOC_ID,
  fileName: "guide.pdf",
  status: "failed",
  error: "previous failure",
  save: async function () { return this; },
};
const storedDoc = { _id: DOC_ID, fileName: "guide.pdf", filePublicId: "doc-public-1", status: "ready" };

stubModule("models/document.model", {
  findById: async (id) => (id === DOC_ID ? storedDoc : retryDoc),
  findByIdAndUpdate: async (id, update) => ({ _id: id, fileName: "guide.pdf", ...update }),
  findByIdAndDelete: async () => storedDoc,
  create: async (doc) => ({ _id: DOC_ID, ...doc }),
  find: () => makeQuery([storedDoc]),
  countDocuments: async () => 1,
});

stubModule("services/backgroundTasks", {
  runDocumentIngestion: (id) => { ingestionCalls.push(id); },
  startBackgroundTasks: () => {},
  stopBackgroundTasks: () => {},
  releaseExpiredGuestCodHolds: async () => {},
});

stubModule("@qdrant/js-client-rest", {
  QdrantClient: class {
    async delete() { return {}; }
  },
});

// ---------------------------------------------------------------------------
// Stubs — category + product clusters (the two controllers share both models)
// ---------------------------------------------------------------------------
const categoryList = [
  { _id: CAT_ID, name: "Chairs", slug: "chairs", status: "active" },
  { _id: "64b64c2f4f5a6b7c8d9e0f22", name: "Tables", slug: "tables", status: "active" },
];
const currentCategory = {
  _id: CAT_ID,
  name: "Chairs",
  slug: "chairs",
  description: "Seating",
  parent: null,
  status: "active",
  sortOrder: 1,
  imagePublicId: null,
  save: async function () { return this; },
};

stubModule("models/category.model", {
  find: () => makeQuery(categoryList),
  findOne: () => makeQuery(currentCategory),
  findById: async () => currentCategory,
  findByIdAndDelete: async () => currentCategory,
  create: async (data) => ({ _id: "64b64c2f4f5a6b7c8d9e0f23", ...data }),
  countDocuments: async () => 0,
  getCategoryTree: async () => categoryList,
});

function freshProduct() {
  return {
    _id: PROD_ID,
    name: "Sofa",
    category: CAT_ID,
    style: "modern",
    tags: ["cozy"],
    price: 100,
    stock: 5,
    status: "active",
    deletedAt: null,
    images: [
      { _id: { toString: () => "img-1" }, url: "https://img/1", publicId: "p1", isPrimary: true },
      { _id: { toString: () => "img-2" }, url: "https://img/2", publicId: "p2", isPrimary: false },
    ],
    modelFiles: [{ url: "https://model/1", publicId: "mp1", isExternal: false }],
    save: async function () { return this; },
    populate: async function () { return this; },
    softDelete: async function () { this.deletedAt = new Date(); },
  };
}
let currentProduct = freshProduct();
const productList = [
  { _id: PROD_ID, name: "Sofa", price: 100 },
  { _id: "64b64c2f4f5a6b7c8d9e0f24", name: "Armchair", price: 60 },
];

stubModule("models/product.model", {
  find: () => makeQuery(productList),
  findOne: async () => currentProduct,
  findById: async () => currentProduct,
  findByIdAndDelete: async () => currentProduct,
  countDocuments: async () => 0,
  create: async (data) => ({ _id: PROD_ID, ...data }),
});

// ---------------------------------------------------------------------------
// Stubs — blog cluster
// ---------------------------------------------------------------------------
const blogDoc = {
  _id: BLOG_ID,
  title: "Design Guide",
  slug: "design-guide",
  category: "trends",
  tags: ["modern"],
  source: { name: "Dezeen" },
  views: 10,
  incrementViews: async () => {},
};
const relatedBlogList = [
  { _id: "64b64c2f4f5a6b7c8d9e0f31", title: "Related One" },
  { _id: "64b64c2f4f5a6b7c8d9e0f32", title: "Related Two" },
];

stubModule("models/blog.model", {
  findOne: async () => blogDoc,
  find: () => makeQuery(relatedBlogList),
  countDocuments: async () => 12,
  aggregate: async (pipeline) => {
    const group = pipeline && pipeline[0] && pipeline[0].$group;
    if (group && group._id === null) return [{ _id: null, total: 999 }];
    return [
      { _id: "trends", count: 3 },
      { _id: "guides", count: 2 },
    ];
  },
  getPopular: async () => [blogDoc],
  getFeatured: async () => [blogDoc],
});

stubModule("models/blogEngagement.model", {
  create: async () => ({}),
});

stubModule("services/rssFeedService", {
  fetchAllFeeds: async () => ({ newArticles: 7, totalFetched: 20, errors: [] }),
  getFeedSources: () => [{ name: "Dezeen", url: "https://www.dezeen.com" }],
  updateFeaturedArticles: async () => {},
});

// ---------------------------------------------------------------------------
// Stubs — newsletter cluster (email service is shared with contact below)
// ---------------------------------------------------------------------------
stubModule("models/newsletter.model", {
  findOneAndUpdate: async () => ({
    _id: "64b64c2f4f5a6b7c8d9e0f70",
    email: "reader@example.com",
    isActive: true,
    unsubscribeNonce: "nonce-1",
  }),
  countDocuments: async (filter) => {
    if (!filter || Object.keys(filter).length === 0) return 20;
    if (filter.subscribedAt) return 4;
    if (filter.isActive === true) return 15;
    if (filter.isActive === false) return 5;
    return 1;
  },
  aggregate: async () => [{ _id: "footer", count: 9 }],
  find: () => makeQuery([]),
  findOne: async () => null,
  updateOne: async () => ({ matchedCount: 1 }),
});

stubModule("services/newsletterToken.service", {
  verifyNewsletterToken: () => ({ email: "reader@example.com", nonce: "nonce-0", purpose: "subscribe" }),
  issueNewsletterToken: () => "issued-token",
});

stubModule("services/email.service", {
  sendNewsletterConfirmationEmail: async () => ({}),
  // confirmSubscription chains .catch() on this return value, so it must
  // be a promise — an async stub satisfies that.
  sendNewsletterWelcomeEmail: async () => ({}),
  sendNewsletterBroadcast: async () => ({ sent: 0 }),
  sendContactResponseEmail: async () => ({ messageId: "msg-1" }),
});

// ---------------------------------------------------------------------------
// Stubs — announcement cluster (controller delegates to the service)
// ---------------------------------------------------------------------------
const announcementFixture = { _id: ANN_ID, title: "Sale", status: "published" };
stubModule("services/announcementService", {
  getAllAnnouncements: async () => ({ announcements: [announcementFixture], pagination: paginationFixture }),
  getAnnouncementById: async () => announcementFixture,
  getPublicAnnouncements: async () => ({ announcements: [announcementFixture], pagination: paginationFixture }),
  getPublicAnnouncementById: async () => announcementFixture,
  getAnnouncementStats: async () => ({ total: 3, byStatus: { published: 2, draft: 1 }, totalViews: 42 }),
  createAnnouncement: async (data) => ({ _id: ANN_ID, ...data }),
  updateAnnouncement: async () => announcementFixture,
  deleteAnnouncement: async () => {},
  publishAnnouncement: async () => ({ ...announcementFixture, status: "published" }),
  scheduleAnnouncement: async () => ({ ...announcementFixture, status: "scheduled" }),
  archiveAnnouncement: async () => ({ ...announcementFixture, status: "archived" }),
});

// ---------------------------------------------------------------------------
// Stubs — promotion cluster (controller delegates to the service)
// ---------------------------------------------------------------------------
const promotionFixture = { _id: PROMO_ID, title: "Winter Sale", status: "draft" };
stubModule("services/promotionService", {
  getAllPromotions: async () => ({ promotions: [promotionFixture], pagination: paginationFixture }),
  getPromotionById: async () => promotionFixture,
  createPromotion: async (data) => ({ _id: PROMO_ID, ...data }),
  updatePromotion: async () => promotionFixture,
  deletePromotion: async () => {},
  schedulePromotion: async () => ({ ...promotionFixture, status: "scheduled" }),
  cancelPromotion: async () => ({ ...promotionFixture, status: "cancelled" }),
  getPromotionAnalytics: async () => ({
    promotionId: PROMO_ID,
    metrics: { deliveredCount: 10, readCount: 4, clickCount: 2 },
    rates: { deliveryRate: 100, engagementRate: 40, clickThroughRate: 20 },
  }),
  getTargetUsers: async () => [ADMIN_ID, CONTACT_ID, CONTACT_ID_2],
  sendPromotion: async () => ({ message: "sent", metrics: {} }),
  trackEngagement: async () => {},
});

// ---------------------------------------------------------------------------
// Stubs — contact cluster
// ---------------------------------------------------------------------------
function freshContact() {
  return {
    _id: CONTACT_ID,
    name: "Jane Doe",
    email: "jane@example.com",
    subject: "Question about a sofa",
    message: "Hello",
    status: "new",
    priority: "medium",
    isRead: true,
    response: null,
    save: async function () { return this; },
  };
}
let currentContact = freshContact();
const contactList = [freshContact(), { ...freshContact(), _id: CONTACT_ID_2, name: "John Roe" }];

stubModule("models/contact.model", {
  find: () => makeQuery(contactList),
  findById: () => makeQuery(currentContact),
  findByIdAndDelete: async () => currentContact,
  countDocuments: async () => 2,
  updateMany: async () => ({ matchedCount: 2, modifiedCount: 2 }),
  create: async (data) => ({ _id: CONTACT_ID, ...data }),
  getStats: async () => ({ total: 10, unread: 3, statusCounts: { new: 4 }, categoryCounts: { general: 5 } }),
});

stubModule("services/notificationEventEmitter", {
  emit: () => true,
  on: () => {},
});

// Controllers under test — required only after every stub is in place.
const documentCtrl = require("../../controllers/document.controller");
const categoryCtrl = require("../../controllers/category.controller");
const productCtrl = require("../../controllers/product.controller");
const blogCtrl = require("../../controllers/blog.controller");
const newsletterCtrl = require("../../controllers/newsletter.controller");
const announcementCtrl = require("../../controllers/announcement.controller");
const promotionCtrl = require("../../controllers/promotion.controller");
const contactCtrl = require("../../controllers/contact.controller");

// ---------------------------------------------------------------------------
// Request factories + invocation helpers
// ---------------------------------------------------------------------------
function baseReq(overrides = {}) {
  return {
    user: { _id: ADMIN_ID, role: "admin" },
    params: {},
    body: {},
    query: {},
    headers: {},
    cookies: {},
    ip: "127.0.0.1",
    ...overrides,
  };
}

// Invoke a handler and wait for it to settle: catchAsync handlers do not
// return their promise, and the plain async handlers settle by writing
// the response, so polling covers both shapes.
async function invoke(handler, req) {
  const res = mockRes();
  const next = mockNext();
  const result = handler(req, res, next);
  if (result && typeof result.catch === "function") result.catch(() => {});
  await until(() => res.body !== undefined || next.error !== undefined);
  return { res, next };
}

function assertSuccess(res, next, statusCode) {
  assert.equal(next.error, undefined, `handler must not error, got: ${next.error && next.error.message}`);
  assert.equal(res.statusCode, statusCode);
  assert.equal(res.body.status, "success");
}

// ===========================================================================
// controllers/document.controller.js
// ===========================================================================

test("PATCH /documents/:id/visibility — updateVisibility returns 200 with the updated document", async () => {
  ingestionCalls = [];
  const req = baseReq({ params: { id: DOC_ID }, body: { visibility: "public" } });
  const { res, next } = await invoke(documentCtrl.updateVisibility, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.document.visibility, "public");
  assert.deepEqual(ingestionCalls, [DOC_ID], "visibility change re-schedules ingestion");
});

test("DELETE /documents/:id — deleteDocument returns 200 with the deletion message", async () => {
  const req = baseReq({ params: { id: DOC_ID } });
  const { res, next } = await invoke(documentCtrl.deleteDocument, req);
  assertSuccess(res, next, 200);
  assert.match(res.body.message, /Document deleted successfully/);
});

test("POST /documents/:id/retry — retryDocumentIngestion returns 200 with the document reset to pending", async () => {
  retryDoc.status = "failed";
  retryDoc.error = "previous failure";
  ingestionCalls = [];
  const req = baseReq({ params: { id: "64b64c2f4f5a6b7c8d9e0f11" } });
  const { res, next } = await invoke(documentCtrl.retryDocumentIngestion, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Re-indexing scheduled successfully");
  assert.equal(res.body.data.document.status, "pending");
  assert.equal(res.body.data.document.error, null);
  assert.equal(ingestionCalls.length, 1, "ingestion re-scheduled exactly once");
});

// ===========================================================================
// controllers/category.controller.js
// ===========================================================================

test("GET /categories — getAllCategories returns 200 with the category list", async () => {
  const { res, next } = await invoke(categoryCtrl.getAllCategories, baseReq({ query: {} }));
  assertSuccess(res, next, 200);
  assert.equal(res.body.results, categoryList.length);
  assert.deepEqual(res.body.data.categories, categoryList);
});

test("POST /categories — createCategory returns 201 with the created category", async () => {
  const req = baseReq({ body: { name: "Lighting", description: "Lamps and fixtures", status: "active", sortOrder: 3 } });
  const { res, next } = await invoke(categoryCtrl.createCategory, req);
  assertSuccess(res, next, 201);
  assert.equal(res.body.data.category.name, "Lighting");
  assert.equal(res.body.data.category.parent, null);
});

test("PATCH /categories/:id — updateCategory returns 200 with the updated category", async () => {
  const req = baseReq({ params: { id: CAT_ID }, body: { name: "Designer Chairs", sortOrder: 2 } });
  const { res, next } = await invoke(categoryCtrl.updateCategory, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.category.name, "Designer Chairs");
  assert.equal(res.body.data.category.sortOrder, 2);
});

test("DELETE /categories/:id — deleteCategory returns 200 with the deletion message", async () => {
  const req = baseReq({ params: { id: CAT_ID } });
  const { res, next } = await invoke(categoryCtrl.deleteCategory, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Category deleted successfully");
});

// ===========================================================================
// controllers/product.controller.js
// ===========================================================================

test("GET /products/featured — getFeaturedProducts returns 200 with the featured products", async () => {
  const { res, next } = await invoke(productCtrl.getFeaturedProducts, baseReq({ query: { limit: "8" } }));
  assertSuccess(res, next, 200);
  assert.equal(res.body.results, productList.length);
  assert.deepEqual(res.body.data.products, productList);
});

test("GET /products/new-arrivals — getNewArrivals returns 200 with the new arrivals", async () => {
  const { res, next } = await invoke(productCtrl.getNewArrivals, baseReq({ query: { limit: "8" } }));
  assertSuccess(res, next, 200);
  assert.equal(res.body.results, productList.length);
  assert.deepEqual(res.body.data.products, productList);
});

test("GET /products/:id/related — getRelatedProducts returns 200 with related products", async () => {
  currentProduct = freshProduct();
  const req = baseReq({ params: { id: PROD_ID }, query: { limit: "2" } });
  const { res, next } = await invoke(productCtrl.getRelatedProducts, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.results, productList.length);
  assert.deepEqual(res.body.data.products, productList);
});

test("PATCH /products/:id — updateProduct returns 200 with the updated product", async () => {
  currentProduct = freshProduct();
  const req = baseReq({
    params: { id: PROD_ID },
    body: { name: "Updated Sofa", price: "120", category: CAT_ID },
  });
  const { res, next } = await invoke(productCtrl.updateProduct, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.product.name, "Updated Sofa");
  assert.equal(res.body.data.product.price, 120);
  assert.equal(res.body.data.product.category, CAT_ID);
});

test("DELETE /products/:id — deleteProduct returns 200 with the soft-delete message", async () => {
  currentProduct = freshProduct();
  const req = baseReq({ params: { id: PROD_ID } });
  const { res, next } = await invoke(productCtrl.deleteProduct, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Product deleted successfully");
  assert.ok(currentProduct.deletedAt instanceof Date, "softDelete stamped deletedAt");
});

test("DELETE /products/:id/permanent — hardDeleteProduct returns 200 with the permanent-delete message", async () => {
  currentProduct = freshProduct();
  const req = baseReq({ params: { id: PROD_ID } });
  const { res, next } = await invoke(productCtrl.hardDeleteProduct, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Product permanently deleted");
});

test("PATCH /products/:id/primary-image — setPrimaryImage returns 200 with the chosen image primary", async () => {
  currentProduct = freshProduct();
  const req = baseReq({ params: { id: PROD_ID }, body: { imageId: "img-2" } });
  const { res, next } = await invoke(productCtrl.setPrimaryImage, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.product.images[0].isPrimary, false);
  assert.equal(res.body.data.product.images[1].isPrimary, true);
});

test("PATCH /products/:id/stock — updateStock returns 200 and reactivates an out-of-stock product", async () => {
  currentProduct = freshProduct();
  currentProduct.stock = 0;
  currentProduct.status = "out_of_stock";
  const req = baseReq({ params: { id: PROD_ID }, body: { stock: 9 } });
  const { res, next } = await invoke(productCtrl.updateStock, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.product.stock, 9);
  assert.equal(res.body.data.product.status, "active");
});

// ===========================================================================
// controllers/blog.controller.js
// ===========================================================================

test("GET /blogs/categories — getBlogCategories returns 200 with formatted categories and a total", async () => {
  const { res, next } = await invoke(blogCtrl.getBlogCategories, baseReq());
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.categories[0].slug, "all");
  assert.equal(res.body.data.categories[0].count, 5);
  assert.deepEqual(res.body.data.categories[1], { slug: "trends", name: "Trends", count: 3 });
});

test("GET /blogs/popular — getPopularBlogs returns 200 with the popular blogs", async () => {
  const { res, next } = await invoke(blogCtrl.getPopularBlogs, baseReq({ query: { limit: "5" } }));
  assertSuccess(res, next, 200);
  assert.equal(res.body.results, 1);
  assert.deepEqual(res.body.data.blogs, [blogDoc]);
});

test("GET /blogs/featured — getFeaturedBlogs returns 200 with the featured blogs", async () => {
  const { res, next } = await invoke(blogCtrl.getFeaturedBlogs, baseReq({ query: { limit: "3" } }));
  assertSuccess(res, next, 200);
  assert.equal(res.body.results, 1);
  assert.deepEqual(res.body.data.blogs, [blogDoc]);
});

test("GET /blogs/stats — getBlogStats returns 200 with totals and counts", async () => {
  const { res, next } = await invoke(blogCtrl.getBlogStats, baseReq());
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.totalBlogs, 12);
  assert.equal(res.body.data.totalViews, 999);
  assert.equal(res.body.data.categoryCounts.length, 2);
  assert.equal(res.body.data.sourceCounts.length, 2);
});

test("GET /blogs/:id — getBlog returns 200 with the blog post", async () => {
  const req = baseReq({ params: { id: "design-guide" }, user: { _id: ADMIN_ID, role: "customer" } });
  const { res, next } = await invoke(blogCtrl.getBlog, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.blog, blogDoc);
});

test("GET /blogs/:id/related — getRelatedBlogs returns 200 with related posts", async () => {
  const req = baseReq({ params: { id: BLOG_ID }, query: { limit: "3" } });
  const { res, next } = await invoke(blogCtrl.getRelatedBlogs, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.results, relatedBlogList.length);
  assert.deepEqual(res.body.data.blogs, relatedBlogList);
});

test("POST /blogs/refresh — refreshFeeds returns 200 reporting the new article count", async () => {
  const { res, next } = await invoke(blogCtrl.refreshFeeds, baseReq());
  assertSuccess(res, next, 200);
  assert.match(res.body.message, /Added 7 new articles/);
  assert.equal(res.body.data.newArticles, 7);
});

// ===========================================================================
// controllers/newsletter.controller.js
// (These handlers respond with { success: true, ... } rather than the
// { status: "success", ... } envelope used by the other controllers.)
// ===========================================================================

test("POST /newsletter/confirm — confirmSubscription returns 200 confirming the subscription", async () => {
  const req = baseReq({ body: { token: "payload.signature" }, user: undefined });
  const { res, next } = await invoke(newsletterCtrl.confirmSubscription, req);
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Your newsletter subscription is confirmed.");
});

test("GET /newsletter/stats — getStats returns 200 with subscriber statistics", async () => {
  const { res, next } = await invoke(newsletterCtrl.getStats, baseReq());
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.total, 20);
  assert.equal(res.body.data.active, 15);
  assert.equal(res.body.data.inactive, 5);
  assert.equal(res.body.data.recentSubscribers, 4);
  assert.deepEqual(res.body.data.bySource, [{ _id: "footer", count: 9 }]);
});

// ===========================================================================
// controllers/announcement.controller.js
// ===========================================================================

test("GET /announcements/public — getPublicAnnouncements returns 200 with announcements and pagination", async () => {
  const req = baseReq({ query: { page: "1", limit: "10" }, user: { _id: ADMIN_ID, role: "customer" } });
  const { res, next } = await invoke(announcementCtrl.getPublicAnnouncements, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.announcements, [announcementFixture]);
  assert.deepEqual(res.body.data.pagination, paginationFixture);
});

test("GET /announcements/public/:id — getPublicAnnouncement returns 200 with the announcement", async () => {
  const req = baseReq({ params: { id: ANN_ID }, user: { _id: ADMIN_ID, role: "customer" } });
  const { res, next } = await invoke(announcementCtrl.getPublicAnnouncement, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.announcement, announcementFixture);
});

test("GET /announcements/stats — getAnnouncementStats returns 200 with the stats", async () => {
  const { res, next } = await invoke(announcementCtrl.getAnnouncementStats, baseReq());
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.stats, { total: 3, byStatus: { published: 2, draft: 1 }, totalViews: 42 });
});

test("GET /announcements/:id — getAnnouncement returns 200 with the announcement", async () => {
  const req = baseReq({ params: { id: ANN_ID } });
  const { res, next } = await invoke(announcementCtrl.getAnnouncement, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.announcement, announcementFixture);
});

test("DELETE /announcements/:id — deleteAnnouncement returns 200 with the deletion message", async () => {
  const req = baseReq({ params: { id: ANN_ID } });
  const { res, next } = await invoke(announcementCtrl.deleteAnnouncement, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Announcement deleted successfully");
});

test("POST /announcements/:id/publish — publishAnnouncement returns 200 with the published announcement", async () => {
  const req = baseReq({ params: { id: ANN_ID } });
  const { res, next } = await invoke(announcementCtrl.publishAnnouncement, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Announcement published successfully");
  assert.equal(res.body.data.announcement.status, "published");
});

test("POST /announcements/:id/schedule — scheduleAnnouncement returns 200 with the scheduled announcement", async () => {
  const req = baseReq({ params: { id: ANN_ID }, body: { scheduledAt: "2026-11-01T10:00:00.000Z" } });
  const { res, next } = await invoke(announcementCtrl.scheduleAnnouncement, req);
  assertSuccess(res, next, 200);
  assert.match(res.body.message, /Announcement scheduled for 2026-11-01T10:00:00\.000Z/);
  assert.equal(res.body.data.announcement.status, "scheduled");
});

test("POST /announcements/:id/archive — archiveAnnouncement returns 200 with the archived announcement", async () => {
  const req = baseReq({ params: { id: ANN_ID } });
  const { res, next } = await invoke(announcementCtrl.archiveAnnouncement, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Announcement archived successfully");
  assert.equal(res.body.data.announcement.status, "archived");
});

// ===========================================================================
// controllers/promotion.controller.js
// ===========================================================================

test("GET /promotions — getAllPromotions returns 200 with promotions and pagination", async () => {
  const req = baseReq({ query: { page: "1", limit: "20" } });
  const { res, next } = await invoke(promotionCtrl.getAllPromotions, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.promotions, [promotionFixture]);
  assert.deepEqual(res.body.data.pagination, paginationFixture);
});

test("POST /promotions/preview — previewPromotion returns 200 with the target audience count", async () => {
  const req = baseReq({ body: { targetAudience: { type: "all" } } });
  const { res, next } = await invoke(promotionCtrl.previewPromotion, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.targetCount, 3);
  assert.equal(res.body.data.audienceType, "all");
});

test("GET /promotions/:id — getPromotion returns 200 with the promotion", async () => {
  const req = baseReq({ params: { id: PROMO_ID } });
  const { res, next } = await invoke(promotionCtrl.getPromotion, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.promotion, promotionFixture);
});

test("DELETE /promotions/:id — deletePromotion returns 200 with the deletion message", async () => {
  const req = baseReq({ params: { id: PROMO_ID } });
  const { res, next } = await invoke(promotionCtrl.deletePromotion, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Promotion deleted successfully");
});

test("POST /promotions/:id/schedule — schedulePromotion returns 200 with the scheduled promotion", async () => {
  const req = baseReq({ params: { id: PROMO_ID }, body: { scheduledAt: "2026-11-05T09:30:00.000Z" } });
  const { res, next } = await invoke(promotionCtrl.schedulePromotion, req);
  assertSuccess(res, next, 200);
  assert.match(res.body.message, /Promotion scheduled for 2026-11-05T09:30:00\.000Z/);
  assert.equal(res.body.data.promotion.status, "scheduled");
});

test("POST /promotions/:id/cancel — cancelPromotion returns 200 with the cancelled promotion", async () => {
  const req = baseReq({ params: { id: PROMO_ID } });
  const { res, next } = await invoke(promotionCtrl.cancelPromotion, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Promotion cancelled successfully");
  assert.equal(res.body.data.promotion.status, "cancelled");
});

test("GET /promotions/:id/analytics — getPromotionAnalytics returns 200 with the analytics", async () => {
  const req = baseReq({ params: { id: PROMO_ID } });
  const { res, next } = await invoke(promotionCtrl.getPromotionAnalytics, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.analytics.promotionId, PROMO_ID);
  assert.equal(res.body.data.analytics.metrics.deliveredCount, 10);
});

// ===========================================================================
// controllers/contact.controller.js
// ===========================================================================

test("GET /contacts — getAllContacts returns 200 with contacts and pagination", async () => {
  const { res, next } = await invoke(contactCtrl.getAllContacts, baseReq({ query: {} }));
  assertSuccess(res, next, 200);
  assert.equal(res.body.results, contactList.length);
  assert.equal(res.body.data.contacts.length, contactList.length);
  assert.equal(res.body.data.pagination.total, 2);
});

test("GET /contacts/stats — getContactStats returns 200 with the stats", async () => {
  const { res, next } = await invoke(contactCtrl.getContactStats, baseReq());
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.stats, { total: 10, unread: 3, statusCounts: { new: 4 }, categoryCounts: { general: 5 } });
});

test("GET /contacts/:id — getContact returns 200 with the contact", async () => {
  currentContact = freshContact();
  const req = baseReq({ params: { id: CONTACT_ID } });
  const { res, next } = await invoke(contactCtrl.getContact, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.contact._id, CONTACT_ID);
  assert.equal(res.body.data.contact.email, "jane@example.com");
});

test("PATCH /contacts/:id — updateContact returns 200 with the updated contact", async () => {
  currentContact = freshContact();
  const req = baseReq({ params: { id: CONTACT_ID }, body: { status: "in-progress", priority: "high" } });
  const { res, next } = await invoke(contactCtrl.updateContact, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.contact.status, "in-progress");
  assert.equal(res.body.data.contact.priority, "high");
});

test("POST /contacts/:id/respond — respondToContact returns 200 after the response email is accepted", async () => {
  currentContact = freshContact();
  const req = baseReq({ params: { id: CONTACT_ID }, body: { message: "Thanks for reaching out!" } });
  const { res, next } = await invoke(contactCtrl.respondToContact, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Response submitted to the email provider");
  assert.equal(res.body.data.contact.status, "resolved");
  assert.equal(res.body.data.contact.response.deliveryStatus, "accepted");
  assert.equal(res.body.data.contact.response.providerMessageId, "msg-1");
});

test("DELETE /contacts/:id — deleteContact returns 200 with the deletion message", async () => {
  currentContact = freshContact();
  const req = baseReq({ params: { id: CONTACT_ID } });
  const { res, next } = await invoke(contactCtrl.deleteContact, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Contact deleted successfully");
  assert.equal(res.body.data, null);
});

// NOTE: the bulk route is shadowed at the routing layer, but the handler
// itself is invocable — this exercises bulkUpdateContacts directly.
test("PATCH /contacts/bulk/update — bulkUpdateContacts returns 200 reporting the matched count", async () => {
  const req = baseReq({ body: { ids: [CONTACT_ID, CONTACT_ID_2], status: "resolved" } });
  const { res, next } = await invoke(contactCtrl.bulkUpdateContacts, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "2 contacts updated successfully");
});
