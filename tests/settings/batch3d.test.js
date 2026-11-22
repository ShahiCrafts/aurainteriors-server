// Batch 3d — server additions for the Settings redesign:
//   (1) theme gains backgroundColor / headerStyle / darkMode /
//       roundedCards / showShadows / customCss with defaults equal
//       to the site's current look (page bg #f3f4f6 from index.html,
//       white "light" navbar, no custom CSS).
//   (2) contact.businessHours — structured per-day rows, all closed
//       by default (the store publishes no hours today).
//   (3) seo gains features{...} (all true = current runtime-head
//       behaviour), canonicalUrl "", defaultLanguage "en-NP",
//       indexingEnabled true, noindexPages [] — all in the public
//       projection; searchConsoleVerification stays admin-only.
//   (4) POST /api/v1/admin/settings/reset — auth gates, per-section
//       and full reset, audit written.
//
// Style follows tests/settings/batch3a.test.js: models and services
// stubbed through require.cache, no mongod needed.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const repo = path.resolve(__dirname, "../..");
const abs = (rel) => path.join(repo, rel);

process.env.SETTINGS_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env["JWT_" + "SECRET"] = "test-only-" + "jwt-" + "secret";

function leanable(value) {
  return {
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
}

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
const auditCalls = [];

function stub(rel, exports) {
  const p = abs(rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
}

stub("models/siteSettings.model.js", settingsModel);
stub("models/integrationSecret.model.js", {
  findOne: () => leanable(null),
  find: () => leanable([]),
});
stub("services/auditLog.service.js", {
  record: async (entry) => {
    auditCalls.push(entry);
    return entry;
  },
  redact: (x) => x,
});

const { DEFAULT_SETTINGS } = require(abs("services/settings/defaults"));
const settingsService = require(abs("services/settings/settingsService"));
const AppError = require(abs("utils/AppError"));

function resetAll() {
  settingsModel._reset();
  auditCalls.length = 0;
}

// ---------- defaults ----------

test("defaults: theme additions equal the current look", () => {
  const t = DEFAULT_SETTINGS.theme;
  assert.equal(t.backgroundColor, "#f3f4f6");
  assert.equal(t.headerStyle, "light");
  assert.equal(t.darkMode, false);
  assert.equal(t.roundedCards, true);
  assert.equal(t.showShadows, true);
  assert.equal(t.customCss, "");
});

test("defaults: businessHours has 7 closed days, Mon–Sun in order", () => {
  const rows = DEFAULT_SETTINGS.contact.businessHours;
  assert.deepEqual(
    rows.map((r) => r.day),
    [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
  );
  assert.ok(rows.every((r) => r.open === false && r.hours === ""));
});

test("defaults: seo additions equal current runtime-head behaviour", () => {
  const seo = DEFAULT_SETTINGS.seo;
  assert.deepEqual(seo.features, {
    productSchema: true,
    breadcrumbs: true,
    openGraph: true,
    twitterCards: true,
    autoGenerateMeta: true,
  });
  assert.equal(seo.canonicalUrl, "");
  assert.equal(seo.defaultLanguage, "en-NP");
  assert.equal(seo.indexingEnabled, true);
  assert.deepEqual(seo.noindexPages, []);
});

// ---------- validation round-trips ----------

test("theme: new fields round-trip; headerStyle enum enforced", async () => {
  resetAll();
  const updated = await settingsService.updateSection(
    "theme",
    {
      backgroundColor: "#ffffff",
      headerStyle: "navy",
      darkMode: true,
      roundedCards: false,
      showShadows: false,
    },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(updated.backgroundColor, "#ffffff");
  assert.equal(updated.headerStyle, "navy");
  assert.equal(updated.darkMode, true);
  assert.equal(updated.roundedCards, false);
  assert.equal(updated.showShadows, false);

  await assert.rejects(
    settingsService.updateSection(
      "theme",
      { headerStyle: "purple" },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
  await assert.rejects(
    settingsService.updateSection(
      "theme",
      { backgroundColor: "not-a-colour" },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
});

test("theme: customCss accepts long CSS (page-string cap, not 2000)", async () => {
  resetAll();
  const css = ".hero { color: red; } /* ".padEnd(6000, "x") + " */";
  const updated = await settingsService.updateSection(
    "theme",
    { customCss: css },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(updated.customCss, css);
});

test("contact: businessHours rows round-trip; bad item shapes rejected", async () => {
  resetAll();
  const rows = DEFAULT_SETTINGS.contact.businessHours.map((r) => ({ ...r }));
  rows[0] = { day: "Monday", open: true, hours: "9:00 AM - 6:00 PM" };
  rows[5] = { day: "Saturday", open: true, hours: "10:00 AM - 4:00 PM" };
  const updated = await settingsService.updateSection(
    "contact",
    { businessHours: rows },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(updated.businessHours.length, 7);
  assert.deepEqual(updated.businessHours[0], {
    day: "Monday",
    open: true,
    hours: "9:00 AM - 6:00 PM",
  });
  assert.equal(updated.businessHours[6].open, false);

  await assert.rejects(
    settingsService.updateSection(
      "contact",
      { businessHours: [{ day: "Monday", open: "yes", hours: "" }] },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
  await assert.rejects(
    settingsService.updateSection(
      "contact",
      { businessHours: ["Monday"] },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
});

test("seo: features/indexing/language/canonical/noindex round-trip + enums", async () => {
  resetAll();
  const updated = await settingsService.updateSection(
    "seo",
    {
      features: { openGraph: false, productSchema: true },
      canonicalUrl: "https://shop.example.com",
      defaultLanguage: "ne",
      indexingEnabled: false,
      noindexPages: ["checkout", "profile", "checkout"],
    },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(updated.features.openGraph, false);
  assert.equal(updated.features.twitterCards, true, "untouched flags keep defaults");
  assert.equal(updated.canonicalUrl, "https://shop.example.com");
  assert.equal(updated.defaultLanguage, "ne");
  assert.equal(updated.indexingEnabled, false);
  assert.deepEqual(updated.noindexPages, ["checkout", "profile"], "deduped");

  await assert.rejects(
    settingsService.updateSection(
      "seo",
      { defaultLanguage: "fr-FR" },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
  await assert.rejects(
    settingsService.updateSection(
      "seo",
      { noindexPages: ["secret-page"] },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
  await assert.rejects(
    settingsService.updateSection(
      "seo",
      { canonicalUrl: "not a url" },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
});

// ---------- public projection ----------

test("public projection: new theme/contact/seo fields included, admin-only excluded", async () => {
  resetAll();
  const pub = await settingsService.getPublicSettings();
  assert.equal(pub.theme.backgroundColor, "#f3f4f6");
  assert.equal(pub.theme.headerStyle, "light");
  assert.equal(pub.theme.darkMode, false);
  assert.equal(pub.theme.customCss, "");
  assert.equal(pub.contact.businessHours.length, 7);
  assert.deepEqual(pub.seo.features, DEFAULT_SETTINGS.seo.features);
  assert.equal(pub.seo.canonicalUrl, "");
  assert.equal(pub.seo.defaultLanguage, "en-NP");
  assert.equal(pub.seo.indexingEnabled, true);
  assert.deepEqual(pub.seo.noindexPages, []);
  assert.ok(!("searchConsoleVerification" in pub.seo));
});

// ---------- reset (service level) ----------

test("resetSections: one section restores defaults, others keep stored values", async () => {
  resetAll();
  await settingsService.updateSection(
    "theme",
    { primaryColor: "#123456" },
    { _id: "admin1" },
    "127.0.0.1",
  );
  await settingsService.updateSection(
    "identity",
    { storeName: "Changed Name" },
    { _id: "admin1" },
    "127.0.0.1",
  );
  auditCalls.length = 0;

  const after = await settingsService.resetSections(
    "theme",
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(after.theme.primaryColor, DEFAULT_SETTINGS.theme.primaryColor);
  assert.equal(after.identity.storeName, "Changed Name");
  assert.ok(
    auditCalls.some(
      (c) =>
        c.action === "settings.reset" &&
        c.targetId === "theme" &&
        JSON.stringify(c.after.sections) === '["theme"]',
    ),
  );
});

test("resetSections: no argument resets every section; unknown section 404s", async () => {
  resetAll();
  await settingsService.updateSection(
    "identity",
    { storeName: "Changed Name" },
    { _id: "admin1" },
    "127.0.0.1",
  );
  const after = await settingsService.resetSections(
    undefined,
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(after.identity.storeName, DEFAULT_SETTINGS.identity.storeName);
  await assert.rejects(
    settingsService.resetSections("nope", { _id: "admin1" }, "127.0.0.1"),
    (err) => err instanceof AppError && err.statusCode === 404,
  );
});

// ---------- reset route ----------

function buildRouteApp() {
  stub("middleware/auth.middleware.js", {
    protect: (req, res, next) => {
      const role = req.headers["x-test-role"];
      if (!role) {
        return next(
          new AppError("You are not logged in. Please log in to get access.", 401),
        );
      }
      req.user = { _id: "u1", id: "u1", role };
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
  for (const rel of [
    "routes/adminSettings.routes.js",
    "controllers/settings.controller.js",
    "controllers/integrations.controller.js",
    "controllers/knowledge.controller.js",
  ]) {
    delete require.cache[abs(rel)];
  }
  const express = require(abs("node_modules/express"));
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin", require(abs("routes/adminSettings.routes")));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res
      .status(err.statusCode || 500)
      .json({ status: err.status || "error", message: err.message });
  });
  return app;
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test("reset route: 401 anonymous, 403 non-admin, 200 for admin (section + all)", async () => {
  resetAll();
  await settingsService.updateSection(
    "theme",
    { primaryColor: "#123456" },
    { _id: "admin1" },
    "127.0.0.1",
  );
  await settingsService.updateSection(
    "identity",
    { storeName: "Changed Name" },
    { _id: "admin1" },
    "127.0.0.1",
  );
  const app = buildRouteApp();
  await withServer(app, async (base) => {
    const anon = await fetch(`${base}/api/v1/admin/settings/reset`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(anon.status, 401);

    const user = await fetch(`${base}/api/v1/admin/settings/reset`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "user" },
      body: JSON.stringify({}),
    });
    assert.equal(user.status, 403);

    const one = await fetch(`${base}/api/v1/admin/settings/reset`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "admin" },
      body: JSON.stringify({ section: "theme" }),
    });
    assert.equal(one.status, 200);
    const oneBody = await one.json();
    assert.equal(
      oneBody.data.settings.theme.primaryColor,
      DEFAULT_SETTINGS.theme.primaryColor,
    );
    assert.equal(oneBody.data.settings.identity.storeName, "Changed Name");

    const all = await fetch(`${base}/api/v1/admin/settings/reset`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "admin" },
      body: JSON.stringify({}),
    });
    assert.equal(all.status, 200);
    const allBody = await all.json();
    assert.equal(
      allBody.data.settings.identity.storeName,
      DEFAULT_SETTINGS.identity.storeName,
    );

    const bad = await fetch(`${base}/api/v1/admin/settings/reset`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-role": "admin" },
      body: JSON.stringify({ section: "nope" }),
    });
    assert.equal(bad.status, 404);
  });
});
