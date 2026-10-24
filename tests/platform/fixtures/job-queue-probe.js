// Phase 3 step 1+2 probe — Mongo job queue + scheduler leases against
// a real mongodb-memory-server mongod (disk-backed dbPath under
// ~/workspace/aura-audit/mms-data - this VM's /tmp is a 512 MB tmpfs).
// Runs as a CHILD process (established pattern) so MMS/mongoose
// handles never live in the test runner.
//
// Scenarios:
//   (a) exactly-once claim: 40 jobs, 8 racing claimers -> 40 claims,
//       40 unique job ids.
//   (b) idempotent enqueue: same idempotencyKey twice -> one row.
//   (c) visibility reclaim: crashed worker's job becomes claimable
//       after the visibility timeout; the stale worker can no longer
//       complete it; the new worker can.
//   (d) dead-letter via fail(): attempts exhaust -> status "dead".
//   (e) dead-letter via crash-reclaim: a job at maxAttempts is
//       dead-lettered at claim time instead of being handed out again.
//   (f) backoff: after fail(), runAt is in the future.
//   (g) worker loop end-to-end: handler runs, job completes; a
//       failing handler retries and then dead-letters.
//   (h) lease race: 8 concurrent withLease calls on one name ->
//       exactly one execution; a held lease blocks; an expired lease
//       can be taken.
// Prints RESULT lines; exits non-zero on any infrastructure error.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  process.env.JOB_BACKOFF_BASE_MS = "100"; // keep the probe fast
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "job-queue-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const uri = mongod.getUri("aura_job_queue_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);

  const queue = require(path.join(REPO, "services/jobQueue.service"));
  const leases = require(path.join(REPO, "services/schedulerLease.service"));
  const Job = require(path.join(REPO, "models/job.model"));

  // (a) exactly-once claim
  const enqueued = [];
  for (let i = 0; i < 40; i++) enqueued.push(await queue.enqueue("probe-a", { i }));
  const claims = [];
  await Promise.all(Array.from({ length: 8 }, async (_, w) => {
    for (;;) {
      const job = await queue.claimNext(`claimer-${w}`, { types: ["probe-a"], visibilityMs: 30000 });
      if (!job) break;
      claims.push(String(job._id));
    }
  }));
  const uniqueClaims = new Set(claims).size;
  console.log(`RESULT claim total=${claims.length} unique=${uniqueClaims} enqueued=${enqueued.length}`);

  // (b) idempotent enqueue
  const first = await queue.enqueue("probe-b", { x: 1 }, { idempotencyKey: "probe-b-key" });
  const second = await queue.enqueue("probe-b", { x: 1 }, { idempotencyKey: "probe-b-key" });
  const bCount = await Job.countDocuments({ type: "probe-b" });
  console.log(`RESULT idem sameId=${String(first._id) === String(second._id)} rows=${bCount}`);

  // (c) visibility reclaim
  const cJob = await queue.enqueue("probe-c", { x: 1 });
  await queue.claimNext("worker-dead", { types: ["probe-c"], visibilityMs: 700 });
  await sleep(1100); // no heartbeat: the claim goes stale
  const cSecond = await queue.claimNext("worker-live", { types: ["probe-c"], visibilityMs: 700 });
  const staleComplete = await queue.complete(cJob._id, "worker-dead");
  const liveComplete = cSecond ? await queue.complete(cJob._id, "worker-live") : false;
  console.log(
    `RESULT reclaim reclaimed=${!!cSecond} attempts=${cSecond ? cSecond.attempts : -1}` +
    ` staleComplete=${staleComplete} liveComplete=${liveComplete}`
  );

  // (d) dead-letter via fail()
  const dJob = await queue.enqueue("probe-d", { x: 1 }, { maxAttempts: 2 });
  await queue.claimNext("w1", { types: ["probe-d"], visibilityMs: 30000 });
  await queue.fail(dJob._id, "w1", new Error("boom-1"));
  let dRow = await Job.findById(dJob._id).lean();
  const afterFirstFail = dRow.status;
  await Job.updateOne({ _id: dJob._id }, { $set: { runAt: new Date(Date.now() - 1000) } });
  await queue.claimNext("w1", { types: ["probe-d"], visibilityMs: 30000 });
  await queue.fail(dJob._id, "w1", new Error("boom-2"));
  dRow = await Job.findById(dJob._id).lean();
  console.log(`RESULT deadfail afterFirst=${afterFirstFail} final=${dRow.status} lastError=${dRow.lastError} attempts=${dRow.attempts}`);

  // (e) dead-letter via crash-reclaim at maxAttempts
  const eJob = await queue.enqueue("probe-e", { x: 1 }, { maxAttempts: 1 });
  await queue.claimNext("w-crash", { types: ["probe-e"], visibilityMs: 500 });
  await sleep(900);
  const eSecond = await queue.claimNext("w-next", { types: ["probe-e"], visibilityMs: 500 });
  const eRow = await Job.findById(eJob._id).lean();
  console.log(`RESULT deadreclaim handedOut=${!!eSecond} status=${eRow.status}`);

  // (f) backoff: runAt lands in the future after fail()
  const fJob = await queue.enqueue("probe-f", { x: 1 }, { maxAttempts: 5 });
  await queue.claimNext("w1", { types: ["probe-f"], visibilityMs: 30000 });
  const before = Date.now();
  await queue.fail(fJob._id, "w1", new Error("boom"));
  const fRow = await Job.findById(fJob._id).lean();
  console.log(`RESULT backoff runAtDeltaMs=${fRow.runAt.getTime() - before} status=${fRow.status}`);

  // (g) worker loop end-to-end
  const handled = [];
  queue.registerHandler("probe-g-ok", async (job) => { handled.push(job.payload.n); });
  queue.registerHandler("probe-g-bad", async () => { throw new Error("always fails"); });
  const gOk = await queue.enqueue("probe-g-ok", { n: 7 });
  const gBad = await queue.enqueue("probe-g-bad", {}, { maxAttempts: 2 });
  queue.startWorker({ pollMs: 100, concurrency: 2, visibilityMs: 30000 });
  const deadline = Date.now() + 30000;
  let gOkRow; let gBadRow;
  for (;;) {
    gOkRow = await Job.findById(gOk._id).lean();
    gBadRow = await Job.findById(gBad._id).lean();
    if (gOkRow.status === "completed" && gBadRow.status === "dead") break;
    if (Date.now() > deadline) break;
    await sleep(200);
  }
  queue.stopWorker();
  console.log(`RESULT worker okStatus=${gOkRow.status} handled=${handled.join(",")} badStatus=${gBadRow.status} badAttempts=${gBadRow.attempts}`);

  // (h) lease race
  let executions = 0;
  const raceResults = await Promise.all(Array.from({ length: 8 }, (_, i) =>
    leases.withLease("probe-lease", 5000, async () => { executions++; await sleep(50); }, { holderId: `holder-${i}` })
  ));
  const winners = raceResults.filter(Boolean).length;
  const blockedWhileHeld = await leases.withLease("probe-lease", 5000, async () => { executions++; }, { holderId: "holder-late" });
  await leases.acquire("probe-lease-short", "holder-x", 400);
  const shortBlocked = await leases.tryAcquire("probe-lease-short", "holder-y", 400);
  await sleep(600);
  const shortAfterExpiry = await leases.tryAcquire("probe-lease-short", "holder-y", 400);
  console.log(
    `RESULT lease winners=${winners} executions=${executions} blockedWhileHeld=${blockedWhileHeld}` +
    ` shortBlocked=${!!shortBlocked} shortAfterExpiry=${!!shortAfterExpiry}`
  );

  await mongoose.disconnect();
  await mongod.stop();
}

main().then(() => process.exit(0)).catch((err) => { console.error("PROBE ERROR:", err); process.exit(1); });
