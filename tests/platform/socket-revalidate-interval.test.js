// AR-15 (D-G) — socket identity revalidation interval.
// Today socket.use runs refreshIdentity (JWT verify + User/GuestSession
// DB hit) before EVERY packet. Behind SOCKET_REVALIDATE_INTERVAL_MS
// (default 0/unset = current per-packet behavior), non-privileged
// packets revalidate at most once per interval per socket; privileged
// events ALWAYS revalidate; a revocation that lands mid-interval cuts
// the socket AT the next revalidation.
// Real NotificationGateway + raw Engine.IO/Socket.IO protocol client
// (the AR-07 pattern in tests/audit/socket-room-convention.test.js);
// only the database models / ChatService are stubbed, and the stubbed
// User lookup is mutable so a test can revoke the user mid-connection.
process.env.JWT_SECRET = "<redacted>";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const WebSocket = require("ws");
const { stubModule, makeQuery, until } = require("../audit/helpers");

const USER_ID = "64b64c2f4f5a6b7c8d9e0f99";
const CHAT_ID = "64b64c2f4f5a6b7c8d9e0f01";
let userRow = { _id: USER_ID, role: "customer" };
let userLookups = 0;
stubModule("models/user.model", {
  findOne: () => { userLookups++; return makeQuery(userRow); },
});
stubModule("models/revokedToken.model", { exists: async () => null });
let authorizeCalls = 0;
let markReadCalls = 0;
stubModule("services/chatService", {
  resolveGuestSession: async () => null,
  authorizeChat: async () => { authorizeCalls++; return true; },
  markMessagesAsRead: async () => { markReadCalls++; },
});

const NotificationGateway = require("../../services/notificationGateway");

function mintToken() {
  return jwt.sign({ id: USER_ID }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "aura-interiors",
    audience: "aura-interiors-api",
    expiresIn: "5m",
  });
}

async function startGateway() {
  const server = http.createServer();
  const gateway = new NotificationGateway(server);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, gateway, port: server.address().port };
}

async function stopGateway({ server, gateway }) {
  await Promise.race([gateway.close().catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
  server.closeAllConnections?.();
}

async function connectClient(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
  const client = { ws, events: [], closed: false, errorPacket: null };
  ws.on("message", (data) => {
    const msg = data.toString();
    if (msg.startsWith("42")) {
      try { client.events.push(JSON.parse(msg.slice(2))); } catch { /* ignore */ }
    }
    if (msg.startsWith("44")) client.errorPacket = msg;
  });
  ws.on("close", () => { client.closed = true; });
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  let connected = false;
  ws.on("message", (data) => { if (data.toString().startsWith("40")) connected = true; });
  ws.send(`40${JSON.stringify({ token: mintToken() })}`);
  await until(() => connected, 5000);
  client.send = (event, payload) => ws.send(`42${JSON.stringify(payload === undefined ? [event] : [event, payload])}`);
  client.acks = () => client.events.filter((e) => e[0] === "heartbeat:ack").length;
  return client;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("AR-15 flag OFF (default): a packet after revocation is rejected immediately (per-packet revalidation unchanged)", { timeout: 30000 }, async () => {
  delete process.env.SOCKET_REVALIDATE_INTERVAL_MS;
  userRow = { _id: USER_ID, role: "customer" };
  const ctx = await startGateway();
  const client = await connectClient(ctx.port);
  try {
    await sleep(150); // let the connection handler settle
    client.send("heartbeat");
    await until(() => client.acks() === 1, 5000);
    // Revoke/deactivate the user in the "DB".
    userRow = null;
    client.send("heartbeat");
    await until(() => client.closed || client.errorPacket, 5000);
    assert.ok(client.closed || client.errorPacket, "the post-revocation packet must cut the socket immediately");
    assert.equal(client.acks(), 1, "no second heartbeat:ack may be emitted after revocation");
  } finally {
    client.ws.terminate();
    await stopGateway(ctx);
    userRow = { _id: USER_ID, role: "customer" };
  }
});

test("AR-15 flag ON (60s): non-privileged packets are handled inside the window after revocation, but a PRIVILEGED packet revalidates immediately and cuts the socket", { timeout: 30000 }, async () => {
  process.env.SOCKET_REVALIDATE_INTERVAL_MS = "60000";
  userRow = { _id: USER_ID, role: "customer" };
  authorizeCalls = 0; markReadCalls = 0;
  const ctx = await startGateway();
  const client = await connectClient(ctx.port);
  try {
    await sleep(150);
    const lookupsAfterConnect = userLookups;
    // Revoke AFTER connect: inside the window this is not yet visible
    // to non-privileged handling — the documented D-G trade-off.
    userRow = null;
    client.send("chat:read", { chatId: CHAT_ID });
    await until(() => markReadCalls === 1, 5000);
    assert.equal(client.closed, false, "socket must survive inside the revalidation window");
    assert.equal(userLookups, lookupsAfterConnect, "no identity DB hit may happen for a non-privileged packet inside the window");
    const authorizeCallsAfterRead = authorizeCalls; // chat:read authorizes per event, by design
    // Privileged: chat:join grants room access — always revalidates.
    client.send("chat:join", { chatId: CHAT_ID });
    await until(() => client.closed || client.errorPacket, 5000);
    assert.ok(userLookups > lookupsAfterConnect, "the privileged packet must trigger an immediate identity revalidation");
    assert.equal(authorizeCalls, authorizeCallsAfterRead, "chat:join must never reach authorization once revalidation fails");
  } finally {
    client.ws.terminate();
    await stopGateway(ctx);
    delete process.env.SOCKET_REVALIDATE_INTERVAL_MS;
    userRow = { _id: USER_ID, role: "customer" };
  }
});

test("AR-15 flag ON (50ms): once the interval lapses, the next non-privileged packet revalidates and a revoked socket is cut", { timeout: 30000 }, async () => {
  process.env.SOCKET_REVALIDATE_INTERVAL_MS = "50";
  userRow = { _id: USER_ID, role: "customer" };
  const ctx = await startGateway();
  const client = await connectClient(ctx.port);
  try {
    await sleep(150); // the handshake's revalidation stamp is now stale (>50ms)
    client.send("heartbeat"); // forces a fresh successful revalidation, resetting the window
    await until(() => client.acks() === 1, 5000);
    userRow = null; // revoked mid-interval
    client.send("heartbeat");
    await until(() => client.acks() === 2, 5000); // inside the fresh window: handled without revalidating
    assert.equal(client.closed, false);
    await sleep(150); // let the 50ms interval lapse
    client.send("heartbeat");
    await until(() => client.closed || client.errorPacket, 5000);
    assert.equal(client.acks(), 2, "the post-lapse packet must be revalidated and rejected, not acked");
  } finally {
    client.ws.terminate();
    await stopGateway(ctx);
    delete process.env.SOCKET_REVALIDATE_INTERVAL_MS;
    userRow = { _id: USER_ID, role: "customer" };
  }
});
