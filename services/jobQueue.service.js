// Phase 3 step 1 (AR-02 groundwork, decision D-A): a durable job
// queue implemented in-repo on MongoDB - no new services, no Redis.
//
// Semantics:
//   enqueue(type, payload, { idempotencyKey, runAt, maxAttempts,
//   session }) - insert a pending job. With an idempotencyKey, a
//   duplicate enqueue returns the existing job (unique sparse index),
//   so producers can be retried safely, including inside a caller's
//   transaction when a session is passed.
//   claimNext(workerId, { types, visibilityMs }) - ATOMIC claim via
//   findOneAndUpdate: the oldest due pending job, or a processing job
//   whose heartbeat went stale (its worker crashed), is flipped to
//   processing with attempts incremented. Exactly one racing worker
//   wins a given job. A job whose attempts are already exhausted is
//   dead-lettered at claim time instead of being handed out again.
//   heartbeat(jobId, workerId) - the owning worker refreshes
//   heartbeatAt; a job whose heartbeat is older than the visibility
//   timeout becomes claimable by others.
//   complete(jobId, workerId) / fail(jobId, workerId, error) - only
//   the current claim owner may settle a job. fail() re-queues with
//   exponential backoff (equal jitter) until maxAttempts, then the
//   job is dead (status "dead", lastError recorded).
//   startWorker() - in-process poll loop claiming up to a concurrency
//   bound, restricted to types with a registered handler. Workers run
//   in the web process by default; WORKER_MODE=separate moves the
//   loop to `node worker.js` and the web process only enqueues.
//
// Operational knobs (NOT behavior flags - they tune the worker, and
// every default is the design value): JOB_POLL_MS (1000),
// JOB_CONCURRENCY (5), JOB_VISIBILITY_MS (60000),
// JOB_BACKOFF_BASE_MS (5000) / JOB_BACKOFF_CAP_MS (300000).
const crypto = require("crypto");
const os = require("os");
const Job = require("../models/job.model");

const handlers = new Map();

const envInt = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const DEFAULT_WORKER_ID = `${os.hostname()}:${process.pid}:${crypto.randomBytes(4).toString("hex")}`;

function backoffMs(attempts) {
  const base = envInt("JOB_BACKOFF_BASE_MS", 5000);
  const cap = envInt("JOB_BACKOFF_CAP_MS", 300000);
  const exp = Math.min(base * 2 ** Math.max(0, attempts - 1), cap);
  // Equal jitter: half fixed, half random - keeps retries spread
  // without ever collapsing to ~0.
  return Math.floor(exp / 2 + Math.random() * (exp / 2));
}

async function enqueue(type, payload = {}, opts = {}) {
  const doc = {
    type,
    payload,
    maxAttempts: opts.maxAttempts ?? 5,
    runAt: opts.runAt ?? new Date(),
    ...(opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : {}),
  };
  try {
    if (opts.session) {
      const [created] = await Job.create([doc], { session: opts.session });
      return created;
    }
    return await Job.create(doc);
  } catch (error) {
    if (error && error.code === 11000 && opts.idempotencyKey) {
      const existing = await Job.findOne({
        idempotencyKey: opts.idempotencyKey,
      });
      if (existing) return existing;
    }
    throw error;
  }
}

async function claimNext(workerId, { types, visibilityMs } = {}) {
  const visibility = visibilityMs ?? envInt("JOB_VISIBILITY_MS", 60000);
  // Loop: a stale candidate that turns out to be attempt-exhausted is
  // dead-lettered and the scan continues with the next candidate.
  for (;;) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - visibility);
    const filter = {
      $or: [
        { status: "pending", runAt: { $lte: now } },
        { status: "processing", heartbeatAt: { $lte: staleBefore } },
        {
          status: "processing",
          heartbeatAt: null,
          claimedAt: { $lte: staleBefore },
        },
      ],
      ...(types && types.length ? { type: { $in: types } } : {}),
    };
    const job = await Job.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "processing",
          claimedBy: workerId,
          claimedAt: now,
          heartbeatAt: now,
        },
        $inc: { attempts: 1 },
      },
      { new: true, sort: { runAt: 1 } },
    );
    if (!job) return null;
    if (job.attempts > job.maxAttempts) {
      await Job.updateOne(
        { _id: job._id, claimedBy: workerId },
        {
          $set: {
            status: "dead",
            claimedBy: null,
            lastError:
              job.lastError ||
              `Attempts exhausted (${job.maxAttempts}) - last worker never settled the job`,
          },
        },
      );
      continue;
    }
    return job;
  }
}

async function heartbeat(jobId, workerId) {
  const res = await Job.updateOne(
    { _id: jobId, status: "processing", claimedBy: workerId },
    { $set: { heartbeatAt: new Date() } },
  );
  return res.matchedCount === 1;
}

async function complete(jobId, workerId) {
  const res = await Job.updateOne(
    { _id: jobId, status: "processing", claimedBy: workerId },
    { $set: { status: "completed", completedAt: new Date(), claimedBy: null } },
  );
  return res.matchedCount === 1;
}

async function fail(jobId, workerId, error) {
  const job = await Job.findOne({
    _id: jobId,
    status: "processing",
    claimedBy: workerId,
  });
  if (!job) return false;
  const message =
    error && error.message
      ? String(error.message).slice(0, 1000)
      : String(error).slice(0, 1000);
  if (job.attempts >= job.maxAttempts) {
    await Job.updateOne(
      { _id: jobId, claimedBy: workerId },
      { $set: { status: "dead", lastError: message, claimedBy: null } },
    );
    return true;
  }
  await Job.updateOne(
    { _id: jobId, claimedBy: workerId },
    {
      $set: {
        status: "pending",
        lastError: message,
        claimedBy: null,
        runAt: new Date(Date.now() + backoffMs(job.attempts)),
      },
    },
  );
  return true;
}

// Merge progress into a processing job's payload (owned claims only).
// Used by long fan-out handlers so a crash mid-run resumes instead of
// restarting - and re-sending - from zero.
async function updateProgress(jobId, workerId, payloadPatch) {
  const $set = {};
  for (const [key, value] of Object.entries(payloadPatch || {}))
    $set[`payload.${key}`] = value;
  if (!Object.keys($set).length) return false;
  const res = await Job.updateOne(
    { _id: jobId, status: "processing", claimedBy: workerId },
    { $set },
  );
  return res.matchedCount === 1;
}

function registerHandler(type, handler) {
  handlers.set(type, handler);
}

function registeredTypes() {
  return [...handlers.keys()];
}

const workerState = {
  running: false,
  timer: null,
  active: 0,
  id: DEFAULT_WORKER_ID,
};

async function runClaimed(job, visibilityMs) {
  const handler = handlers.get(job.type);
  const heartbeatTimer = setInterval(
    () => {
      heartbeat(job._id, workerState.id).catch(() => {});
    },
    Math.max(250, Math.floor(visibilityMs / 3)),
  );
  heartbeatTimer.unref?.();
  try {
    if (!handler)
      throw new Error(`No handler registered for job type ${job.type}`);
    await handler(job, {
      workerId: workerState.id,
      heartbeat: () => heartbeat(job._id, workerState.id),
      updateProgress: (patch) => updateProgress(job._id, workerState.id, patch),
    });
    await complete(job._id, workerState.id);
  } catch (error) {
    console.error(
      `[jobs] job ${job._id} (${job.type}) attempt ${job.attempts} failed:`,
      error.message,
    );
    await fail(job._id, workerState.id, error).catch(() => {});
  } finally {
    clearInterval(heartbeatTimer);
    workerState.active--;
  }
}

function startWorker(opts = {}) {
  if (workerState.running) return workerState;
  const pollMs = opts.pollMs ?? envInt("JOB_POLL_MS", 1000);
  const concurrency = opts.concurrency ?? envInt("JOB_CONCURRENCY", 5);
  const visibilityMs = opts.visibilityMs ?? envInt("JOB_VISIBILITY_MS", 60000);
  workerState.running = true;
  const tick = async () => {
    if (!workerState.running) return;
    try {
      while (workerState.running && workerState.active < concurrency) {
        const types = registeredTypes();
        if (!types.length) break;
        const job = await claimNext(workerState.id, { types, visibilityMs });
        if (!job) break;
        workerState.active++;
        runClaimed(job, visibilityMs); // deliberately not awaited - concurrency
      }
    } catch (error) {
      console.error("[jobs] worker poll failed:", error.message);
    }
  };
  workerState.timer = setInterval(tick, pollMs);
  workerState.timer.unref?.();
  tick();
  return workerState;
}

function stopWorker() {
  workerState.running = false;
  if (workerState.timer) clearInterval(workerState.timer);
  workerState.timer = null;
}

module.exports = {
  enqueue,
  claimNext,
  heartbeat,
  complete,
  fail,
  updateProgress,
  registerHandler,
  registeredTypes,
  startWorker,
  stopWorker,
  backoffMs,
  workerId: () => workerState.id,
  _workerState: workerState,
};
