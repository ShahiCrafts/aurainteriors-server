// CodeQL class B (auth sites #6/#7/#8 - auth.controller.js:42,169,230):
// the email/OTP/challenge lookups. The handlers typeof-guard every
// credential field BEFORE building a filter; these tests prove
// operator/array payloads are rejected at that guard and never reach
// the database layer in attacker shape.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes } = require("../audit/helpers");

let findOneCalls = [];
let findOneAndUpdateCalls = [];
class FakeUser {
  static async findOne(filter) {
    findOneCalls.push(filter);
    return null;
  }
  static findOneAndUpdate(filter) {
    findOneAndUpdateCalls.push(filter);
    return { select: () => Promise.resolve(null) }; // Query-like, as Mongoose returns
  }
}
stubModule("models/user.model.js", FakeUser);
stubModule("models/revokedToken.model.js", {
  exists: async () => false,
  updateOne: async () => ({}),
});
stubModule("services/email.service.js", {
  sendMagicLinkEmail: () => Promise.resolve(),
  sendOtpEmail: () => Promise.resolve(),
});
const auth = require("../../controllers/auth.controller");

test("CQ-B auth: operator payloads die at the typeof guards, never reaching a query", async () => {
  findOneCalls = [];
  findOneAndUpdateCalls = [];

  let res = mockRes();
  await auth.sendMagicLink({ body: { email: { $ne: null } } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(findOneCalls.length, 0, "no lookup may run for an object email");

  res = mockRes();
  await auth.adminLogin({ body: { email: { $gt: "" }, password: "x" } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(findOneCalls.length, 0);

  res = mockRes();
  await auth.adminLogin(
    { body: { email: "admin@example.com", password: { $ne: null } } },
    res,
  );
  assert.equal(
    res.statusCode,
    400,
    "an object password is rejected, not compared",
  );
  assert.equal(findOneCalls.length, 0);

  res = mockRes();
  await auth.adminVerifyOtp(
    {
      body: {
        email: "admin@example.com",
        otp: "123456",
        challengeId: { $ne: null },
      },
    },
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(
    findOneAndUpdateCalls.length,
    0,
    "an object challengeId must never enter the claim filter",
  );

  res = mockRes();
  await auth.adminVerifyOtp(
    {
      body: {
        email: ["admin@example.com"],
        otp: { $gt: "" },
        challengeId: "a".repeat(64),
      },
    },
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(findOneAndUpdateCalls.length, 0);
});

test("CQ-B auth: well-formed shapes reach the query as scalars (control)", async () => {
  findOneAndUpdateCalls = [];
  const res = mockRes();
  await auth.adminVerifyOtp(
    {
      body: {
        email: "Admin@Example.com",
        otp: "123456",
        challengeId: "a".repeat(64),
      },
    },
    res,
  );
  assert.equal(res.statusCode, 400, "unknown challenge -> uniform rejection");
  assert.equal(findOneAndUpdateCalls.length, 1);
  const filter = findOneAndUpdateCalls[0];
  assert.equal(typeof filter.email, "string");
  assert.equal(filter.email, "admin@example.com");
  assert.equal(typeof filter.loginOtpChallenge, "string");
});
