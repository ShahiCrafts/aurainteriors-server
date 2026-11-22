// Batch 3c — ChatService.updatePriority (admin Support Chat redesign).
//
// The admin thread header's priority dropdown PATCHes
// /chats/:id/priority; the service method behind it follows the
// resolveChat pattern (404 on a missing/deleted chat, atomic
// findByIdAndUpdate, socket broadcast when a gateway is registered).
// Technique (see tests/audit/helpers.js): stubModule() pre-populates
// require.cache BEFORE the service is required, so the Chat model is a
// fake — no DB, no network.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery } = require("../audit/helpers");

const CHAT_ID = "64b64c2f4f5a6b7c8d9e0f02";
const ADMIN_ID = "64b64c2f4f5a6b7c8d9e0f01";

const calls = { findOne: [], findByIdAndUpdate: [] };
let findOneResult = { _id: CHAT_ID };
let emitRecord = null;

const fakeChatModel = {
  findOne: (query) => {
    calls.findOne.push(query);
    return makeQuery(findOneResult);
  },
  findByIdAndUpdate: (id, update, options) => {
    calls.findByIdAndUpdate.push({ id, update, options });
    return makeQuery({ _id: id, priority: update.$set.priority });
  },
};

stubModule("models/chat.model.js", fakeChatModel);
stubModule("models/chatMessage.model.js", {});
stubModule("models/guestSession.model.js", {});
stubModule("models/user.model.js", {});
stubModule("services/notificationEventEmitter.js", {
  emit: () => {},
  on: () => {},
});
stubModule("services/runtimeContext.js", {
  getNotificationGateway: () => ({
    io: {
      to: (room) => ({
        emit: (event, payload) => {
          emitRecord = { room, event, payload };
        },
      }),
    },
  }),
});

const ChatService = require("../../services/chatService");

test.beforeEach(() => {
  calls.findOne.length = 0;
  calls.findByIdAndUpdate.length = 0;
  findOneResult = { _id: CHAT_ID };
  emitRecord = null;
});

test("updatePriority persists the new priority and returns the updated chat", async () => {
  const updated = await ChatService.updatePriority(CHAT_ID, "high", ADMIN_ID);

  assert.equal(updated._id, CHAT_ID);
  assert.equal(updated.priority, "high");
  assert.deepEqual(calls.findOne, [{ _id: CHAT_ID, deletedAt: null }]);
  assert.equal(calls.findByIdAndUpdate.length, 1);
  assert.deepEqual(calls.findByIdAndUpdate[0].update, {
    $set: { priority: "high" },
  });
  assert.deepEqual(calls.findByIdAndUpdate[0].options, {
    returnDocument: "after",
  });
});

test("updatePriority broadcasts chat:priority-updated to the chat room", async () => {
  await ChatService.updatePriority(CHAT_ID, "low", ADMIN_ID);

  assert.ok(emitRecord, "expected a socket broadcast");
  assert.equal(emitRecord.room, `chat:${CHAT_ID}`);
  assert.equal(emitRecord.event, "chat:priority-updated");
  assert.equal(emitRecord.payload.chatId, CHAT_ID);
  assert.equal(emitRecord.payload.priority, "low");
  assert.equal(emitRecord.payload.updatedBy, ADMIN_ID);
});

test("updatePriority accepts every enum value", async () => {
  for (const priority of ["low", "normal", "high", "urgent"]) {
    const updated = await ChatService.updatePriority(CHAT_ID, priority, ADMIN_ID);
    assert.equal(updated.priority, priority);
  }
});

test("updatePriority throws 404 for a missing chat and does not update", async () => {
  findOneResult = null;

  await assert.rejects(
    () => ChatService.updatePriority(CHAT_ID, "high", ADMIN_ID),
    (err) => err.statusCode === 404 && /not found/i.test(err.message),
  );
  assert.equal(calls.findByIdAndUpdate.length, 0);
});

test("updatePriority rejects a non-enum priority with 400 before touching the DB", async () => {
  await assert.rejects(
    () => ChatService.updatePriority(CHAT_ID, "medium", ADMIN_ID),
    (err) => err.statusCode === 400,
  );
  assert.equal(calls.findOne.length, 0);
  assert.equal(calls.findByIdAndUpdate.length, 0);
});
