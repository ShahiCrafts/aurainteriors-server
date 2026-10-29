// Remediation (audit report follow-up): SEC-009 auth audit logging and
// SEC-011 public order tracking (old/new ID formats, status-only view).
// Stub-based (tests/audit/helpers): no DB, no network, no real .env.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { stubModule, mockRes } = require("../audit/helpers");

process.env.JWT_SECRET = "test-secret-for-remediation-sec009";
process.env.FRONTEND_URL = "http://localhost:5173";

// --- AuditLog stub: records every event the auth controller emits ---
const authEvents = [];
stubModule("services/auditLog.service", {
  record: async (entry) => {
    authEvents.push(entry);
    return null;
  },
  redact: (x) => x,
});

// --- User stub (pattern from tests/audit/auth-hardening.test.js) ---
const GOOD_PASSWORD = "correct-horse-battery";
const passwordHash = bcrypt.hashSync(GOOD_PASSWORD, 4);
let fixtures = [];
let otpAttemptDoc = null;

class FakeUser {
  constructor(fields = {}) {
    Object.assign(this, fields);
    this.isActive = fields.isActive !== false;
    this.deletedAt = null;
  }
  createOtp() {
    this.loginOtpChallenge = "c".repeat(64);
    return "123456";
  }
  async comparePassword(candidate) {
    return bcrypt.compare(candidate, passwordHash);
  }
  async save() {
    return this;
  }
}
function queryOf(doc) {
  return {
    select: () => Promise.resolve(doc),
    then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
  };
}
FakeUser.findOne = (filter) =>
  queryOf(fixtures.find((u) => u.email === filter.email) || null);
FakeUser.findOneAndUpdate = () => queryOf(otpAttemptDoc);

stubModule("models/user.model.js", FakeUser);
stubModule("models/revokedToken.model.js", { exists: async () => null });
stubModule("services/email.service.js", {
  sendMagicLinkEmail: () => Promise.resolve(),
  sendOtpEmail: () => Promise.resolve(),
});

const authCtrl = require("../../controllers/auth.controller");
const { hashOtp } = require("../../utils/otpHash");

function call(handler, body, ip = "203.0.113.7") {
  const res = mockRes();
  res.cookies = {};
  res.cookie = function (name, value, options) {
    this.cookies[name] = { value, options };
    return this;
  };
  res.clearCookie = function () {
    return this;
  };
  return handler({ body, ip }, res).then(() => res);
}

test("SEC-009: failed admin login returns the generic 401 and logs a redacted failure event", async () => {
  authEvents.length = 0;
  fixtures = [
    new FakeUser({ _id: "admin1", email: "boss@example.com", role: "admin" }),
  ];
  const res = await call(authCtrl.adminLogin, {
    email: "Boss@Example.com",
    password: "wrong-password",
  });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    status: "fail",
    message: "Invalid email or password",
  });
  assert.equal(authEvents.length, 1);
  const event = authEvents[0];
  assert.equal(event.action, "auth.admin_login.failure");
  assert.equal(event.after.reason, "invalid_credentials");
  assert.equal(event.after.email, "b***@example.com", "email must be masked");
  assert.equal(event.ip, "203.0.113.7");
  const serialized = JSON.stringify(event);
  assert.ok(!serialized.includes("wrong-password"), "password must never be logged");
  assert.ok(!serialized.includes("boss@example.com"), "raw email must never be logged");
});

test("SEC-009: unknown-email admin login is indistinguishable and also logged", async () => {
  authEvents.length = 0;
  fixtures = [];
  const res = await call(authCtrl.adminLogin, {
    email: "ghost@example.com",
    password: "whatever",
  });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    status: "fail",
    message: "Invalid email or password",
  });
  assert.equal(authEvents.length, 1);
  assert.equal(authEvents[0].after.reason, "invalid_credentials");
});

test("SEC-009: successful admin login (OTP issued) logs a success event", async () => {
  authEvents.length = 0;
  fixtures = [
    new FakeUser({
      _id: "admin1",
      email: "boss@example.com",
      role: "admin",
      password: passwordHash,
    }),
  ];
  const res = await call(authCtrl.adminLogin, {
    email: "boss@example.com",
    password: GOOD_PASSWORD,
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.otpRequired, true);
  const success = authEvents.find((e) => e.action === "auth.admin_login.success");
  assert.ok(success, `expected a success event, got ${JSON.stringify(authEvents)}`);
  assert.equal(success.after.reason, "otp_issued");
});

test("SEC-009: OTP mismatch returns the generic 400 and logs otp_mismatch without the code", async () => {
  authEvents.length = 0;
  otpAttemptDoc = {
    _id: "admin1",
    email: "boss@example.com",
    loginOtp: hashOtp("123456"),
  };
  const res = await call(authCtrl.adminVerifyOtp, {
    email: "boss@example.com",
    otp: "999999",
    challengeId: "c".repeat(64),
  });
  assert.equal(res.statusCode, 400);
  assert.equal(
    res.body.message,
    "The code is invalid or has expired. Please sign in again if necessary.",
  );
  assert.equal(authEvents.length, 1);
  assert.equal(authEvents[0].action, "auth.admin_otp.failure");
  assert.equal(authEvents[0].after.reason, "otp_mismatch");
  assert.ok(!JSON.stringify(authEvents[0]).includes("999999"), "OTP must never be logged");
});

// ---------------------------------------------------------------------------
// SEC-011: order tracking — old and new ID formats, status-only response
// ---------------------------------------------------------------------------
test("SEC-011: trackOrder finds orders by exact ID for both suffix formats and returns status-only fields", async () => {
  const seenFilters = [];
  const doc = {
    orderId: "AUM3K7Z2ABAB12CD34",
    orderStatus: "shipped",
    paymentStatus: "paid",
    paymentMethod: "esewa",
    items: [{ name: "Chair", quantity: 1, price: 100 }],
    subtotal: 100,
    discountAmount: 0,
    shippingCost: 10,
    tax: 0,
    total: 110,
    createdAt: new Date(),
    updatedAt: new Date(),
    guestInfo: { email: "g@example.com", phone: "9800000000" },
    adminNote: "internal",
  };
  stubModule("models/order.model.js", {
    findOne: (filter) => {
      seenFilters.push(filter);
      return { select: async () => doc };
    },
  });
  // Fresh controller instance bound to the stubbed model.
  const ctrlPath = require.resolve("../../controllers/order.controller");
  delete require.cache[ctrlPath];
  const orderCtrl = require(ctrlPath);
  const flush = async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  };
  for (const orderId of ["AUM3K7Z2ABAB12", "AUM3K7Z2ABAB12CD34"]) {
    const res = mockRes();
    let nextError;
    orderCtrl.trackOrder(
      { body: { orderId: orderId.toLowerCase(), email: "G@Example.com" } },
      res,
      (e) => {
        nextError = e;
      },
    );
    await flush();
    assert.equal(nextError, undefined);
    assert.equal(res.statusCode, 200, `tracking failed for ${orderId}`);
    const view = res.body.data.order;
    assert.equal(view.orderStatus, "shipped");
    assert.equal(view.guestInfo, undefined, "status-only: no guest PII");
    assert.equal(view.adminNote, undefined, "status-only: no internal notes");
  }
  assert.equal(seenFilters.length, 2);
  assert.equal(seenFilters[0].orderId, "AUM3K7Z2ABAB12", "old format looked up verbatim (uppercased)");
  assert.equal(seenFilters[1].orderId, "AUM3K7Z2ABAB12CD34", "new format looked up verbatim");
});
