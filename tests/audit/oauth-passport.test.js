// A-02 / A-13 — Google strategy verify callback (config/passport.js).
// A-02: the email fallback path linked a Google identity to an existing
// account by email ALONE, without checking Google's email_verified claim,
// and marked the account verified. A-13: profile.emails[0] / profile.name
// were dereferenced unguarded, so profiles without email/name crashed
// with a TypeError instead of a controlled rejection.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
// OA-1 (AR-32): BACKEND_URL has no fallback any more and the Google
// strategy's callback URL is built from it - tests set it explicitly
// (env-setup only; no assertion in this file changes).
process.env.BACKEND_URL =
  process.env.BACKEND_URL || "https://backend.example.test";

let users;
let created;
let capturedStrategy;
function makeUser(fields) {
  return {
    ...fields,
    saveCalls: 0,
    updateLoginActivity() {},
    async save() {
      this.saveCalls += 1;
      return this;
    },
  };
}
stubModule("passport", {
  use: (strategy) => {
    capturedStrategy = strategy;
  },
  serializeUser: () => {},
  deserializeUser: () => {},
});
stubModule("models/user.model.js", {
  findOne: async (filter) => {
    if (filter.googleId)
      return users.find((u) => u.googleId === filter.googleId) || null;
    if (filter.email)
      return users.find((u) => u.email === filter.email) || null;
    return null;
  },
  create: async (fields) => {
    created = makeUser(fields);
    users.push(created);
    return created;
  },
});

require("../../config/passport");
const verify = capturedStrategy._verify;
assert.ok(
  typeof verify === "function",
  "strategy verify callback should be capturable",
);

function runVerify(profile) {
  return new Promise((resolve) => {
    verify("access-token", "refresh-token", profile, (err, user, info) =>
      resolve({ err, user, info }),
    );
  });
}
function profile(overrides = {}) {
  return {
    id: "google-sub-123",
    emails: [{ value: "person@example.test" }],
    name: { givenName: "Per", familyName: "Son" },
    displayName: "Per Son",
    photos: [{ value: "https://example.invalid/p.jpg" }],
    _json: { email_verified: true },
    ...overrides,
  };
}

test("A-02: linking by email is refused when Google does not verify the email", async () => {
  users = [
    makeUser({
      email: "person@example.test",
      role: "customer",
      isEmailVerified: false,
    }),
  ];
  created = undefined;
  const { err, user } = await runVerify(
    profile({ id: "new-sub-999", _json: { email_verified: false } }),
  );
  assert.ok(!user, "must not sign in / link on an unverified email claim");
  assert.equal(users[0].googleId, undefined, "googleId must not be linked");
  assert.equal(
    users[0].isEmailVerified,
    false,
    "account must not be marked verified",
  );
});

test("A-02: account creation is refused when Google does not verify the email", async () => {
  users = [];
  created = undefined;
  const { user } = await runVerify(
    profile({ _json: { email_verified: false } }),
  );
  assert.ok(!user);
  assert.equal(created, undefined, "no account should be created");
});

test("characterization: verified email links to the existing account", async () => {
  users = [
    makeUser({
      email: "person@example.test",
      role: "customer",
      isEmailVerified: false,
    }),
  ];
  const { err, user } = await runVerify(profile({ id: "new-sub-999" }));
  assert.equal(err, null);
  assert.equal(user.email, "person@example.test");
  assert.equal(user.googleId, "new-sub-999");
  assert.equal(user.isEmailVerified, true);
});

test("characterization: an already-linked googleId signs in (identity is the sub)", async () => {
  users = [
    makeUser({
      email: "person@example.test",
      googleId: "google-sub-123",
      role: "customer",
    }),
  ];
  const { err, user } = await runVerify(profile({ _json: {} }));
  assert.equal(err, null);
  assert.equal(user.googleId, "google-sub-123");
});

test("A-13: a profile without an email is a controlled rejection, not a TypeError", async () => {
  users = [];
  const { err, user } = await runVerify(profile({ emails: undefined }));
  assert.ok(
    !(err instanceof TypeError),
    `expected controlled rejection, got TypeError: ${err && err.message}`,
  );
  assert.ok(!user);
});

test("A-13: a profile without name/photos still creates an account", async () => {
  users = [];
  created = undefined;
  const { err, user } = await runVerify(
    profile({ name: undefined, displayName: undefined, photos: undefined }),
  );
  assert.equal(err, null, `unexpected error: ${err && err.message}`);
  assert.ok(user);
  assert.equal(typeof user.firstName, "string");
  assert.equal(user.avatar, null);
});
