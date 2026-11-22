// Batch 5 (Handover / team roles / audit viewer / exports / media)
// — server tests. Style follows tests/settings/batch4.test.js:
// models/services are stubbed through require.cache, no mongod.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repo = path.resolve(__dirname, "../..");
const abs = (rel) => path.join(repo, rel);

process.env.SETTINGS_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env["JWT_" + "SECRET"] = "test-only-" + "jwt-" + "secret";

// Deterministic secret sources for describeSecrets(): clear every
// service env var, then individual tests set exactly one.
const SERVICE_ENV_VARS = [
  "GROQ_API_KEY",
  "MISTRAL_API_KEY",
  "OPENROUTER_API_KEY",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "NVIDIA_API_KEY",
  "QDRANT_API_KEY",
  "BREVO_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "ESEWA_SECRET_KEY",
  "KHALTI_SECRET_KEY",
  "SMS_API_TOKEN",
  "FCM_SERVER_KEY",
];
for (const name of SERVICE_ENV_VARS) delete process.env[name];

function leanable(value) {
  return {
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
}

// Chainable mongoose-query stand-in: sort/populate/select/skip/limit
// return the query; lean()/await resolve the (skip/limit-sliced)
// result. populate calls are recorded when a recorder is supplied.
function chainable(getResult, recordPopulate) {
  const q = {
    _skip: 0,
    _limit: undefined,
    sort() {
      return q;
    },
    select() {
      return q;
    },
    populate(...args) {
      if (recordPopulate) recordPopulate(args);
      return q;
    },
    skip(n) {
      q._skip = n;
      return q;
    },
    limit(n) {
      q._limit = n;
      return q;
    },
    lean: async () => {
      const result = await getResult();
      if (!Array.isArray(result)) return result;
      return result.slice(
        q._skip,
        q._limit !== undefined ? q._skip + q._limit : undefined,
      );
    },
    then: (resolve, reject) => q.lean().then(resolve, reject),
  };
  return q;
}

function stub(rel, exports) {
  const p = abs(rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
}

// ---------- settings model (batch4 pattern) ----------

function makeSettingsModel() {
  let doc = null;
  return {
    _reset: () => {
      doc = null;
    },
    _doc: () => doc,
    findOne: () => leanable(doc),
    create: async (obj) => {
      doc = {
        ...obj,
        async save() {
          return this;
        },
      };
      return doc;
    },
  };
}
const settingsModel = makeSettingsModel();
stub("models/siteSettings.model.js", settingsModel);

// ---------- integration secrets model ----------

const integrationState = {
  docs: [],
  writes: 0, // create + deleteOne + doc.save counter
};
const integrationSecretModel = {
  find: () => leanable(integrationState.docs),
  findOne: (filter) =>
    leanable(
      integrationState.docs.find((d) => d.service === filter.service) ||
        null,
    ),
  create: async (obj) => {
    integrationState.writes += 1;
    integrationState.docs.push(obj);
    return obj;
  },
  deleteOne: async (filter) => {
    integrationState.writes += 1;
    integrationState.docs = integrationState.docs.filter(
      (d) => d.service !== filter.service,
    );
    return { deletedCount: 1 };
  },
};
stub("models/integrationSecret.model.js", integrationSecretModel);

// ---------- audit log service (real redact, capturing record) ----------

const realAuditService = require(abs("services/auditLog.service.js"));
const auditCalls = [];
stub("services/auditLog.service.js", {
  record: async (entry) => {
    auditCalls.push(entry);
    return entry;
  },
  redact: realAuditService.redact,
});

// ---------- mongoose: connected (settingsService.isDbReady) ----------

require.cache[require.resolve("mongoose")] = {
  id: "mongoose",
  filename: "mongoose",
  loaded: true,
  exports: { connection: { readyState: 1 } },
};

// ---------- catalog cache ----------

let cacheInvalidations = 0;
stub("utils/catalogCache.js", {
  invalidateCatalogCache: () => {
    cacheInvalidations += 1;
  },
});

// ---------- product / cart / wishlist / order stubs ----------

const productState = {
  demoCount: 3,
  totalCount: 10,
  demoDocs: [{ _id: "demo1" }, { _id: "demo2" }, { _id: "demo3" }],
  exportDocs: [],
  countCalls: [],
  findCalls: [],
  deleteManyCalls: [],
};
const isDemoFilter = (filter) =>
  !!filter && Array.isArray(filter.$and);
const productModel = {
  countDocuments: async (filter) => {
    productState.countCalls.push(filter);
    return isDemoFilter(filter)
      ? productState.demoCount
      : productState.totalCount;
  },
  find: (filter) => {
    productState.findCalls.push(filter);
    return chainable(() =>
      isDemoFilter(filter) ? productState.demoDocs : productState.exportDocs,
    );
  },
  deleteMany: async (filter) => {
    productState.deleteManyCalls.push(filter);
    return { deletedCount: productState.demoCount };
  },
};
stub("models/product.model.js", productModel);

const cartCalls = [];
stub("models/cart.model.js", {
  updateMany: async (filter, update) => {
    cartCalls.push({ filter, update });
    return { modifiedCount: 1 };
  },
});
const wishlistCalls = [];
stub("models/wishlist.model.js", {
  updateMany: async (filter, update) => {
    wishlistCalls.push({ filter, update });
    return { modifiedCount: 1 };
  },
});

let orderInteractions = 0;
stub("models/order.model.js", {
  find: () => {
    orderInteractions += 1;
    return chainable(() => orderState.docs);
  },
  countDocuments: async () => {
    orderInteractions += 1;
    return orderState.docs.length;
  },
});
const orderState = {
  docs: [
    {
      orderId: "AUORDER1",
      createdAt: new Date("2026-11-01T10:00:00.000Z"),
      guestInfo: { email: "guest@example.test" },
      items: [{}, {}],
      total: 4200,
      orderStatus: "delivered",
      paymentStatus: "paid",
    },
  ],
};

// ---------- user stub ----------

function makeUserDoc(fields) {
  return {
    deletedAt: null,
    ...fields,
    id: fields._id,
    async save() {
      return this;
    },
  };
}
const userState = {
  byId: new Map(),
  adminCount: 1,
  teamCount: 2,
  customerDocs: [],
  findCalls: [],
  countCalls: [],
};
const userModel = {
  findById: async (id) => userState.byId.get(String(id)) || null,
  countDocuments: async (filter) => {
    userState.countCalls.push(filter);
    if (filter && filter.role === "admin") return userState.adminCount;
    if (filter && filter.role && filter.role.$in) return userState.teamCount;
    return 0;
  },
  find: (filter) => {
    userState.findCalls.push(filter);
    return chainable(() => userState.customerDocs);
  },
};
stub("models/user.model.js", userModel);

// ---------- audit log model stub ----------

const auditState = { docs: [], findCalls: [], populateCalls: [] };
stub("models/auditLog.model.js", {
  find: (filter) => {
    auditState.findCalls.push(filter);
    return chainable(
      () =>
        auditState.docs.filter(
          (d) => !filter.action || d.action === filter.action,
        ),
      (args) => auditState.populateCalls.push(args),
    );
  },
  countDocuments: async (filter) =>
    auditState.docs.filter(
      (d) => !filter.action || d.action === filter.action,
    ).length,
});

// ---------- cloudinary stub ----------

const cloudinaryState = {
  config: { cloud_name: "demo-cloud", api_key: "key", api_secret: "shh" },
  expressions: [],
  destroyCalls: [],
  searchResult: {
    resources: [
      {
        public_id: "aura/products/sofa-1",
        secure_url: "https://res.example.test/aura/products/sofa-1.jpg",
        format: "jpg",
        width: 800,
        height: 600,
        bytes: 12345,
        created_at: "2026-11-01T00:00:00Z",
        folder: "aura/products",
      },
    ],
    next_cursor: "cursor-2",
  },
};
const fakeCloudinaryClient = {
  config: () => cloudinaryState.config,
  search: {
    expression: (expr) => {
      cloudinaryState.expressions.push(expr);
      const builder = {
        sort_by: () => builder,
        max_results: () => builder,
        next_cursor: () => builder,
        execute: async () => cloudinaryState.searchResult,
      };
      return builder;
    },
  },
  uploader: {
    destroy: async (publicId) => {
      cloudinaryState.destroyCalls.push(publicId);
      return { result: "ok" };
    },
  },
};
stub("config/cloudinary.js", {
  resolveCloudinaryConfig: async () => fakeCloudinaryClient,
});

// ---------- middleware / misc stubs (batch4 pattern) ----------

const AppError = require(abs("utils/AppError"));
stub("middleware/auth.middleware.js", {
  protect: (req, res, next) => {
    const role = req.headers["x-test-role"];
    if (!role) {
      return next(
        new AppError(
          "You are not logged in. Please log in to get access.",
          401,
        ),
      );
    }
    const id = req.headers["x-test-id"] || "u1";
    req.user = { _id: id, id, role, email: "admin@example.test" };
    return next();
  },
  restrictTo:
    (...roles) =>
    (req, res, next) =>
      roles.includes(req.user.role)
        ? next()
        : next(
            new AppError(
              "You do not have permission to perform this action.",
              403,
            ),
          ),
  requireRole:
    (...roles) =>
    (req, res, next) =>
      roles.includes(req.user.role)
        ? next()
        : next(
            new AppError(
              "You do not have permission to perform this action.",
              403,
            ),
          ),
});
const passthrough = (req, res, next) => next();
stub("middleware/rateLimit.middleware.js", {
  standardReadLimiter: passthrough,
  standardWriteLimiter: passthrough,
  adminReadLimiter: passthrough,
  adminWriteLimiter: passthrough,
});
stub("middleware/upload.middleware.js", {
  uploadCategoryImage: passthrough,
  resizeCategoryImage: passthrough,
});
stub("models/document.model.js", {
  find: () => ({ select: () => Promise.resolve([]) }),
});
stub("services/backgroundTasks.js", { runDocumentIngestion: () => {} });
stub("services/email.service.js", {
  sendTemplateTestEmail: async () => ({ messageId: "x" }),
});

// ---------- real services under test ----------

const settingsService = require(abs("services/settings/settingsService"));
const secretCrypto = require(abs("utils/secretCrypto"));
const { DEFAULT_SETTINGS } = require(abs("services/settings/defaults"));

// ---------- app ----------

function buildApp() {
  for (const rel of [
    "routes/adminSettings.routes.js",
    "routes/adminHandover.routes.js",
    "routes/user.routes.js",
    "controllers/settings.controller.js",
    "controllers/integrations.controller.js",
    "controllers/knowledge.controller.js",
    "controllers/handover.controller.js",
    "controllers/auditLog.controller.js",
    "controllers/export.controller.js",
    "controllers/media.controller.js",
    "controllers/user.controller.js",
    "services/handover.service.js",
    "services/mediaLibrary.service.js",
  ]) {
    delete require.cache[abs(rel)];
  }
  const express = require(abs("node_modules/express"));
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin", require(abs("routes/adminSettings.routes")));
  app.use("/api/v1/admin", require(abs("routes/adminHandover.routes")));
  app.use("/api/v1/users", require(abs("routes/user.routes")));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res
      .status(err.statusCode || 500)
      .json({ status: err.status || "error", message: err.message });
  });
  return app;
}
const app = buildApp();

async function withServer(fn) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const ADMIN = { "x-test-role": "admin" };
const MANAGER = { "x-test-role": "manager" };
const CUSTOMER = { "x-test-role": "customer" };

function resetAll() {
  settingsModel._reset();
  auditCalls.length = 0;
  integrationState.docs = [];
  integrationState.writes = 0;
  productState.demoCount = 3;
  productState.totalCount = 10;
  productState.exportDocs = [];
  productState.countCalls = [];
  productState.findCalls = [];
  productState.deleteManyCalls = [];
  cartCalls.length = 0;
  wishlistCalls.length = 0;
  orderInteractions = 0;
  userState.byId = new Map();
  userState.adminCount = 1;
  userState.teamCount = 2;
  userState.customerDocs = [];
  userState.findCalls = [];
  userState.countCalls = [];
  auditState.docs = [];
  auditState.findCalls = [];
  auditState.populateCalls = [];
  cacheInvalidations = 0;
  cloudinaryState.config = {
    cloud_name: "demo-cloud",
    api_key: "key",
    api_secret: "shh",
  };
  cloudinaryState.expressions = [];
  cloudinaryState.destroyCalls = [];
  for (const name of SERVICE_ENV_VARS) delete process.env[name];
}

// ---------- user model enum (real mongoose, child process) ----------

test("user model: role enum includes manager/staff (real model load)", () => {
  const script = `
    const User = require("./models/user.model.js");
    console.log(JSON.stringify(User.schema.path("role").enumValues));
  `;
  const out = execFileSync(process.execPath, ["-e", script], {
    cwd: repo,
    encoding: "utf8",
  });
  const enumValues = JSON.parse(out.trim().split("\n").at(-1));
  assert.deepEqual(enumValues, ["customer", "admin", "manager", "staff"]);
});

// ---------- demo status / wipe ----------

test("demo-status: counts only AUR-DEMO products (filter shape captured)", async () => {
  resetAll();
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/admin/handover/demo-status`, {
      headers: ADMIN,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.data, { demoProducts: 3, totalProducts: 10 });

    assert.equal(productState.countCalls.length, 2);
    const demoFilter = productState.countCalls.find((f) =>
      Array.isArray(f.$and),
    );
    assert.ok(demoFilter, "a $and demo filter was passed");
    assert.deepEqual(demoFilter.$and[0], { deletedAt: null });
    const or = demoFilter.$and[1].$or;
    assert.equal(or.length, 2);
    assert.ok(or[0].sku instanceof RegExp);
    assert.equal(or[0].sku.source, "^AUR-DEMO-");
    assert.ok(or[1]["catalogVariants.sku"] instanceof RegExp);
    assert.equal(or[1]["catalogVariants.sku"].source, "^AUR-DEMO-");
    const totalFilter = productState.countCalls.find(
      (f) => !Array.isArray(f.$and),
    );
    assert.deepEqual(totalFilter, { deletedAt: null });
  });
});

test("wipe-demo: confirm gate, demo-only delete, cart/wishlist cleanup, audit", async () => {
  resetAll();
  await withServer(async (base) => {
    const post = (headers, body) =>
      fetch(`${base}/api/v1/admin/handover/wipe-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });

    assert.equal((await post(ADMIN, {})).status, 400);
    assert.equal((await post(ADMIN, { confirm: "DELETE" })).status, 400);
    assert.equal(productState.deleteManyCalls.length, 0);

    const ok = await post(ADMIN, { confirm: "WIPE" });
    assert.equal(ok.status, 200);
    assert.deepEqual((await ok.json()).data, { deleted: 3 });

    // deleteMany received the demo filter (AUR-DEMO $or + not deleted).
    assert.equal(productState.deleteManyCalls.length, 1);
    const filter = productState.deleteManyCalls[0];
    assert.ok(Array.isArray(filter.$and));
    assert.equal(filter.$and[1].$or[0].sku.source, "^AUR-DEMO-");

    // Carts + wishlists pulled exactly the demo ids.
    assert.equal(cartCalls.length, 1);
    assert.deepEqual(cartCalls[0].update.$pull.items.product.$in, [
      "demo1",
      "demo2",
      "demo3",
    ]);
    assert.equal(wishlistCalls.length, 1);
    assert.deepEqual(wishlistCalls[0].update.$pull.products.product.$in, [
      "demo1",
      "demo2",
      "demo3",
    ]);

    // Orders never touched; catalog cache invalidated; audit written.
    assert.equal(orderInteractions, 0);
    assert.ok(cacheInvalidations >= 1);
    const wipeAudit = auditCalls.find(
      (e) => e.action === "handover.demoWipe",
    );
    assert.ok(wipeAudit);
    assert.deepEqual(wipeAudit.after, { deleted: 3 });
  });
});

test("handover routes: role matrix (401 anonymous, 403 team on admin-only, manager allowed on status)", async () => {
  resetAll();
  await withServer(async (base) => {
    const get = (path, headers) => fetch(`${base}${path}`, { headers });
    const post = (path, headers, body) =>
      fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });

    assert.equal(
      (await get("/api/v1/admin/handover/demo-status", {})).status,
      401,
    );
    assert.equal(
      (await get("/api/v1/admin/handover/demo-status", MANAGER)).status,
      403,
    );
    assert.equal(
      (await get("/api/v1/admin/handover/demo-status", CUSTOMER)).status,
      403,
    );
    assert.equal(
      (await post("/api/v1/admin/handover/wipe-demo", MANAGER, {
        confirm: "WIPE",
      })).status,
      403,
    );
    assert.equal(
      (await get("/api/v1/admin/handover/status", {})).status,
      401,
    );
    assert.equal(
      (await get("/api/v1/admin/handover/status", CUSTOMER)).status,
      403,
    );
    assert.equal(
      (await get("/api/v1/admin/handover/status", MANAGER)).status,
      200,
    );
  });
});

// ---------- handover status aggregation ----------

test("handover/status: aggregates keys, products, identity, payments from real state", async () => {
  resetAll();
  // 2 admin-stored secrets (real encryption), 1 env-only secret.
  for (const service of ["ai.groq", "email.brevo"]) {
    integrationState.docs.push({
      service,
      ...secretCrypto.encrypt(`plaintext-for-${service}`),
    });
  }
  process.env.OPENROUTER_API_KEY = "env-openrouter-1234";
  // eSewa merchant configured in settings (identity left at defaults).
  await settingsService.updateSection(
    "integrations",
    { esewa: { merchantId: "EPAYTEST-MERCHANT" } },
    { _id: "admin1" },
    "127.0.0.1",
  );

  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/admin/handover/status`, {
      headers: ADMIN,
    });
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.deepEqual(Object.keys(data).sort(), [
      "contact",
      "demoProducts",
      "hasAdminUsers",
      "identity",
      "keys",
      "maintenanceEnabled",
      "payments",
      "realProducts",
      "shippingZonesEnabled",
      "totalProducts",
    ]);
    // 15 known services: 2 admin + 1 env + 12 missing.
    assert.deepEqual(data.keys, { adminSet: 2, envOnly: 1, missing: 12 });
    assert.equal(data.demoProducts, 3);
    assert.equal(data.totalProducts, 10);
    assert.equal(data.realProducts, 7);
    assert.deepEqual(data.identity, {
      storeNameSet: false,
      logoSet: false,
    });
    assert.equal(
      data.identity.storeNameSet,
      DEFAULT_SETTINGS.identity.storeName === "Aura Interiors" ? false : true,
    );
    assert.deepEqual(data.contact, {
      phone: true,
      email: true,
      address: true,
    });
    assert.deepEqual(data.payments, { esewaConfigured: true });
    assert.equal(data.shippingZonesEnabled, 2);
    assert.equal(data.maintenanceEnabled, false);
    assert.equal(data.hasAdminUsers, true);
  });
  delete process.env.OPENROUTER_API_KEY;
});

// ---------- user role endpoint ----------

const HEX = {
  target: "64b64c2f4f5a6b7c8d9e0a01",
  self: "64b64c2f4f5a6b7c8d9e0a02",
  lastAdmin: "64b64c2f4f5a6b7c8d9e0a03",
  unknown: "64b64c2f4f5a6b7c8d9e0a99",
};

test("role endpoint: valid change, self-change, last-admin, invalid role, manager 403", async () => {
  resetAll();
  userState.byId.set(
    HEX.target,
    makeUserDoc({ _id: HEX.target, role: "customer" }),
  );
  userState.byId.set(
    HEX.self,
    makeUserDoc({ _id: HEX.self, role: "admin" }),
  );
  userState.byId.set(
    HEX.lastAdmin,
    makeUserDoc({ _id: HEX.lastAdmin, role: "admin" }),
  );
  userState.adminCount = 1;

  await withServer(async (base) => {
    const patch = (id, headers, body) =>
      fetch(`${base}/api/v1/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });

    // Non-admin (manager) is rejected by the admin-only router.
    assert.equal(
      (await patch(HEX.target, MANAGER, { role: "manager" })).status,
      403,
    );
    // Invalid role.
    assert.equal(
      (await patch(HEX.target, ADMIN, { role: "superuser" })).status,
      400,
    );
    // Unknown user.
    assert.equal(
      (await patch(HEX.unknown, ADMIN, { role: "manager" })).status,
      404,
    );
    // Self-change.
    const selfRes = await patch(
      HEX.self,
      { ...ADMIN, "x-test-id": HEX.self },
      { role: "manager" },
    );
    assert.equal(selfRes.status, 400);
    assert.match((await selfRes.json()).message, /own role/);
    // Demoting the last remaining admin.
    const lastRes = await patch(HEX.lastAdmin, ADMIN, { role: "manager" });
    assert.equal(lastRes.status, 400);
    assert.match(
      (await lastRes.json()).message,
      /last remaining admin/,
    );
    // Valid change + audit entry.
    const ok = await patch(HEX.target, ADMIN, { role: "manager" });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.data.user.role, "manager");
    assert.equal(userState.byId.get(HEX.target).role, "manager");
    const entry = auditCalls.find((e) => e.action === "user.role.update");
    assert.ok(entry);
    assert.deepEqual(entry.before, { role: "customer" });
    assert.deepEqual(entry.after, { role: "manager" });
  });
});

// ---------- audit logs viewer ----------

test("audit-logs: pagination math, action filter, actor populate, secret stripping", async () => {
  resetAll();
  auditState.docs = [
    {
      _id: "l1",
      action: "settings.update",
      at: new Date("2026-11-03T00:00:00Z"),
      before: { passwordHash: "nope", isActive: true },
      after: { apiSecret: "should-not-leak", section: "identity" },
    },
    {
      _id: "l2",
      action: "user.role.update",
      at: new Date("2026-11-02T00:00:00Z"),
      before: { role: "customer" },
      after: { role: "manager" },
    },
    {
      _id: "l3",
      action: "settings.update",
      at: new Date("2026-11-01T00:00:00Z"),
      before: null,
      after: { section: "theme" },
    },
  ];
  await withServer(async (base) => {
    // Action filter reaches find(); populate is applied to actor.
    const filtered = await fetch(
      `${base}/api/v1/admin/audit-logs?action=settings.update`,
      { headers: MANAGER },
    );
    assert.equal(filtered.status, 200);
    const filteredBody = await filtered.json();
    assert.deepEqual(auditState.findCalls.at(-1), {
      action: "settings.update",
    });
    assert.deepEqual(auditState.populateCalls.at(-1), [
      "actor",
      "firstName lastName email role",
    ]);
    assert.equal(filteredBody.data.pagination.total, 2);

    // Pagination: page 2 of size 2 over 3 rows -> 1 result, 2 pages.
    const page2 = await fetch(
      `${base}/api/v1/admin/audit-logs?page=2&limit=2`,
      { headers: ADMIN },
    );
    const page2Body = await page2.json();
    assert.deepEqual(page2Body.data.pagination, {
      page: 2,
      limit: 2,
      total: 3,
      pages: 2,
    });
    assert.equal(page2Body.results, 1);

    // Secret-ish keys are stripped from before/after in responses.
    const all = await fetch(`${base}/api/v1/admin/audit-logs`, {
      headers: ADMIN,
    });
    const text = await all.text();
    assert.ok(!text.includes("should-not-leak"));
    assert.ok(!text.includes("passwordHash"));
    const allBody = JSON.parse(text);
    const first = allBody.data.logs.find((l) => l._id === "l1");
    assert.deepEqual(first.after, { section: "identity" });
    assert.deepEqual(first.before, { isActive: true });

    // Customers cannot read the audit trail.
    assert.equal(
      (
        await fetch(`${base}/api/v1/admin/audit-logs`, {
          headers: CUSTOMER,
        })
      ).status,
      403,
    );
  });
});

// ---------- exports + backup/restore ----------

test("exports: products.csv header + quoted row; orders/customers headers", async () => {
  resetAll();
  productState.exportDocs = [
    {
      sku: "AUR-001",
      name: 'Sofa, "Luxury"',
      category: { name: "Living Room" },
      price: 1000,
      stock: 5,
      status: "active",
    },
  ];
  userState.customerDocs = [
    {
      firstName: "Sita",
      lastName: "Sharma",
      email: "sita@example.test",
      phone: "9800000000",
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
    },
  ];
  await withServer(async (base) => {
    const products = await fetch(
      `${base}/api/v1/admin/export/products.csv`,
      { headers: ADMIN },
    );
    assert.equal(products.status, 200);
    assert.match(
      products.headers.get("content-type"),
      /text\/csv/,
    );
    assert.match(
      products.headers.get("content-disposition"),
      /products\.csv/,
    );
    const lines = (await products.text()).split("\n");
    assert.equal(lines[0], "sku,name,category,price,stock,status");
    assert.equal(
      lines[1],
      'AUR-001,"Sofa, ""Luxury""",Living Room,1000,5,active',
    );

    const orders = await fetch(`${base}/api/v1/admin/export/orders.csv`, {
      headers: ADMIN,
    });
    const orderLines = (await orders.text()).split("\n");
    assert.equal(
      orderLines[0],
      "orderId,date,customerEmail,itemsCount,total,status,paymentStatus",
    );
    assert.equal(
      orderLines[1],
      "AUORDER1,2026-11-01T10:00:00.000Z,guest@example.test,2,4200,delivered,paid",
    );

    const customers = await fetch(
      `${base}/api/v1/admin/export/customers.csv`,
      { headers: ADMIN },
    );
    const customerLines = (await customers.text()).split("\n");
    assert.equal(customerLines[0], "name,email,phone,joined");
    assert.equal(
      customerLines[1],
      "Sita Sharma,sita@example.test,9800000000,2026-10-01T00:00:00.000Z",
    );

    // Exports are Owner-only.
    assert.equal(
      (
        await fetch(`${base}/api/v1/admin/export/products.csv`, {
          headers: MANAGER,
        })
      ).status,
      403,
    );
  });
});

test("backup: secrets excluded marker and no secret material anywhere in the payload", async () => {
  resetAll();
  const planted = secretCrypto.encrypt("planted-secret-value-9876");
  integrationState.docs = [
    { service: "ai.groq", ...planted },
  ];
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/admin/settings/backup`, {
      headers: ADMIN,
    });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(!text.includes("planted-secret-value-9876"));
    assert.ok(!text.includes(planted.ciphertext));
    const body = JSON.parse(text);
    assert.equal(body.data.backup.version, 1);
    assert.equal(body.data.backup.secrets, "excluded");
    assert.ok(body.data.backup.exportedAt);
    assert.deepEqual(
      body.data.backup.integrationsConfig,
      body.data.backup.settings.integrations,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/admin/settings/backup`, {
          headers: MANAGER,
        })
      ).status,
      403,
    );
  });
});

test("restore: applies valid sections, skips invalid, ignores payload secrets", async () => {
  resetAll();
  await withServer(async (base) => {
    const post = (headers, body) =>
      fetch(`${base}/api/v1/admin/settings/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });

    assert.equal((await post(ADMIN, {})).status, 400);
    assert.equal((await post(MANAGER, { backup: {} })).status, 403);

    const res = await post(ADMIN, {
      backup: {
        version: 1,
        settings: {
          identity: { storeName: "New Store Name" },
          theme: { primaryColor: "not-a-color" },
          bogusSection: { x: 1 },
        },
        secrets: { "ai.groq": "must-never-be-stored" },
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.data.appliedSections, ["identity"]);
    const skipped = Object.fromEntries(
      body.data.skippedSections.map((s) => [s.section, s.reason]),
    );
    assert.ok(skipped.theme);
    assert.ok(skipped.bogusSection);
    // Applied through the real settings service.
    const settings = await settingsService.getSettings();
    assert.equal(settings.identity.storeName, "New Store Name");
    // The payload's secrets key caused NO IntegrationSecret write.
    assert.equal(integrationState.writes, 0);
    assert.equal(integrationState.docs.length, 0);
    const entry = auditCalls.find((e) => e.action === "settings.restore");
    assert.ok(entry);
    assert.deepEqual(entry.after, { appliedSections: ["identity"] });

    // integrationsConfig fallback applies as the integrations section.
    const res2 = await post(ADMIN, {
      backup: {
        integrationsConfig: { esewa: { merchantId: "MERCHANT-9" } },
      },
    });
    assert.equal(res2.status, 200);
    assert.deepEqual((await res2.json()).data.appliedSections, [
      "integrations",
    ]);
    const settings2 = await settingsService.getSettings();
    assert.equal(settings2.integrations.esewa.merchantId, "MERCHANT-9");
  });
});

// ---------- media library ----------

test("media: list maps the search-API shape; search term joins the expression", async () => {
  resetAll();
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/admin/media`, {
      headers: MANAGER,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(cloudinaryState.expressions.at(-1), "folder:aura/*");
    assert.equal(body.data.nextCursor, "cursor-2");
    assert.deepEqual(body.data.media, [
      {
        publicId: "aura/products/sofa-1",
        url: "https://res.example.test/aura/products/sofa-1.jpg",
        format: "jpg",
        width: 800,
        height: 600,
        bytes: 12345,
        createdAt: "2026-11-01T00:00:00Z",
        folder: "aura/products",
      },
    ]);

    const searched = await fetch(
      `${base}/api/v1/admin/media?search=sofa`,
      { headers: ADMIN },
    );
    assert.equal(searched.status, 200);
    assert.equal(
      cloudinaryState.expressions.at(-1),
      "folder:aura/* AND filename:*sofa*",
    );
  });
});

test("media: unconfigured Cloudinary -> 503", async () => {
  resetAll();
  cloudinaryState.config = {};
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/admin/media`, {
      headers: ADMIN,
    });
    assert.equal(res.status, 503);
  });
});

test("media: delete destroys by publicId, refuses ids outside aura/, manager 403", async () => {
  resetAll();
  await withServer(async (base) => {
    const del = (headers, body) =>
      fetch(`${base}/api/v1/admin/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });

    const ok = await del(ADMIN, { publicId: "aura/products/sofa-1" });
    assert.equal(ok.status, 200);
    assert.deepEqual(cloudinaryState.destroyCalls, [
      "aura/products/sofa-1",
    ]);
    const entry = auditCalls.find((e) => e.action === "media.delete");
    assert.ok(entry);
    assert.equal(entry.targetId, "aura/products/sofa-1");

    const outside = await del(ADMIN, { publicId: "other-folder/x" });
    assert.equal(outside.status, 400);
    assert.equal(cloudinaryState.destroyCalls.length, 1);

    assert.equal(
      (await del(MANAGER, { publicId: "aura/products/sofa-1" })).status,
      403,
    );
    assert.equal((await del(ADMIN, {})).status, 400);
  });
});

// ---------- adminSettings restructure: role matrix spot checks ----------

test("settings routes: manager can read/update settings, cannot reset or read integrations", async () => {
  resetAll();
  await withServer(async (base) => {
    const get = (path, headers) => fetch(`${base}${path}`, { headers });
    const send = (method, path, headers, body) =>
      fetch(`${base}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });

    assert.equal(
      (await get("/api/v1/admin/settings", MANAGER)).status,
      200,
    );
    assert.equal(
      (
        await send("PUT", "/api/v1/admin/settings/identity", MANAGER, {
          storeName: "Manager Edit Store",
        })
      ).status,
      200,
    );
    assert.equal(
      (await get("/api/v1/admin/settings", CUSTOMER)).status,
      403,
    );
    assert.equal(
      (
        await send("POST", "/api/v1/admin/settings/reset", MANAGER, {})
      ).status,
      403,
    );
    assert.equal(
      (
        await send("POST", "/api/v1/admin/settings/reset", ADMIN, {})
      ).status,
      200,
    );
    assert.equal(
      (await get("/api/v1/admin/integrations", MANAGER)).status,
      403,
    );
    assert.equal(
      (await get("/api/v1/admin/integrations", ADMIN)).status,
      200,
    );
    assert.equal(
      (
        await send(
          "POST",
          "/api/v1/admin/settings/test-email",
          MANAGER,
          { template: "magicLink" },
        )
      ).status,
      200,
    );
  });
});
