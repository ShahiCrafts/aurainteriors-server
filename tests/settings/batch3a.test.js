// Batch 3a — server additions:
//   (1) seo.googleMapsKey round-trips settings validation and is in
//       the PUBLIC projection (a Maps browser key is exposed by
//       design), unlike searchConsoleVerification.
//   (2) New defaults: pages section (FAQ verbatim from the web repo's
//       src/data/faqData.js; long-text pages empty because no such
//       pages/copy exist), homepage heroSlides/promoBanner/
//       sectionsOrder (verbatim from Hero.jsx / HomePage.jsx),
//       theme.buttonRadius token, identity.supportEmail, contact
//       socials twitter/linkedin.
//   (3) Array-of-objects validation (heroSlides / pages.faq).
//   (4) POST /api/v1/admin/knowledge/reindex — auth gates + queued
//       count with the ingestion trigger stubbed.
//   (5) retrievalService resolves embeddings/Qdrant through the same
//       settings/secrets resolution as ingestionService (Batch 2),
//       with the env chain as fallback.
//
// Style follows tests/settings/settings-backend.test.js: models and
// services stubbed through require.cache, no mongod needed.
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

test("defaults: seo.googleMapsKey exists and defaults to empty", () => {
  assert.equal(DEFAULT_SETTINGS.seo.googleMapsKey, "");
});

test("defaults: theme.buttonRadius is the current-look token 'rounded'", () => {
  assert.equal(DEFAULT_SETTINGS.theme.buttonRadius, "rounded");
});

test("defaults: identity.supportEmail + contact socials twitter/linkedin", () => {
  assert.equal(
    DEFAULT_SETTINGS.identity.supportEmail,
    "support@aurainteriors.live",
  );
  assert.equal(DEFAULT_SETTINGS.contact.socials.twitter, "");
  assert.equal(DEFAULT_SETTINGS.contact.socials.linkedin, "");
});

test("defaults: homepage hero slides are verbatim from Hero.jsx", () => {
  const slides = DEFAULT_SETTINGS.homepage.heroSlides;
  assert.equal(slides.length, 3);
  assert.equal(slides[0].headline, "Furniture That Fits You");
  assert.equal(
    slides[0].subtext,
    "Discover our handpicked collection of timeless sofas and accent chairs — thoughtfully designed to bring warmth, character, and lasting comfort into every corner of your home.",
  );
  assert.equal(slides[0].buttonText, "Explore Now");
  assert.equal(slides[0].buttonLink, "/shop?categories=living-room");
  assert.equal(slides[1].headline, "Sleep in Pure Comfort");
  assert.equal(slides[1].buttonLink, "/shop?categories=bedroom");
  assert.equal(slides[2].headline, "Work From Anywhere");
  const promo = DEFAULT_SETTINGS.homepage.promoBanner;
  assert.equal(promo.headline, "Calmora Bed Frame");
  assert.equal(
    promo.subtext,
    "Handcrafted solid sheesham wood frame with a plush upholstered headboard",
  );
  assert.equal(promo.buttonText, "Shop Sale");
  assert.deepEqual(DEFAULT_SETTINGS.homepage.sectionsOrder, [
    "hero",
    "trustBanner",
    "shopByCategory",
    "featuredPieces",
    "testimonials",
  ]);
});

test("defaults: pages FAQ is faqData.js flattened verbatim; long pages empty", () => {
  const { faq, about, privacyPolicy, terms, shippingReturns } =
    DEFAULT_SETTINGS.pages;
  assert.equal(faq.length, 10);
  assert.equal(faq[0].question, "How do I place an order?");
  assert.equal(
    faq[0].answer,
    "To place an order, browse our shop, select your desired items, and add them to your cart. Once you're ready, click on the cart icon and proceed to checkout. Follow the prompts to enter your shipping and payment information.",
  );
  assert.equal(faq[5].question, "Do you deliver outside Nepal?");
  assert.equal(
    faq[9].question,
    "Which devices support AR features?",
  );
  // No About/Privacy/Terms/Shipping pages exist in the web repo —
  // defaults must be empty, never invented copy.
  assert.equal(about, "");
  assert.equal(privacyPolicy, "");
  assert.equal(terms, "");
  assert.equal(shippingReturns, "");
});

// ---------- googleMapsKey round-trip + projection ----------

test("googleMapsKey: survives validation, appears in admin GET and public projection", async () => {
  resetAll();
  const updated = await settingsService.updateSection(
    "seo",
    { googleMapsKey: "AIza-test-browser-key" },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(updated.googleMapsKey, "AIza-test-browser-key");

  const all = await settingsService.getSettings();
  assert.equal(all.seo.googleMapsKey, "AIza-test-browser-key");

  const pub = await settingsService.getPublicSettings();
  assert.equal(
    pub.seo.googleMapsKey,
    "AIza-test-browser-key",
    "browser key is public by design",
  );
  assert.ok(
    !("searchConsoleVerification" in pub.seo),
    "searchConsoleVerification stays admin-only",
  );
  assert.ok(!("googleMapsKey" in pub.seo) === false);
});

test("pages: included in the public projection", async () => {
  resetAll();
  const pub = await settingsService.getPublicSettings();
  assert.ok(pub.pages, "pages section is public content");
  assert.equal(pub.pages.faq.length, 10);
  assert.equal(pub.pages.about, "");
});

// ---------- array-of-objects + token validation ----------

test("validation: heroSlides array-of-objects round-trips, unknown keys stripped", async () => {
  resetAll();
  const updated = await settingsService.updateSection(
    "homepage",
    {
      heroSlides: [
        {
          imageUrl: "/img/a.webp",
          headline: "New headline",
          subtext: "New subtext",
          buttonText: "Shop",
          buttonLink: "/shop",
          enabled: false,
          bogusKey: "strip me",
        },
      ],
      sectionsOrder: ["hero", "testimonials", "trustBanner", "shopByCategory", "featuredPieces"],
    },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(updated.heroSlides.length, 1);
  assert.equal(updated.heroSlides[0].headline, "New headline");
  assert.equal(updated.heroSlides[0].enabled, false);
  assert.ok(!("bogusKey" in updated.heroSlides[0]));
  assert.deepEqual(updated.sectionsOrder, [
    "hero",
    "testimonials",
    "trustBanner",
    "shopByCategory",
    "featuredPieces",
  ]);
});

test("validation: non-object hero slide item is rejected", async () => {
  resetAll();
  await assert.rejects(
    settingsService.updateSection(
      "homepage",
      { heroSlides: ["not-an-object"] },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
});

test("validation: pages FAQ rows round-trip; long About text accepted", async () => {
  resetAll();
  const longAbout = "About us. ".repeat(600); // 6000 chars > MAX_STRING
  const updated = await settingsService.updateSection(
    "pages",
    {
      about: longAbout,
      faq: [{ question: "Q1?", answer: "A1." }],
    },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(updated.about, longAbout);
  assert.deepEqual(updated.faq, [{ question: "Q1?", answer: "A1." }]);
});

test("validation: theme.buttonRadius accepts the enum, rejects other tokens", async () => {
  resetAll();
  const ok = await settingsService.updateSection(
    "theme",
    { buttonRadius: "pill" },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(ok.buttonRadius, "pill");
  await assert.rejects(
    settingsService.updateSection(
      "theme",
      { buttonRadius: "wobbly" },
      { _id: "admin1" },
      "127.0.0.1",
    ),
    (err) => err instanceof AppError && err.statusCode === 400,
  );
});

// ---------- knowledge reindex route ----------

const ingestionCalls = [];
const fakeDocs = [
  { _id: "doc1", status: "indexed", error: null, async save() { return this; } },
  { _id: "doc2", status: "failed", error: "boom", async save() { return this; } },
  { _id: "doc3", status: "indexed", error: null, async save() { return this; } },
];

stub("models/document.model.js", {
  find: () => ({
    select: () => Promise.resolve(fakeDocs),
  }),
});
stub("services/backgroundTasks.js", {
  runDocumentIngestion: (id) => {
    ingestionCalls.push(id);
  },
});

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
    resizeCategoryImage: (req, res, next) => {
      if (req.headers["x-test-file"] === "1") {
        req.file = { cloudinaryUrl: "https://cdn.example/uploaded.webp" };
      }
      next();
    },
  });
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

test("reindex route: 401 anonymous, 403 non-admin, 200 {queued} for admin", async () => {
  ingestionCalls.length = 0;
  auditCalls.length = 0;
  for (const d of fakeDocs) {
    d.status = "indexed";
    d.error = null;
  }
  const app = buildRouteApp();
  await withServer(app, async (base) => {
    const anon = await fetch(`${base}/api/v1/admin/knowledge/reindex`, {
      method: "POST",
    });
    assert.equal(anon.status, 401);

    const user = await fetch(`${base}/api/v1/admin/knowledge/reindex`, {
      method: "POST",
      headers: { "x-test-role": "user" },
    });
    assert.equal(user.status, 403);

    const admin = await fetch(`${base}/api/v1/admin/knowledge/reindex`, {
      method: "POST",
      headers: { "x-test-role": "admin" },
    });
    assert.equal(admin.status, 200);
    const body = await admin.json();
    assert.equal(body.data.queued, 3);
  });
  assert.deepEqual(ingestionCalls, ["doc1", "doc2", "doc3"]);
  assert.ok(
    fakeDocs.every((d) => d.status === "pending" && d.error === null),
    "each document is reset to pending like the per-document retry",
  );
  assert.ok(
    auditCalls.some(
      (c) => c.action === "knowledge.reindexAll" && c.after.queued === 3,
    ),
  );
});

test("settings image route: returns the Cloudinary URL from the reused pipeline", async () => {
  const app = buildRouteApp();
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/v1/admin/settings/image`, {
      method: "POST",
      headers: { "x-test-role": "admin", "x-test-file": "1" },
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.url, "https://cdn.example/uploaded.webp");

    const noFile = await fetch(`${base}/api/v1/admin/settings/image`, {
      method: "POST",
      headers: { "x-test-role": "admin" },
    });
    assert.equal(noFile.status, 400);
  });
});

// ---------- retrievalService parity ----------

// ingestionService is lazy-required by retrievalService's resolvers;
// stub it with settings-resolved values to prove retrieval now goes
// through the SAME resolution (settings > env) instead of its old
// env-only duplicate.
stub("services/ingestionService.js", {
  resolveEmbeddingApiKey: async () => "settings-resolved-key",
  resolveEmbeddingModel: async () => "settings-model-x",
  resolveQdrantClient: async () => {
    throw new Error("not used by retrieval (it has its own client cache)");
  },
});
delete require.cache[abs("services/retrievalService.js")];
const retrievalService = require(abs("services/retrievalService"));

test("retrieval: getEmbedding uses the settings-resolved key and model", async () => {
  const realFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url, options) => {
    seen = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
      text: async () => "",
    };
  };
  try {
    const vector = await retrievalService.getEmbedding("hello", "query", {
      timeoutMs: 1000,
    });
    assert.deepEqual(vector, [0.1, 0.2]);
    assert.equal(seen.options.headers.Authorization, "Bearer settings-resolved-key");
    const body = JSON.parse(seen.options.body);
    assert.equal(body.model, "settings-model-x");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("retrieval: no resolved key keeps the historical missing-key error", async () => {
  stub("services/ingestionService.js", {
    resolveEmbeddingApiKey: async () =>
      process.env.NVIDIA_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.GEMINI_API_KEY ||
      null,
    resolveEmbeddingModel: async () =>
      process.env.EMBEDDING_MODEL_NAME || "nvidia/llama-3.2-nv-embed-qa-4",
  });
  delete process.env.NVIDIA_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(
    retrievalService.getEmbedding("hello", "query", { timeoutMs: 1000 }),
    /Missing API Key for embedding model/,
  );
});

test("retrieval: resolveQdrantClient honours a pre-set client (AR-39 seam)", async () => {
  const stubClient = { search: async () => [] };
  retrievalService.qdrant = stubClient;
  try {
    const client = await retrievalService.resolveQdrantClient();
    assert.equal(client, stubClient);
  } finally {
    retrievalService.qdrant = null;
  }
});
