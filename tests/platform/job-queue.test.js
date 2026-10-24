// Phase 3 step 1+2 — Mongo job queue (atomic claim, visibility
// timeout, attempts/backoff, dead-letter, idempotency, heartbeat via
// claim staleness) and scheduler leases (exactly one holder).
// Child-process probe on a real mongod - see
// fixtures/job-queue-probe.js. Before Phase 3 the queue/lease modules
// did not exist and every scenario failed (module not found).
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "job-queue-probe.js")],
      { timeout: 240000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      }
    );
  });
}

let cached;
async function probe() {
  if (!cached) cached = runProbe();
  return cached;
}
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print a RESULT ${prefix} line; got: ${out}`);
  return l;
};
const field = (l, name) => {
  const m = l.match(new RegExp(`${name}=([^ ]*)`));
  return m ? m[1] : null;
};

test("queue (a): 8 racing claimers claim 40 jobs exactly once", { timeout: 250000 }, async () => {
  const l = await line("claim");
  assert.equal(field(l, "total"), "40");
  assert.equal(field(l, "unique"), "40");
  assert.equal(field(l, "enqueued"), "40");
});

test("queue (b): idempotent enqueue returns the same job, one row", { timeout: 250000 }, async () => {
  const l = await line("idem");
  assert.equal(field(l, "sameId"), "true");
  assert.equal(field(l, "rows"), "1");
});

test("queue (c): crashed worker's job is reclaimed after the visibility timeout; stale worker cannot complete it", { timeout: 250000 }, async () => {
  const l = await line("reclaim");
  assert.equal(field(l, "reclaimed"), "true");
  assert.equal(field(l, "attempts"), "2");
  assert.equal(field(l, "staleComplete"), "false");
  assert.equal(field(l, "liveComplete"), "true");
});

test("queue (d): fail() retries then dead-letters at maxAttempts, error recorded", { timeout: 250000 }, async () => {
  const l = await line("deadfail");
  assert.equal(field(l, "afterFirst"), "pending");
  assert.equal(field(l, "final"), "dead");
  assert.equal(field(l, "lastError"), "boom-2");
  assert.equal(field(l, "attempts"), "2");
});

test("queue (e): a crashed job at maxAttempts is dead-lettered at claim time, not handed out", { timeout: 250000 }, async () => {
  const l = await line("deadreclaim");
  assert.equal(field(l, "handedOut"), "false");
  assert.equal(field(l, "status"), "dead");
});

test("queue (f): fail() schedules the retry in the future (backoff)", { timeout: 250000 }, async () => {
  const l = await line("backoff");
  assert.equal(field(l, "status"), "pending");
  assert.ok(Number(field(l, "runAtDeltaMs")) >= 30, `backoff must push runAt forward; got: ${l}`);
});

test("queue (g): worker loop runs handlers to completion and dead-letters a poison job", { timeout: 250000 }, async () => {
  const l = await line("worker");
  assert.equal(field(l, "okStatus"), "completed");
  assert.equal(field(l, "handled"), "7");
  assert.equal(field(l, "badStatus"), "dead");
  assert.equal(field(l, "badAttempts"), "2");
});

test("leases (h): 8 racing withLease calls execute exactly once; held lease blocks; expired lease frees", { timeout: 250000 }, async () => {
  const l = await line("lease");
  assert.equal(field(l, "winners"), "1");
  assert.equal(field(l, "executions"), "1");
  assert.equal(field(l, "blockedWhileHeld"), "false");
  assert.equal(field(l, "shortBlocked"), "false");
  assert.equal(field(l, "shortAfterExpiry"), "true");
});
