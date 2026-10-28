// AR-07 + S-9 — socket room convention.
// AR-07: NotificationEventEmitter.broadcastToUser emitted order
// notifications to room `user:<id>` — a room NO socket ever joins
// (the gateway joins the BARE userId; notificationService emits to the
// bare id) — and badge:update carried a hardcoded unreadCount of 1.
// These tests run a REAL NotificationGateway on a real http server and
// connect a real Socket.IO client (raw Engine.IO/Socket.IO protocol
// over the `ws` package, a transitive dependency of socket.io) whose
// handshake is authenticated with a real JWT through the real
// authToken.verify; only the database models are stubbed.
// S-9: chat.controller.updateMessageAttachments required the nonexistent
// ../services/socketService inside a try/catch, so the
// message:attachments:updated broadcast never fired. The fix emits via
// the notification gateway (services/runtimeContext.js registry, AR-33)
// like every other chat broadcast.
process.env.JWT_SECRET = "<redacted>";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const WebSocket = require("ws");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("./helpers");

const USER_ID = "64b64c2f4f5a6b7c8d9e0f99";
const userDoc = { _id: USER_ID, role: "customer" };

stubModule("models/user.model", {
  findOne: () => makeQuery(userDoc),
});
stubModule("models/revokedToken.model", { exists: async () => null });
stubModule("services/chatService", {
  resolveGuestSession: async () => null,
  authorizeChat: async () => true,
});
let unreadCountValue = 7;
stubModule("services/notificationService", {
  getUnreadCount: async () => unreadCountValue,
  createNotification: async (doc) => ({ _id: "n1", ...doc }),
  notifyAdmins: async () => [],
});

const NotificationGateway = require("../../services/notificationGateway");
const runtimeContext = require("../../services/runtimeContext"); // AR-33: registry replaces global.io
const emitter = require("../../services/notificationEventEmitter");

function mintToken() {
  return jwt.sign({ id: USER_ID }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "aura-interiors",
    audience: "aura-interiors-api",
    expiresIn: "5m",
  });
}

async function connectSocketClient(port) {
  // Direct WebSocket transport (no polling upgrade): the server sends
  // the Engine.IO open packet ("0{...}"), we answer with the Socket.IO
  // namespace connect packet carrying the auth token ("40{...}"), and
  // the server confirms with its own "40{...}" once the handshake
  // middleware accepts. Event packets arrive as "42[...]".
  const ws = new WebSocket(
    `ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`,
  );
  const events = [];
  const raw = [];
  let connected = false;
  let connectError = null;
  ws.on("message", (data) => {
    const msg = data.toString();
    raw.push(msg.slice(0, 120));
    if (msg.startsWith("40")) {
      connected = true;
      return;
    }
    if (msg.startsWith("44")) {
      connectError = msg;
      return;
    }
    if (msg.startsWith("42")) {
      try {
        events.push(JSON.parse(msg.slice(2)));
      } catch {
        /* ignore */
      }
    }
  });
  try {
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    ws.send(`40${JSON.stringify({ token: mintToken() })}`);
    await until(() => connected || connectError, 5000);
    if (!connected)
      throw new Error(
        `socket connect rejected: ${connectError}; raw: ${JSON.stringify(raw)}`,
      );
  } catch (err) {
    ws.terminate();
    throw err;
  }
  return { ws, events };
}

test(
  "AR-07: order notification reaches the user's socket via the joined (bare id) room, with the REAL unread count",
  { timeout: 30000 },
  async () => {
    const server = http.createServer();
    const gateway = new NotificationGateway(server);
    // AR-33: the constructor no longer publishes global.io - register the
    // gateway explicitly so the emitter's broadcasts reach this server.
    runtimeContext.setNotificationGateway(gateway);
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const port = server.address().port;
    const { ws, events } = await connectSocketClient(port);
    try {
      // The gateway's connection handler joins the socket to room USER_ID
      // (bare). Give the join a beat to complete, then broadcast.
      await new Promise((r) => setTimeout(r, 200));
      await emitter.broadcastToUser(USER_ID, {
        _id: "n1",
        type: "order_created",
        title: "Order Confirmed",
      });
      await until(() => events.some((e) => e[0] === "badge:update"), 5000);
      const notif = events.find((e) => e[0] === "notification:new");
      assert.ok(
        notif,
        `notification:new must reach the socket; got ${JSON.stringify(events)}`,
      );
      assert.equal(notif[1].title, "Order Confirmed");
      const badge = events.find((e) => e[0] === "badge:update");
      assert.equal(
        badge[1].unreadCount,
        7,
        "badge must carry the real unread count from notificationService.getUnreadCount, not a hardcoded 1",
      );
    } finally {
      ws.terminate();
      // io.close() also closes the attached HTTP server.
      await Promise.race([
        gateway.close().catch(() => {}),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      server.closeAllConnections?.();
      runtimeContext.reset();
    }
  },
);

test(
  "S-9: updateMessageAttachments emits message:attachments:updated via the real gateway path (no dead socketService require)",
  { timeout: 30000 },
  async () => {
    const chatId = "64b64c2f4f5a6b7c8d9e0f01";
    const messageId = "64b64c2f4f5a6b7c8d9e0f02";
    const messageDoc = {
      _id: messageId,
      chat: { _id: chatId },
      deletedAt: null,
    };
    const updatedDoc = {
      _id: messageId,
      chat: chatId,
      attachments: [
        { fileUrl: "https://cdn.example.com/a.png", fileType: "image" },
      ],
    };
    stubModule("models/chatMessage.model", {
      findOne: () => makeQuery(messageDoc),
      findOneAndUpdate: () => makeQuery(updatedDoc),
    });
    const emitted = [];
    // AR-33: the controller reads the gateway from the runtimeContext
    // registry, not global.notificationGateway.
    runtimeContext.setNotificationGateway({
      io: {
        to: (room) => ({
          emit: (event, payload) => emitted.push({ room, event, payload }),
        }),
      },
    });
    const errors = [];
    const origError = console.error;
    console.error = (...args) => {
      errors.push(args.join(" "));
    };
    try {
      const ctrl = require("../../controllers/chat.controller");
      const res = mockRes();
      const next = mockNext();
      const req = {
        params: { messageId },
        body: {
          attachments: [
            {
              fileUrl: "https://cdn.example.com/a.png",
              fileType: "image",
              fileName: "a.png",
              fileSize: 12345,
            },
          ],
        },
        user: { _id: USER_ID, role: "customer" },
        headers: {},
      };
      ctrl.updateMessageAttachments(req, res, next);
      await until(() => res.body !== undefined || next.error !== undefined);
      assert.equal(
        next.error,
        undefined,
        `unexpected error: ${next.error && next.error.message}`,
      );
      assert.equal(res.statusCode, 200);
      const hit = emitted.find(
        (e) => e.event === "message:attachments:updated",
      );
      assert.ok(
        hit,
        `attachments broadcast must fire via the gateway; emitted: ${JSON.stringify(emitted)}`,
      );
      assert.equal(hit.room, `chat:${chatId}`);
      assert.ok(
        !errors.some((e) => /Failed to broadcast socket update/.test(e)),
        `dead-require error must be gone; console.error saw: ${JSON.stringify(errors)}`,
      );
    } finally {
      console.error = origError;
      runtimeContext.reset();
    }
  },
);
