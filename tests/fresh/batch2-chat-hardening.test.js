// Batch 2 (FRESH remediation): FA-14, FA-33, FA-34, FA-39, FA-58, FA-72,
// FA-06, FA-37, FA-59, FA-29, FA-82.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};

// FA-14: shared strict attachment validation
test("FA-14: validateChatAttachments enforces the strict update-path rules", () => {
  const { validateChatAttachments } = require(path.join(repo, "utils/chatAttachments.js"));
  const good = [{ fileName: "a.png", fileUrl: "https://res.cloudinary.com/x/a.png", fileType: "image", fileSize: 1234 }];
  assert.deepEqual(validateChatAttachments(good), good);
  assert.equal(validateChatAttachments([{ ...good[0], fileUrl: "http://evil.example/a.png" }]), null, "https only");
  assert.equal(validateChatAttachments([{ ...good[0], fileUrl: "https://x/" + "a".repeat(2050) }]), null, "bounded length");
  assert.equal(validateChatAttachments([{ ...good[0], fileSize: 0 }]), null, "positive size");
  assert.equal(validateChatAttachments([{ ...good[0], fileSize: 1.5 }]), null, "integer size");
  assert.equal(validateChatAttachments([good[0], good[0], good[0], good[0]]), null, "max 3");
  assert.equal(validateChatAttachments([{ fileUrl: "https://x/a.png" }]), null, "all fields required");
  assert.deepEqual(validateChatAttachments([]), [], "empty is valid for send");
  assert.equal(validateChatAttachments("nope"), null);
});

// FA-59: cancelled-key set is bounded
test("FA-59: KeyedTurnQueue cancelled set cannot grow without bound", () => {
  const KeyedTurnQueue = require(path.join(repo, "services/chatV2/queue/keyedTurnQueue.js"));
  const q = new KeyedTurnQueue();
  for (let i = 0; i < 5000; i++) q.cancel("chat-" + i);
  assert.ok(q.cancelled.size <= 1000, `cancelled set bounded, got ${q.cancelled.size}`);
});

// FA-37: tool timeout aborts the signal handed to handlers
test("FA-37: registry execute passes an AbortSignal and aborts on timeout", async () => {
  stub("services/dbTools.js", {});
  const registry = require(path.join(repo, "services/chatV2/tools/registry.js"));
  let seenCtx = null;
  registry.byName.set("slowTool", { name: "slowTool", identity: false,
    handler: async (_a, ctx) => { seenCtx = ctx; await new Promise((r) => setTimeout(r, 500)); return {}; } });
  await assert.rejects(() => registry.execute("slowTool", {}, { userId: "u1" }, { timeoutMs: 30 }), /timeout/i);
  assert.ok(seenCtx && seenCtx.signal, "handler ctx carries a signal");
  assert.equal(seenCtx.signal.aborted, true, "signal aborted after timeout");
});

// FA-82: output guard strips HTML tags (assistant output is plain text)
test("FA-82: outputGuard strips HTML tags from assistant output", () => {
  const { guard } = require(path.join(repo, "services/chatV2/core/outputGuard.js"));
  const out = guard("Hello <script>alert(1)</script> <b>world</b> <img src=x onerror=alert(2)>");
  assert.ok(!/<\/?(script|b|img)/i.test(out), `tags stripped, got: ${out}`);
  assert.ok(out.includes("world"));
});

// FA-06: streaming completion has an overall deadline
test("FA-06: llmGateway stream aborts when the overall deadline passes", async () => {
  process.env.CHAT_LLM_STREAM_TIMEOUT_MS = "50";
  const LlmGateway = require(path.join(repo, "services/chatV2/providers/llmGateway.js"));
  const gw = new LlmGateway({ providers: [], temperature: 0.2, maxTokens: 100 });
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    status: 200, ok: true, headers: { get: () => null },
    body: { getReader: () => {
      // Behaves like a real stream reader: a pending read resolves done
      // when cancel() is called.
      let cancelled = false; let resolveRead = null;
      return {
        read: () => cancelled ? Promise.resolve({ done: true }) : new Promise((res) => { resolveRead = res; }),
        cancel: async () => { cancelled = true; if (resolveRead) resolveRead({ done: true }); },
      };
    } },
  });
  try {
    await assert.rejects(
      () => gw._stream({ name: "P", baseUrl: "https://example.invalid", model: "m", apiKey: "k" }, "P:m", { messages: [], tools: [] }),
      /deadline|timeout|abort/i
    );
  } finally {
    global.fetch = originalFetch;
    delete process.env.CHAT_LLM_STREAM_TIMEOUT_MS;
  }
});

// FA-34 + FA-58: chatService existence oracle + sender email exposure
const chatDoc = { _id: "64b64c2f9f1b2c3d4e5f60aa", customer: "64b64c2f9f1b2c3d4e5f6001", guestSession: null, deletedAt: null };
stub("models/chat.model.js", {
  // The populated customer behaves like a Mongoose doc for authorizeChat's
  // toString() ownership comparison.
  findOne: () => ({ populate: () => ({ lean: async () => ({ ...chatDoc, customer: { _id: chatDoc.customer, email: "owner@example.com", firstName: "O", toString() { return this._id; } } }) }),
                    select: () => ({ lean: async () => chatDoc }), lean: async () => chatDoc }),
});
stub("models/chatMessage.model.js", { countDocuments: async () => 0, aggregate: async () => [], getChatMessages: async () => [] });
stub("models/guestSession.model.js", { findOne: () => ({ select: () => ({ lean: async () => null }) }) });
stub("models/user.model.js", { findById: () => ({ select: () => ({ lean: async () => null }) }), findOne: async () => null });
stub("services/notificationEventEmitter.js", { emit: () => {} });
const ChatService = require(path.join(repo, "services/chatService.js"));

test("FA-34: unauthorized non-admin gets 404 (not 403) for an existing chat", async () => {
  await assert.rejects(
    () => ChatService.getChatById(chatDoc._id, "64b64c2f9f1b2c3d4e5f6999", "customer", null),
    (e) => e.statusCode === 404
  );
});

test("FA-58: non-admin viewers do not receive the customer email via getChatById", async () => {
  const chat = await ChatService.getChatById(chatDoc._id, chatDoc.customer, "customer", null);
  assert.equal(chat.customer?.email, undefined, "email withheld from non-admin viewers");
});

// FA-33: guest session id transport
test("FA-33: guest session id from query is off by default; header always works", () => {
  const controller = require(path.join(repo, "controllers/chat.controller.js"));
  const get = controller._getGuestSessionId;
  assert.equal(typeof get, "function");
  const reqQ = { body: {}, query: { guestSessionId: "guest_" + "a".repeat(64) }, headers: {}, cookies: {} };
  const reqH = { body: {}, query: {}, headers: { "x-guest-session-id": "guest_" + "b".repeat(64) }, cookies: {} };
  delete process.env.GUEST_SESSION_ALLOW_QUERY;
  assert.equal(get(reqQ), undefined, "query transport refused by default (owner-approved)");
  assert.equal(get(reqH), "guest_" + "b".repeat(64), "header transport unaffected");
  process.env.GUEST_SESSION_ALLOW_QUERY = "1";
  try {
    assert.equal(get(reqQ), "guest_" + "a".repeat(64), "flag restores the legacy query transport");
  } finally { delete process.env.GUEST_SESSION_ALLOW_QUERY; }
});

// FA-39: startChat schema no longer accepts client-forged network metadata
test("FA-39: startChatSchema does not accept ipAddress/userAgent/referrer from the client", () => {
  const { startChatSchema } = require(path.join(repo, "validators/chat.validator.js"));
  const { error, value } = startChatSchema.validate({ subject: "Hi", metadata: { ipAddress: "1.2.3.4", userAgent: "Forged/1.0", referrer: "https://evil.example" } });
  assert.ok(error || !value.metadata?.ipAddress, "forged metadata rejected or stripped");
  if (!error) {
    assert.equal(value.metadata?.userAgent, undefined);
    assert.equal(value.metadata?.referrer, undefined);
  }
});
