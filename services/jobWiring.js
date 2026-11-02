// AR-33: jobs & scheduler wiring.
//
// Everything in server.js's startServer that is periodic or background
// work lives here behind two functions: startScheduledJobs() wires it
// up and returns opaque handles; stopScheduledJobs() tears it down.
// The bootstrap (server.js) only holds the handles for shutdown -
// scheduling policy is no longer interleaved with app assembly or
// lifecycle code.
//
// Strictly wiring: no intervals, workers, or tasks are started at
// require time. WORKER_MODE=separate semantics are unchanged (the
// dedicated worker.js process drains the queue instead).
const {
  startBackgroundTasks,
  stopBackgroundTasks,
} = require("./backgroundTasks");

function startScheduledJobs({ notificationGateway }) {
  startBackgroundTasks();

  // Phase 3 (AR-02): durable job-queue worker. Default is
  // in-process: this web process both enqueues and drains.
  // WORKER_MODE=separate means a dedicated `node worker.js`
  // process drains the queue and this process only enqueues.
  if ((process.env.WORKER_MODE || "").trim().toLowerCase() !== "separate") {
    require("./jobHandlers").registerAllHandlers();
    require("./jobQueue.service").startWorker();
    console.log("✓ Job queue worker started (in-process)");
  } else {
    console.log(
      "✓ Job queue worker delegated to a separate worker process (WORKER_MODE=separate)",
    );
  }

  const heartbeatInterval = setInterval(() => {
    notificationGateway.broadcastHeartbeat();
  }, 60000);

  const cleanupInterval = setInterval(
    () => {
      notificationGateway.cleanupStaleConnections();
    },
    5 * 60 * 1000,
  );

  return {
    heartbeatInterval,
    cleanupInterval,
  };
}

function stopScheduledJobs(handles) {
  if (!handles) return;
  clearInterval(handles.heartbeatInterval);
  clearInterval(handles.cleanupInterval);
  stopBackgroundTasks();
  try {
    require("./jobQueue.service").stopWorker();
  } catch {
    /* not started */
  }
}

module.exports = { startScheduledJobs, stopScheduledJobs };
