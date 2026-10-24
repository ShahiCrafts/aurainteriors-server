// AR-02 (D2) — the Phase 3 proof: two real server processes, one
// replica-set MongoDB, RATE_LIMIT_STORE=mongo + SOCKET_ADAPTER=mongo.
// Child-process probe: fixtures/two-instance-probe.js (it owns the
// replset, the seeding, both server children, both socket clients,
// and the shutdown). Justification for the heavyweight harness: every
// AR-02 claim is a CROSS-PROCESS claim (shared counters, cross-
// instance room emits, exactly-once leased scheduling) — none of it
// can be evidenced in one process, and per the work order an
// in-process simulation is not an acceptable substitute.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(__dirname, "fixtures", "two-instance-probe.js")],
      { timeout: 390000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err && !stdout) return reject(new Error(`probe died: ${err.message}\n${stderr || ""}`));
        resolve(String(stdout));
      });
  });
}
let cached;
const probe = async () => { if (!cached) cached = runProbe(); return cached; };
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print RESULT ${prefix}; got: ${out}`);
  return l;
};
const field = (l, name) => { const m = l.match(new RegExp(`${name}=([^ ]*)`)); return m ? m[1] : null; };

test("AR-02/D2 both instances boot against the replica set", { timeout: 400000 }, async () => {
  const l = await line("boot");
  assert.equal(field(l, "a"), "true");
  assert.equal(field(l, "b"), "true");
});

test("AR-02/D2 (a) both instances log the MongoDB adapter attached", { timeout: 400000 }, async () => {
  const l = await line("adapter");
  assert.equal(field(l, "a"), "true");
  assert.equal(field(l, "b"), "true");
});

test("AR-02/D2 (b) rate limit is shared: exactly 6x200 across A+B, 7th combined request is 429", { timeout: 400000 }, async () => {
  const l = await line("ratelimit");
  assert.equal(field(l, "ok200"), "6");
  assert.equal(field(l, "first429At"), "7");
});

test("AR-02/D2 (c) chat:typing emitted on A is received by a client connected to B", { timeout: 400000 }, async () => {
  const l = await line("socket");
  assert.equal(field(l, "received"), "true");
  assert.equal(field(l, "chatMatch"), "true");
});

test("AR-02/D2 (d) due scheduled promotion is sent exactly once for the fleet (leased)", { timeout: 400000 }, async () => {
  const l = await line("promotion");
  assert.equal(field(l, "sent"), "true");
  assert.equal(field(l, "notifications"), field(l, "expected"));
  assert.equal(field(l, "leaseExists"), "true");
  assert.equal(field(l, "leaseHolder"), "true");
});

test("AR-02/D2 (e) both instances shut down gracefully on SIGTERM (exit 0, no wedge)", { timeout: 400000 }, async () => {
  const l = await line("shutdown");
  assert.equal(field(l, "aCode"), "0");
  assert.equal(field(l, "bCode"), "0");
});
