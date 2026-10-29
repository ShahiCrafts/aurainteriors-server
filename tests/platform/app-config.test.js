"use strict";
// AR-32 + OA-1/OA-2 characterization tests for config/appConfig.js.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const cfg = require("../../config/appConfig");

test("defaults: every registered key parses to its pinned default under an empty env", () => {
  for (const [name, spec] of Object.entries(cfg.REGISTRY)) {
    assert.equal(cfg.get(name, {}), spec.def, `${name} default`);
  }
  // Literal spot-pins derived from the pre-AR-32 code (not from the registry):
  const pins = {
    PORT: 3001,
    NODE_ENV: "development",
    MONGO_DB_NAME: "aura_interiors_db",
    MONGO_MAX_POOL_SIZE: 100,
    MONGO_MIN_POOL_SIZE: 0,
    MONGO_CONNECT_RETRIES: 5,
    JWT_EXPIRES_IN: "7d",
    JWT_COOKIE_EXPIRES_IN: 7,
    BREVO_API_BASE_URL: "https://api.brevo.com/v3",
    BREVO_TIMEOUT_MS: 15000,
    CLOUDINARY_TIMEOUT_MS: 30000,
    EMBEDDING_API_URL: "https://integrate.api.nvidia.com/v1/embeddings",
    EMBEDDING_MODEL_NAME: "nvidia/llama-3.2-nv-embed-qa-4",
    EMBEDDING_VECTOR_SIZE: 2048,
    CHAT_TOOL_TIMEOUT_MS: 1500,
    CHAT_MAX_TOKENS: 700,
    CHAT_TEMPERATURE: 0.2,
    CHAT_MAX_TOOL_ROUNDS: 3,
    CHAT_MAX_CONCURRENT_TURNS: 0,
    CHAT_LLM_STREAM_TIMEOUT_MS: 120000,
    GROQ_CHAT_MODEL: "openai/gpt-oss-120b",
    MISTRAL_CHAT_MODEL: "mistral-small-latest",
    OPENROUTER_CHAT_MODEL: "meta-llama/llama-3.3-70b-instruct",
    GUEST_SESSION_TTL_MODE: "creation",
    GUEST_STOCK_RESERVATION_TTL_MINUTES: 30,
    GUEST_COD_HOLD_RELEASE_HOURS: 0,
    CATEGORY_SVG_POLICY: "reencode",
    BLOG_SEARCH_MODE: "regex",
    ANALYTICS_CACHE_TTL_MS: 0,
    SOCKET_REVALIDATE_INTERVAL_MS: 0,
    SOCKET_ADAPTER: "none",
    RATE_LIMIT_STORE: "memory",
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_READ_MAX: 900,
    RATE_LIMIT_WRITE_MAX: 300,
    WORKER_MODE: "inline",
    BROADCAST_MODE: "inline",
    EMAIL_MODE: "direct",
    JOB_POLL_MS: 1000,
    JOB_CONCURRENCY: 5,
    JOB_VISIBILITY_MS: 60000,
    JOB_BACKOFF_BASE_MS: 5000,
    JOB_BACKOFF_CAP_MS: 300000,
    INGEST_CONCURRENCY: 2,
    INGEST_STUCK_AFTER_MS: 600000,
    INGEST_MAX_RECOVERIES: 3,
    RAG_EMBEDDING_TIMEOUT_MS: 250,
    RAG_QDRANT_TIMEOUT_MS: 5000,
    SHUTDOWN_DRAIN_TIMEOUT_MS: 10000,
    KEEP_ALIVE_INTERVAL: 14,
    // OA-1 removed fallbacks: these MUST be unset by default now.
    FRONTEND_URL: null,
    BACKEND_URL: null,
    EMAIL_FROM: null,
    SUPPORT_EMAIL: null,
    QDRANT_URL: null,
  };
  for (const [k, v] of Object.entries(pins))
    assert.equal(cfg.get(k, {}), v, `pin ${k}`);
});

test("invalid values: validateEnv errors name the key", () => {
  const { errors } = cfg.validateEnv({
    SOCKET_REVALIDATE_INTERVAL_MS: "abc",
    EMAIL_MODE: "sideways",
    FRONTEND_URL: "not a url",
  });
  assert.ok(
    errors.some((e) => e.includes("SOCKET_REVALIDATE_INTERVAL_MS")),
    errors.join(";"),
  );
  assert.ok(
    errors.some((e) => e.includes("EMAIL_MODE")),
    errors.join(";"),
  );
  assert.ok(
    errors.some((e) => e.includes("FRONTEND_URL")),
    errors.join(";"),
  );
});

test("near-miss + removed keys warn; unrelated keys never warn", () => {
  const { warnings } = cfg.validateEnv({
    BROADCAS_MODE: "queue",
    CHAT_PIPELINE: "legacy",
    PATH: "/usr/bin",
    HOME: "/home/x",
  });
  assert.ok(
    warnings.some(
      (w) => w.includes("BROADCAS_MODE") && w.includes("BROADCAST_MODE"),
    ),
    warnings.join(";"),
  );
  assert.ok(
    warnings.some((w) => w.includes("CHAT_PIPELINE") && w.includes("AR-30")),
    warnings.join(";"),
  );
  assert.ok(!warnings.some((w) => w.startsWith("PATH")), warnings.join(";"));
});

const PROD_OK = {
  NODE_ENV: "production",
  FRONTEND_URL: "https://example.com",
  ADMIN_URL: "https://admin.example.com",
  BACKEND_URL: "https://api.example.com",
  EMAIL_FROM: "Aura <noreply@example.com>",
  SUPPORT_EMAIL: "support@example.com",
  JWT_SECRET: "x".repeat(40),
  MONGO_URI: "mongodb+srv://cluster.example/db",
  ESEWA_MERCHANT_ID: "M1",
  ESEWA_SECRET_KEY: "s3cret",
  OTP_PEPPER: "pepper-value", // VULN-007: requiredProd since the Phase 1 remediation
};
test("production gate: each required missing in turn errors naming it; all present passes", () => {
  for (const k of [
    "FRONTEND_URL",
    "ADMIN_URL",
    "BACKEND_URL",
    "EMAIL_FROM",
    "SUPPORT_EMAIL",
    "JWT_SECRET",
    "MONGO_URI",
    "ESEWA_MERCHANT_ID",
    "ESEWA_SECRET_KEY",
    "OTP_PEPPER",
  ]) {
    const env = { ...PROD_OK };
    delete env[k];
    const { errors } = cfg.validateEnv(env);
    assert.ok(
      errors.some((e) => e.includes(k)),
      `${k}: ${errors.join(";")}`,
    );
  }
  assert.deepEqual(cfg.validateEnv(PROD_OK).errors, []);
  assert.ok(
    cfg
      .validateEnv({ ...PROD_OK, JWT_SECRET: "short" })
      .errors.some((e) => e.includes("JWT_SECRET")),
  );
  assert.ok(
    cfg
      .validateEnv({ ...PROD_OK, MONGO_URI: "mongodb://localhost:27017/db" })
      .errors.some((e) => e.includes("MONGO_URI")),
  );
  // non-production: missing requireds are warnings, never errors
  const dev = cfg.validateEnv({ NODE_ENV: "development" });
  assert.equal(
    dev.errors.filter((e) => e.includes("required in production")).length,
    0,
  );
});

test("SEC-012: escape-hatch flags are boot errors in production, not warnings", () => {
  const withBody = cfg.validateEnv({ ...PROD_OK, RETURN_TOKEN_IN_BODY: "1" });
  assert.ok(
    withBody.errors.some((e) => e.includes("RETURN_TOKEN_IN_BODY")),
    withBody.errors.join(";"),
  );
  assert.ok(
    !withBody.warnings.some((w) => w.includes("RETURN_TOKEN_IN_BODY")),
    "must be an error, not a warning",
  );
  const withIssAud = cfg.validateEnv({ ...PROD_OK, JWT_REQUIRE_ISS_AUD: "0" });
  assert.ok(
    withIssAud.errors.some((e) => e.includes("JWT_REQUIRE_ISS_AUD")),
    withIssAud.errors.join(";"),
  );
  // Unset / non-triggering values stay clean in production.
  assert.deepEqual(cfg.validateEnv(PROD_OK).errors, []);
  assert.deepEqual(
    cfg.validateEnv({ ...PROD_OK, RETURN_TOKEN_IN_BODY: "0" }).errors,
    [],
  );
  // Outside production the flags remain usable for local debugging.
  const dev = cfg.validateEnv({
    NODE_ENV: "development",
    RETURN_TOKEN_IN_BODY: "1",
    JWT_REQUIRE_ISS_AUD: "0",
  });
  assert.ok(!dev.errors.some((e) => e.includes("RETURN_TOKEN_IN_BODY")));
  assert.ok(!dev.errors.some((e) => e.includes("JWT_REQUIRE_ISS_AUD")));
});

test("placeholder rejection: .env.production template values fail in production; real-looking values pass", () => {
  const text = fs.readFileSync(
    path.join(__dirname, "../../.env.production"),
    "utf8",
  );
  const env = { NODE_ENV: "production" };
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  const { errors } = cfg.validateEnv(env);
  assert.ok(
    errors.some((e) => e.includes("JWT_SECRET") && e.includes("placeholder")),
    errors.join(";"),
  );
  // Lead review item 1 (2026-10-24): EPAYTEST is eSewa's SANDBOX merchant
  // code; paired with ESEWA_ENV=production the placeholder validator
  // cannot catch it, so the template itself must carry a CHANGE_ME
  // marker that boot refuses by name.
  const merchantLine = text
    .split("\n")
    .find((l) => l.startsWith("ESEWA_MERCHANT_ID="));
  assert.ok(
    /CHANGE_ME/.test(merchantLine || ""),
    `production template must not ship a non-placeholder merchant code: ${merchantLine}`,
  );
  assert.ok(
    errors.some(
      (e) => e.includes("ESEWA_MERCHANT_ID") && e.includes("placeholder"),
    ),
    errors.join(";"),
  );
  const real = {
    ...env,
    BACKEND_URL: "https://api.example.com",
    QDRANT_URL: "https://q.example.com",
    MONGO_URI: "mongodb+srv://cluster.example/db",
  };
  for (const k of Object.keys(real))
    if (typeof real[k] === "string" && real[k].includes("CHANGE_ME"))
      real[k] = "real-value-" + "x".repeat(32);
  assert.deepEqual(
    cfg.validateEnv(real).errors,
    [],
    cfg.validateEnv(real).errors.join(";"),
  );
});

test("buildAllowedOrigins: env only, normalized, extras appended, order stable", () => {
  assert.deepEqual(
    cfg.buildAllowedOrigins({
      FRONTEND_URL: "https://a.example/",
      ADMIN_URL: "https://b.example",
      CORS_EXTRA_ORIGINS: "https://c.example/, https://a.example",
    }),
    ["https://a.example", "https://b.example", "https://c.example"],
  );
  assert.deepEqual(cfg.buildAllowedOrigins({}), []);
});

test("qdrant resolver: import-safe, operation without QDRANT_URL fails loudly by name", () => {
  assert.throws(() => cfg.qdrantConfig({}), /QDRANT_URL is not configured/);
  assert.deepEqual(cfg.qdrantConfig({ QDRANT_URL: "http://localhost:6333" }), {
    url: "http://localhost:6333",
    apiKey: undefined,
  });
});

test("requireAtUse names the variable", () => {
  assert.throws(
    () => cfg.requireAtUse("FRONTEND_URL", {}),
    /FRONTEND_URL is not configured/,
  );
  assert.equal(
    cfg.requireAtUse("FRONTEND_URL", { FRONTEND_URL: "https://a.example" }),
    "https://a.example",
  );
});

test("loadEnv precedence: process env > .env.<NODE_ENV> > .env; missing files are a no-op", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "appcfg-"));
  fs.writeFileSync(
    path.join(dir, ".env"),
    "APPCFG_PROBE_A=from-dotenv\nAPPCFG_PROBE_B=from-dotenv\n",
  );
  fs.writeFileSync(
    path.join(dir, ".env.production"),
    "APPCFG_PROBE_A=from-specific\n",
  );
  const saved = {
    A: process.env.APPCFG_PROBE_A,
    B: process.env.APPCFG_PROBE_B,
  };
  try {
    process.env.APPCFG_PROBE_B = "from-process";
    delete process.env.APPCFG_PROBE_A;
    const r = cfg.loadEnv({ cwd: dir, env: { NODE_ENV: "production" } });
    assert.deepEqual(r.loaded, [".env.production", ".env"]);
    assert.equal(process.env.APPCFG_PROBE_A, "from-specific"); // env-specific beats .env
    assert.equal(process.env.APPCFG_PROBE_B, "from-process"); // process beats files
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "appcfg-empty-"));
    assert.deepEqual(
      cfg.loadEnv({ cwd: empty, env: { NODE_ENV: "test" } }).loaded,
      [],
    ); // no .env.test: silent no-op
  } finally {
    if (saved.A === undefined) delete process.env.APPCFG_PROBE_A;
    else process.env.APPCFG_PROBE_A = saved.A;
    if (saved.B === undefined) delete process.env.APPCFG_PROBE_B;
    else process.env.APPCFG_PROBE_B = saved.B;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("case-variant near-miss warns naming both spellings (A3)", () => {
  const { warnings } = cfg.validateEnv({
    frontend_url: "https://x.example",
    Node_Env: "development",
  });
  assert.ok(
    warnings.some(
      (w) => w.includes("frontend_url") && w.includes("FRONTEND_URL"),
    ),
    warnings.join(";"),
  );
});

test("embedded CHANGE_ME placeholder in a required value errors naming it (A3/F)", () => {
  const env = {
    ...PROD_OK,
    MONGO_URI: "mongodb+srv://CHANGE_ME_host/aura_interiors_db?tls=true",
  };
  const { errors } = cfg.validateEnv(env);
  assert.ok(
    errors.some((e) => e.includes("MONGO_URI") && e.includes("placeholder")),
    errors.join(";"),
  );
});

test("enum validation is case-sensitive, matching consumers' exact comparisons (A3)", () => {
  const { errors } = cfg.validateEnv({ EMAIL_MODE: "Outbox" });
  assert.ok(
    errors.some((e) => e.includes("EMAIL_MODE")),
    errors.join(";"),
  );
});

test("open NODE_ENV values and FLAGS-documented WORKER_MODE=inprocess are accepted (A2)", () => {
  assert.ok(
    !cfg
      .validateEnv({ NODE_ENV: "staging" })
      .errors.some((e) => e.includes("NODE_ENV")),
  );
  assert.equal(cfg.get("NODE_ENV", { NODE_ENV: "staging" }), "staging");
  assert.ok(
    !cfg
      .validateEnv({ WORKER_MODE: "inprocess" })
      .errors.some((e) => e.includes("WORKER_MODE")),
  );
});

test("no import-time throws: consumers require cleanly with an empty env, and with Google set but BACKEND_URL unset (A4)", () => {
  const { spawnSync } = require("node:child_process");
  const repoRoot = path.join(__dirname, "../..");
  const script = [
    'require("./config/passport");',
    'require("./controllers/document.controller");',
    'require("./services/ingestionService");',
    'require("./services/retrievalService");',
    'require("./services/email.service");',
    'require("./utils/emailTemplate");',
    'require("./controllers/order.controller");',
    'console.log("imports-ok");',
  ].join("");
  const clean = { PATH: process.env.PATH, HOME: process.env.HOME };
  const r1 = spawnSync(process.execPath, ["-e", script], {
    cwd: repoRoot,
    env: clean,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(r1.status, 0, r1.stderr);
  assert.match(r1.stdout, /imports-ok/);
  const r2 = spawnSync(process.execPath, ["-e", script], {
    cwd: repoRoot,
    env: { ...clean, GOOGLE_CLIENT_ID: "x", GOOGLE_CLIENT_SECRET: "y" },
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(r2.status, 0, r2.stderr);
  assert.match(r2.stdout + r2.stderr, /Google OAuth disabled: BACKEND_URL/);
});

test(".env.example and both templates carry exactly the registered key set", () => {
  const parseKeys = (f) =>
    fs
      .readFileSync(path.join(__dirname, "../..", f), "utf8")
      .split("\n")
      .map((l) => (l.match(/^#?\s*([A-Z0-9_]+)=/) || [])[1])
      .filter(Boolean)
      .sort();
  const reg = Object.keys(cfg.REGISTRY).sort();
  assert.deepEqual(parseKeys(".env.example"), reg);
  assert.deepEqual(parseKeys(".env.development"), reg);
  assert.deepEqual(parseKeys(".env.production"), reg);
});
