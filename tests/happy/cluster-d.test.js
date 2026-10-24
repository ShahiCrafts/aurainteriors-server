// Happy-path (success-path) controller tests — Cluster D:
// controllers/chat.controller.js and controllers/notification.controller.js.
//
// Technique (see tests/audit/helpers.js): stubModule() pre-populates
// require.cache BEFORE the controllers are required, so every model /
// service beneath them is a fake — no DB, no network. Chat handlers are
// wrapped in catchAsync (which does not return its promise), so their
// completion is polled with until(); notification handlers are plain
// async functions and are awaited directly.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery, mockRes, mockNext, until } = require("../audit/helpers");

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const USER_ID = "64b64c2f4f5a6b7c8d9e0f01";
const CHAT_ID = "64b64c2f4f5a6b7c8d9e0f02";
const MESSAGE_ID = "64b64c2f4f5a6b7c8d9e0f03";
const NOTIF_ID_1 = "64b64c2f4f5a6b7c8d9e0f04";
const NOTIF_ID_2 = "64b64c2f4f5a6b7c8d9e0f05";

const chatFixture = { _id: CHAT_ID, status: "open", subject: "Order help" };
const messageFixture = { _id: MESSAGE_ID, chat: CHAT_ID, content: "Hello" };
const paginationFixture = { page: 1, limit: 20, total: 1, totalPages: 1 };

const validAttachment = {
  fileName: "photo.png",
  fileUrl: "https://res.cloudinary.com/aura/photo.png",
  fileType: "image/png",
  fileSize: 2048,
};

// ---------------------------------------------------------------------------
// Stubs — chat cluster
// ---------------------------------------------------------------------------
stubModule("services/chatService.js", {
  createChat: async () => chatFixture,
  createGuestChat: async () => chatFixture,
  resolveGuestSession: async () => ({ _id: "guest-session-1", sessionId: "guest_abc" }),
  getCustomerChats: async () => ({ chats: [chatFixture], pagination: paginationFixture }),
  getChatById: async () => chatFixture,
  getChatMessages: async () => ({ messages: [messageFixture], pagination: paginationFixture }),
  sendMessage: async () => messageFixture,
  markMessagesAsRead: async () => ({ modifiedCount: 4 }),
  closeChat: async () => ({ ...chatFixture, status: "closed" }),
  getAllChats: async () => ({ chats: [chatFixture], pagination: paginationFixture }),
  getWaitingQueue: async () => [chatFixture],
  resolveChat: async () => ({ ...chatFixture, status: "resolved" }),
  getChatStats: async () => ({ totalChats: 10, openChats: 3, resolvedChats: 7 }),
  toggleBot: async () => ({ ...chatFixture, botActive: true }),
  authorizeChat: async () => true,
});

stubModule("models/guestSession.model", {
  create: async (doc) => ({ _id: "guest-session-1", ...doc }),
  updateOne: async () => ({ matchedCount: 1, modifiedCount: 1 }),
});

stubModule("services/chatUpload.service", {
  uploadAttachment: async () => ({
    expiresAt: new Date("2026-10-25T00:00:00.000Z"),
    attachment: validAttachment,
  }),
  retainAttachments: async () => {},
  actorKey: (userId, guestSessionId) => `actor:${userId || guestSessionId || "anon"}`,
});

const chatMessageDoc = { _id: MESSAGE_ID, chat: { _id: CHAT_ID }, attachments: [] };
const updatedMessageDoc = { _id: MESSAGE_ID, chat: CHAT_ID, attachments: [validAttachment] };
stubModule("models/chatMessage.model", {
  findOne: () => makeQuery(chatMessageDoc),
  findOneAndUpdate: () => makeQuery(updatedMessageDoc),
});

// NOTE: there is no services/socketService module in this repo —
// updateMessageAttachments requires it inside a try/catch and tolerates its
// absence, so no stub is (or can be) registered for it.

// ---------------------------------------------------------------------------
// Stubs — notification cluster
// ---------------------------------------------------------------------------
const preferencesFixture = {
  newsletter: true,
  smsNotifications: false,
  orderUpdates: true,
  promotionalEmails: false,
  preferredCategories: ["living-room"],
};
const userFixture = { _id: USER_ID, preferences: preferencesFixture };

stubModule("services/notificationService", {
  getUserNotifications: async () => ({
    notifications: [{ _id: NOTIF_ID_1, title: "Order shipped", isRead: false }],
    total: 1,
    page: 1,
    limit: 20,
  }),
  getUnreadCount: async () => 5,
  markAsRead: async (id) => ({ _id: id, isRead: true }),
});

stubModule("services/pushTokenService", {
  getUserDevices: async () => [{ deviceId: "device-1", platform: "android", deviceName: "Pixel" }],
  unregisterDevice: async (userId, deviceId) => ({ deviceId, removed: true }),
  registerPushToken: async (doc) => ({ _id: "token-1", ...doc }),
});

stubModule("models/user.model", {
  findById: () => makeQuery(userFixture),
  findByIdAndUpdate: () => makeQuery(userFixture),
});

stubModule("models/notification.model", {
  findById: async () => ({ _id: NOTIF_ID_1, recipient: USER_ID }),
  updateMany: async () => ({ matchedCount: 2, modifiedCount: 2 }),
  deleteOne: async () => ({ acknowledged: true, deletedCount: 1 }),
  deleteMany: async () => ({ acknowledged: true, deletedCount: 2 }),
});

// Controllers under test — required only after every stub is in place.
const chatCtrl = require("../../controllers/chat.controller");
const notifCtrl = require("../../controllers/notification.controller");

// ---------------------------------------------------------------------------
// Request factories
// ---------------------------------------------------------------------------
function baseReq(overrides = {}) {
  return {
    user: { _id: USER_ID, role: "customer" },
    params: {},
    body: {},
    query: {},
    headers: {},
    cookies: {},
    ip: "127.0.0.1",
    get: () => "",
    ...overrides,
  };
}

const adminReq = (overrides = {}) =>
  baseReq({ user: { _id: USER_ID, role: "admin" }, ...overrides });

// Invoke a catchAsync-wrapped chat handler and wait for it to settle.
async function invokeChat(handler, req) {
  const res = mockRes();
  const next = mockNext();
  handler(req, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  return { res, next };
}

function assertSuccess(res, next, statusCode) {
  assert.equal(next.error, undefined, `handler must not error, got: ${next.error && next.error.message}`);
  assert.equal(res.statusCode, statusCode);
  assert.equal(res.body.status, "success");
}

// ===========================================================================
// controllers/chat.controller.js
// ===========================================================================

test("GET /chats/signature/upload — getUploadSignature returns the retired-endpoint 410", () => {
  const res = mockRes();
  const next = mockNext();
  chatCtrl.getUploadSignature(baseReq(), res, next);
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 410);
  assert.equal(res.body.status, "fail");
  assert.equal(res.body.message, "Use the chat attachment upload endpoint");
});

test("POST /chats/:id/attachments — uploadAttachment returns 201 with the uploaded attachment", async () => {
  const req = baseReq({
    params: { id: CHAT_ID },
    attachmentActor: "actor:u1",
    file: { originalname: "photo.png", mimetype: "image/png", size: 2048, buffer: Buffer.from("x") },
  });
  const { res, next } = await invokeChat(chatCtrl.uploadAttachment, req);
  assertSuccess(res, next, 201);
  assert.deepEqual(res.body.data.attachment, validAttachment);
});

test("GET /chats/my — getMyChats returns 200 with chats and pagination", async () => {
  const req = baseReq({ query: { page: "1", limit: "20" } });
  const { res, next } = await invokeChat(chatCtrl.getMyChats, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.chats, [chatFixture]);
  assert.deepEqual(res.body.data.pagination, paginationFixture);
});

test("GET /chats/:id — getChatDetails returns 200 with the chat", async () => {
  const req = baseReq({ params: { id: CHAT_ID } });
  const { res, next } = await invokeChat(chatCtrl.getChatDetails, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.chat, chatFixture);
});

test("POST /chats/:id/messages — sendMessage returns 202 with the accepted message", async () => {
  const req = baseReq({
    params: { id: CHAT_ID },
    body: { content: "Hello, I need help with my order", clientMessageId: "cm-1" },
  });
  const { res, next } = await invokeChat(chatCtrl.sendMessage, req);
  assertSuccess(res, next, 202);
  assert.equal(res.body.message, "Message accepted");
  assert.deepEqual(res.body.data.message, messageFixture);
});

test("PATCH /chats/:id/read — markMessagesRead returns 200 with modifiedCount", async () => {
  const req = baseReq({ params: { id: CHAT_ID } });
  const { res, next } = await invokeChat(chatCtrl.markMessagesRead, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Messages marked as read");
  assert.equal(res.body.data.modifiedCount, 4);
});

test("PATCH /chats/:id/close — closeChat returns 200 with the closed chat", async () => {
  const req = baseReq({ params: { id: CHAT_ID } });
  const { res, next } = await invokeChat(chatCtrl.closeChat, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Chat closed successfully");
  assert.equal(res.body.data.chat.status, "closed");
});

test("PATCH /chats/:id/toggle-bot — toggleBot returns 200 with the chat and enabled message", async () => {
  const req = baseReq({ params: { id: CHAT_ID }, body: { botActive: true } });
  const { res, next } = await invokeChat(chatCtrl.toggleBot, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "AI Bot enabled successfully");
  assert.equal(res.body.data.chat.botActive, true);
});

test("PATCH /chats/:id/messages/:messageId/attachments — updateMessageAttachments returns 200 with the updated message", async () => {
  const req = baseReq({
    params: { id: CHAT_ID, messageId: MESSAGE_ID },
    body: { attachments: [validAttachment] },
  });
  const { res, next } = await invokeChat(chatCtrl.updateMessageAttachments, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Message attachments updated successfully");
  assert.deepEqual(res.body.data.message, updatedMessageDoc);
});

test("GET /chats/admin/stats — getChatStats returns 200 with stats", async () => {
  const { res, next } = await invokeChat(chatCtrl.getChatStats, adminReq());
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.stats, { totalChats: 10, openChats: 3, resolvedChats: 7 });
});

test("GET /chats/admin/all — getAllChats returns 200 with chats and pagination", async () => {
  const req = adminReq({ query: { page: "1", limit: "20" } });
  const { res, next } = await invokeChat(chatCtrl.getAllChats, req);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.chats, [chatFixture]);
  assert.deepEqual(res.body.data.pagination, paginationFixture);
});

test("GET /chats/admin/queue — getWaitingQueue returns 200 with the waiting chats", async () => {
  const { res, next } = await invokeChat(chatCtrl.getWaitingQueue, adminReq());
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.chats, [chatFixture]);
});

test("PATCH /chats/:id/resolve — resolveChat returns 200 with the resolved chat", async () => {
  const req = adminReq({ params: { id: CHAT_ID } });
  const { res, next } = await invokeChat(chatCtrl.resolveChat, req);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Chat resolved successfully");
  assert.equal(res.body.data.chat.status, "resolved");
});

// ===========================================================================
// controllers/notification.controller.js
// ===========================================================================

test("GET /notifications — getUserNotifications returns 200 with the notification list", async () => {
  const res = mockRes();
  const next = mockNext();
  await notifCtrl.getUserNotifications(baseReq({ query: { page: 1, limit: 20 } }), res, next);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.total, 1);
  assert.equal(res.body.data.notifications.length, 1);
  assert.equal(res.body.data.notifications[0]._id, NOTIF_ID_1);
});

test("GET /notifications/unread-count — getUnreadCount returns 200 with unreadCount", async () => {
  const res = mockRes();
  const next = mockNext();
  await notifCtrl.getUnreadCount(baseReq(), res, next);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.unreadCount, 5);
});

test("GET /notifications/preferences — getPreferences returns 200 with the user's preferences", async () => {
  const res = mockRes();
  const next = mockNext();
  await notifCtrl.getPreferences(baseReq(), res, next);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.preferences, preferencesFixture);
});

test("POST /notifications/mark-multiple-read — markMultipleAsRead returns 200 with modifiedCount", async () => {
  const res = mockRes();
  const next = mockNext();
  const req = baseReq({ body: { notificationIds: [NOTIF_ID_1, NOTIF_ID_2] } });
  await notifCtrl.markMultipleAsRead(req, res, next);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Selected notifications marked as read");
  assert.equal(res.body.modifiedCount, 2);
});

test("PUT /notifications/:id/archive — archiveNotification returns 200 with the deleted message", async () => {
  const res = mockRes();
  const next = mockNext();
  await notifCtrl.archiveNotification(baseReq({ params: { id: NOTIF_ID_1 } }), res, next);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Notification deleted");
});

test("POST /notifications/archive-multiple — archiveMultiple returns 200 with deletedCount", async () => {
  const res = mockRes();
  const next = mockNext();
  const req = baseReq({ body: { notificationIds: [NOTIF_ID_1, NOTIF_ID_2] } });
  await notifCtrl.archiveMultiple(req, res, next);
  assertSuccess(res, next, 200);
  assert.equal(res.body.message, "Notifications deleted");
  assert.equal(res.body.deletedCount, 2);
});

test("GET /notifications/push-tokens/devices — getUserDevices returns 200 with the device list", async () => {
  const res = mockRes();
  const next = mockNext();
  await notifCtrl.getUserDevices(baseReq(), res, next);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.devices.length, 1);
  assert.equal(res.body.data.devices[0].deviceId, "device-1");
});

test("DELETE /notifications/push-tokens/:deviceId — unregisterDevice returns 200 with the removed device", async () => {
  const res = mockRes();
  const next = mockNext();
  await notifCtrl.unregisterDevice(baseReq({ params: { deviceId: "device-1" } }), res, next);
  assertSuccess(res, next, 200);
  assert.equal(res.body.data.device.deviceId, "device-1");
  assert.equal(res.body.data.device.removed, true);
});

test("PUT /notifications/preferences — updatePreferences returns 200 with the updated preferences", async () => {
  const res = mockRes();
  const next = mockNext();
  const req = baseReq({ body: { newsletter: true, orderUpdates: true } });
  await notifCtrl.updatePreferences(req, res, next);
  assertSuccess(res, next, 200);
  assert.deepEqual(res.body.data.preferences, preferencesFixture);
});
