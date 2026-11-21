// Batch 1 (Settings + Secrets backend) — unit tests.
//
// Style follows the repo's node:test harnesses: model modules are
// stubbed through require.cache (the tests/fresh pattern) with
// in-memory fakes, so no mongod is needed; the audit-log service is
// stubbed the same way and its calls are captured. Route tests mount
// the REAL routers + controllers on a throwaway express app with the
// auth + rate-limit middleware stubbed (protect reads an x-test-role
// header: absent -> 401 AppError, "user" -> non-admin user,
// "admin" -> admin) — the real protect's own behaviour is covered by
// tests/platform/auth-protect.test.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const repo = path.resolve(__dirname, "../..");
const abs = (rel) => path.join(repo, rel);

process.env.SETTINGS_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env["JWT_" + "SECRET"] = "test-only-" + "jwt-" + "secret";

// ---------- in-memory model fakes ----------

// findOne().lean() support: the services call .lean() on findOne for
// settings/secrets reads, so the fakes return a small thenable whose
// .lean() resolves to the plain stored value.
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

function makeSecretsModel() {
  const map = new Map();
  const wrap = (d) => ({
    ...d,
    async save() {
      map.set(this.service, this);
      return this;
    },
  });
  return {
    _reset: () => map.clear(),
    _map: map,
    findOne: (q) => leanable(map.get(q.service) || null),
    find: () => leanable([...map.values()]),
    create: async (obj) => {
      const d = wrap({ ...obj });
      map.set(obj.service, d);
      return d;
    },
    deleteOne: async (q) => {
      map.delete(q.service);
      return { deletedCount: 1 };
    },
  };
}

const settingsModel = makeSettingsModel();
const secretsModel = makeSecretsModel();
const auditCalls = [];

function stub(rel, exports) {
  const p = abs(rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
}

stub("models/siteSettings.model.js", settingsModel);
stub("models/integrationSecret.model.js", secretsModel);
stub("services/auditLog.service.js", {
  record: async (entry) => {
    auditCalls.push(entry);
    return entry;
  },
  redact: (x) => x,
});

// Services require their models lazily, so the stubs above are what
// they pick up.
const { DEFAULT_SETTINGS } = require(abs("services/settings/defaults"));
const settingsService = require(abs("services/settings/settingsService"));
const secretsService = require(abs("services/settings/secretsService"));
const secretCrypto = require(abs("utils/secretCrypto"));
const connectionTester = require(abs("services/settings/connectionTester"));

function resetAll() {
  settingsModel._reset();
  secretsModel._reset();
  auditCalls.length = 0;
  for (const k of [
    "GROQ_API_KEY",
    "MISTRAL_API_KEY",
    "OPENROUTER_API_KEY",
    "GEMINI_API_KEY",
    "NVIDIA_API_KEY",
    "BREVO_API_KEY",
  ]) {
    delete process.env[k];
  }
}

// ---------- (a) defaults integrity ----------

test("defaults: theme colours equal the current live palette", () => {
  assert.equal(DEFAULT_SETTINGS.theme.primaryColor, "#F27318");
  assert.equal(DEFAULT_SETTINGS.theme.primaryHoverColor, "#D9620E");
  assert.equal(DEFAULT_SETTINGS.theme.navyColor, "#1E2C4A");
  assert.equal(DEFAULT_SETTINGS.theme.fontFamily, "DM Sans");
});

test("defaults: identity, currency and contact equal current site values", () => {
  assert.equal(DEFAULT_SETTINGS.identity.storeName, "Aura Interiors");
  assert.equal(DEFAULT_SETTINGS.identity.logoUrl, "/logo-aura-interiors.webp");
  assert.equal(DEFAULT_SETTINGS.commerce.currency, "NPR");
  assert.equal(DEFAULT_SETTINGS.commerce.locale, "en-NP");
  assert.equal(DEFAULT_SETTINGS.commerce.freeShippingThreshold, 5000);
  assert.equal(DEFAULT_SETTINGS.contact.email, "support@aurainteriors.live");
  assert.equal(DEFAULT_SETTINGS.contact.phone, "+977 9866291003");
});

test("defaults: chat fallback order mirrors chatConfig (groq, mistral, openrouter)", () => {
  assert.deepEqual(DEFAULT_SETTINGS.integrations.ai.fallbackOrder, [
    "groq",
    "mistral",
    "openrouter",
  ]);
  assert.equal(
    DEFAULT_SETTINGS.integrations.ai.providers.groq.model,
    "openai/gpt-oss-120b",
  );
  assert.equal(DEFAULT_SETTINGS.integrations.ai.providers.gemini.enabled, false);
});

// ---------- settings service: reads ----------

test("getSettings returns defaults when nothing is stored, and creates nothing", async () => {
  resetAll();
  const s = await settingsService.getSettings();
  assert.equal(s.theme.primaryColor, "#F27318");
  assert.equal(s.identity.storeName, "Aura Interiors");
  assert.equal(settingsModel._doc(), null, "read must not create a document");
});

test("getPublicSettings excludes secrets, integrations and internal sections", async () => {
  resetAll();
  const pub = await settingsService.getPublicSettings();
  const flat = JSON.stringify(pub);
  assert.ok(!("integrations" in pub), "integrations must not be public");
  assert.ok(!("notifications" in pub), "notifications must not be public");
  assert.ok(!("searchConsoleVerification" in pub.seo));
  assert.ok(!/API_KEY|SECRET|ciphertext/i.test(flat));
  assert.equal(pub.identity.storeName, "Aura Interiors");
  assert.equal(pub.commerce.currency, "NPR");
  assert.equal(pub.maintenance.enabled, false);
  assert.equal(pub.seo.googleAnalyticsId, "");
});

// ---------- (c) updateSection validation ----------

test("updateSection: valid patch round-trips and is audit-logged (metadata only)", async () => {
  resetAll();
  const updated = await settingsService.updateSection(
    "theme",
    { primaryColor: "#112233" },
    { _id: "admin1" },
    "127.0.0.1",
  );
  assert.equal(updated.primaryColor, "#112233");
  assert.equal(updated.primaryHoverColor, "#D9620E", "untouched defaults remain");
  const again = await settingsService.getSettings();
  assert.equal(again.theme.primaryColor, "#112233");
  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0].action, "settings.update");
  assert.equal(auditCalls[0].targetId, "theme");
  assert.deepEqual(auditCalls[0].after.changedKeys, ["theme.primaryColor"]);
  assert.ok(
    !JSON.stringify(auditCalls[0]).includes("#112233"),
    "audit must carry key names only, never values",
  );
});

test("updateSection: bad hex colour is rejected with 400", async () => {
  resetAll();
  await assert.rejects(
    () => settingsService.updateSection("theme", { primaryColor: "orange" }, {}),
    (err) => err.statusCode === 400 && /hex colour/.test(err.message),
  );
  await assert.rejects(
    () => settingsService.updateSection("theme", { primaryColor: "#12345" }, {}),
    (err) => err.statusCode === 400,
  );
});

test("updateSection: unknown section rejected, unknown keys stripped", async () => {
  resetAll();
  await assert.rejects(
    () => settingsService.updateSection("nope", { a: 1 }, {}),
    (err) => err.statusCode === 404,
  );
  await assert.rejects(
    () => settingsService.updateSection("theme", { evilKey: "x" }, {}),
    (err) => err.statusCode === 400 && /No recognised/.test(err.message),
    "a patch of only unknown keys has nothing to apply",
  );
  const updated = await settingsService.updateSection(
    "identity",
    { storeName: "New Name", hacker: "drop me" },
    {},
  );
  assert.equal(updated.storeName, "New Name");
  assert.ok(!("hacker" in updated));
});

test("updateSection: type mismatches and bad URLs/emails are rejected", async () => {
  resetAll();
  await assert.rejects(
    () => settingsService.updateSection("chat", { enabled: "yes" }, {}),
    (err) => err.statusCode === 400,
  );
  await assert.rejects(
    () => settingsService.updateSection("identity", { logoUrl: "javascript:alert(1)" }, {}),
    (err) => err.statusCode === 400,
  );
  await assert.rejects(
    () => settingsService.updateSection("contact", { email: "not-an-email" }, {}),
    (err) => err.statusCode === 400,
  );
  await assert.rejects(
    () =>
      settingsService.updateSection(
        "integrations",
        { ai: { fallbackOrder: ["groq", "bogus"] } },
        {},
      ),
    (err) => err.statusCode === 400 && /unknown provider/.test(err.message),
  );
});

// ---------- (d) secretCrypto ----------

test("secretCrypto: encrypt/decrypt round-trips", () => {
  const enc = secretCrypto.encrypt("sk-test-value-1234");
  assert.notEqual(enc.ciphertext, "sk-test-value-1234");
  assert.equal(secretCrypto.decrypt(enc), "sk-test-value-1234");
});

test("secretCrypto: tampered ciphertext fails authentication", () => {
  const enc = secretCrypto.encrypt("sk-test-value-1234");
  const raw = Buffer.from(enc.ciphertext, "base64");
  raw[0] = raw[0] ^ 0xff;
  assert.throws(() =>
    secretCrypto.decrypt({ ...enc, ciphertext: raw.toString("base64") }),
  );
});

test("secretCrypto: JWT_SECRET fallback derivation works without SETTINGS_ENCRYPTION_KEY", () => {
  const saved = process.env.SETTINGS_ENCRYPTION_KEY;
  delete process.env.SETTINGS_ENCRYPTION_KEY;
  try {
    const enc = secretCrypto.encrypt("fallback-value");
    assert.equal(secretCrypto.decrypt(enc), "fallback-value");
  } finally {
    process.env.SETTINGS_ENCRYPTION_KEY = saved;
  }
});

// ---------- (e) secrets service ----------

test("secrets: set/describe shows masked last4 + source admin, never the value", async () => {
  resetAll();
  const described = await secretsService.setSecret("ai.groq", "sk-groq-abcd1234", {
    _id: "admin1",
  });
  assert.equal(described.configured, true);
  assert.equal(described.source, "admin");
  assert.equal(described.masked, "••••1234");
  assert.ok(!JSON.stringify(described).includes("sk-groq-abcd1234"));
  assert.equal(await secretsService.getSecret("ai.groq"), "sk-groq-abcd1234");
  const all = await secretsService.describeSecrets();
  assert.ok(!JSON.stringify(all).includes("sk-groq-abcd1234"));
  assert.equal(auditCalls.at(-1).action, "integrations.secret.set");
  assert.ok(!JSON.stringify(auditCalls.at(-1)).includes("sk-groq"));
});

test("secrets: resolution precedence admin > env > null; delete restores env", async () => {
  resetAll();
  process.env["GROQ_" + "API_KEY"] = "env-" + "groq-9999";
  assert.equal(await secretsService.getResolvedSecret("ai.groq"), "env-groq-9999");
  const fromEnv = await secretsService.describeService("ai.groq");
  assert.equal(fromEnv.source, "env");
  assert.equal(fromEnv.masked, "••••9999");

  await secretsService.setSecret("ai.groq", "admin-groq-5555", {});
  assert.equal(await secretsService.getResolvedSecret("ai.groq"), "admin-groq-5555");

  await secretsService.deleteSecret("ai.groq", {});
  assert.equal(await secretsService.getResolvedSecret("ai.groq"), "env-groq-9999");
  delete process.env.GROQ_API_KEY;
  assert.equal(await secretsService.getResolvedSecret("ai.groq"), null);
  const none = await secretsService.describeService("ai.groq");
  assert.equal(none.configured, false);
  assert.equal(none.source, "none");
});

test("secrets: unknown service is rejected everywhere", async () => {
  resetAll();
  await assert.rejects(() => secretsService.setSecret("ai.bogus", "x", {}), /Unknown integration/);
  await assert.rejects(() => secretsService.getResolvedSecret("bogus"), /Unknown integration/);
});

// ---------- (f) connectionTester with mocked fetch ----------

function withFetch(fake, fn) {
  const saved = globalThis.fetch;
  globalThis.fetch = fake;
  return fn().finally(() => {
    globalThis.fetch = saved;
  });
}

test("tester: 200 from provider /models -> ok, key never in the message", async () => {
  await withFetch(
    async (url, opts) => {
      assert.match(url, /api\.groq\.com\/openai\/v1\/models/);
      assert.equal(opts.headers.Authorization, "Bearer " + "sk-" + "secret-abcdef");
      return { ok: true, status: 200 };
    },
    async () => {
      const r = await connectionTester.testService("ai.groq", {
        key: "sk-secret-abcdef",
        config: { baseUrl: "https://api.groq.com/openai/v1" },
      });
      assert.equal(r.ok, true);
      assert.equal(r.status, "ok");
      assert.ok(!JSON.stringify(r).includes("sk-secret-abcdef"));
    },
  );
});

test("tester: 401 -> not ok with a safe message", async () => {
  await withFetch(
    async () => ({ ok: false, status: 401 }),
    async () => {
      const r = await connectionTester.testService("email.brevo", {
        key: "brevo-key-123456",
        config: {},
      });
      assert.equal(r.ok, false);
      assert.equal(r.status, "rejected");
      assert.ok(!JSON.stringify(r).includes("brevo-key-123456"));
    },
  );
});

test("tester: format-only services never call fetch", async () => {
  await withFetch(
    async () => {
      throw new Error("fetch must not be called for format-only services");
    },
    async () => {
      const r = await connectionTester.testService("payments.esewaSecret", {
        key: "esewa-secret-123",
        config: {},
      });
      assert.equal(r.ok, null);
      assert.equal(r.status, "format-only");
      const missing = await connectionTester.testService("payments.khalti", {
        key: "",
        config: {},
      });
      assert.equal(missing.ok, false);
      assert.equal(missing.status, "missing");
    },
  );
});

test("tester: network failure -> unreachable, no key leakage", async () => {
  await withFetch(
    async () => {
      throw new Error("socket hang up");
    },
    async () => {
      const r = await connectionTester.testService("vector.qdrant", {
        key: "qdrant-key-7777",
        config: { url: "http://localhost:6333" },
      });
      assert.equal(r.ok, false);
      assert.equal(r.status, "unreachable");
      assert.ok(!JSON.stringify(r).includes("qdrant-key-7777"));
    },
  );
});

// ---------- (g) route-level tests ----------

function buildRouteApp() {
  const AppError = require(abs("utils/AppError"));
  stub("middleware/auth.middleware.js", {
    protect: (req, res, next) => {
      const role = req.headers["x-test-role"];
      if (!role) {
        return next(new AppError("You are not logged in. Please log in to get access.", 401));
      }
      req.user = { _id: "u1", id: "u1", role };
      return next();
    },
    restrictTo:
      (...roles) =>
      (req, res, next) =>
        roles.includes(req.user.role)
          ? next()
          : next(new AppError("You do not have permission to perform this action.", 403)),
  });
  const passthrough = (req, res, next) => next();
  stub("middleware/rateLimit.middleware.js", {
    standardReadLimiter: passthrough,
    standardWriteLimiter: passthrough,
    adminReadLimiter: passthrough,
    adminWriteLimiter: passthrough,
  });
  for (const rel of [
    "routes/settings.routes.js",
    "routes/adminSettings.routes.js",
    "controllers/settings.controller.js",
    "controllers/integrations.controller.js",
  ]) {
    delete require.cache[abs(rel)];
  }
  const express = require(abs("node_modules/express"));
  const app = express();
  app.use(express.json());
  app.use("/api/v1/settings", require(abs("routes/settings.routes")));
  app.use("/api/v1/admin", require(abs("routes/adminSettings.routes")));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ status: err.status || "error", message: err.message });
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

test("routes: public settings 200 without auth, no secret material", async () => {
  resetAll();
  const app = buildRouteApp();
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/v1/settings/public`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.settings.identity.storeName, "Aura Interiors");
    assert.ok(!("integrations" in body.data.settings));
    assert.ok(!JSON.stringify(body).includes("ciphertext"));
  });
});

test("routes: admin settings reject anonymous (401) and non-admin (403)", async () => {
  resetAll();
  const app = buildRouteApp();
  await withServer(app, async (base) => {
    const anon = await fetch(`${base}/api/v1/admin/settings`);
    assert.equal(anon.status, 401);
    const user = await fetch(`${base}/api/v1/admin/settings`, {
      headers: { "x-test-role": "user" },
    });
    assert.equal(user.status, 403);
    const admin = await fetch(`${base}/api/v1/admin/settings`, {
      headers: { "x-test-role": "admin" },
    });
    assert.equal(admin.status, 200);
    const put = await fetch(`${base}/api/v1/admin/settings/theme`, {
      method: "PUT",
      headers: { "x-test-role": "admin", "content-type": "application/json" },
      body: JSON.stringify({ primaryColor: "#445566" }),
    });
    assert.equal(put.status, 200);
    const badPut = await fetch(`${base}/api/v1/admin/settings/theme`, {
      method: "PUT",
      headers: { "x-test-role": "admin", "content-type": "application/json" },
      body: JSON.stringify({ primaryColor: "not-a-colour" }),
    });
    assert.equal(badPut.status, 400);
  });
});

test("routes: secret write/test/delete round-trip without leaking the value", async () => {
  resetAll();
  const app = buildRouteApp();
  const realFetch = globalThis.fetch;
  await withFetch(
    async () => ({ ok: true, status: 200 }),
    async () => {
      await withServer(app, async (base) => {
        const put = await realFetch(`${base}/api/v1/admin/integrations/ai.groq/secret`, {
          method: "PUT",
          headers: { "x-test-role": "admin", "content-type": "application/json" },
          body: JSON.stringify({ value: "sk-route-test-4321" }),
        });
        assert.equal(put.status, 200);
        const putBody = await put.json();
        assert.equal(putBody.data.secret.masked, "••••4321");
        assert.ok(!JSON.stringify(putBody).includes("sk-route-test-4321"));

        const list = await realFetch(`${base}/api/v1/admin/integrations`, {
          headers: { "x-test-role": "admin" },
        });
        assert.equal(list.status, 200);
        assert.ok(!JSON.stringify(await list.json()).includes("sk-route-test-4321"));

        const tested = await realFetch(`${base}/api/v1/admin/integrations/ai.groq/test`, {
          method: "POST",
          headers: { "x-test-role": "admin", "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        assert.equal(tested.status, 200);
        const testBody = await tested.json();
        assert.equal(testBody.data.test.ok, true);
        const doc = secretsModel._map.get("ai.groq");
        assert.equal(doc.lastTestStatus, "ok");
        assert.ok(doc.lastTestedAt);

        const del = await realFetch(`${base}/api/v1/admin/integrations/ai.groq/secret`, {
          method: "DELETE",
          headers: { "x-test-role": "admin" },
        });
        assert.equal(del.status, 200);
        assert.equal((await del.json()).data.secret.configured, false);

        const unknown = await realFetch(`${base}/api/v1/admin/integrations/ai.bogus/test`, {
          method: "POST",
          headers: { "x-test-role": "admin", "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        assert.equal(unknown.status, 404);
      });
    },
  );
});
