// Batch 2 (server rewiring) — unit tests.
//
// Style follows tests/settings/settings-backend.test.js: model /
// service modules are stubbed through require.cache before the module
// under test is (re)required, so no mongod is needed.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const repo = path.resolve(__dirname, "../..");
const abs = (rel) => path.join(repo, rel);

function stubModule(rel, exports) {
  const p = abs(rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
}
function freshRequire(rel) {
  const p = abs(rel);
  delete require.cache[p];
  return require(p);
}

const chatConfigPath = "services/chatV2/config/chatConfig.js";

// ---------- (a) buildProvidersFromSettings ----------

function integrationsFixture(overrides = {}) {
  return {
    ai: {
      fallbackOrder: ["groq", "mistral", "openrouter"],
      providers: {
        groq: { enabled: true, model: "g-model", baseUrl: "https://api.groq.com/openai/v1" },
        mistral: { enabled: true, model: "m-model", baseUrl: "https://api.mistral.ai/v1" },
        openrouter: { enabled: true, model: "o-model", baseUrl: "https://openrouter.ai/api/v1" },
        gemini: { enabled: false, model: "", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
        openai: { enabled: false, model: "", baseUrl: "https://api.openai.com/v1" },
        anthropic: { enabled: false, model: "", baseUrl: "https://api.anthropic.com/v1" },
      },
      featureProviders: { chat: "", insights: "", productDescriptions: "", knowledgeBase: "" },
      chat: { temperature: 0.2, maxTokens: 700 },
      ...overrides,
    },
  };
}

test("buildProvidersFromSettings: fallbackOrder ordering, remaining enabled appended", () => {
  const { buildProvidersFromSettings } = require(abs(chatConfigPath));
  const integrations = integrationsFixture();
  integrations.ai.providers.anthropic = {
    enabled: true,
    model: "claude-x",
    baseUrl: "https://api.anthropic.com/v1",
  };
  const providers = buildProvidersFromSettings(integrations, {
    groq: "k1",
    mistral: "k2",
    openrouter: "k3",
    anthropic: "k4",
  });
  assert.deepEqual(
    providers.map((p) => p.name),
    ["groq", "mistral", "openrouter", "anthropic"],
  );
});

test("buildProvidersFromSettings: disabled, keyless and empty-model providers excluded", () => {
  const { buildProvidersFromSettings } = require(abs(chatConfigPath));
  const integrations = integrationsFixture();
  integrations.ai.providers.openai = {
    enabled: true,
    model: "", // enabled but no model -> excluded
    baseUrl: "https://api.openai.com/v1",
  };
  integrations.ai.providers.gemini = {
    enabled: true,
    model: "gemini-x",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  };
  const providers = buildProvidersFromSettings(integrations, {
    groq: "k1",
    // mistral: no key -> excluded
    openrouter: "k3",
    openai: "k5",
    gemini: "k6",
  });
  assert.deepEqual(
    providers.map((p) => p.name),
    ["groq", "openrouter", "gemini"],
  );
});

test("buildProvidersFromSettings: featureProviders.chat promotion", () => {
  const { buildProvidersFromSettings } = require(abs(chatConfigPath));
  const integrations = integrationsFixture();
  integrations.ai.featureProviders.chat = "openrouter";
  const providers = buildProvidersFromSettings(integrations, {
    groq: "k1",
    mistral: "k2",
    openrouter: "k3",
  });
  assert.equal(providers[0].name, "openrouter");
  assert.equal(providers.length, 3);
});

test("buildProvidersFromSettings: gemini /openai adjustment + anthropic authStyle", () => {
  const { buildProvidersFromSettings } = require(abs(chatConfigPath));
  const integrations = integrationsFixture();
  integrations.ai.providers.gemini = {
    enabled: true,
    model: "gemini-x",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  };
  integrations.ai.providers.anthropic = {
    enabled: true,
    model: "claude-x",
    baseUrl: "https://api.anthropic.com/v1",
  };
  const providers = buildProvidersFromSettings(integrations, {
    groq: "k1",
    mistral: "k2",
    openrouter: "k3",
    gemini: "k6",
    anthropic: "k4",
  });
  const gemini = providers.find((p) => p.name === "gemini");
  assert.equal(
    gemini.baseUrl,
    "https://generativelanguage.googleapis.com/v1beta/openai",
  );
  const anthropic = providers.find((p) => p.name === "anthropic");
  assert.equal(anthropic.authStyle, "x-api-key");
  const groq = providers.find((p) => p.name === "groq");
  assert.equal(groq.authStyle, "bearer");
});

// ---------- (b) env parity when settings unavailable ----------

test("loadChatConfigAsync: settings unavailable returns the sync env config", async () => {
  stubModule("services/settings/settingsService.js", {
    isDbReady: () => false,
    getSettings: async () => {
      throw new Error("no db");
    },
    getRawStoredData: async () => null,
  });
  stubModule("services/settings/secretsService.js", {
    getResolvedSecret: async () => null,
  });
  const { loadChatConfig, loadChatConfigAsync } = freshRequire(chatConfigPath);
  const env = {
    GROQ_API_KEY: "groq-key",
    MISTRAL_API_KEY: "mistral-key",
    GROQ_CHAT_MODEL: "custom-groq-model",
  };
  const asyncConfig = await loadChatConfigAsync(env);
  const syncConfig = loadChatConfig(env);
  assert.deepEqual(asyncConfig.providers, syncConfig.providers);
  assert.deepEqual(asyncConfig, syncConfig);
});

test("loadChatConfigAsync: saved integrations engage the settings path", async () => {
  const integrations = integrationsFixture();
  integrations.ai.chat = { temperature: 0.7, maxTokens: 900 };
  integrations.ai.featureProviders.chat = "mistral";
  stubModule("services/settings/settingsService.js", {
    isDbReady: () => true,
    getRawStoredData: async () => ({ integrations }),
    getSettings: async () => ({ integrations }),
  });
  stubModule("services/settings/secretsService.js", {
    getResolvedSecret: async (service) =>
      ({ "ai.groq": "gk", "ai.mistral": "mk", "ai.openrouter": "ok" })[service] ||
      null,
  });
  const { loadChatConfigAsync } = freshRequire(chatConfigPath);
  const config = await loadChatConfigAsync({});
  assert.deepEqual(
    config.providers.map((p) => p.name),
    ["mistral", "groq", "openrouter"],
  );
  assert.equal(config.providers[0].apiKey, "mk");
  assert.equal(config.temperature, 0.7);
  assert.equal(config.maxTokens, 900);
});

// ---------- (c) gateway providerHeaders ----------

test("providerHeaders: bearer default, x-api-key + anthropic-version for anthropic", async () => {
  const gatewayModule = require(abs("services/chatV2/providers/llmGateway.js"));
  const headers = gatewayModule._providerHeaders;
  assert.equal(typeof headers, "function");
  assert.deepEqual(headers({ apiKey: "k" }), {
    Authorization: "Bearer k",
    "Content-Type": "application/json",
  });
  assert.deepEqual(headers({ apiKey: "k", authStyle: "x-api-key" }), {
    "x-api-key": "k",
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  });

  // And through _completeJson with a mocked fetch: the anthropic
  // provider must NOT send an Authorization header.
  const LlmGateway = gatewayModule;
  const gateway = new LlmGateway({
    providers: [],
    temperature: 0.2,
    maxTokens: 100,
  });
  const realFetch = global.fetch;
  let seenHeaders;
  global.fetch = async (url, options) => {
    seenHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        choices: [{ message: { content: "hi" }, finish_reason: "stop" }],
        usage: null,
      }),
    };
  };
  try {
    await gateway._completeJson(
      {
        name: "anthropic",
        apiKey: "ak",
        model: "claude-x",
        baseUrl: "https://api.anthropic.com/v1",
        authStyle: "x-api-key",
      },
      "anthropic:claude-x",
      { messages: [], tools: undefined },
    );
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(seenHeaders["x-api-key"], "ak");
  assert.equal(seenHeaders["anthropic-version"], "2023-06-01");
  assert.equal(seenHeaders.Authorization, undefined);
});

// ---------- (d) email key precedence ----------

test("email: resolved admin Brevo key beats env; env is the fallback", async () => {
  process.env.BREVO_API_KEY = "env-brevo-key";
  stubModule("services/settings/settingsService.js", {
    isDbReady: () => true,
  });
  stubModule("services/settings/secretsService.js", {
    getResolvedSecret: async () => "admin-brevo-key",
  });
  const email = freshRequire("services/email.service.js");
  email._resetBrevoKeyCache();
  assert.equal(await email._resolveBrevoApiKey(), "admin-brevo-key");

  stubModule("services/settings/secretsService.js", {
    getResolvedSecret: async () => null,
  });
  const email2 = freshRequire("services/email.service.js");
  email2._resetBrevoKeyCache();
  assert.equal(await email2._resolveBrevoApiKey(), "env-brevo-key");
  delete process.env.BREVO_API_KEY;
});

// ---------- (e) cloudinary merged-config precedence ----------

test("cloudinary mergeCloudinaryConfig: settings win per-field, env fills gaps", () => {
  const { mergeCloudinaryConfig } = require(abs("config/cloudinary.js"));
  const env = {
    CLOUDINARY_CLOUD_NAME: "env-cloud",
    CLOUDINARY_API_KEY: "env-key",
    CLOUDINARY_API_SECRET: "env-secret",
  };
  assert.deepEqual(
    mergeCloudinaryConfig({ cloudName: "admin-cloud", apiKey: "" }, "admin-secret", env),
    {
      cloud_name: "admin-cloud",
      api_key: "env-key",
      api_secret: "admin-secret",
    },
  );
  assert.deepEqual(mergeCloudinaryConfig({}, null, env), {
    cloud_name: "env-cloud",
    api_key: "env-key",
    api_secret: "env-secret",
  });
  assert.deepEqual(
    mergeCloudinaryConfig({ cloudName: "", apiKey: "admin-key" }, null, env),
    {
      cloud_name: "env-cloud",
      api_key: "admin-key",
      api_secret: "env-secret",
    },
  );
});

// ---------- (f) esewa credential resolution precedence ----------

test("esewa resolveEsewaCredentials: settings merchant + resolved secret win, env fallback per-field", () => {
  const svc = require(abs("services/esewaVerification.service.js"));
  const resolve = svc._resolveEsewaCredentials;
  assert.equal(typeof resolve, "function");
  const env = { ESEWA_MERCHANT_ID: "env-merchant", ESEWA_SECRET_KEY: "env-secret" };
  assert.deepEqual(
    resolve({ settingsMerchantId: "admin-merchant", resolvedSecret: "admin-secret" }, env),
    { merchantId: "admin-merchant", secretKey: "admin-secret" },
  );
  assert.deepEqual(resolve({ settingsMerchantId: "", resolvedSecret: null }, env), {
    merchantId: "env-merchant",
    secretKey: "env-secret",
  });
  assert.deepEqual(
    resolve({ settingsMerchantId: "admin-merchant", resolvedSecret: null }, env),
    { merchantId: "admin-merchant", secretKey: "env-secret" },
  );
  assert.deepEqual(resolve({}, {}), { merchantId: "", secretKey: "" });
});

test("esewa getEsewaConfigAsync: no DB degrades to the sync env config", async () => {
  stubModule("services/settings/settingsService.js", {
    isDbReady: () => false,
    getRawStoredData: async () => null,
  });
  const svc = freshRequire("services/esewaVerification.service.js");
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    ESEWA_MERCHANT_ID: process.env.ESEWA_MERCHANT_ID,
    ESEWA_SECRET_KEY: process.env.ESEWA_SECRET_KEY,
  };
  process.env.NODE_ENV = "development";
  process.env.ESEWA_MERCHANT_ID = "async-merchant";
  process.env.ESEWA_SECRET_KEY = "async-secret";
  try {
    const asyncCfg = await svc.getEsewaConfigAsync();
    const syncCfg = svc.getEsewaConfig();
    assert.deepEqual(asyncCfg, syncCfg);
    assert.equal(asyncCfg.merchantId, "async-merchant");
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
