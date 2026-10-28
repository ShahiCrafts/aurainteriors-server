// Phase 3 (AR-02, decision D-A): dedicated job-worker entry point.
// Used only when WORKER_MODE=separate - the web process then enqueues
// jobs without draining them, and this process runs the queue worker
// (plus the email-outbox drainer) against the same MongoDB.
//   node worker.js
// With WORKER_MODE unset (the default) server.js runs the worker
// in-process and this file is unused.
const { loadEnv, validateEnv } = require("./config/appConfig");
loadEnv();
{
  const { errors, warnings } = validateEnv();
  for (const w of warnings) console.warn(`[config] warning: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`[config] error: ${e}`);
    process.exit(1);
  }
}

const mongoose = require("mongoose");
const { connectDatabase } = require("./config/database");
const jobQueue = require("./services/jobQueue.service");
const { registerAllHandlers } = require("./services/jobHandlers");

async function main() {
  await connectDatabase();
  registerAllHandlers();
  jobQueue.startWorker();
  console.log(
    `[worker] job worker started (id=${jobQueue.workerId()}, types=${jobQueue.registeredTypes().join(", ") || "none"})`,
  );

  // AR-20 drain trigger (3 of 3): in outbox mode the dedicated worker
  // also drains the email outbox every 15 s.
  let emailDrainTimer = null;
  if (require("./config/appConfig").getString("EMAIL_MODE") === "outbox") {
    const { drainEmailOutbox } = require("./services/emailOutbox.service");
    emailDrainTimer = setInterval(() => {
      drainEmailOutbox().catch((e) =>
        console.error("[worker] email outbox drain failed:", e.message),
      );
    }, 15 * 1000);
    emailDrainTimer.unref?.();
  }

  let shuttingDown = false;
  const shutdown = async (trigger) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[worker] shutting down (${trigger})...`);
    if (emailDrainTimer) clearInterval(emailDrainTimer);
    jobQueue.stopWorker();
    try {
      await mongoose.connection.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[worker] failed to start:", error);
  process.exit(1);
});
