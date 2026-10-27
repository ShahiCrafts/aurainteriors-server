// Phase 1 remediation regression tests (VULN-001/002/003/004/005/006/007/008/009).
// Style follows the repo's node --test suites: plain requires, no live
// MongoDB — model writes are monkeypatched where a service is tested.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repo = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(repo, rel), "utf8");

// ---------- VULN-001: shared gated guest-session extractor ----------

const { getGuestSessionId, setGuestSessionCookie } = require(path.join(repo, "utils/guestSession"));

const withEnv = (key, value, fn) => {
  const prev = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try { return fn(); } finally {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  }
};

test("VULN-001: query-only guest id is NOT honoured when GUEST_SESSION_ALLOW_QUERY is off", () => {
  withEnv("GUEST_SESSION_ALLOW_QUERY", undefined, () => {
    const req = { query: { guestSessionId: "guest_abc" }, headers: {}, cookies: {}, body: {} };
    assert.equal(getGuestSessionId(req), undefined);
  });
});

test("VULN-001: header and cookie sources are always honoured", () => {
  withEnv("GUEST_SESSION_ALLOW_QUERY", undefined, () => {
    assert.equal(
      getGuestSessionId({ headers: { "x-guest-session-id": "guest_h" }, cookies: {}, body: {}, query: {} }),
      "guest_h"
    );
    assert.equal(
      getGuestSessionId({ headers: {}, cookies: { guestSessionId: "guest_c" }, body: {}, query: {} }),
      "guest_c"
    );
  });
});

test("VULN-001: query source works only with the explicit opt-in flag", () => {
  withEnv("GUEST_SESSION_ALLOW_QUERY", "1", () => {
    const req = { query: { guestSessionId: "guest_q" }, headers: {}, cookies: {}, body: {} };
    assert.equal(getGuestSessionId(req), "guest_q");
  });
});

test("VULN-001: chatUpload middleware uses the shared extractor and never reads req.query directly", () => {
  const src = read("middleware/chatUpload.middleware.js");
  assert.match(src, /getGuestSessionId\(req\)/);
  assert.ok(!/=\s*req\.query\.guestSessionId/.test(src), "middleware must not read the query credential directly");
});

test("VULN-001: chat.controller re-exports the same extractor for existing tests", () => {
  const controller = require(path.join(repo, "controllers/chat.controller.js"));
  assert.equal(controller._getGuestSessionId, getGuestSessionId);
});

// ---------- VULN-009: server-set guest cookie ----------

test("VULN-009: setGuestSessionCookie sets httpOnly + SameSite=Lax + path=/ + 24h, Secure in production", () => {
  const calls = [];
  const res = { cookie: (...args) => calls.push(args) };
  withEnv("NODE_ENV", "production", () => setGuestSessionCookie(res, "guest_x"));
  assert.equal(calls.length, 1);
  const [name, value, opts] = calls[0];
  assert.equal(name, "guestSessionId");
  assert.equal(value, "guest_x");
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.secure, true);
  assert.equal(opts.sameSite, "lax");
  assert.equal(opts.path, "/");
  assert.equal(opts.maxAge, 24 * 60 * 60 * 1000);
});

test("VULN-009: setGuestSessionCookie is not Secure outside production and ignores junk input", () => {
  const calls = [];
  const res = { cookie: (...args) => calls.push(args) };
  withEnv("NODE_ENV", "development", () => setGuestSessionCookie(res, "guest_x"));
  assert.equal(calls[0][2].secure, false);
  setGuestSessionCookie(res, "");
  setGuestSessionCookie(null, "guest_x");
  assert.equal(calls.length, 1);
});

// ---------- VULN-002 + VULN-005/007 + VULN-006: appConfig ----------

const cfg = require(path.join(repo, "config/appConfig"));

test("VULN-002: an unknown CATEGORY_SVG_POLICY value fails boot validation", () => {
  const { errors } = cfg.validateEnv({ CATEGORY_SVG_POLICY: "reencde" });
  assert.ok(errors.some((e) => e.includes("CATEGORY_SVG_POLICY")), `expected enum error, got: ${errors.join("; ")}`);
  const ok = cfg.validateEnv({ CATEGORY_SVG_POLICY: "reject" });
  assert.ok(!ok.errors.some((e) => e.includes("CATEGORY_SVG_POLICY")));
  assert.equal(cfg.REGISTRY.CATEGORY_SVG_POLICY.def, "reencode");
});

test("VULN-002: upload.middleware rejects SVG for any non-reencode policy (no fall-through)", () => {
  const src = read("middleware/upload.middleware.js");
  const region = src.slice(src.indexOf("detectImageType(req.file.buffer) === \"svg\""), src.indexOf("uploadToCloudinary(uploadBuffer"));
  assert.match(region, /else \{\s*\n\s*return next\(new AppError\("SVG images are not accepted/);
});

const PROD_BASE = {
  NODE_ENV: "production",
  JWT_SECRET: "j".repeat(40),
  MONGO_URI: "mongodb+srv://cluster.example/db",
  OTP_PEPPER: "pepper-value",
};

test("VULN-007: OTP_PEPPER is required in production", () => {
  const env = { ...PROD_BASE };
  delete env.OTP_PEPPER;
  const { errors } = cfg.validateEnv(env);
  assert.ok(errors.some((e) => e.includes("OTP_PEPPER")), `expected required error, got: ${errors.join("; ")}`);
  const ok = cfg.validateEnv(PROD_BASE);
  assert.ok(!ok.errors.some((e) => e.includes("OTP_PEPPER")));
});

test("VULN-005/007: production posture warnings fire for weakened/undecided settings", () => {
  const { warnings } = cfg.validateEnv(PROD_BASE);
  for (const key of ["RATE_LIMIT_STORE", "TRUST_PROXY", "UPLOAD_MAX_TOTAL_BYTES"]) {
    assert.ok(warnings.some((w) => w.includes(key)), `expected a ${key} warning, got: ${warnings.join("; ")}`);
  }
  const weakened = cfg.validateEnv({
    ...PROD_BASE,
    RATE_LIMIT_STORE: "mongo",
    TRUST_PROXY: "1",
    UPLOAD_MAX_TOTAL_BYTES: "52428800",
    RETURN_TOKEN_IN_BODY: "1",
    JWT_REQUIRE_ISS_AUD: "0",
  });
  assert.ok(weakened.warnings.some((w) => w.includes("RETURN_TOKEN_IN_BODY")));
  assert.ok(weakened.warnings.some((w) => w.includes("JWT_REQUIRE_ISS_AUD")));
  assert.ok(!weakened.warnings.some((w) => w.includes("RATE_LIMIT_STORE")));
  assert.ok(!weakened.warnings.some((w) => w.includes("TRUST_PROXY")));
});

test("VULN-005/007: non-production boot gets none of the posture warnings", () => {
  const { warnings } = cfg.validateEnv({ NODE_ENV: "development" });
  for (const key of ["RATE_LIMIT_STORE", "TRUST_PROXY", "RETURN_TOKEN_IN_BODY", "JWT_REQUIRE_ISS_AUD", "UPLOAD_MAX_TOTAL_BYTES: not set"]) {
    assert.ok(!warnings.some((w) => w.includes(key)), `unexpected ${key} warning in dev`);
  }
});

test("VULN-006: UPLOAD_MAX_TOTAL_BYTES defaults to 50 MB and an explicit value still wins", () => {
  assert.equal(cfg.getInt("UPLOAD_MAX_TOTAL_BYTES", {}), 52428800);
  assert.equal(cfg.getInt("UPLOAD_MAX_TOTAL_BYTES", { UPLOAD_MAX_TOTAL_BYTES: "1500" }), 1500);
});

// ---------- VULN-003: NODE_ENV normalisation in the error handler ----------

const errorMiddleware = require(path.join(repo, "middleware/error.middleware.js"));

test("VULN-003: isDevelopment normalises case and whitespace", () => {
  assert.equal(errorMiddleware.isDevelopment("development"), true);
  assert.equal(errorMiddleware.isDevelopment("Development"), true);
  assert.equal(errorMiddleware.isDevelopment("  DEVELOPMENT "), true);
  assert.equal(errorMiddleware.isDevelopment("production"), false);
  assert.equal(errorMiddleware.isDevelopment(" Production "), false);
  assert.equal(errorMiddleware.isDevelopment(undefined), false);
});

const runErrorHandler = (nodeEnv, err) => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  const origError = console.error;
  console.error = () => {};
  let payload;
  const res = {
    statusCode: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { payload = body; return this; },
  };
  try {
    errorMiddleware(err, {}, res, () => {});
  } finally {
    console.error = origError;
    if (prev === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prev;
  }
  return payload;
};

test("VULN-003: 'Development' follows the (normalised) dev branch, 'Production' never leaks a stack", () => {
  const err = new Error("boom");
  err.statusCode = 500;
  const devPayload = runErrorHandler("Development", err);
  assert.ok(devPayload.stack, "normalised dev branch should include the stack, like the rest of the codebase");
  const prodPayload = runErrorHandler("Production", new Error("boom"));
  assert.ok(!("stack" in prodPayload), "production branch must not leak stacks");
});

// ---------- VULN-008: getAllOrders point-of-use coercion ----------

const { asEnum } = require(path.join(repo, "utils/params"));

test("VULN-008: asEnum with the getAllOrders enum sets passes valid values and drops everything else", () => {
  const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
  assert.equal(asEnum("shipped", ORDER_STATUSES), "shipped");
  assert.equal(asEnum("paid", PAYMENT_STATUSES), "paid");
  assert.equal(asEnum("bogus", ORDER_STATUSES), undefined);
  assert.equal(asEnum({ $ne: "x" }, ORDER_STATUSES), undefined);
  assert.equal(asEnum(["paid"], PAYMENT_STATUSES), undefined);
  assert.equal(asEnum(undefined, ORDER_STATUSES), undefined);
});

test("VULN-008: getAllOrders coerces both status and paymentStatus via asEnum", () => {
  const src = read("controllers/order.controller.js");
  const start = src.indexOf("exports.getAllOrders");
  assert.ok(start >= 0);
  const region = src.slice(start, start + 3000);
  assert.match(region, /asEnum\(status, \["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"\]\)/);
  assert.match(region, /asEnum\(paymentStatus, \["pending", "paid", "failed", "refunded"\]\)/);
  assert.ok(!/filter\.orderStatus = status;/.test(region), "raw status must not reach the filter");
  assert.ok(!/filter\.paymentStatus = paymentStatus;/.test(region), "raw paymentStatus must not reach the filter");
});

// ---------- VULN-004: audit log service ----------

const AuditLog = require(path.join(repo, "models/auditLog.model.js"));
const auditLogService = require(path.join(repo, "services/auditLog.service.js"));

test("VULN-004: redact drops sensitive keys shallowly and one level deep", () => {
  const out = auditLogService.redact({
    isActive: false,
    password: "p",
    nested: { otpCode: "123456", note: "ok" },
    accessToken: "t",
  });
  assert.deepEqual(out, { isActive: false, nested: { note: "ok" } });
  assert.equal(auditLogService.redact(undefined), undefined);
  assert.equal(auditLogService.redact(null), null);
});

const mongoose = require("mongoose");
// record() skips writes while disconnected (it must never buffer-and-
// hang the audited request); these tests simulate a live connection.
const withConnection = async (fn) => {
  const prev = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;
  try { return await fn(); } finally { mongoose.connection.readyState = prev; }
};

test("VULN-004: record() writes exactly one redacted row", async () => {
  const original = AuditLog.create;
  const written = [];
  AuditLog.create = async (doc) => { written.push(doc); return doc; };
  try {
    await withConnection(() => auditLogService.record({
      actor: "64b64c2f9f1b2c3d4e5f6071",
      action: "user.deactivate",
      targetType: "User",
      targetId: 12345,
      before: { isActive: true, magicLinkToken: "should-not-be-stored" },
      after: { isActive: false },
      ip: "203.0.113.9",
    }));
  } finally {
    AuditLog.create = original;
  }
  assert.equal(written.length, 1);
  assert.equal(written[0].action, "user.deactivate");
  assert.equal(written[0].targetId, "12345"); // stringified
  assert.deepEqual(written[0].before, { isActive: true });
  assert.deepEqual(written[0].after, { isActive: false });
  assert.equal(written[0].ip, "203.0.113.9");
  assert.ok(written[0].at instanceof Date);
});

test("VULN-004: record() never throws when the write fails", async () => {
  const original = AuditLog.create;
  const origError = console.error;
  console.error = () => {};
  AuditLog.create = async () => { throw new Error("db down"); };
  try {
    const result = await withConnection(() => auditLogService.record({ action: "discount.delete", targetType: "Discount", targetId: "d1" }));
    assert.equal(result, null);
    // And while disconnected it skips silently instead of hanging.
    const skipped = await auditLogService.record({ action: "discount.delete", targetType: "Discount", targetId: "d1" });
    assert.equal(skipped, null);
  } finally {
    AuditLog.create = original;
    console.error = origError;
  }
});

test("VULN-004: audit model carries the required indexes and no TTL", () => {
  const indexes = AuditLog.schema.indexes().map(([fields]) => Object.keys(fields).join(","));
  assert.ok(indexes.includes("targetType,targetId,at"));
  assert.ok(indexes.includes("actor,at"));
  const src = read("models/auditLog.model.js");
  assert.ok(!src.includes("expireAfterSeconds"), "audit rows must not expire");
});

test("VULN-004: every named admin handler records exactly one audit entry", () => {
  const expectations = [
    ["controllers/user.controller.js", "exports.updateUserStatus", "user.activate"],
    ["controllers/user.controller.js", "exports.deleteUser", "user.delete"],
    ["controllers/order.controller.js", "exports.updateOrderStatus", "order.status.update"],
    ["controllers/order.controller.js", "exports.reconcileRefund", "order.refund.reconcile"],
    ["controllers/discount.controller.js", "exports.createDiscount", "discount.create"],
    ["controllers/discount.controller.js", "exports.updateDiscount", "discount.update"],
    ["controllers/discount.controller.js", "exports.deleteDiscount", "discount.delete"],
    ["controllers/promotion.controller.js", "exports.createPromotion", "promotion.create"],
    ["controllers/promotion.controller.js", "exports.updatePromotion", "promotion.update"],
    ["controllers/promotion.controller.js", "exports.deletePromotion", "promotion.delete"],
    ["controllers/document.controller.js", "exports.updateVisibility", "document.visibility.update"],
  ];
  for (const [file, handler, action] of expectations) {
    const src = read(file);
    const start = src.indexOf(handler);
    assert.ok(start >= 0, `${handler} not found in ${file}`);
    const region = src.slice(start, start + 4000);
    // updateUserStatus uses a ternary (activate/deactivate) — match the
    // quoted action name in either form.
    const hits = region.split(`"${action}"`).length - 1;
    assert.ok(hits >= 1, `${file} ${handler} must record action ${action}`);
  }
});
