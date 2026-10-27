"use strict";
// AR-32 + OA-1/OA-2 (2026-10-24): central validated configuration.
// Location/name: config/ already holds the other boot-time configuration
// modules (database.js, topology.js, passport.js, cloudinary.js), and
// AR-33 decomposition builds on this module, so the registry lives here
// as config/appConfig.js rather than in a new top-level directory.
//
// Design rules (binding):
// - NO import-time throws. Importing this module never reads or validates
//   the environment. Getters read LIVE from process.env on every call by
//   default, preserving today's per-call semantics and test env-stubbing;
//   a consumer that froze a value at import today may keep freezing by
//   calling a getter at import.
// - Validation runs ONLY in the server.js / worker.js boot path via
//   validateEnv(). Getters fall back to the registered default on an
//   invalid INT/FLOAT value (today's silent-fallback semantics at read
//   sites); for enum/string/url keys they return the raw value and
//   validateEnv is what makes an invalid value loud, at boot, by name.
// - Secrets are never logged by this module; errors name variables only.
const fs = require("fs");
const path = require("path");

// type: string | int | float | boolish | enum | url
// def: the parsed default under an empty env (EXACTLY today's behavior,
// except the OA-1 sites whose fallbacks the owner ordered REMOVED —
// those are def:null and marked removedFallback:true).
// semantics: "live" (read per call in today's code) or "frozen" (read
// once at import in today's code). Informational; getters are always live.
const REGISTRY = {
  PORT: { type: "int", def: 3001, semantics: "frozen" },
  // AR-32 completion fix: NODE_ENV is NOT an enum. Pre-AR-32 code treated
  // it as an open string (only === "production" / === "development" are
  // special-cased) and this repo contemplates staging/preview/CI values
  // (see tests/audit/esewa-config.test.js B-20) - an enum here made a
  // staging boot exit(1), a behavior the pre-AR-32 code never had.
  NODE_ENV: { type: "string", def: "development", semantics: "live" },
  MONGO_URI: { type: "string", def: null, secret: true, requiredProd: true, semantics: "live" },
  MONGO_DB_NAME: { type: "string", def: "aura_interiors_db", semantics: "live" },
  MONGO_MAX_POOL_SIZE: { type: "int", def: 100, semantics: "live" },
  MONGO_MIN_POOL_SIZE: { type: "int", def: 0, semantics: "live" },
  MONGO_CONNECT_RETRIES: { type: "int", def: 5, semantics: "live" },
  JWT_SECRET: { type: "string", def: null, secret: true, requiredProd: true, semantics: "live" },
  JWT_EXPIRES_IN: { type: "string", def: "7d", semantics: "live" },
  JWT_COOKIE_EXPIRES_IN: { type: "int", def: 7, semantics: "live" },
  JWT_REQUIRE_ISS_AUD: { type: "string", def: null, semantics: "live" }, // off only when exactly "0"
  OTP_PEPPER: { type: "string", def: null, secret: true, requiredProd: true, semantics: "live" }, // VULN-007: required in production like JWT_SECRET — the OTP HMAC must not silently fall back to the JWT secret (key separation)
  NEWSLETTER_TOKEN_SECRET: { type: "string", def: null, secret: true, semantics: "live" },
  FRONTEND_URL: { type: "url", def: null, requiredProd: true, removedFallback: true, semantics: "live" },
  ADMIN_URL: { type: "url", def: null, requiredProd: true, semantics: "live" },
  BACKEND_URL: { type: "url", def: null, requiredProd: true, removedFallback: true, semantics: "live" },
  CORS_EXTRA_ORIGINS: { type: "string", def: null, semantics: "live" }, // OA-1: comma-separated extra origins
  GOOGLE_CLIENT_ID: { type: "string", def: null, semantics: "frozen" },
  GOOGLE_CLIENT_SECRET: { type: "string", def: null, secret: true, semantics: "frozen" },
  BREVO_API_KEY: { type: "string", def: null, secret: true, semantics: "frozen" },
  BREVO_API_BASE_URL: { type: "url", def: "https://api.brevo.com/v3", semantics: "frozen" },
  BREVO_TIMEOUT_MS: { type: "int", def: 15000, semantics: "frozen" },
  EMAIL_FROM: { type: "string", def: null, requiredProd: true, removedFallback: true, semantics: "live" },
  SUPPORT_EMAIL: { type: "string", def: null, requiredProd: true, semantics: "live" }, // OA-1: replaces hardcoded support@ literals
  // Lead review item 3 (GROUP A, 2026-10-24): the email logo URL was
  // hardcoded (https://aurainteriors.com/aura-logo.png) in two template
  // functions. Routed through env; unset fails loudly at email-render
  // time via requireAtUse (same as the other email identity keys). Not
  // requiredProd - a logo is cosmetic; a missing value throws at send
  // time, never silently substitutes a wrong host.
  EMAIL_LOGO_URL: { type: "url", def: null, semantics: "live" },
  EMAIL_MODE: { type: "enum", values: ["direct", "outbox"], def: "direct", semantics: "live" },
  CLOUDINARY_CLOUD_NAME: { type: "string", def: null, semantics: "live" },
  CLOUDINARY_API_KEY: { type: "string", def: null, secret: true, semantics: "live" },
  CLOUDINARY_API_SECRET: { type: "string", def: null, secret: true, semantics: "live" },
  CLOUDINARY_TIMEOUT_MS: { type: "int", def: 30000, semantics: "live" },
  ESEWA_MERCHANT_ID: { type: "string", def: null, requiredProd: true, semantics: "live" },
  ESEWA_SECRET_KEY: { type: "string", def: null, secret: true, requiredProd: true, semantics: "live" },
  ESEWA_ENV: { type: "enum", values: ["sandbox", "production"], def: null, semantics: "live" },
  QDRANT_URL: { type: "url", def: null, removedFallback: true, semantics: "live" },
  QDRANT_API_KEY: { type: "string", def: null, secret: true, semantics: "live" },
  EMBEDDING_API_URL: { type: "url", def: "https://integrate.api.nvidia.com/v1/embeddings", semantics: "live" },
  // Code sites agree on this default; .env.example previously documented a
  // DIFFERENT model (nvidia/llama-nemotron-embed-1b-v2) — code wins, see report.
  EMBEDDING_MODEL_NAME: { type: "string", def: "nvidia/llama-3.2-nv-embed-qa-4", semantics: "live" },
  EMBEDDING_VECTOR_SIZE: { type: "int", def: 2048, semantics: "frozen" },
  NVIDIA_API_KEY: { type: "string", def: null, secret: true, semantics: "live" },
  OPENROUTER_API_KEY: { type: "string", def: null, secret: true, semantics: "live" },
  GEMINI_API_KEY: { type: "string", def: null, secret: true, semantics: "live" },
  GROQ_API_KEY: { type: "string", def: null, secret: true, semantics: "live" },
  MISTRAL_API_KEY: { type: "string", def: null, secret: true, semantics: "live" },
  GROQ_CHAT_MODEL: { type: "string", def: "openai/gpt-oss-120b", semantics: "live" },
  MISTRAL_CHAT_MODEL: { type: "string", def: "mistral-small-latest", semantics: "live" },
  OPENROUTER_CHAT_MODEL: { type: "string", def: "meta-llama/llama-3.3-70b-instruct", semantics: "live" },
  GROQ_BASE_URL: { type: "url", def: "https://api.groq.com/openai/v1", semantics: "live" },
  MISTRAL_BASE_URL: { type: "url", def: "https://api.mistral.ai/v1", semantics: "live" },
  OPENROUTER_BASE_URL: { type: "url", def: "https://openrouter.ai/api/v1", semantics: "live" },
  // Code fallback in chatConfig int() is 1500; .env.example documented 1200 — code wins, see report.
  CHAT_TOOL_TIMEOUT_MS: { type: "int", def: 1500, semantics: "live" },
  CHAT_MAX_TOKENS: { type: "int", def: 700, semantics: "live" },
  CHAT_TEMPERATURE: { type: "float", def: 0.2, semantics: "live" },
  CHAT_MAX_TOOL_ROUNDS: { type: "int", def: 3, semantics: "live" },
  CHAT_MAX_CONCURRENT_TURNS: { type: "int", def: 0, semantics: "live" },
  CHAT_LLM_STREAM_TIMEOUT_MS: { type: "int", def: 120000, semantics: "live" },
  CHAT_ALLOW_CUSTOM_LLM_BASE_URLS: { type: "string", def: null, semantics: "live" }, // on only when exactly "1"
  CART_GET_READONLY: { type: "string", def: null, semantics: "live" }, // on only when exactly "on"
  DOCUMENT_DELETE_HONEST_STATUS: { type: "string", def: null, semantics: "live" },
  GUEST_SESSION_TTL_MODE: { type: "enum", values: ["creation", "activity"], def: "creation", semantics: "live" },
  GUEST_SESSION_ALLOW_QUERY: { type: "string", def: null, semantics: "live" }, // on only when exactly "1"
  GUEST_STOCK_RESERVATION: { type: "string", def: null, semantics: "live" }, // on only when exactly "on"
  GUEST_STOCK_RESERVATION_TTL_MINUTES: { type: "int", def: 30, semantics: "live" },
  GUEST_COD_HOLD_RELEASE_HOURS: { type: "int", def: 0, semantics: "live" },
  CATEGORY_SVG_POLICY: { type: "enum", values: ["reencode", "reject"], def: "reencode", semantics: "live" }, // VULN-002: enum so a typo'd value fails boot validation instead of failing open in upload.middleware (values are lowercase; the consumer lowercases before comparing, and validateEnv compares enums case-sensitively)
  BLOG_SEARCH_MODE: { type: "enum", values: ["regex", "text"], def: "regex", semantics: "live" },
  ANALYTICS_CACHE_TTL_MS: { type: "int", def: 0, semantics: "live" },
  UPLOAD_MAX_TOTAL_BYTES: { type: "int", def: 52428800, semantics: "live" }, // VULN-006: 50 MB aggregate per-request default (was def:null = no aggregate enforcement); an explicit env value still overrides
  SOCKET_REVALIDATE_INTERVAL_MS: { type: "int", def: 0, semantics: "live" },
  SOCKET_ADAPTER: { type: "enum", values: ["none", "mongo"], def: "none", semantics: "frozen" },
  RATE_LIMIT_STORE: { type: "enum", values: ["memory", "mongo"], def: "memory", semantics: "live" },
  RATE_LIMIT_WINDOW_MS: { type: "int", def: 900000, semantics: "frozen" },
  RATE_LIMIT_READ_MAX: { type: "int", def: 900, semantics: "frozen" },
  RATE_LIMIT_WRITE_MAX: { type: "int", def: 300, semantics: "frozen" },
  // CONFLICT (reported, not silently picked): middleware/rateLimit.middleware.js
  // reads this ONE key with TWO different defaults — 900 for adminReadLimiter
  // and 300 for adminWriteLimiter. def stays null here; the read site is
  // registered-only and NOT migrated until the owner/coordinator resolves it.
  RATE_LIMIT_ADMIN_MAX: { type: "int", def: null, semantics: "frozen", conflict: "adminReadLimiter default 900 vs adminWriteLimiter default 300 in middleware/rateLimit.middleware.js" },
  // "inprocess" is FLAGS.md's documented name for the default mode, so it
  // is accepted alongside the draft's "inline"; server.js treats every
  // value other than "separate" as in-process, exactly as pre-AR-32.
  WORKER_MODE: { type: "enum", values: ["inline", "inprocess", "separate"], def: "inline", semantics: "live" },
  BROADCAST_MODE: { type: "enum", values: ["inline", "queue"], def: "inline", semantics: "live" },
  JOB_POLL_MS: { type: "int", def: 1000, semantics: "live" },
  JOB_CONCURRENCY: { type: "int", def: 5, semantics: "live" },
  JOB_VISIBILITY_MS: { type: "int", def: 60000, semantics: "live" },
  JOB_BACKOFF_BASE_MS: { type: "int", def: 5000, semantics: "live" },
  JOB_BACKOFF_CAP_MS: { type: "int", def: 300000, semantics: "live" },
  INGEST_CONCURRENCY: { type: "int", def: 2, semantics: "live" },
  INGEST_MAX_CHUNKS_PER_JOB: { type: "int", def: null, semantics: "live" },
  INGEST_STUCK_AFTER_MS: { type: "int", def: 600000, semantics: "live" },
  INGEST_MAX_RECOVERIES: { type: "int", def: 3, semantics: "live" },
  RAG_EMBEDDING_TIMEOUT_MS: { type: "int", def: 250, semantics: "live" },
  RAG_QDRANT_TIMEOUT_MS: { type: "int", def: 5000, semantics: "live" },
  RETENTION_CHAT_MESSAGE_DAYS: { type: "int", def: null, semantics: "live" },
  RETENTION_NOTIFICATION_DAYS: { type: "int", def: null, semantics: "live" },
  RETENTION_BLOG_ENGAGEMENT_DAYS: { type: "int", def: null, semantics: "live" },
  RETENTION_CONTACT_DAYS: { type: "int", def: null, semantics: "live" },
  SHUTDOWN_DRAIN_TIMEOUT_MS: { type: "int", def: 10000, semantics: "live" },
  TRUST_PROXY: { type: "string", def: null, semantics: "frozen" },
  HEALTH_DETAIL_TOKEN: { type: "string", def: null, secret: true, semantics: "live" },
  RETURN_TOKEN_IN_BODY: { type: "string", def: null, semantics: "live" }, // on only when exactly "1"
  SEED_DEMO_DATA: { type: "string", def: null, semantics: "live" }, // on only when exactly "true"
  SEED_CUSTOMER_PASSWORD: { type: "string", def: null, secret: true, semantics: "live" },
  ADMIN_EMAIL: { type: "string", def: null, semantics: "live" },
  ADMIN_PASSWORD: { type: "string", def: null, secret: true, semantics: "live" },
  ALLOW_DESTRUCTIVE_DEMO_SEED: { type: "string", def: null, semantics: "live" },
  KEEP_ALIVE_ENABLED: { type: "string", def: null, semantics: "frozen" }, // legacy keep-alive switch
  KEEPALIVE_ENABLED: { type: "string", def: null, semantics: "frozen" }, // AR-44 gate
  KEEP_ALIVE_INTERVAL: { type: "int", def: 14, semantics: "frozen" },
  RENDER_EXTERNAL_URL: { type: "url", def: null, semantics: "frozen" }, // platform-provided (Render), not app config
};

const REMOVED_KEYS = {
  CHAT_PIPELINE: "removed by AR-30, ignored",
  CHAT_PIPELINE_SHADOW: "removed by AR-30, ignored",
};

function rawOf(name, env) {
  const v = env ? env[name] : undefined;
  return v === undefined || v === null || String(v).trim() === "" ? undefined : String(v);
}

function parseValue(name, env = process.env) {
  const spec = REGISTRY[name];
  if (!spec) throw new Error(`appConfig: unregistered key ${name}`);
  const raw = rawOf(name, env);
  if (raw === undefined) return spec.def;
  const t = raw.trim();
  if (spec.type === "int") { const n = Number(t); return Number.isFinite(n) ? Math.trunc(n) : spec.def; }
  if (spec.type === "float") { const n = Number(t); return Number.isFinite(n) ? n : spec.def; }
  return t;
}
const get = (name, env = process.env) => parseValue(name, env);
const getString = get;
const getInt = (name, env = process.env) => parseValue(name, env);

// Loud-at-use accessor for OA-1 keys whose fallback was removed: returns
// the configured value or throws an error NAMING the variable. Consumers
// call it at use time (inside handlers/functions); the one construction-
// time caller, config/passport.js, guards the call and disables Google
// with a log line instead of throwing at import.
function requireAtUse(name, env = process.env) {
  const v = parseValue(name, env);
  if (v === null || v === undefined || v === "") {
    throw new Error(`${name} is not configured: set ${name} in the environment (see .env.example) before using this feature`);
  }
  return v;
}

// OA-1 shared origin builder: env only, no hardcoded origins anywhere.
function buildAllowedOrigins(env = process.env) {
  const parts = [parseValue("FRONTEND_URL", env), parseValue("ADMIN_URL", env)];
  const extra = rawOf("CORS_EXTRA_ORIGINS", env);
  if (extra) parts.push(...extra.split(","));
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    const o = String(p).trim().replace(/\/+$/, "");
    if (o && !out.includes(o)) out.push(o);
  }
  return out;
}

// OA-1 §9: ONE shared Qdrant resolver. Construction/import never throws;
// an OPERATION attempted while unconfigured fails loudly by name.
function qdrantConfig(env = process.env) {
  const url = parseValue("QDRANT_URL", env);
  if (!url) throw new Error("QDRANT_URL is not configured: set QDRANT_URL in the environment (see .env.example) before using Qdrant-backed features");
  return { url, apiKey: parseValue("QDRANT_API_KEY", env) || undefined };
}
function createQdrantClient(env = process.env, extra = {}) {
  const { QdrantClient } = require("@qdrant/js-client-rest");
  const { url, apiKey } = qdrantConfig(env);
  return new QdrantClient({ url, apiKey, ...extra });
}

function isPlaceholder(v) {
  // AR-32 completion fix: the draft checked only a WHOLE-VALUE prefix, so
  // the .env.production template's own MONGO_URI
  // (mongodb+srv://CHANGE_ME_host/...) evaded detection and would have
  // passed production validation. A CHANGE_ME marker ANYWHERE in the
  // value is a placeholder.
  return typeof v === "string" && (v.includes("CHANGE_ME") || /^<[^>]*>$/.test(v.trim()));
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[m][n];
}

function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  const isProd = String(env.NODE_ENV || "").trim().toLowerCase() === "production";
  for (const [name, spec] of Object.entries(REGISTRY)) {
    const raw = rawOf(name, env);
    if (raw !== undefined) {
      const t = raw.trim();
      if (spec.type === "int" && !Number.isFinite(Number(t))) errors.push(`${name}: invalid integer value`);
      else if (spec.type === "float" && !Number.isFinite(Number(t))) errors.push(`${name}: invalid numeric value`);
      // Enum comparison is CASE-SENSITIVE (AR-32 completion fix): the
      // draft lowercased here, so EMAIL_MODE=Outbox passed validation
      // while every consumer compares === "outbox" and silently fell
      // back - a validated-but-wrong value. Consumers are exact-match,
      // so validation must be too.
      else if (spec.type === "enum" && !spec.values.includes(t)) errors.push(`${name}: invalid value (expected one of: ${spec.values.join(", ")})`);
      else if (spec.type === "url") { try { new URL(t); } catch { errors.push(`${name}: malformed URL`); } }
      if (isProd && spec.requiredProd && isPlaceholder(t)) errors.push(`${name}: still a template placeholder - set a real value in production`);
    } else if (isProd && spec.requiredProd) {
      errors.push(`${name} environment variable is required in production`);
    } else if (!isProd && spec.requiredProd) {
      warnings.push(`${name}: not set (required in production)`);
    }
  }
  if (isProd) {
    const js = rawOf("JWT_SECRET", env);
    if (js && js.length < 32 && !isPlaceholder(js)) errors.push("JWT_SECRET must be at least 32 characters in production");
    const mu = rawOf("MONGO_URI", env);
    if (mu && !isPlaceholder(mu) && !/^mongodb\+srv:\/\//i.test(mu) && !/[?&](tls|ssl)=true/i.test(mu)) {
      errors.push("MONGO_URI must use TLS in production (mongodb+srv:// or ?tls=true)");
    }
    // Preserve today's combined eSewa message shape as individual named errors
    // (both variables are already covered by requiredProd above).
    // VULN-005 / VULN-007: production posture warnings. These settings
    // are legal owner decisions, so they WARN (not error) — but until
    // now nothing surfaced them at boot, so a weakened posture was
    // silent. OTP_PEPPER is the exception: it is requiredProd above
    // and therefore already an error when missing.
    if ((rawOf("RATE_LIMIT_STORE", env) || "memory").trim() !== "mongo") {
      warnings.push("RATE_LIMIT_STORE: not \"mongo\" — rate limits are per-process memory and multiply by instance count in production");
    }
    if (rawOf("TRUST_PROXY", env) === undefined) {
      warnings.push("TRUST_PROXY: not set — behind a load balancer req.ip is the proxy address (shared limiter buckets); set it explicitly to the deployment's proxy topology");
    }
    if ((rawOf("RETURN_TOKEN_IN_BODY", env) || "").trim() === "1") {
      warnings.push("RETURN_TOKEN_IN_BODY=1: the session JWT is returned in response bodies (readable by page scripts) — the httpOnly-cookie design is weakened");
    }
    if ((rawOf("JWT_REQUIRE_ISS_AUD", env) || "").trim() === "0") {
      warnings.push("JWT_REQUIRE_ISS_AUD=0: JWT issuer/audience enforcement is disabled");
    }
    if (rawOf("UPLOAD_MAX_TOTAL_BYTES", env) === undefined) {
      warnings.push("UPLOAD_MAX_TOTAL_BYTES: not set — the registry default (50 MB aggregate per request) applies");
    }
  }
  for (const key of Object.keys(env || {})) {
    if (REMOVED_KEYS[key]) { warnings.push(`${key}: ${REMOVED_KEYS[key]}`); continue; }
    if (REGISTRY[key]) continue;
    const upper = key.toUpperCase();
    if (REGISTRY[upper] && upper !== key) { warnings.push(`${key}: near-miss of registered key ${upper} (case differs) - did you mean ${upper}?`); continue; }
    if (key.length >= 4) {
      for (const reg of Object.keys(REGISTRY)) {
        if (Math.abs(reg.length - key.length) <= 2 && levenshtein(key, reg) <= 2) {
          warnings.push(`${key}: near-miss of registered key ${reg} - did you mean ${reg}?`);
          break;
        }
      }
    }
  }
  return { errors, warnings };
}

// OA-2 layered loading. Precedence: real process env > .env.<NODE_ENV>
// > .env, implemented by loading the env-specific file FIRST and then
// .env, relying on dotenv's never-override semantics (verified for
// dotenv v17: config() does not overwrite keys already present in
// process.env). NODE_ENV for file selection comes from the REAL process
// env (default "development") — it must be set by the platform/process,
// not only inside a file (chicken-and-egg, documented in DEPLOYMENT.md).
// Missing files are a silent no-op.
function loadEnv({ cwd = process.cwd(), env = process.env } = {}) {
  const dotenv = require("dotenv");
  const nodeEnv = String(env.NODE_ENV || "development").trim().toLowerCase() || "development";
  const loaded = [];
  for (const file of [`.env.${nodeEnv}`, ".env"]) {
    const p = path.join(cwd, file);
    if (fs.existsSync(p)) { dotenv.config({ path: p }); loaded.push(file); }
  }
  return { nodeEnv, loaded };
}

module.exports = {
  REGISTRY, REMOVED_KEYS, get, getString, getInt, parseValue,
  requireAtUse, buildAllowedOrigins, qdrantConfig, createQdrantClient,
  validateEnv, loadEnv, isPlaceholder,
};
