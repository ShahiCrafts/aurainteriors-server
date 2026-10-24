// A-06 — magic-link redemption must be an atomic claim.
// Before the fix, verifyMagicLink did findOne -> mutate -> save: two
// concurrent requests with the same token both passed the findOne
// before either save cleared it, and both received a JWT. The OTP flow
// in the same controller already does this correctly with
// findOneAndUpdate + $unset; the magic-link flow now mirrors it.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { stubModule, makeQuery } = require("./helpers");

process.env.JWT_SECRET = "test-only-jwt-secret-for-magic-link-tests";

const RAW_TOKEN = "a".repeat(64);
const HASHED = crypto.createHash("sha256").update(RAW_TOKEN).digest("hex");

// Backing store emulating the DB. findOneAndUpdate mutates it
// synchronously (atomic, like Mongo); findOne + save has the classic
// read-modify-write gap the bug lived in.
let store;
function freshStore() {
  return { magicLinkToken: HASHED, magicLinkExpires: Date.now() + 60_000, claimed: false };
}
function makeDoc() {
  return {
    _id: "111111111111111111111111",
    email: "user@example.test",
    role: "customer",
    isActive: true,
    isEmailVerified: false,
    updateLoginActivity() {},
    async save() {
      await new Promise((r) => setTimeout(r, 10)); // the race window
      store.magicLinkToken = undefined;
      store.magicLinkExpires = undefined;
    },
  };
}
stubModule("models/user.model.js", {
  findOne: (filter) => makeQuery(
    store.magicLinkToken === filter.magicLinkToken && !store.claimed ? makeDoc() : null,
  ),
  findOneAndUpdate: (filter, update) => {
    // Atomic: decide and mutate in one synchronous step.
    if (store.magicLinkToken !== filter.magicLinkToken || store.claimed) {
      return makeQuery(null);
    }
    store.claimed = true;
    store.magicLinkToken = undefined;
    store.magicLinkExpires = undefined;
    const doc = makeDoc();
    doc.isEmailVerified = true;
    return makeQuery(doc);
  },
});
stubModule("services/email.service.js", { sendMagicLinkEmail: async () => true });

const controller = require("../../controllers/auth.controller");

function mockRes() {
  return {
    statusCode: undefined, body: undefined, cookies: {},
    cookie(name, value, options) { this.cookies[name] = { value, options }; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}
async function verify(token) {
  const res = mockRes();
  await controller.verifyMagicLink({ body: { token } }, res);
  return res;
}

test("A-06: two concurrent redemptions of one token yield exactly one session", async () => {
  store = freshStore();
  const [r1, r2] = await Promise.all([verify(RAW_TOKEN), verify(RAW_TOKEN)]);
  const successes = [r1, r2].filter((r) => r.statusCode === 200);
  const failures = [r1, r2].filter((r) => r.statusCode === 400);
  assert.equal(successes.length, 1, `expected exactly one 200, got statuses ${r1.statusCode}/${r2.statusCode}`);
  assert.equal(failures.length, 1);
});

test("A-06: a redeemed token cannot be replayed sequentially", async () => {
  store = freshStore();
  const first = await verify(RAW_TOKEN);
  assert.equal(first.statusCode, 200);
  const second = await verify(RAW_TOKEN);
  assert.equal(second.statusCode, 400);
});

test("characterization: a valid token issues a session cookie once", async () => {
  store = freshStore();
  const res = await verify(RAW_TOKEN);
  assert.equal(res.statusCode, 200);
  assert.ok(res.cookies.jwt, "jwt cookie should be set");
  assert.equal(res.body.status, "success");
});

test("characterization: malformed and unknown tokens are 400", async () => {
  store = freshStore();
  assert.equal((await verify("not-a-token")).statusCode, 400);
  assert.equal((await verify("b".repeat(64))).statusCode, 400);
  assert.equal((await verify(undefined)).statusCode, 400);
});
