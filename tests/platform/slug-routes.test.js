// Phase 0.5 (SR-8) — the public product/category DETAIL routes must
// accept slugs. The controllers already resolve slug-or-id
// (product.controller getProduct, category.controller getCategory /
// getCategoryProducts), but router.param("id", objectIdParam) 400'd
// every non-ObjectId before they could run, so e.g.
// GET /products/<slug> — the storefront's canonical product URL —
// never reached the handler. The fix makes the :id guard method-aware
// for these two routers: public GETs pass through to the controller's
// slug-or-id resolution (unknown slug -> the controller's 404), while
// mutations keep the strict ObjectId 400. The reviews nesting
// (:productId) and GET /:id/related — whose controller has no slug
// branch — keep strict validation.
//
// The REAL routers are mounted in a throwaway express app; models and
// upload/cloudinary modules are stubbed (audit/helpers technique), so
// what is exercised end to end is the actual route + guard + auth
// wiring. Auth uses a locally signed admin JWT (cluster-a pattern).
process.env.JWT_SECRET = "<redacted>";
const test = require("node:test");
const { before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { stubModule, makeQuery } = require("../audit/helpers");

const PID = "64b64c64b64c64b64c64b64c"; // 24-hex product id
const CID = "64b64c64b64c64b64c64b64d"; // 24-hex category id
const CATS = [
  { _id: CID, slug: "living-room", name: "Living Room", parent: null },
  { _id: "c-sofas", slug: "sofas", name: "Sofas", parent: CID },
];
const PRODUCT = {
  _id: PID,
  slug: "oslo-sofa",
  name: "Oslo Sofa",
  status: "active",
  deletedAt: null,
  category: CID,
  style: "modern",
};

stubModule("models/product.model.js", {
  findOne: (query) => {
    if (query && query.slug === "oslo-sofa") return makeQuery(PRODUCT);
    if (query && String(query._id) === PID) return makeQuery(PRODUCT);
    return makeQuery(null);
  },
  find: () => makeQuery([]),
  countDocuments: async () => 0,
});
stubModule("models/category.model.js", {
  findOne: (query) => {
    if (query && query.slug === "living-room") return makeQuery(CATS[0]);
    if (query && String(query._id) === CID) return makeQuery(CATS[0]);
    return makeQuery(null);
  },
  find: () => makeQuery(CATS),
  getDescendantIds: async function (id) {
    const categories = await this.find({}, "_id parent").lean();
    const children = new Map();
    for (const category of categories) {
      const key = String(category.parent || "");
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(String(category._id));
    }
    const seen = new Set();
    const queue = [String(id)];
    while (queue.length) {
      const current = queue.shift();
      if (seen.has(current)) continue;
      seen.add(current);
      queue.push(...(children.get(current) || []));
    }
    return [...seen];
  },
});
stubModule("models/user.model.js", {
  findById: () =>
    makeQuery({
      _id: "admin-1",
      role: "admin",
      isActive: true,
      deletedAt: null,
      email: "admin@example.invalid",
      firstName: "Admin",
      lastName: "User",
      avatar: null,
      phone: null,
    }),
});
stubModule("models/revokedToken.model.js", { exists: async () => null });
stubModule("middleware/upload.middleware.js", {
  deleteFile: async () => {},
  deleteFiles: async () => {},
  uploadProductFiles: (req, res, next) => next(),
  processProductFiles: (req, res, next) => next(),
  uploadCategoryImage: (req, res, next) => next(),
  resizeCategoryImage: (req, res, next) => next(),
});
stubModule("config/cloudinary.js", { deleteFromCloudinary: async () => {} });

const express = require("express");
const productRoutes = require("../../routes/product.routes");
const categoryRoutes = require("../../routes/category.routes");

const app = express();
app.use(express.json());
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
// Mirror the app's error envelope closely enough for status assertions.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ status: "error", message: err.message });
});

let server;
let base;
before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// utils/authToken.verify enforces the iss/aud claims the app's own
// signToken issues (FA-18), so the harness token carries them too.
const adminToken = jwt.sign({ id: "admin-1" }, process.env.JWT_SECRET, {
  algorithm: "HS256",
  expiresIn: "1h",
  issuer: "aura-interiors",
  audience: "aura-interiors-api",
});
const asAdmin = { authorization: `Bearer ${adminToken}`, "content-type": "application/json" };

test("SR-8: GET /products/:slug resolves the product (200)", async () => {
  const res = await fetch(`${base}/api/v1/products/oslo-sofa`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.product.slug, "oslo-sofa");
});

test("SR-8: GET /products/:id (ObjectId) still resolves (200)", async () => {
  const res = await fetch(`${base}/api/v1/products/${PID}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.product._id, PID);
});

test("SR-8: GET /products/<unknown slug> is the controller's 404, not a guard 400", async () => {
  const res = await fetch(`${base}/api/v1/products/no-such-product`);
  assert.equal(res.status, 404);
});

test("SR-8: GET /products/:id/related keeps working by ObjectId (200)", async () => {
  const res = await fetch(`${base}/api/v1/products/${PID}/related`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data.products));
});

test("SR-8: GET /products/:slug/related stays ObjectId-strict (400) — no slug branch in that controller", async () => {
  const res = await fetch(`${base}/api/v1/products/oslo-sofa/related`);
  assert.equal(res.status, 400);
});

test("SR-8: PATCH /products/<slug-shaped id> as admin still 400 (mutations keep strict validation)", async () => {
  const res = await fetch(`${base}/api/v1/products/oslo-sofa`, {
    method: "PATCH",
    headers: asAdmin,
    body: JSON.stringify({ name: "Renamed" }),
  });
  assert.equal(res.status, 400);
});

test("SR-8: DELETE /products/<malformed id> as admin still 400", async () => {
  const res = await fetch(`${base}/api/v1/products/junk!!id`, {
    method: "DELETE",
    headers: asAdmin,
  });
  assert.equal(res.status, 400);
});

test("SR-8: GET /categories/:slug resolves the category (200)", async () => {
  const res = await fetch(`${base}/api/v1/categories/living-room`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.category.slug, "living-room");
});

test("SR-8: GET /categories/:id (ObjectId) still resolves (200)", async () => {
  const res = await fetch(`${base}/api/v1/categories/${CID}`);
  assert.equal(res.status, 200);
});

test("SR-8: GET /categories/<unknown slug> is the controller's 404, not a guard 400", async () => {
  const res = await fetch(`${base}/api/v1/categories/no-such-category`);
  assert.equal(res.status, 404);
});

test("SR-8: GET /categories/:slug/products reaches the subtree listing (200)", async () => {
  const res = await fetch(`${base}/api/v1/categories/living-room/products`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.category.slug, "living-room");
});

test("SR-8: PATCH /categories/<slug> as admin still 400 (mutations keep strict validation)", async () => {
  const res = await fetch(`${base}/api/v1/categories/living-room`, {
    method: "PATCH",
    headers: asAdmin,
    body: JSON.stringify({ name: "Renamed" }),
  });
  assert.equal(res.status, 400);
});

test("SR-8: DELETE /categories/<malformed id> as admin still 400", async () => {
  const res = await fetch(`${base}/api/v1/categories/not-an-id`, {
    method: "DELETE",
    headers: asAdmin,
  });
  assert.equal(res.status, 400);
});
