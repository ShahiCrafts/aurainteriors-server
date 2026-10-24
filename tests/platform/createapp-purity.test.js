// AR-33: createApp() purity.
//
// Importing app.js (or calling createApp()) must NOT start timers,
// listeners, or connections, and must NOT run env validation (no
// throws, no process.exit). This is the AR-33 verification criterion:
// the bootstrap owns all lifecycle, assembly is inert.
//
// Each test file runs in its own process under node --test, so the
// lazy require() inside the test body is the first load of app.js in
// this process and the before/after handle snapshots are meaningful.
const test = require("node:test");
const assert = require("node:assert/strict");

// Handle kinds that indicate *started work*. stdio pipes and the
// test runner's own plumbing exist in every process and are ignored;
// we compare before/after snapshots instead of absolute counts.
const WORK_HANDLE_KINDS = new Set([
  "Timeout",
  "Immediate",
  "Socket",
  "Server",
  "ChildProcess",
  "MessagePort",
]);

function workHandles() {
  const counts = {};
  for (const h of process._getActiveHandles()) {
    const name = h && h.constructor ? h.constructor.name : "unknown";
    if (WORK_HANDLE_KINDS.has(name)) counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

function assertNoNewHandles(before, after, what) {
  assert.deepEqual(
    after,
    before,
    `${what} must not open handles; ` +
      `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
}

test("AR-33: requiring app.js starts no timers/listeners", () => {
  const before = workHandles();
  require("../../app.js");
  assertNoNewHandles(before, workHandles(), "importing app.js");
});

test("AR-33: createApp() assembles without starting timers/listeners", () => {
  const { createApp } = require("../../app.js");
  const before = workHandles();
  const app = createApp();
  assertNoNewHandles(before, workHandles(), "createApp()");
  assert.equal(typeof app.handle, "function", "createApp() must return an express app");
  assert.equal(typeof app.listen, "function", "createApp() must return an express app");
});

test("AR-33: createApp() wires the platform routes", () => {
  const { createApp } = require("../../app.js");
  const app = createApp();
  const routes = [];
  // Express 5 keeps the stack on app.router (lazy); poke a request
  // through the router to force its construction, then read it.
  app.router.stack.forEach((layer) => {
    if (layer.route) routes.push(`${Object.keys(layer.route.methods).join(",")}:${layer.route.path}`);
  });
  for (const p of ["/", "/health", "/health/ready"]) {
    assert.ok(routes.includes(`get:${p}`), `expected route GET ${p}; got ${JSON.stringify(routes)}`);
  }
});
