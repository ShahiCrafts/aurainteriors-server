// Phase 4 negative-test battery: attacks that must FAIL against the
// hardened code paths, exercised end-to-end where practical.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { stubModule, makeQuery, mockRes, mockNext, until } = require("./helpers");

process.env.JWT_SECRET = "phase4-battery-secret-0123456789abcdef";

// ---------- JWT attacks ----------
let revoked;
stubModule("models/revokedToken.model.js", { exists: async () => revoked });
const authToken = require("../../utils/authToken");

test("battery: forged, expired, wrong-alg, tampered and revoked tokens are all rejected", async () => {
  revoked = false;
  const good = jwt.sign({ id: "u1", role: "customer" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h", issuer: "aura-interiors", audience: "aura-interiors-api" }); // FA-18: current-issue shape
  assert.equal((await authToken.verify(good)).id, "u1", "control: the genuine token verifies");

  const wrongSecret = jwt.sign({ id: "u1", role: "admin" }, "attacker-secret", { algorithm: "HS256" });
  await assert.rejects(() => authToken.verify(wrongSecret));

  const expired = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "-1h" });
  await assert.rejects(() => authToken.verify(expired));

  const hs512 = jwt.sign({ id: "u1", role: "admin" }, process.env.JWT_SECRET, { algorithm: "HS512" });
  await assert.rejects(() => authToken.verify(hs512), "algorithm confusion must fail (A-10)");

  const noneAlg = [
    Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ id: "u1", role: "admin" })).toString("base64url"),
    "",
  ].join(".");
  await assert.rejects(() => authToken.verify(noneAlg), "alg=none must fail");

  const [h, , s] = good.split(".");
  const tampered = [h, Buffer.from(JSON.stringify({ id: "u1", role: "admin" })).toString("base64url"), s].join(".");
  await assert.rejects(() => authToken.verify(tampered), "payload tampering must fail");

  revoked = true;
  await assert.rejects(() => authToken.verify(good), /revoked/i, "a revoked genuine token must fail");
  revoked = false;
});

// ---------- NoSQL corpus through the real middleware + express ----------
test("battery: NoSQL operator corpus is rejected; normal traffic passes", async () => {
  const express = require("express");
  const sanitize = require("../../middleware/nosqlSanitize.middleware");
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use(sanitize);
  app.post("/echo", (req, res) => res.json({ ok: true, body: req.body }));
  app.get("/echo", (req, res) => res.json({ ok: true }));
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ status: "fail", message: err.message })); // eslint-disable-line no-unused-vars
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const post = async (body) => {
      const res = await fetch(`${base}/echo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await res.arrayBuffer();
      return res.status;
    };
    const corpus = [
      { email: { $ne: null } },
      { email: { $gt: "" } },
      { $where: "sleep(1000)" },
      { user: { $or: [{ role: "admin" }] } },
      { "profile.role": "admin" },
      { items: [{ $elemMatch: { $gt: 1 } }] },
      JSON.parse('{"__proto__": {"isAdmin": true}}'),
      { email: "a@example.com", password: { $regex: ".*" } },
    ];
    for (const payload of corpus) {
      assert.equal(await post(payload), 400, `payload must be rejected: ${JSON.stringify(payload).slice(0, 60)}`);
    }
    assert.equal(await post({ email: "a@example.com", note: "I paid $50. Great." }), 200, "ordinary payloads pass");
    // Query strings: Express 5's default parser is the flat
    // querystring parser, so ?filter[$gt]=0 arrives as ONE inert
    // string key, not a nested operator object - verified here by it
    // passing harmlessly. Dotted keys, which the flat parser CAN
    // smuggle into path-style access, are rejected.
    const bracketRes = await fetch(`${base}/echo?filter[$gt]=0`);
    assert.equal(bracketRes.status, 200, "bracket syntax stays an inert flat key under the default parser");
    await bracketRes.arrayBuffer();
    const dottedRes = await fetch(`${base}/echo?user.role=admin`);
    assert.equal(dottedRes.status, 400, "dotted keys in the query string are rejected");
    await dottedRes.arrayBuffer();
    // Oversized body -> 413 from the explicit JSON limit (B-13 config shape)
    const big = await fetch(`${base}/echo`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "x".repeat(200 * 1024) }),
    });
    assert.equal(big.status, 413);
    await big.arrayBuffer();
  } finally {
    await new Promise((r) => server.close(r));
  }
});

// ---------- IDOR spot check: order read is scoped to the owner ----------
test("battery: getOrder queries by id AND requesting user (no cross-user read)", async () => {
  let capturedFilter;
  stubModule("models/order.model.js", {
    findOne: (filter) => { capturedFilter = filter; return makeQuery(null); },
  });
  stubModule("models/cart.model.js", {});
  stubModule("models/product.model.js", {});
  stubModule("models/discount.model.js", {});
  stubModule("models/address.model.js", {});
  stubModule("services/discountUsage.service.js", { consumeDiscountUsage: async () => {} });
  stubModule("services/orderTransition.service.js", { transitionOrder: async () => {} });
  stubModule("services/email.service.js", { sendOrderConfirmationEmail: async () => {} });
  stubModule("services/esewaCapture.service.js", { captureEsewaPayment: async () => {} });
  const orderController = require("../../controllers/order.controller");
  const res = mockRes();
  const next = mockNext();
  orderController.getOrder(
    { params: { id: "507f1f77bcf86cd799439011" }, user: { _id: "507f1f77bcf86cd799439099" } },
    res, next,
  );
  await until(() => next.error !== undefined || res.statusCode !== undefined);
  assert.ok(capturedFilter, "the order lookup must run");
  assert.equal(String(capturedFilter.user), "507f1f77bcf86cd799439099", "the lookup must be scoped to the requesting user");
  assert.equal(next.error?.statusCode, 404, "a non-owned order reads as not found");
});

// ---------- Role escalation via magic-link signup ----------
test("battery: a magic-link signup cannot self-assign the admin role", async () => {
  let createdWith;
  class FakeUser {
    constructor(fields) { createdWith = fields; Object.assign(this, fields); }
    createMagicLinkToken() { return "raw"; }
    async save() { return this; }
    static async findOne() { return null; }
  }
  stubModule("models/user.model.js", FakeUser);
  stubModule("services/email.service.js", { sendMagicLinkEmail: () => Promise.resolve() });
  const authController = require("../../controllers/auth.controller");
  const res = mockRes();
  await authController.sendMagicLink({ body: { email: "hopeful@example.com", role: "admin", isActive: true } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(Object.keys(createdWith), ["email"], "only the email may be taken from the request");
});
