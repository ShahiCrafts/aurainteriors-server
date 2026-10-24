// Batch 6 (FRESH remediation): FA-08, FA-74, FA-02, FA-18, FA-64, FA-35.
// (FA-62 TRUST_PROXY is env wiring in server.js - boot-checked; FA-63 PKCE
// and FA-44 are documented dispositions, FA-02's flip is an owner decision.)
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};
process.env.JWT_SECRET = "test-secret-at-least-32-characters-long!!";

const { createOriginCheck } = require(path.join(repo, "middleware/csrfOrigin.js"));
function runMw(mw, req) {
  return new Promise((resolve) => {
    const res = { code: null, status(c) { this.code = c; return this; }, json() { resolve({ passed: false, code: this.code }); } };
    mw(req, res, () => resolve({ passed: true }));
  });
}

test("FA-74: origin check runs even when an Authorization header is present", async () => {
  const mw = createOriginCheck(["https://aurainteriors.live"]);
  const req = { method: "POST", path: "/api/orders", headers: { cookie: "jwt=abc", authorization: "Bearer x" } };
  const r = await runMw(mw, req);
  assert.equal(r.passed, false, "cookie-auth mutation without a trusted origin is blocked");
  assert.equal(r.code, 403);
});

test("FA-08: trusted origin passes; non-cookie and safe requests pass", async () => {
  const mw = createOriginCheck(["https://aurainteriors.live"]);
  assert.equal((await runMw(mw, { method: "POST", path: "/x", headers: { cookie: "jwt=abc", origin: "https://aurainteriors.live" } })).passed, true);
  assert.equal((await runMw(mw, { method: "POST", path: "/x", headers: { cookie: "jwt=abc", referer: "https://aurainteriors.live/cart" } })).passed, true, "Referer origin accepted when Origin absent");
  assert.equal((await runMw(mw, { method: "POST", path: "/x", headers: { origin: "https://evil.example" } })).passed, true, "no jwt cookie -> not cookie-auth");
  assert.equal((await runMw(mw, { method: "GET", path: "/x", headers: { cookie: "jwt=abc" } })).passed, true);
  assert.equal((await runMw(mw, { method: "POST", path: "/x", headers: { cookie: "jwt=abc", origin: "https://evil.example" } })).passed, false);
});

test("FA-02/FA-18: sendAuthResponse - iss/aud set, cookie lifetime equals token lifetime, body token behind flag", () => {
  stub("models/user.model.js", {});
  stub("models/revokedToken.model.js", {});
  stub("services/email.service.js", { sendMagicLinkEmail: () => {} });
  const auth = require(path.join(repo, "controllers/auth.controller.js"));
  const user = { _id: "64b64c2f9f1b2c3d4e5f6001", email: "a@example.com", role: "customer" };
  function call() {
    const captured = {};
    const res = {
      cookie(name, value, opts) { captured.cookie = { name, value, opts }; },
      status(c) { captured.code = c; return this; },
      json(b) { captured.body = b; },
    };
    auth._sendAuthResponse(user, 200, res);
    return captured;
  }
  delete process.env.RETURN_TOKEN_IN_BODY;
  let out = call();
  assert.equal(out.body.token, undefined, "owner-approved default: no token in the body (cookie only)");
  assert.ok(out.cookie.value, "cookie carries the token");
  const jwt = require("jsonwebtoken");
  const decoded = jwt.decode(out.cookie.value);
  assert.equal(decoded.iss, "aura-interiors");
  assert.equal(decoded.aud, "aura-interiors-api");
  const cookieMs = out.cookie.opts.expires.getTime() - Date.now();
  const tokenMs = decoded.exp * 1000 - Date.now();
  assert.ok(Math.abs(cookieMs - tokenMs) < 60 * 1000, `cookie (${Math.round(cookieMs / 864e5)}d) and token (${Math.round(tokenMs / 864e5)}d) share one lifetime`);
  process.env.RETURN_TOKEN_IN_BODY = "1";
  out = call();
  assert.ok(out.body.token, "RETURN_TOKEN_IN_BODY=1 restores the legacy body copy");
  delete process.env.RETURN_TOKEN_IN_BODY;
});

test("FA-18: authToken.verify enforces iss/aud by default (JWT_REQUIRE_ISS_AUD=0 relaxes)", async () => {
  delete require.cache[path.join(repo, "models/revokedToken.model.js")];
  stub("models/revokedToken.model.js", { exists: async () => false });
  delete require.cache[path.join(repo, "utils/authToken.js")];
  const authToken = require(path.join(repo, "utils/authToken.js"));
  const jwt = require("jsonwebtoken");
  const legacy = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { expiresIn: 600 });
  await assert.rejects(() => authToken.verify(legacy), /issuer|audience/i, "pre-claims tokens are rejected by default (owner-approved)");
  process.env.JWT_REQUIRE_ISS_AUD = "0";
  await authToken.verify(legacy); // escape hatch restores migration-window tolerance
  delete process.env.JWT_REQUIRE_ISS_AUD;
  const modern = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { expiresIn: 600, issuer: "aura-interiors", audience: "aura-interiors-api" });
  await authToken.verify(modern);
});

test("FA-35/OA-1: socket origins derive only from env (no hardcoded lists)", () => {
  const { buildSocketOrigins } = require(path.join(repo, "services/notificationGateway.js"));
  const prod = buildSocketOrigins({ NODE_ENV: "production", FRONTEND_URL: "https://aurainteriors.live" });
  assert.deepEqual(prod, ["https://aurainteriors.live"]);
  assert.ok(!prod.some((o) => o.includes("localhost")), `prod origins: ${prod}`);
  // Local origins now come from env (e.g. .env.development), not a hardcoded list:
  const dev = buildSocketOrigins({ NODE_ENV: "development", FRONTEND_URL: "http://localhost:5173", ADMIN_URL: "http://localhost:5174" });
  assert.ok(dev.some((o) => o.includes("localhost:5173")));
  assert.deepEqual(buildSocketOrigins({ NODE_ENV: "development" }), []);
});

test("FA-64: account deletion requires re-authentication and revokes the session", async () => {
  const bcrypt = require("bcrypt");
  const hash = bcrypt.hashSync("correct horse", 4);
  let updated = null; let revoked = null;
  const userDoc = { _id: "u1", password: hash, deletedAt: null };
  stub("models/user.model.js", {
    findById: () => ({ select: async () => userDoc }),
    findByIdAndUpdate: async (id, upd) => { updated = upd; return {}; },
  });
  stub("models/revokedToken.model.js", { updateOne: async (filter, update) => { revoked = { filter, update }; return {}; } });
  stub("config/cloudinary.js", { deleteFromCloudinary: async () => {} });
  const profile = require(path.join(repo, "controllers/profile.controller.js"));
  const jwt = require("jsonwebtoken");
  const session = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { expiresIn: 600 });
  function mk(body) {
    const res = { code: null, body: null, cookie() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    return { req: { user: { id: "u1", iat: Math.floor(Date.now() / 1000) }, body, headers: { cookie: `jwt=${session}` }, cookies: { jwt: session } }, res };
  }
  let { req, res } = mk({});
  await profile.deleteAccount(req, res);
  assert.equal(res.code, 400, "no password confirmation -> refused");
  assert.equal(updated, null);
  ({ req, res } = mk({ currentPassword: "wrong" }));
  await profile.deleteAccount(req, res);
  assert.equal(res.code, 400);
  ({ req, res } = mk({ currentPassword: "correct horse" }));
  await profile.deleteAccount(req, res);
  assert.equal(res.code, 200);
  assert.ok(updated && updated.deletedAt, "soft-delete applied");
  assert.ok(revoked && revoked.filter._id, "current token revoked");
});
