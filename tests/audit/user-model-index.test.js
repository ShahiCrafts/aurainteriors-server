// A-14 — googleId must be a UNIQUE sparse index. Before the fix the schema
// had { sparse: true } with no unique, which constrains nothing: two user
// documents could share one googleId and findOne({ googleId }) would return
// an arbitrary match.
const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-for-model-load";
const User = require("../../models/user.model");

test("A-14: googleId has a unique sparse index", () => {
  const indexes = User.schema.indexes();
  const googleIndex = indexes.find(([fields]) => fields.googleId === 1);
  assert.ok(googleIndex, "an index on googleId should exist");
  const [, options] = googleIndex;
  assert.equal(options.unique, true, "googleId index must be unique");
  assert.equal(options.sparse, true, "googleId index must stay sparse (most users have no googleId)");
});

test("characterization: email stays uniquely indexed", () => {
  const indexes = User.schema.indexes();
  const emailIndex = indexes.find(([fields]) => fields.email === 1);
  assert.ok(emailIndex && emailIndex[1].unique === true);
});
