// AR-38 — chatV2 bot replies skipped sendMessage's bookkeeping.
// The legacy pipeline sent bot replies THROUGH sendMessage (so
// lastMessageAt / lastReadAdminAt / markAsRead / chat:messages:read
// all happened); the v2 job created the bot message directly and only
// emitted chat:message:new + ai:complete. Consequences: chat lists
// (sorted by lastMessageAt) ranked a chat by the CUSTOMER's message
// instead of the newer bot reply, and the customer's messages were
// never marked read by the bot reply. The fix runs both paths through
// one shared bookkeeping helper. These tests pin the customer-path
// behavior (characterization) and require the v2 bot path to perform
// the same bookkeeping.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery } = require("./helpers");

const CHAT_ID = "64b64c2f4f5a6b7c8d9e0f77";
let updateOneCalls = [];
let markAsReadCalls = [];
let createdMessages = [];
let capturedJob = null;
let socketEvents = [];

const chatDoc = { _id: CHAT_ID, customer: "cust1", guestSession: null, status: "ai_handling", metadata: { botActive: true } };
const latestDoc = { _id: CHAT_ID, status: "ai_handling", metadata: {}, customer: "cust1" };

stubModule("models/chat.model", {
  findOne: () => makeQuery(chatDoc),
  findById: () => makeQuery(latestDoc),
  exists: async () => true,
  updateOne: async (filter, update) => { updateOneCalls.push({ filter, update }); return { matchedCount: 1 }; },
});
stubModule("models/chatMessage.model", {
  create: async (data) => {
    createdMessages.push(data);
    const doc = {
      _id: `msg${createdMessages.length}`,
      ...data,
      toObject: () => ({ _id: `msg${createdMessages.length}`, chat: data.chat, senderRole: data.senderRole, content: data.content, isAiGenerated: !!data.isAiGenerated }),
      populate: async () => doc,
    };
    return doc;
  },
  markAsRead: async (chatId, role) => { markAsReadCalls.push([String(chatId), role]); return {}; },
  findOne: () => makeQuery(null),
});
stubModule("models/guestSession.model", {});
stubModule("models/user.model", { findOne: () => makeQuery(null), findById: () => makeQuery(null) });
stubModule("services/notificationEventEmitter", { notifyOrderStatusChange: async () => {}, notifyNewOrder: async () => {} });
stubModule("services/chatV2", {
  queue: {
    resume: () => {},
    cancel: () => {},
    enqueue: (roomId, fn) => { capturedJob = fn; return Promise.resolve(); },
  },
  pipeline: { run: async () => ({ text: "Bot reply text", productOptions: [], degraded: false }) },
});
stubModule("services/retrievalService", { retrieveContext: async () => [] });

const runtimeContext = require("../../services/runtimeContext"); // AR-33: registry replaces global.notificationGateway
const service = require("../../services/chatService");
service.authorizeChat = async () => true;

function installGateway() {
  socketEvents = [];
  runtimeContext.setNotificationGateway({
    io: { to: (room) => ({ emit: (event, payload) => socketEvents.push({ room, event, payload }) }) },
  });
}

async function customerTurnThenRunBotJob() {
  installGateway();
  updateOneCalls = []; markAsReadCalls = []; createdMessages = []; capturedJob = null;
  const sent = await service.sendMessage(CHAT_ID, "cust1", "customer", { content: "Hello, need help" });
  assert.ok(sent, "customer send must return the message");
  assert.ok(capturedJob, "the v2 turn job must have been enqueued");
  // Reset the recorders so only the BOT job's effects are measured.
  updateOneCalls = []; markAsReadCalls = []; socketEvents = [];
  await capturedJob();
}

test("AR-38 characterization: a customer message updates lastMessageAt + lastReadCustomerAt and broadcasts chat:message:new", async () => {
  installGateway();
  updateOneCalls = []; markAsReadCalls = []; createdMessages = []; capturedJob = null;
  await service.sendMessage(CHAT_ID, "cust1", "customer", { content: "Hello, need help" });
  const call = updateOneCalls.find((c) => c.update.$set && c.update.$set.lastMessageAt);
  assert.ok(call, "customer bookkeeping must set lastMessageAt");
  assert.ok(call.update.$set.lastReadCustomerAt instanceof Date, "customer bookkeeping must set lastReadCustomerAt");
  assert.ok(socketEvents.some((e) => e.event === "chat:message:new" && e.payload.message.content === "Hello, need help"), "customer message must be broadcast");
});

test("AR-38: the v2 bot reply performs the same bookkeeping as sendMessage (lastMessageAt, lastReadAdminAt, markAsRead, messages:read)", async () => {
  await customerTurnThenRunBotJob();
  const botMsg = createdMessages.find((m) => m.senderRole === "bot");
  assert.ok(botMsg, "the job must create the bot message");
  const call = updateOneCalls.find((c) => c.update.$set && c.update.$set.lastMessageAt);
  assert.ok(call, `bot reply must bump lastMessageAt (chat-list ordering); updateOne calls: ${JSON.stringify(updateOneCalls.map((c) => Object.keys(c.update.$set || {})))}`);
  assert.ok(call.update.$set.lastReadAdminAt instanceof Date, "bot reply must set lastReadAdminAt (the bot has read up to now)");
  assert.deepEqual(markAsReadCalls, [[CHAT_ID, "admin"]], "bot reply must mark the customer's messages read, as the legacy/sendMessage bot path does");
  assert.ok(socketEvents.some((e) => e.event === "chat:messages:read" && e.payload.chatId === CHAT_ID), "bot reply must broadcast chat:messages:read like sendMessage does");
  assert.ok(socketEvents.some((e) => e.event === "chat:message:new" && e.payload.message && e.payload.message.content === "Bot reply text"), "bot message broadcast (pre-existing behavior) must still fire");
});
