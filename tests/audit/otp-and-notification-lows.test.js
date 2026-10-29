// Lows batch 1: A-12 (OTP HMAC), C-13 (notification existence oracle),
// B-12 (embedding timeout), C-11 (keep-alive status gate).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("./helpers");

process.env.JWT_SECRET = "test-only-jwt-secret-for-lows";

// ---------- A-12 ----------
test("A-12: OTPs are stored as HMAC-SHA256 keyed by a server secret, not bare SHA-256", () => {
  delete process.env.OTP_PEPPER;
  const { hashOtp } = require("../../utils/otpHash");
  const otp = "123456";
  const expected = crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(otp)
    .digest("hex");
  assert.equal(hashOtp(otp), expected);
  assert.notEqual(
    hashOtp(otp),
    crypto.createHash("sha256").update(otp).digest("hex"),
    "a bare SHA-256 of a 6-digit code is brute-forceable from a DB leak alone",
  );
});

test("A-12: User.createOtp stores the HMAC form", () => {
  const User = require("../../models/user.model");
  const { hashOtp } = require("../../utils/otpHash");
  const user = new User({ email: "admin-otp@example.com" });
  const raw = user.createOtp();
  assert.match(raw, /^\d{6}$/);
  assert.equal(user.loginOtp, hashOtp(raw));
});

test("A-12: adminVerifyOtp accepts an OTP stored in HMAC form", async () => {
  const { hashOtp } = require("../../utils/otpHash");
  const challenge = "f".repeat(64);
  const attemptDoc = {
    email: "admin@example.com",
    role: "admin",
    isActive: true,
    loginOtp: hashOtp("123456"),
    loginOtpChallenge: challenge,
  };
  const finalUser = { ...attemptDoc, _id: "507f1f77bcf86cd799439011" };
  let call = 0;
  stubModule("models/user.model.js", {
    // Not async: Mongoose returns a Query (thenable with .select()),
    // and the handler chains .select() before awaiting.
    findOneAndUpdate: (filter) => {
      call += 1;
      if (call === 1) return makeQuery(attemptDoc);
      // The claim update must present the HMAC of the submitted code.
      return filter.loginOtp === hashOtp("123456") ? finalUser : null;
    },
  });
  stubModule("services/email.service.js", {
    sendMagicLinkEmail: async () => {},
    sendOtpEmail: async () => {},
  });
  stubModule("models/revokedToken.model.js", {
    exists: async () => null,
    updateOne: async () => {},
  });
  const controller = require("../../controllers/auth.controller");
  const res = mockRes();
  res.cookies = {};
  res.cookie = function (name, value, options) {
    this.cookies[name] = { value, options };
    return this;
  };
  await controller.adminVerifyOtp(
    {
      body: {
        email: "admin@example.com",
        otp: "123456",
        challengeId: challenge,
      },
    },
    res,
  );
  assert.equal(
    res.statusCode,
    200,
    `expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`,
  );
});

// ---------- C-13 ----------
test("C-13: another user's notification is indistinguishable from a missing one (404)", async () => {
  stubModule("models/notification.model.js", {
    findById: async (id) =>
      id === "exists" ? { _id: id, recipient: "someone-else" } : null,
  });
  stubModule("services/notificationService.js", {
    markAsRead: async () => ({}),
  });
  const controller = require("../../controllers/notification.controller");
  const next = mockNext();
  const res = mockRes();
  await controller.getNotificationDetail(
    { params: { id: "exists" }, user: { _id: "me" } },
    res,
    next,
  );
  assert.ok(next.error, "an error should be passed to the error handler");
  assert.equal(
    next.error.statusCode,
    404,
    `expected 404 oracle-free response, got ${next.error.statusCode}`,
  );
});

// ---------- B-12 ----------
test("B-12: the embedding API call carries a timeout signal", async () => {
  process.env.NVIDIA_API_KEY = "test-key-not-real";
  let fetchOptions;
  const realFetch = global.fetch;
  global.fetch = async (url, options) => {
    fetchOptions = options;
    return {
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
      text: async () => "",
    };
  };
  try {
    delete require.cache[require.resolve("../../services/ingestionService")];
    const svc = require("../../services/ingestionService");
    const embedding = await svc.getEmbedding("hello");
    assert.deepEqual(embedding, [0.1, 0.2]);
    assert.ok(
      fetchOptions.signal instanceof AbortSignal,
      "fetch must be given an AbortSignal timeout (B-12)",
    );
  } finally {
    global.fetch = realFetch;
    delete process.env.NVIDIA_API_KEY;
  }
});

// ---------- C-11 ----------
test("C-11: the keep-alive status route requires authentication", () => {
  stubModule("middleware/auth.middleware.js", {
    protect: (req, res, next) => next(),
    restrictTo: () => (req, res, next) => next(),
  });
  delete require.cache[require.resolve("../../routes/system.routes")];
  const router = require("../../routes/system.routes");
  const layer = router.stack.find(
    (l) => l.route && l.route.path === "/keep-alive-status",
  );
  assert.ok(layer, "route should exist");
  assert.ok(
    layer.route.stack.length >= 3,
    `expected protect + restrictTo + handler, got ${layer.route.stack.length} handler(s) - the endpoint is public`,
  );
});
