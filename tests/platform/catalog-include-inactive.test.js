// Phase 6.5 (SR-P6-1) — the public catalog registry lists
// (GET /catalog/product-types, /rooms, /collections) return active
// entries only, which made deactivated entries invisible to the
// very admin pages that manage them. The fix honors
// ?includeInactive=true ONLY for an authenticated admin: the three
// list routes gain protectOptional (guests and non-admins keep the
// byte-identical active-only behavior, and the parameter is never
// acknowledged to them), and each list controller widens its
// filter only when req.user is an admin asking for it.
//
// The REAL catalog router is mounted in a throwaway express app;
// models and the heavy services are stubbed (slug-routes
// technique), so what is exercised end to end is the actual route
// + optional-auth + controller wiring. Auth uses locally signed
// JWTs (slug-routes pattern).
process.env.JWT_SECRET = "<redacted_labeled_credential_1>";
const test = require("node:test");
const { before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { stubModule, makeQuery } = require("../audit/helpers");

const TYPES = [
  { key: "sofa", label: "Sofa", active: true, sortOrder: 0 },
  { key: "pouf", label: "Pouf", active: false, sortOrder: 1 },
];
const ROOMS = [
  { slug: "living-room", label: "Living Room", active: true, sortOrder: 0 },
  { slug: "attic", label: "Attic", active: false, sortOrder: 1 },
];
const COLLECTIONS = [
  { slug: "featured-picks", label: "Featured Picks", active: true, sortOrder: 0, kind: "manual" },
  { slug: "old-promo", label: "Old Promo", active: false, sortOrder: 1, kind: "manual" },
];
// The controllers call find({ active: true }) for the public view;
// the stub applies the same filter the real model would.
const listFind = (fixtures) => (query) =>
  makeQuery(query && query.active === true ? fixtures.filter((f) => f.active) : [...fixtures]);

stubModule("models/productType.model.js", { find: listFind(TYPES) });
stubModule("models/room.model.js", { find: listFind(ROOMS) });
stubModule("models/collection.model.js", { find: listFind(COLLECTIONS) });
stubModule("models/attributeDefinition.model.js", {
  find: () => makeQuery([]),
  exists: async () => null,
});
stubModule("models/category.model.js", {
  find: () => makeQuery([]),
  findOne: () => makeQuery(null),
  getCategoryTree: async () => [],
  getDescendantIds: async () => [],
});
stubModule("models/product.model.js", {
  find: () => makeQuery([]),
  countDocuments: async () => 0,
  exists: async () => null,
});
const USERS = {
  "admin-1": {
    _id: "admin-1", role: "admin", isActive: true, deletedAt: null,
    email: "admin@example.invalid", firstName: "Admin", lastName: "User", avatar: null, phone: null,
  },
  "user-1": {
    _id: "user-1", role: "customer", isActive: true, deletedAt: null,
    email: "user@example.invalid", firstName: "Regular", lastName: "User", avatar: null, phone: null,
  },
};
stubModule("models/user.model.js", {
  findById: (id) => makeQuery(USERS[id] || null),
});
stubModule("models/revokedToken.model.js", { exists: async () => null });
stubModule("services/collection.service.js", {
  resolveCollectionProducts: async () => ({ products: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }),
});
stubModule("services/attributeResolution.service.js", {
  resolveForCategory: async () => [],
  resolveForProductType: async () => null,
});
stubModule("services/catalogFacets.service.js", {
  computeFacets: async () => ({ facets: { attributes: [] }, total: 0 }),
});

const express = require("express");
const catalogRoutes = require("../../routes/catalog.routes");

const app = express();
app.use(express.json());
app.use("/api/v1/catalog", catalogRoutes);
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
// signToken issues (FA-18), so the harness tokens carry them too.
const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
    issuer: "aura-interiors",
    audience: "aura-interiors-api",
  });
const asAdmin = { authorization: `Bearer ${sign("admin-1")}` };
const asCustomer = { authorization: `Bearer ${sign("user-1")}` };
const asGarbage = { authorization: "Bearer not-a-real-token" };

const LISTS = [
  { path: "/product-types", field: "productTypes", idOf: (x) => x.key, active: "sofa", inactive: "pouf" },
  { path: "/rooms", field: "rooms", idOf: (x) => x.slug, active: "living-room", inactive: "attic" },
  { path: "/collections", field: "collections", idOf: (x) => x.slug, active: "featured-picks", inactive: "old-promo" },
];

async function listIds({ path, field, idOf }, query = "", headers = {}) {
  const res = await fetch(`${base}/api/v1/catalog${path}${query}`, { headers });
  assert.equal(res.status, 200);
  const body = await res.json();
  return body.data[field].map(idOf);
}

for (const list of LISTS) {
  test(`SR-P6-1: GET /catalog${list.path} — includeInactive honored for admins only`, async () => {
    // Default behavior is unchanged for everyone.
    assert.deepEqual(await listIds(list), [list.active]);
    assert.deepEqual(await listIds(list, "", asAdmin), [list.active]);
    // Anonymous and non-admin requests get active-only even when
    // they pass the parameter; an invalid token is a guest.
    assert.deepEqual(await listIds(list, "?includeInactive=true"), [list.active]);
    assert.deepEqual(await listIds(list, "?includeInactive=true", asCustomer), [list.active]);
    assert.deepEqual(await listIds(list, "?includeInactive=true", asGarbage), [list.active]);
    // An authenticated admin asking for it sees every entry,
    // including the deactivated one.
    assert.deepEqual(await listIds(list, "?includeInactive=true", asAdmin), [list.active, list.inactive]);
  });
}
