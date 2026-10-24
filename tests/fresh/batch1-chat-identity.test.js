// Batch 1 (FRESH remediation): FA-01, FA-07, FA-13, FA-31, FA-32.
// Converted from fresh-audit PoC-03 and extended. Harness: require-cache
// stubs, the same technique as tests/audit and the original PoC.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};

// ---------- dbTools-capture harness (registry boundary) ----------
let captured = [];
const dbToolsStub = {
  getOrderStatus: async (args) => { captured.push({ tool: "getOrderStatus", args: { ...args } }); return { orderId: "X" }; },
  searchProducts: async (args) => { captured.push({ tool: "searchProducts", args: { ...args } }); return []; },
  getProductDetails: async (args) => { captured.push({ tool: "getProductDetails", args: { ...args } }); return {}; },
};
stub("services/dbTools.js", dbToolsStub);
// The FA-13/FA-32 section at the bottom of this file replaces the cached
// dbTools module with the REAL one at load time (all top-level statements
// run before any test). The chatV2 registry lazy-requires dbTools at
// execute time — so registry tests re-install the stub first.
const installDbToolsStub = () => stub("services/dbTools.js", dbToolsStub);
stub("models/chat.model.js", { findById: async () => ({ _id: "chat1", metadata: {} }) });
stub("models/chatMessage.model.js", { find: () => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }) }) });
// AR-30: this file originally drove the legacy chatOrchestrator. Change
// set 1 (FA-31 port) moved tests 1, 2, 4, 5 to the chatV2 registry
// boundary (registry.execute); change set 2 (legacy removal, D-B) moved
// test 3 to the chatV2 context builder and test 6 to chatService's
// buildV2TurnIdentity helper. The registry lazy-requires services/dbTools
// inside its handlers, so the require-cache stub above is what its
// handlers resolve at execute time.
const registry = require(path.join(repo, "services/chatV2/tools/registry.js"));
const contextBuilder = require(path.join(repo, "services/chatV2/core/contextBuilder.js"));

const VICTIM = "64b64c2f9f1b2c3d4e5f6071";
const ATTACKER = "64b64c2f9f1b2c3d4e5f6001";

test("FA-01: model-supplied userId never reaches dbTools (logged-in user)", async () => {
  captured = [];
  installDbToolsStub();
  await registry.execute("getOrderStatus", { userId: VICTIM, orderId: "ORD-1" },
    { userId: ATTACKER, guestSessionId: null, chatId: "chat1" });
  const call = captured.find((c) => c.tool === "getOrderStatus");
  assert.ok(call, "tool executed");
  assert.equal(call.args.userId, ATTACKER, "identity must be the server-side session user, not the model's");
});

test("FA-01/FA-07: guest turn - model-supplied userId is dropped entirely", async () => {
  captured = [];
  installDbToolsStub();
  const guestSessionId = "guest_" + "a".repeat(64);
  await registry.execute("getOrderStatus", { userId: VICTIM, orderId: "ORD-1", email: "guest@example.com" },
    { userId: null, guestSessionId, chatId: "chat1" });
  const call = captured.find((c) => c.tool === "getOrderStatus");
  assert.ok(call, "tool executed");
  assert.equal(call.args.userId, undefined, "guests run with NO customer identity");
  assert.equal(call.args.lookupKey, `guest:${guestSessionId}`, "guests are keyed by their guest session, never by a userId");
});

test("FA-01: system prompt never contains the raw customer id", async () => {
  // AR-30: migrated from the legacy orchestrator's handleUserMessage to
  // the chatV2 context builder, which assembles the prompt from the chat
  // id + user text only — it takes no identity input at all (history
  // comes through the ChatMessage stub above and is empty here).
  const messages = await contextBuilder.build({ chatId: "chat1", userText: "where is my order please" });
  const sys = (messages || []).find((m) => m.role === "system");
  assert.ok(sys, "system prompt captured");
  assert.ok(!JSON.stringify(messages).includes(ATTACKER), "prompt must not embed the user's ObjectId");
});

test("FA-31: tool args are schema-validated and stripped before execution", async () => {
  captured = [];
  installDbToolsStub();
  await registry.execute("searchProducts", { query: "sofa", limit: 9999, userId: VICTIM, $where: "1" },
    { userId: ATTACKER, guestSessionId: null, chatId: "chat1" });
  const call = captured.find((c) => c.tool === "searchProducts");
  assert.ok(call, "tool executed");
  assert.equal(call.args.userId, undefined);
  assert.equal(call.args.$where, undefined, "unknown properties are stripped");
  assert.equal(call.args.limit, 10, "limit is clamped to schema max");
});

test("FA-31: wrong-typed tool args are rejected, tool not executed", async () => {
  captured = [];
  installDbToolsStub();
  const res = await registry.execute("getProductDetails", { productId: 12345 },
    { userId: ATTACKER, guestSessionId: null, chatId: "chat1" });
  assert.equal(captured.find((c) => c.tool === "getProductDetails"), undefined);
  assert.deepEqual(res, { error: "Invalid tool arguments" }, "the LLM gets the generic invalid-arguments error");
});

test("FA-31/AR-30: every registered tool has a TOOL_ARG_RULES entry", () => {
  assert.ok(registry.TOOL_ARG_RULES, "registry exports TOOL_ARG_RULES (ported from the legacy orchestrator)");
  for (const def of registry.definitions) {
    assert.ok(Object.prototype.hasOwnProperty.call(registry.TOOL_ARG_RULES, def.name),
      `TOOL_ARG_RULES is missing an entry for registered tool ${def.name}`);
  }
});

test("FA-31/AR-30: the v2-only tools are validated too (handoff reason, knowledge query)", async () => {
  let handoffReason = null;
  let retrieveQuery = null;
  const ctx = {
    userId: ATTACKER, guestSessionId: null, chatId: "chat1",
    handoff: async (reason) => { handoffReason = reason; return { ok: true }; },
    retrieve: async (query) => { retrieveQuery = query; return []; },
  };
  await registry.execute("handoffToHuman", { reason: "r".repeat(900), userId: VICTIM, extra: "x" }, ctx);
  assert.equal(handoffReason, "r".repeat(500), "handoff reason is truncated to the 500-char cap");
  await registry.execute("retrieveKnowledge", { query: "q".repeat(1500), userId: VICTIM }, ctx);
  assert.equal(retrieveQuery, "q".repeat(1000), "knowledge query is truncated to the 1000-char cap");
  const bad = await registry.execute("retrieveKnowledge", { query: 42 }, ctx);
  assert.deepEqual(bad, { error: "Invalid tool arguments" }, "wrong-typed query is rejected");
});

// ---------- chatService identity decision (FA-07) ----------
stub("models/guestSession.model.js", {});
stub("services/notificationEventEmitter.js", {});
const chatServiceModule = require(path.join(repo, "services/chatService.js"));

test("FA-07: guest turns resolve to NO customer identity; guest session carried separately", () => {
  // AR-30: migrated from orchestratorIdentityFor (legacy pipeline) to
  // buildV2TurnIdentity, the extracted identity fields of the chatV2
  // dispatcher's turn context in chatService.
  const fn = chatServiceModule.buildV2TurnIdentity;
  assert.equal(typeof fn, "function", "chatService exports buildV2TurnIdentity");
  const guestSid = "guest_" + "b".repeat(64);
  const guest = fn({ customer: null, guestSessionId: guestSid });
  assert.equal(guest.userId, null, "guest chats carry NO customer identity");
  assert.equal(guest.guestSessionId, guestSid, "guest session id is carried separately");
  assert.notEqual(guest.guestSessionId, guest.userId, "a guest session id is never a userId");
  const user = fn({ customer: ATTACKER, guestSessionId: null });
  assert.equal(user.userId, ATTACKER, "customer identity comes from the chat's server-side customer record");
  assert.equal(user.guestSessionId, null);
});

// ---------- dbTools guest lookup (FA-13, FA-32) ----------
delete require.cache[path.join(repo, "services/dbTools.js")];
let orderDoc = null;
stub("models/order.model.js", {
  findOne: () => ({ populate: () => ({ lean: async () => orderDoc }), lean: async () => orderDoc }),
  find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }),
});
stub("models/product.model.js", {});
stub("models/category.model.js", {});
stub("models/address.model.js", {});
stub("models/user.model.js", {});
const dbTools = require(path.join(repo, "services/dbTools.js"));

const FULL_ORDER = {
  orderId: "ORD-2026-500001", orderStatus: "shipped", total: 4999, items: [{}, {}],
  createdAt: new Date(), isGuestOrder: true,
  guestInfo: { email: "buyer@example.com", name: "Buyer", phone: "9800000000" },
  shippingAddress: { name: "Buyer", phone: "9800000000", city: "KTM", street: "Secret St 1" },
  paymentResponse: { secret: "payload" },
};

test("FA-32: guest lookup gives ONE uniform error for not-found and email mismatch", async () => {
  orderDoc = null;
  const notFound = await dbTools.getOrderStatus({ orderId: "ORD-X", email: "a@example.com", lookupKey: "guest:t1" });
  orderDoc = FULL_ORDER;
  const mismatch = await dbTools.getOrderStatus({ orderId: "ORD-2026-500001", email: "wrong@example.com", lookupKey: "guest:t2" });
  assert.ok(notFound.error && mismatch.error);
  assert.equal(notFound.error, mismatch.error, "errors must be indistinguishable");
});

test("FA-13: guest lookup success returns minimal fields only (no address/phone/payment data)", async () => {
  orderDoc = FULL_ORDER;
  const ok = await dbTools.getOrderStatus({ orderId: "ORD-2026-500001", email: "buyer@example.com", lookupKey: "guest:t3" });
  assert.equal(ok.orderId, "ORD-2026-500001");
  const flat = JSON.stringify(ok);
  assert.ok(!flat.includes("Secret St"), "no street address");
  assert.ok(!flat.includes("9800000000"), "no phone");
  assert.ok(!flat.includes("paymentResponse"), "no gateway payload");
});

test("FA-13: repeated failed guest lookups are throttled per key", async () => {
  orderDoc = null;
  let last;
  for (let i = 0; i < 6; i++) last = await dbTools.getOrderStatus({ orderId: "ORD-X", email: "a@example.com", lookupKey: "guest:throttle" });
  assert.match(last.error, /too many/i);
});
