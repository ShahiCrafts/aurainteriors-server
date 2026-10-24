// Phase 0 boot matrix (AR-43 safety net / AR-06 + AR-14 characterization).
//
// What each case pins down TODAY (2026-10-24, HEAD after AR-43 wiring):
//  (a) minimal env — the smallest env that boots: PORT, NODE_ENV,
//      GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (DB stubbed). JWT_SECRET and
//      ESEWA_* are NOT needed at boot (per-call / lazy reads).
//  (b) no Google vars — AR-14 (fixed Phase 1): the Google strategy is
//      constructed only when BOTH GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
//      are set; without them the server boots and logs one clear line that
//      Google login is disabled. (Before the fix, boot crashed with
//      "OAuth2Strategy requires a clientID option".)
//  (c) no LLM keys — boot succeeds; chatV2 config loads with zero
//      providers (turns then degrade inside the pipeline; they do not
//      take the server down).
//  (d) no Qdrant / dead Qdrant — boot succeeds (the retrieval client is
//      constructed without connecting; RAG failures are per-turn).
//  (e) Mongo topology (AR-06, fixed Phase 3) — a transaction, which
//      every checkout runs, fails on a standalone mongod and succeeds
//      on a replica set; the server now REFUSES to boot against a
//      standalone (boot-time topology check in config/topology.js:
//      non-zero exit, one fatal line naming the replica-set
//      requirement, /health never answers) and boots normally against
//      the replica set. See AUDIT_ARCH_TRACKER.md (AR-06 design note).
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const repo = path.join(__dirname, "..", "..");
const stubPreload = path.join(repo, "tests", "fresh", "fixtures", "stub-db-preload.js");

const GOOGLE = { GOOGLE_CLIENT_ID: "dummy", GOOGLE_CLIENT_SECRET: "dummy" };

function baseEnv(extra) {
  return { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "development", ...extra };
}

function boot(extraEnv, { stub = true } = {}) {
  const args = stub ? ["-r", stubPreload, "server.js"] : ["server.js"];
  const child = spawn("node", args, { cwd: repo, env: baseEnv(extraEnv), stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  return { child, output: () => out };
}

async function waitForHealth(port, timeoutMs = 25000) {
  const start = Date.now();
  for (;;) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.status === 200) return;
    } catch { /* not up yet */ }
    if (Date.now() - start > timeoutMs) throw new Error(`server on ${port} did not come up`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function waitForExit(child, timeoutMs = 25000) {
  const start = Date.now();
  while (child.exitCode === null) {
    if (Date.now() - start > timeoutMs) throw new Error("child did not exit");
    await new Promise((r) => setTimeout(r, 200));
  }
  return child.exitCode;
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 600));
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    // Wait for the exit to actually land: a lingering child's stdio
    // pipes keep this process's event loop (and the test file) alive.
    await Promise.race([
      new Promise((r) => child.once("exit", r)),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    child.stdout?.destroy();
    child.stderr?.destroy();
  }
}

test("(a) minimal env boots and serves /health (DB stubbed)", { timeout: 60000 }, async () => {
  const port = 39401;
  const { child } = boot({ PORT: String(port), ...GOOGLE });
  try {
    await waitForHealth(port);
  } finally {
    await stop(child);
  }
});

test("(b) AR-14: no Google vars boots fine and logs that Google login is disabled", { timeout: 60000 }, async () => {
  const port = 39402;
  const { child, output } = boot({ PORT: String(port) });
  try {
    await waitForHealth(port);
    assert.match(output(), /Google OAuth disabled/);
  } finally {
    await stop(child);
  }
});

test("(b2) AR-14: with Google vars set, no disabled-line is logged (strategy registered)", { timeout: 60000 }, async () => {
  const port = 39412;
  const { child, output } = boot({ PORT: String(port), ...GOOGLE });
  try {
    await waitForHealth(port);
    assert.doesNotMatch(output(), /Google OAuth disabled/);
  } finally {
    await stop(child);
  }
});

test("(c) no LLM keys: boot succeeds and chatV2 config loads with zero providers", { timeout: 60000 }, async () => {
  const port = 39403;
  const { child } = boot({ PORT: String(port), ...GOOGLE });
  try {
    await waitForHealth(port);
  } finally {
    await stop(child);
  }
  // Config-level check in a clean child: loadChatConfig(env) with no keys
  // must not throw and must yield an empty provider list (degraded turns).
  const probe = spawn("node", ["-e",
    "const { loadChatConfig } = require('./services/chatV2/config/chatConfig');" +
    "const c = loadChatConfig({});" +
    "console.log('providers:' + c.providers.length);",
  ], { cwd: repo, env: baseEnv({}), stdio: ["ignore", "pipe", "pipe"] });
  let probeOut = "";
  probe.stdout.on("data", (d) => { probeOut += d; });
  const probeCode = await waitForExit(probe);
  assert.equal(probeCode, 0);
  assert.match(probeOut, /providers:0/);
});

test("(d) no Qdrant and dead Qdrant: boot succeeds either way", { timeout: 90000 }, async () => {
  const portA = 39404;
  const a = boot({ PORT: String(portA), ...GOOGLE });
  try {
    await waitForHealth(portA);
  } finally {
    await stop(a.child);
  }
  const portB = 39405;
  const b = boot({ PORT: String(portB), ...GOOGLE, QDRANT_URL: "http://127.0.0.1:9" });
  try {
    await waitForHealth(portB);
  } finally {
    await stop(b.child);
  }
});

test("(e) AR-06 topology: server refuses to boot on standalone mongod, boots on a replica set; transactions fail on standalone and succeed on a replica set", { timeout: 240000 }, async () => {
  // The whole topology probe runs in a child process (fixtures/
  // topology-probe.js): mongodb-memory-server + mongoose handles in
  // THIS process kept the test file alive after its assertions passed.
  const probePath = path.join(repo, "tests", "platform", "fixtures", "topology-probe.js");
  const probe = spawn("node", [probePath], { cwd: repo, env: baseEnv({}), stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  probe.stdout.on("data", (d) => { out += d; });
  probe.stderr.on("data", (d) => { out += d; });
  const code = await Promise.race([
    waitForExit(probe, 200000),
    (async () => { await new Promise((r) => setTimeout(r, 210000)); probe.kill("SIGKILL"); throw new Error("topology probe timed out"); })(),
  ]);
  assert.equal(code, 0, `topology probe failed:\n${out}`);
  // The invariant is that a checkout-shaped transaction cannot commit
  // on a standalone. Which of the two errors surfaces first is
  // driver-path dependent - both were observed across runs:
  // "Transaction numbers are only allowed on a replica set member or
  // mongos" (server error) and "This MongoDB deployment does not
  // support retryable writes" (driver refusal).
  assert.match(out, /STANDALONE_TXN_ERROR: .*(Transaction numbers are only allowed on a replica set member or mongos|does not support retryable writes)/);
  assert.match(out, /SERVER_REFUSES_STANDALONE/);
  assert.match(out, /STANDALONE_EXIT_CODE: [1-9]/);
  assert.doesNotMatch(out, /SERVER_BOOTS_ON_STANDALONE/);
  assert.match(out, /REPLSET_TXN_OK/);
  assert.match(out, /SERVER_BOOTS_ON_REPLSET/);
});
