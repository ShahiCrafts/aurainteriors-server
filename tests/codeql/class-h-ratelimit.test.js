// CodeQL class H (#46-#191, js/missing-rate-limiting): every router
// now mounts the tiered limiters via router.use. Env overrides are
// set BEFORE the middleware module loads so the behavior tests can
// use tiny limits in this process.
process.env.RATE_LIMIT_READ_MAX = "3";
process.env.RATE_LIMIT_WRITE_MAX = "2";
process.env.RATE_LIMIT_ADMIN_MAX = "3";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const limiters = require("../../middleware/rateLimit.middleware");

test("CQ-H: every alert-listed router carries both tier limiters in its stack", () => {
  const files = [
    "address", "admin.review", "analytics", "announcement", "auth", "blog", "cart",
    "category", "chat", "contact", "discount", "document", "newsletter",
    "notification", "order", "product", "profile", "promotion", "review",
    "user", "wishlist",
  ];
  for (const name of files) {
    const router = require(`../../routes/${name}.routes.js`);
    const handles = router.stack.map((layer) => layer.handle);
    const tier = name === "analytics" || name === "admin.review" ? "admin" : "standard";
    assert.ok(handles.includes(limiters[`${tier}ReadLimiter`]), `${name}: read limiter missing`);
    assert.ok(handles.includes(limiters[`${tier}WriteLimiter`]), `${name}: write limiter missing`);
  }
});

test("CQ-H: tiers count independently, 429 keeps the standard shape, eSewa is exempt", async () => {
  const app = express();
  app.use(express.json());
  app.use(limiters.standardReadLimiter);
  app.use(limiters.standardWriteLimiter);
  app.get("/thing", (req, res) => res.json({ ok: true }));
  app.post("/thing", (req, res) => res.json({ ok: true }));
  app.get("/esewa/success", (req, res) => res.json({ ok: true }));
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path) => {
    const res = await fetch(base + path, { method });
    const body = res.status === 429 ? await res.json() : (await res.arrayBuffer(), null);
    return { status: res.status, body };
  };
  try {
    for (let i = 0; i < 3; i++) assert.equal((await call("GET", "/thing")).status, 200);
    const blocked = await call("GET", "/thing");
    assert.equal(blocked.status, 429, "4th read in the window is limited");
    assert.equal(blocked.body.status, "fail");
    assert.match(blocked.body.message, /Too many requests/);
    // Writes have their own counter (reads did not consume it)
    assert.equal((await call("POST", "/thing")).status, 200);
    assert.equal((await call("POST", "/thing")).status, 200);
    assert.equal((await call("POST", "/thing")).status, 429);
    // eSewa return path is never throttled
    for (let i = 0; i < 6; i++) assert.equal((await call("GET", "/esewa/success")).status, 200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
