const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");
const path = require("node:path");
const base = path.resolve(__dirname, "../..");
function load(file, mocks, logs = []) {
  const module = { exports: {} };
  // AR-33: auth.controller requires the runtimeContext registry (side-effect-free, requires nothing) - resolve it for real.
  mocks = {
    "../utils/authToken": {},
    "../models/revokedToken.model": {},
    "../utils/maskEmail": require("../../utils/maskEmail.js"),
    "../services/runtimeContext": require("../../services/runtimeContext.js"),
    ...mocks,
  };
  vm.runInNewContext(fs.readFileSync(path.join(base, file), "utf8"), {
    module,
    exports: module.exports,
    require: (id) => mocks[id] || require(id),
    process: {
      env: { FRONTEND_URL: "https://example.test", JWT_SECRET: "test" },
    },
    console: { log: (...x) => logs.push(x), error: (...x) => logs.push(x) },
    Date,
    Buffer,
  });
  return module.exports;
}
function response() {
  return {
    code: 200,
    set() {},
    cookie(name, value) {
      this.cookies = { ...this.cookies, [name]: value };
    },
    status(x) {
      this.code = x;
      return this;
    },
    json(x) {
      this.body = x;
      return this;
    },
  };
}
test("account counter limits across IPs, IP counter across accounts, outage fails closed", async () => {
  const counters = new Map();
  const store = {
    async findOneAndUpdate({ _id }) {
      const count = (counters.get(_id) || 0) + 1;
      counters.set(_id, count);
      return { count };
    },
  };
  const { createAuthLimiter } = load("middleware/authRateLimit.middleware.js", {
    "../models/authAttempt.model": store,
  });
  const limit = createAuthLimiter("login", 2, 3);
  for (let i = 0; i < 3; i++) {
    const res = response();
    let passed = false;
    await limit(
      { ip: `ip${i}`, body: { email: " ADMIN@EXAMPLE.TEST " } },
      res,
      () => {
        passed = true;
      },
    );
    assert.equal(passed, i < 2);
    if (i === 2) assert.equal(res.code, 429);
  }
  for (let i = 0; i < 4; i++) {
    const res = response();
    await limit(
      { ip: "shared", body: { email: `${i}@example.test` } },
      res,
      () => {},
    );
    assert.equal(res.code, i === 3 ? 429 : 200);
  }
  store.findOneAndUpdate = async () => {
    throw Error("down");
  };
  const res = response();
  await limit({ ip: "x", body: {} }, res, () => assert.fail());
  assert.equal(res.code, 503);
});
function otpHarness() {
  const challengeId = "a".repeat(64);
  const record = {
    email: "admin@example.test",
    role: "admin",
    isActive: true,
    loginOtpChallenge: challengeId,
    loginOtpAttempts: 0,
    loginOtp: crypto
      .createHmac("sha256", "test")
      .update("123456")
      .digest("hex"),
  }; // A-12: OTPs are stored as HMAC-SHA256 (was bare SHA-256);
  const User = {
    findOneAndUpdate(filter, update) {
      let value = null;
      if (
        record.loginOtpChallenge === filter.loginOtpChallenge &&
        (!filter.loginOtpAttempts || record.loginOtpAttempts < 5) &&
        (!filter.loginOtp || filter.loginOtp === record.loginOtp)
      ) {
        if (update.$inc?.loginOtpAttempts) record.loginOtpAttempts++;
        if (update.$unset)
          for (const key of Object.keys(update.$unset)) delete record[key];
        value = { ...record };
      }
      return {
        select: async () => value,
        then: (resolve) => Promise.resolve(value).then(resolve),
      };
    },
  };
  const ctrl = load("controllers/auth.controller.js", {
    "../models/user.model": User,
    "../services/email.service": {},
    jsonwebtoken: { sign: () => "jwt" },
    "../utils/otpHash": {
      hashOtp: (otp) =>
        crypto.createHmac("sha256", "test").update(String(otp)).digest("hex"),
    },
  });
  return { ctrl, challengeId };
}
test("OTP requires challenge, locks after five guesses, cannot replay or race", async () => {
  let { ctrl, challengeId } = otpHarness();
  let res = response();
  await ctrl.adminVerifyOtp(
    { body: { email: "admin@example.test", otp: "123456" } },
    res,
  );
  assert.equal(res.code, 400);
  const requests = Array.from({ length: 7 }, () => {
    const r = response();
    return ctrl.adminVerifyOtp(
      { body: { email: "admin@example.test", otp: "000000", challengeId } },
      r,
    );
  });
  await Promise.all(requests);
  res = response();
  await ctrl.adminVerifyOtp(
    { body: { email: "admin@example.test", otp: "123456", challengeId } },
    res,
  );
  assert.equal(res.code, 400);
  ({ ctrl, challengeId } = otpHarness());
  const results = await Promise.all(
    [1, 2].map(async () => {
      const r = response();
      await ctrl.adminVerifyOtp(
        { body: { email: "admin@example.test", otp: "123456", challengeId } },
        r,
      );
      return r;
    }),
  );
  assert.equal(
    results.filter((r) => r.body?.token === "jwt" || r.cookies?.jwt === "jwt")
      .length,
    1,
  ); // FA-02: the session token now travels by cookie
});
test("magic link and provider error credentials never reach controller logs", async () => {
  const logs = [];
  const user = {
    isActive: true,
    createMagicLinkToken: () => "SECRET_TOKEN",
    save: async () => {},
  };
  const ctrl = load(
    "controllers/auth.controller.js",
    {
      "../models/user.model": { findOne: async () => user },
      "../services/email.service": {
        sendMagicLinkEmail: async () => {
          throw Error("SECRET_TOKEN email body");
        },
      },
      jsonwebtoken: {},
    },
    logs,
  );
  const res = response();
  await ctrl.sendMagicLink({ body: { email: "user@example.test" } }, res);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(res.code, 200);
  assert.equal(JSON.stringify(logs).includes("SECRET_TOKEN"), false);
});
