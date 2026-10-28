// AR-30 (D-B): the legacy chat pipeline (services/chatOrchestrator.js)
// is removed and chatV2 is the only pipeline. CHAT_PIPELINE=legacy must
// be INERT: a customer message still routes through the chatV2
// queue/pipeline, and loadChatConfig no longer reads CHAT_PIPELINE /
// CHAT_PIPELINE_SHADOW. Harness mirrors
// tests/audit/chat-bot-bookkeeping.test.js: require-cache stubs, with
// the chatV2 module stubbed at the chatService boundary so the enqueued
// turn job is captured. Rollback for the removal is the git tag
// `pre-legacy-chat-removal`.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery } = require("../audit/helpers");

// The legacy switch position, set before anything reads the environment.
process.env.CHAT_PIPELINE = "legacy";
process.env.CHAT_PIPELINE_SHADOW = "true";

const CHAT_ID = "64b64c2f4f5a6b7c8d9e0f88";
let capturedJob = null;
let pipelineRuns = [];
let createdMessages = [];

const chatDoc = {
  _id: CHAT_ID,
  customer: "cust1",
  guestSession: null,
  status: "ai_handling",
  metadata: { botActive: true },
};
const latestDoc = {
  _id: CHAT_ID,
  status: "ai_handling",
  metadata: {},
  customer: "cust1",
};

stubModule("models/chat.model", {
  findOne: () => makeQuery(chatDoc),
  findById: () => makeQuery(latestDoc),
  exists: async () => true,
  updateOne: async () => ({ matchedCount: 1 }),
});
stubModule("models/chatMessage.model", {
  create: async (data) => {
    createdMessages.push(data);
    const doc = {
      _id: `msg${createdMessages.length}`,
      ...data,
      toObject: () => ({
        _id: `msg${createdMessages.length}`,
        chat: data.chat,
        senderRole: data.senderRole,
        content: data.content,
      }),
      populate: async () => doc,
    };
    return doc;
  },
  markAsRead: async () => ({}),
  findOne: () => makeQuery(null),
});
stubModule("models/guestSession.model", {});
stubModule("models/user.model", {
  findOne: () => makeQuery(null),
  findById: () => makeQuery(null),
});
stubModule("services/notificationEventEmitter", {});
stubModule("services/chatV2", {
  queue: {
    resume: () => {},
    cancel: () => {},
    enqueue: (roomId, fn) => {
      capturedJob = fn;
      return Promise.resolve();
    },
  },
  pipeline: {
    run: async (turn) => {
      pipelineRuns.push(turn);
      return { text: "Bot reply", productOptions: [], degraded: false };
    },
  },
});
stubModule("services/retrievalService", {
  retrieveContext: async () => [],
  embeddingTimeoutMs: () => 250,
});

const runtimeContext = require("../../services/runtimeContext"); // AR-33: registry replaces global.notificationGateway
const service = require("../../services/chatService");
service.authorizeChat = async () => true;
runtimeContext.setNotificationGateway({
  io: { to: () => ({ emit: () => {} }) },
});

test("AR-30: CHAT_PIPELINE=legacy is inert — a customer message still routes through the chatV2 queue/pipeline", async () => {
  capturedJob = null;
  pipelineRuns = [];
  createdMessages = [];
  await service.sendMessage(CHAT_ID, "cust1", "customer", {
    content: "Hello, need help",
  });
  assert.ok(
    capturedJob,
    "the v2 turn job must be enqueued even with CHAT_PIPELINE=legacy set",
  );
  await capturedJob();
  assert.equal(pipelineRuns.length, 1, "the v2 pipeline must run the turn");
  assert.ok(
    createdMessages.some((m) => m.senderRole === "bot"),
    "the v2 bot reply must be persisted",
  );
});

test("AR-30: loadChatConfig ignores CHAT_PIPELINE / CHAT_PIPELINE_SHADOW (legacy switch removed)", () => {
  const { loadChatConfig } = require("../../services/chatV2/config/chatConfig");
  const config = loadChatConfig({
    CHAT_PIPELINE: "legacy",
    CHAT_PIPELINE_SHADOW: "true",
  });
  assert.equal(
    config.enabled,
    true,
    "chat is always enabled — there is no legacy pipeline to switch to",
  );
  assert.equal(
    "shadow" in config,
    false,
    "the shadow field is gone (it never had a consumer)",
  );
});
