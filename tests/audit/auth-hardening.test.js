// Auth hardening batch: A-04 (magic-link enumeration), A-05 (admin
// login disclosure/timing), A-10 (JWT algorithm pinning), A-11
// (cookie Secure normalization).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { stubModule, mockRes } = require("./helpers");

process.env.JWT_SECRET = "test-only-jwt-secret-for-auth-hardening";

const GOOD_PASSWORD = "correct-horse-battery";
const passwordHash = bcrypt.hashSync(GOOD_PASSWORD, 4);
let fixtures;
let saves;

class FakeUser {
  constructor(fields = {}) {
    Object.assign(this, fields);
    this.isActive = fields.isActive !== false;
    this.deletedAt = null;
  }
  createMagicLinkToken() { this.magicLinkToken = "hashed"; return "raw-token"; }
  createOtp() { this.loginOtpChallenge = "c".repeat(64); return "123456"; }
  async comparePassword(candidate) { return bcrypt.compare(candidate, passwordHash); }
  updateLoginActivity() {}
  async save() { saves.push(this.email); return this; }
}
// Mongoose findOne returns a Query: awaitable AND has .select().
function queryOf(doc) {
  return {
    select: () => Promise.resolve(doc),
    then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
  };
}
FakeUser.findOne = (filter) => queryOf(fixtures.find((u) => u.email === filter.email) || null);
FakeUser.findOneAndUpdate = async (filter) => fixtures.find((u) => u.magicLinkToken === filter.magicLinkToken) || null;

stubModule("models/user.model.js", FakeUser);
stubModule("models/revokedToken.model.js", { exists: async () => null });
stubModule("services/email.service.js", {
  sendMagicLinkEmail: () => Promise.resolve(),
  sendOtpEmail: () => Promise.resolve(),
});

const controller = require("../../controllers/auth.controller");
const authToken = require("../../utils/authToken");

function call(handler, body) {
  const res = mockRes();
  res.cookies = {};
  res.cookie = function (name, value, options) { this.cookies[name] = { value, options }; return this; };
  res.clearCookie = function () { return this; };
  return handler({ body }, res).then(() => res);
}

// ---------- A-04 ----------
test("A-04: magic-link request answers identically for unknown, admin, and deactivated emails", async () => {
  saves = [];
  fixtures = [
    new FakeUser({ email: "admin@example.test", role: "admin" }),
    new FakeUser({ email: "off@example.test", role: "customer", isActive: false }),
  ];
  const unknown = await call(controller.sendMagicLink, { email: "new@example.test" });
  const admin = await call(controller.sendMagicLink, { email: "admin@example.test" });
  const deactivated = await call(controller.sendMagicLink, { email: "off@example.test" });
  for (const res of [unknown, admin, deactivated]) {
    assert.equal(res.statusCode, 200, `expected uniform 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.message, unknown.body.message);
  }
  assert.deepEqual(saves, ["new@example.test"], "no token may be created/saved for admin or deactivated accounts");
});

// ---------- A-05 ----------
test("A-05: a deactivated admin with a WRONG password gets the generic 401, not the deactivation disclosure", async () => {
  fixtures = [new FakeUser({ email: "admin@example.test", role: "admin", isActive: false, password: passwordHash })];
  const res = await call(controller.adminLogin, { email: "admin@example.test", password: "wrong-password" });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid email or password");
});

test("characterization: a deactivated admin with the CORRECT password still gets the deactivation notice", async () => {
  fixtures = [new FakeUser({ email: "admin@example.test", role: "admin", isActive: false, password: passwordHash })];
  const res = await call(controller.adminLogin, { email: "admin@example.test", password: GOOD_PASSWORD });
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /deactivated/);
});

test("characterization: an active admin with the correct password proceeds to the OTP step", async () => {
  saves = [];
  fixtures = [new FakeUser({ email: "admin@example.test", role: "admin", isActive: true, password: passwordHash })];
  const res = await call(controller.adminLogin, { email: "admin@example.test", password: GOOD_PASSWORD });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.otpRequired, true);
});

test("characterization: unknown email gets the generic 401", async () => {
  fixtures = [];
  const res = await call(controller.adminLogin, { email: "ghost@example.test", password: "whatever" });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid email or password");
});

// ---------- A-10 ----------
test("A-10: token verification pins HS256 (an HS512 token is rejected)", async () => {
  const good = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { algorithm: "HS256", issuer: "aura-interiors", audience: "aura-interiors-api" }); // FA-18: current-issue shape
  const decoded = await authToken.verify(good);
  assert.equal(decoded.id, "u1");
  const otherAlg = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { algorithm: "HS512" });
  await assert.rejects(() => authToken.verify(otherAlg), "HS512 token must not verify against an HS256-only policy");
});

// ---------- A-11 ----------
test("A-11: the session cookie is Secure when NODE_ENV is production in any casing/spacing", async () => {
  const crypto = require("crypto");
  const raw = "d".repeat(64);
  const hashed = crypto.createHash("sha256").update(raw).digest("hex");
  fixtures = [new FakeUser({ email: "user@example.test", role: "customer", isActive: true, magicLinkToken: hashed })];
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = " Production ";
    const res = await call(controller.verifyMagicLink, { token: raw });
    assert.equal(res.statusCode, 200);
    assert.equal(res.cookies.jwt.options.secure, true, "cookie must be Secure in production regardless of env casing");
    process.env.NODE_ENV = "development";
    fixtures = [new FakeUser({ email: "user@example.test", role: "customer", isActive: true, magicLinkToken: hashed })];
    const res2 = await call(controller.verifyMagicLink, { token: raw });
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.cookies.jwt.options.secure, false);
  } finally {
    process.env.NODE_ENV = previous;
  }
});
