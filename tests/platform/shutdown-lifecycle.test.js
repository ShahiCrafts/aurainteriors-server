// AR-45 — process lifecycle: shutdown re-entrancy guard + drain
// reporting. Child-process boots of the real server.js on the stub-DB
// preload (same pattern as boot-matrix.test.js):
//  1. SIGTERM -> one graceful pass, exit 0 (characterization).
//  2. SIGTERM + SIGINT in quick succession -> the second signal must
//     be IGNORED by a re-entrancy guard (previously both ran the
//     whole teardown concurrently).
//  3. A request still in flight when the drain cap expires must be
//     REPORTED (structured shutdown_drain_timeout record with counts)
//     instead of the process exiting silently at the cap (previously
//     the 10 s race just moved on). The cap is shortened via
//     SHUTDOWN_DRAIN_TIMEOUT_MS so the test runs in ~1 s post-fix.
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const repo = path.join(__dirname, "..", "..");
const stubPreload = path.join(repo, "tests", "fresh", "fixtures", "stub-db-preload.js");

function boot(port, extraEnv = {}) {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: "development",
    PORT: String(port),
    GOOGLE_CLIENT_ID: "dummy",
    GOOGLE_CLIENT_SECRET: "dummy",
    ...extraEnv,
  };
  const child = spawn("node", ["-r", stubPreload, "server.js"], { cwd: repo, env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  return { child, output: () => out };
}

async function waitForHealth(port, timeoutMs = 30000) {
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

async function waitForExit(child, timeoutMs = 30000, output) {
  const start = Date.now();
  while (child.exitCode === null) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`child did not exit; output tail: ${output ? output().slice(-800) : "n/a"}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return child.exitCode;
}

async function cleanup(child) {
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([
      new Promise((r) => child.once("exit", r)),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
}

test("AR-45 characterization: SIGTERM produces one graceful shutdown and exit 0", { timeout: 90000 }, async () => {
  const { child, output } = boot(39711);
  try {
    await waitForHealth(39711);
    child.kill("SIGTERM");
    const code = await waitForExit(child);
    assert.equal(code, 0);
    const passes = output().split("Shutting down gracefully").length - 1;
    assert.equal(passes, 1, `expected exactly one shutdown pass; output tail: ${output().slice(-400)}`);
  } finally {
    await cleanup(child);
  }
});

test("AR-45: a second signal during shutdown is ignored by the re-entrancy guard", { timeout: 90000 }, async () => {
  // The shutdown must still be IN PROGRESS when the second signal
  // arrives, deterministically: a hung in-flight request holds the
  // drain phase open for the (shortened) 3 s cap, so the SIGINT at
  // +400 ms always lands mid-shutdown. (With nothing in flight the
  // teardown can finish in <250 ms and the second signal would
  // legitimately find no process to signal.)
  const { child, output } = boot(39712, { SHUTDOWN_DRAIN_TIMEOUT_MS: "3000" });
  let socket;
  try {
    await waitForHealth(39712);
    socket = net.connect(39712, "127.0.0.1");
    await new Promise((r) => socket.once("connect", r));
    socket.write("POST /api/v1/auth/login HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{");
    await new Promise((r) => setTimeout(r, 400));
    child.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 400));
    child.kill("SIGINT");
    const code = await waitForExit(child, 30000, output);
    assert.equal(code, 0);
    const passes = output().split("Shutting down gracefully").length - 1;
    assert.equal(passes, 1, `the teardown must run exactly once; saw ${passes} passes`);
    assert.match(output(), /already in progress/i, "the ignored second trigger must be logged");
  } finally {
    socket?.destroy();
    await cleanup(child);
  }
});

test("AR-45: an in-flight request truncated by the drain cap is reported, not silent", { timeout: 90000 }, async () => {
  const { child, output } = boot(39713, { SHUTDOWN_DRAIN_TIMEOUT_MS: "700" });
  let socket;
  try {
    await waitForHealth(39713);
    // A request whose body never finishes: the server has accepted it
    // (in-flight) and cannot drain it.
    socket = net.connect(39713, "127.0.0.1");
    await new Promise((r) => socket.once("connect", r));
    socket.write("POST /api/v1/auth/login HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{");
    await new Promise((r) => setTimeout(r, 400));
    child.kill("SIGTERM");
    const code = await waitForExit(child, 30000, output);
    assert.equal(code, 0);
    assert.match(output(), /shutdown_drain_timeout/, `the drain timeout must be reported as a structured record; output tail: ${output().slice(-600)}`);
    assert.match(output(), /"inFlightRequests":\s*[1-9]/, "the report must count the truncated in-flight request(s)");
  } finally {
    socket?.destroy();
    await cleanup(child);
  }
});
