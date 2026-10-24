// AR-02 (D2) probe — the Phase 3 proof: TWO real server.js processes
// against ONE replica-set MongoDB (MMS, disk-backed dbPath under
// ~/workspace/aura-audit/mms-data), booted with RATE_LIMIT_STORE=mongo
// + SOCKET_ADAPTER=mongo. Asserts, across the two processes:
//   (a) both log the MongoDB adapter-attached line;
//   (b) the product read limit is SHARED: with RATE_LIMIT_READ_MAX=6,
//       alternating GETs across A and B yield exactly 6x200 then a
//       429 on the 7th combined request (per-process stores would
//       allow 12);
//   (c) a chat:typing event sent on A is received by a socket client
//       connected to B (room emits cross the adapter via change
//       streams — the reason AR-06's replica-set requirement exists);
//   (d) the already-due scheduled promotion is sent EXACTLY ONCE for
//       the fleet: notifications == seeded recipient count (not 2x),
//       and the "scheduled-content" SchedulerLease names one of the
//       two child PIDs;
//   (e) both children shut down gracefully on SIGTERM (AR-45 bounds).
// Fail-tolerant: every section prints a RESULT line even when its
// behavior is absent (the parent tree ignores both env flags), so the
// same probe produces the fail-before evidence.
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const REPO = path.resolve(__dirname, "../../..");
const DB_NAME = "aura_two_instance";
const PORT_A = 39711;
const PORT_B = 39712;
const JWT_SECRET = "<redacted>";
const ADAPTER_LINE = "Socket.IO MongoDB adapter attached";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(port, timeoutMs = 60000) {
  const start = Date.now();
  for (;;) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.status === 200) return true;
    } catch { /* not up yet */ }
    if (Date.now() - start > timeoutMs) return false;
    await sleep(300);
  }
}

function spawnServer(port, mongoUri) {
  const child = spawn("node", ["server.js"], {
    cwd: REPO,
    env: {
      PATH: process.env.PATH, HOME: process.env.HOME,
      NODE_ENV: "development",
      PORT: String(port),
      MONGO_URI: mongoUri,
      MONGO_DB_NAME: DB_NAME,
      GOOGLE_CLIENT_ID: "dummy", GOOGLE_CLIENT_SECRET: "dummy",
      JWT_SECRET,
      FRONTEND_URL: "http://localhost:5173",
      RATE_LIMIT_STORE: "mongo",
      SOCKET_ADAPTER: "mongo",
      RATE_LIMIT_READ_MAX: "6",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  return { child, pid: child.pid, output: () => out };
}

async function stopChild(child, sigkillAfterMs = 5000) {
  if (child.exitCode !== null) return;
  try { child.kill("SIGKILL"); } catch { /* gone */ }
  await Promise.race([
    new Promise((r) => child.once("exit", r)),
    sleep(sigkillAfterMs),
  ]);
  try { child.stdout?.destroy(); child.stderr?.destroy(); } catch { /* ignore */ }
}

// Minimal raw Engine.IO/Socket.IO client (the pattern from
// tests/platform/socket-revalidate-interval.test.js).
async function connectClient(port, token) {
  const WebSocket = require(path.join(REPO, "node_modules/ws"));
  const ws = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
  const client = { ws, events: [], closed: false };
  ws.on("message", (data) => {
    const msg = data.toString();
    if (msg.startsWith("42")) {
      try { client.events.push(JSON.parse(msg.slice(2))); } catch { /* ignore */ }
    }
  });
  ws.on("close", () => { client.closed = true; });
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  let connected = false;
  ws.on("message", (data) => { if (data.toString().startsWith("40")) connected = true; });
  ws.send(`40${JSON.stringify({ token })}`);
  const start = Date.now();
  while (!connected && Date.now() - start < 8000) await sleep(50);
  if (!connected) throw new Error(`socket client on ${port} never connected`);
  client.send = (event, payload) => ws.send(`42${JSON.stringify(payload === undefined ? [event] : [event, payload])}`);
  return client;
}

async function main() {
  const { MongoMemoryReplSet } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "two-instance-"));
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ dbPath }],
  });
  const uri = replSet.getUri(DB_NAME);
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri, { dbName: DB_NAME });
  let srvA = null; let srvB = null;
  try {
    // Wait for a writable primary.
    let primaryReady = false;
    for (let i = 0; i < 60 && !primaryReady; i++) {
      try {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        primaryReady = hello.isWritablePrimary === true;
      } catch { /* not ready */ }
      if (!primaryReady) await sleep(500);
    }
    if (!primaryReady) throw new Error("replica set never became primary");

    // --- Seed (raw driver: no model hooks needed for JWT/socket use)
    const db = mongoose.connection.db;
    const oid = () => new mongoose.Types.ObjectId();
    const now = new Date();
    const users = [0, 1, 2].map((i) => ({
      _id: oid(),
      email: `two-instance-${i}@example.com`,
      firstName: "Two", lastName: `Instance${i}`,
      role: "customer", isActive: true, deletedAt: null,
      preferences: { promotionalEmails: true, preferredCategories: [] },
      createdAt: now, updatedAt: now,
    }));
    await db.collection("users").insertMany(users);
    const chatId = oid();
    await db.collection("chats").insertOne({
      _id: chatId, customer: users[0]._id, status: "ai_handling",
      deletedAt: null, lastMessageAt: now, createdAt: now, updatedAt: now,
    });
    const promoId = oid();
    await db.collection("promotions").insertOne({
      _id: promoId,
      title: "Two-instance probe promotion",
      description: "Seeded already-due scheduled promotion",
      targetAudience: { type: "all", categories: [], userIds: [] },
      status: "scheduled",
      scheduledAt: new Date(Date.now() - 60000),
      sentAt: null, createdBy: users[0]._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      metrics: { targetCount: 0, sentCount: 0, deliveredCount: 0, readCount: 0, clickCount: 0, failedCount: 0 },
      createdAt: now, updatedAt: now,
    });
    console.log(`RESULT seed users=${users.length} chat=${chatId.toString()} promo=${promoId.toString()}`);

    // --- Boot two real servers
    srvA = spawnServer(PORT_A, uri);
    srvB = spawnServer(PORT_B, uri);
    const upA = await waitForHealth(PORT_A);
    const upB = await waitForHealth(PORT_B);
    console.log(`RESULT boot a=${upA} b=${upB} pidA=${srvA.pid} pidB=${srvB.pid}`);
    if (!upA || !upB) {
      console.log(`RESULT adapter a=false b=false bootFailed=true`);
      console.log("RESULT ratelimit ok200=0 first429At=none bootFailed=true");
      console.log("RESULT socket received=false bootFailed=true");
      console.log("RESULT promotion sent=false notifications=0 leaseHolder=false bootFailed=true");
      console.log("RESULT shutdown skipped=boot-failed");
      return;
    }

    // (a) adapter attached on both (attach is async at gateway
    // construction; allow a grace window after /health answers).
    {
      const start = Date.now();
      let aHas = false; let bHas = false;
      while (Date.now() - start < 25000) {
        aHas = srvA.output().includes(ADAPTER_LINE);
        bHas = srvB.output().includes(ADAPTER_LINE);
        if (aHas && bHas) break;
        await sleep(300);
      }
      console.log(`RESULT adapter a=${aHas} b=${bHas}`);
    }

    // (b) shared rate limit: alternate A/B, exactly 6x200 then 429.
    {
      const statuses = [];
      for (let i = 0; i < 14; i++) {
        const port = i % 2 === 0 ? PORT_A : PORT_B;
        try {
          const r = await fetch(`http://127.0.0.1:${port}/api/v1/products`);
          statuses.push(r.status);
          await r.text().catch(() => {});
        } catch { statuses.push(0); }
      }
      const ok200 = statuses.filter((s) => s === 200).length;
      const first429 = statuses.indexOf(429);
      console.log(`RESULT ratelimit ok200=${ok200} first429At=${first429 === -1 ? "none" : first429 + 1} statuses=${statuses.join(",")}`);
    }

    // (c) cross-instance socket: typing on A received on B.
    {
      let received = false; let chatMatch = false; let errMsg = "";
      try {
        const jwt = require(path.join(REPO, "node_modules/jsonwebtoken"));
        const token = jwt.sign({ id: users[0]._id.toString() }, JWT_SECRET, {
          algorithm: "HS256", issuer: "aura-interiors", audience: "aura-interiors-api", expiresIn: "10m",
        });
        const clientA = await connectClient(PORT_A, token);
        const clientB = await connectClient(PORT_B, token);
        try {
          await sleep(250);
          clientA.send("chat:join", { chatId: chatId.toString() });
          clientB.send("chat:join", { chatId: chatId.toString() });
          await sleep(2000); // joins authorize asynchronously
          clientA.send("chat:typing", { chatId: chatId.toString(), isTyping: true });
          const start = Date.now();
          while (Date.now() - start < 10000) {
            const hit = clientB.events.find((e) => e[0] === "chat:typing:status");
            if (hit) {
              received = true;
              chatMatch = hit[1] && hit[1].chatId === chatId.toString();
              break;
            }
            await sleep(100);
          }
        } finally {
          try { clientA.ws.terminate(); } catch { /* ignore */ }
          try { clientB.ws.terminate(); } catch { /* ignore */ }
        }
      } catch (err) { errMsg = String(err && err.message || err).slice(0, 120); }
      console.log(`RESULT socket received=${received} chatMatch=${chatMatch}${errMsg ? ` error=${errMsg.replace(/\s+/g, "_")}` : ""}`);
    }

    // (d) leased scheduled job exactly once.
    {
      let sent = false;
      const start = Date.now();
      while (Date.now() - start < 60000) {
        const promo = await db.collection("promotions").findOne({ _id: promoId });
        if (promo && promo.status === "sent") { sent = true; break; }
        await sleep(1000);
      }
      await sleep(3000); // stability window: a duplicate run would land here
      const notifCount = await db.collection("notifications").countDocuments({ "data.promotionId": promoId });
      const lease = await db.collection("schedulerleases").findOne({ _id: "scheduled-content" });
      const holder = lease ? String(lease.holderId) : "";
      const holderOk = holder.includes(`:${srvA.pid}:`) || holder.includes(`:${srvB.pid}:`);
      const promoAfter = await db.collection("promotions").findOne({ _id: promoId });
      console.log(`RESULT promotion sent=${sent && promoAfter.status === "sent"} notifications=${notifCount} expected=${users.length} leaseExists=${!!lease} leaseHolder=${holderOk}`);
    }

    // (e) graceful shutdown within AR-45 bounds.
    {
      const t0 = Date.now();
      srvA.child.kill("SIGTERM");
      srvB.child.kill("SIGTERM");
      const waitExit = (child, timeoutMs) => new Promise((resolve) => {
        if (child.exitCode !== null) return resolve(child.exitCode);
        const timer = setTimeout(() => resolve("timeout"), timeoutMs);
        child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
      });
      const codeA = await waitExit(srvA.child, 25000);
      const codeB = await waitExit(srvB.child, 25000);
      console.log(`RESULT shutdown aCode=${codeA} bCode=${codeB} elapsedMs=${Date.now() - t0}`);
    }
  } finally {
    if (srvA) await stopChild(srvA.child);
    if (srvB) await stopChild(srvB.child);
    await mongoose.disconnect().catch(() => {});
    await replSet.stop().catch(() => {});
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error("PROBE_ERROR", err); process.exit(1); });
