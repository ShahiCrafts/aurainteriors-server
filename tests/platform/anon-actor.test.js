"use strict";
// Lead review item 2 (2026-10-24): utils/anonActor's || "dev-anon-key"
// fallback signed the FA-25 guest-dedup cookie with a public constant.
// The secret now routes through config/appConfig's validated registry and
// fails loudly when absent. These tests pin: (a) the HMAC construction is
// byte-identical to the pre-removal construction when JWT_SECRET is set;
// (b) sign/verify round-trips and rejects forgeries; (c) a missing
// JWT_SECRET throws an error naming the variable instead of silently
// signing with a constant.
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { actorFor } = require("../../utils/anonActor");

const SECRET = "test-anon-secret-" + "x".repeat(32);
let saved;

beforeEach(() => {
  saved = process.env.JWT_SECRET;
});
afterEach(() => {
  if (saved === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = saved;
});

function resSpy() {
  const calls = [];
  return {
    calls,
    cookie: (name, value, opts) => calls.push({ name, value, opts }),
  };
}
const expectedSig = (secret, id) =>
  crypto.createHmac("sha256", secret).update(`anon:${id}`).digest("base64url");

test("sign/verify: HMAC construction is unchanged when JWT_SECRET is set", () => {
  process.env.JWT_SECRET = SECRET;
  const res = resSpy();
  const actor = actorFor({ cookies: {} }, res);
  assert.match(actor, /^anon:[a-f0-9]{32}$/);
  const id = actor.slice("anon:".length);
  assert.equal(res.calls.length, 1);
  assert.equal(res.calls[0].name, "aura_anon");
  const [cookieId, sig] = res.calls[0].value.split(".");
  assert.equal(cookieId, id);
  // Independent recomputation proves the exact pre-removal construction:
  // HMAC-SHA256(secret).update("anon:" + id).digest("base64url").
  assert.equal(sig, expectedSig(SECRET, id));
  // A request presenting the signed cookie verifies to the same actor.
  const again = actorFor(
    { cookies: { aura_anon: res.calls[0].value } },
    resSpy(),
  );
  assert.equal(again, actor);
});

test("sign/verify: forged or malformed cookies are rejected with a fresh id", () => {
  process.env.JWT_SECRET = SECRET;
  const res = resSpy();
  const first = actorFor({ cookies: {} }, res);
  const id = first.slice("anon:".length);
  const forged = `${id}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
  const second = actorFor({ cookies: { aura_anon: forged } }, resSpy());
  assert.notEqual(second, first);
  assert.match(second, /^anon:[a-f0-9]{32}$/);
  const garbage = actorFor(
    { cookies: { aura_anon: "not-a-cookie" } },
    resSpy(),
  );
  assert.match(garbage, /^anon:[a-f0-9]{32}$/);
  assert.notEqual(garbage, first);
});

test("missing JWT_SECRET fails loudly, naming the variable", () => {
  delete process.env.JWT_SECRET;
  assert.throws(
    () => actorFor({ cookies: {} }, resSpy()),
    /JWT_SECRET is not configured/,
  );
  assert.throws(
    () => actorFor({ cookies: { aura_anon: "abcd.efgh" } }, resSpy()),
    /JWT_SECRET is not configured/,
  );
});
