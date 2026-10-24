// Commit-audit C-4 regression: FA-13's guest order-lookup throttle was
// wired only into the legacy orchestrator (chatOrchestrator.js:601 sets
// args.lookupKey). The chatV2 registry's getOrderStatus handler never
// passed a lookupKey, so dbTools' throttle (5 failures / 15 min per key)
// never engaged on the live pipeline: guest lookups via chatV2 were
// unthrottled and failures were never counted.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { stubModule, makeQuery } = require("../audit/helpers");

const repoRoot = path.join(__dirname, "..", "..");
const registryPath = require.resolve(path.join(repoRoot, "services/chatV2/tools/registry.js"));
const dbToolsPath = require.resolve(path.join(repoRoot, "services/dbTools.js"));

test("C-4: registry passes a lookupKey mirroring the legacy key scheme", async () => {
  let captured;
  stubModule("services/dbTools", {
    getOrderStatus: async (args) => { captured = args; return { ok: true }; },
  });
  delete require.cache[registryPath];
  const registry = require(registryPath);

  await registry.execute("getOrderStatus",
    { orderId: "ORD1", email: "guest@example.com" },
    { userId: null, guestSessionId: "guest_abc", chatId: "chat1" });
  assert.equal(captured.lookupKey, "guest:guest_abc");

  await registry.execute("getOrderStatus",
    { orderId: "ORD1", email: "guest@example.com" },
    { userId: null, guestSessionId: null, chatId: "chat1" });
  assert.equal(captured.lookupKey, "guest:chat1", "chat id is the fallback key, as in the legacy path");

  await registry.execute("getOrderStatus",
    { orderId: "ORD1" },
    { userId: "user42", guestSessionId: null, chatId: "chat1" });
  assert.equal(captured.lookupKey, "user:user42");
});

test("C-4: failed guest lookups via chatV2 are throttled after 5 failures", async () => {
  // Real dbTools this time, with only the models stubbed: an order whose
  // guest email never matches the lookup email.
  const order = { orderId: "ORD9", isGuestOrder: true, guestInfo: { email: "real@example.com" } };
  stubModule("models/order.model", { findOne: () => makeQuery(order) });
  stubModule("models/product.model", {});
  stubModule("models/category.model", {});
  stubModule("models/address.model", {});
  stubModule("models/user.model", {});
  delete require.cache[dbToolsPath];
  delete require.cache[registryPath];
  const registry = require(registryPath);

  const ctx = { userId: null, guestSessionId: "guest_throttle_probe", chatId: "chatT" };
  for (let i = 0; i < 5; i++) {
    const res = await registry.execute("getOrderStatus", { orderId: "ORD9", email: "wrong@example.com" }, ctx);
    assert.match(res.error, /Order not found/, `attempt ${i + 1} is the uniform FA-32 error`);
  }
  const sixth = await registry.execute("getOrderStatus", { orderId: "ORD9", email: "wrong@example.com" }, ctx);
  assert.match(sixth.error, /Too many lookup attempts/, "the FA-13 throttle must engage on the chatV2 path");
});
