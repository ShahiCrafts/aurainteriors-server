// AR-16 — getChatStats must not $lookup the entire chatmessages
// collection per chat. The response-time average is computed by an
// aggregation OVER chatmessages (first admin message per chat via an
// index-supported $match/$sort/$group) joined back to the (small) chats
// side for createdAt/status filtering. These stubbed tests pin the
// pipeline shape and the returned-object shape; the real-mongod probe
// (tests/platform/chat-stats-integration.test.js) proves the new and old
// pipelines agree on a fixture dataset and that the new plan examines
// far fewer documents than the total message count.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

let chatAggregateCalls = [];
let messageAggregateCalls = [];
let countsByStatus = {
  ai_handling: 3,
  escalated: 2,
  agent_handling: 4,
  resolved: 5,
  closed: 6,
};
// Total = sum of the five status counts plus any other deletedAt:null docs.
const TOTAL = 20;

stubModule("models/chat.model", {
  countDocuments: async (filter) => {
    if (!filter.status) return TOTAL;
    return countsByStatus[filter.status] || 0;
  },
  // The OLD implementation aggregated over Chat with a $lookup into
  // chatmessages. If it is called at all for the response-time average,
  // return a sentinel average (999 ms -> 0 minutes) so the test can tell
  // which pipeline produced the result.
  aggregate: async (pipeline) => {
    chatAggregateCalls.push(pipeline);
    return [{ avgResponseTime: 999 }];
  },
});
stubModule("models/chatMessage.model", {
  aggregate: async (pipeline) => {
    messageAggregateCalls.push(pipeline);
    return [{ avgResponseTime: 3600000 }]; // exactly 60 minutes
  },
});
stubModule("models/guestSession.model", {});
stubModule("models/user.model", {});
stubModule("services/notificationEventEmitter", {});

const service = require("../../services/chatService");

test("AR-16: getChatStats derives avgResponseTimeMinutes from a chatmessages aggregation, not a chats $lookup", async () => {
  chatAggregateCalls = [];
  messageAggregateCalls = [];
  const stats = await service.getChatStats();
  assert.equal(
    stats.avgResponseTimeMinutes,
    60,
    "average must come from the chatmessages aggregation (3600000 ms)",
  );
  assert.equal(
    messageAggregateCalls.length,
    1,
    "exactly one aggregation over chatmessages",
  );
  assert.equal(
    chatAggregateCalls.length,
    0,
    "Chat.aggregate (the $lookup pipeline) must no longer run",
  );
});

test("AR-16: the chatmessages pipeline is index-shaped: $match admin first, $sort by chat/createdAt, $group $first, small $lookup on chats", async () => {
  if (messageAggregateCalls.length === 0) await service.getChatStats();
  const pipeline = messageAggregateCalls[messageAggregateCalls.length - 1];
  const serialized = JSON.stringify(pipeline);
  assert.ok(
    !serialized.includes('"chatmessages"'),
    "pipeline must not $lookup the chatmessages collection",
  );
  assert.deepEqual(
    pipeline[0],
    { $match: { senderRole: "admin" } },
    "first stage filters to admin messages",
  );
  const sortStage = pipeline.find((s) => s.$sort);
  assert.deepEqual(
    sortStage,
    { $sort: { chat: 1, createdAt: 1 } },
    "sort supports first-per-chat grouping",
  );
  const groupStage = pipeline.find((s) => s.$group && s.$group.firstAdminAt);
  assert.ok(
    groupStage,
    "pipeline groups per chat taking the first (earliest) admin message",
  );
  assert.deepEqual(groupStage.$group.firstAdminAt, { $first: "$createdAt" });
  const lookupStage = pipeline.find((s) => s.$lookup);
  assert.ok(lookupStage, "pipeline joins chat createdAt via a $lookup");
  assert.equal(
    lookupStage.$lookup.from,
    "chats",
    "the only $lookup is against the small chats collection",
  );
});

test("AR-16: returned object shape and counts are unchanged", async () => {
  const stats = await service.getChatStats();
  assert.deepEqual(Object.keys(stats).sort(), [
    "activeChats",
    "agentHandlingChats",
    "aiHandlingChats",
    "avgResponseTimeMinutes",
    "closedChats",
    "resolvedChats",
    "totalChats",
    "waitingChats",
  ]);
  assert.equal(stats.totalChats, TOTAL);
  assert.equal(stats.waitingChats, 2, "waitingChats mirrors escalatedChats");
  assert.equal(
    stats.activeChats,
    3 + 4,
    "activeChats = aiHandling + agentHandling",
  );
  assert.equal(stats.aiHandlingChats, 3);
  assert.equal(stats.agentHandlingChats, 4);
  assert.equal(stats.resolvedChats, 5);
  assert.equal(stats.closedChats, 6);
});
