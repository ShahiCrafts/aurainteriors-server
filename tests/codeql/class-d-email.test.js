// CodeQL class D (#1/#2, js/redos): the newsletter email regex
// /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ backtracks
// catastrophically - a 28-char adversarial input ran >6 SECONDS
// pre-fix (measured). It is replaced by validator.isEmail (linear)
// plus a 254-char cap. Accept/reject for normal emails is unchanged;
// two classes of genuinely-valid addresses the old regex wrongly
// rejected (plus-tags, TLDs longer than 3 chars) are now accepted -
// logged as a behavior change in FINDINGS.md.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Newsletter = require("../../models/newsletter.model");

const check = async (email) => {
  const doc = new Newsletter({ email });
  try {
    await doc.validate();
    return true;
  } catch {
    return false;
  }
};

test("CQ-D: valid and invalid sets behave as specified", async () => {
  for (const ok of ["user@example.com", "first.last@sub.domain.co", "user@aurainteriors.live"]) {
    assert.equal(await check(ok), true, `should accept ${ok}`);
  }
  for (const bad of ["not-an-email", "a@b", "@example.com", "a b@example.com", "a@.com", "a@@example.com", ""]) {
    assert.equal(await check(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
  // Behavior change (logged): previously rejected valid addresses
  assert.equal(await check("user+tag@example.com"), true, "plus-tag now accepted");
  assert.equal(await check("user@example.museum"), true, "long TLD now accepted");
  // Length cap
  assert.equal(await check(`${"a".repeat(250)}@example.com`), false, "over-254 addresses rejected");
});

test("CQ-D: adversarial input validates in linear time", async () => {
  const evil = `${"a".repeat(2000)}@${"a.".repeat(1000)}!`;
  const start = Date.now();
  assert.equal(await check(evil), false);
  assert.ok(Date.now() - start < 1000, "validation must not backtrack");
});
