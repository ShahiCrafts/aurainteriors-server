// Phase 3: central registry of job-queue handlers. server.js
// (in-process worker, the default) and worker.js (WORKER_MODE=
// separate) both call registerAllHandlers() after the database
// connects, so a job type is runnable in whichever process drains
// the queue. Each Phase 3 change that introduces a job type adds
// its registration here: AR-04 broadcast fan-out, AR-20 email
// sends, AR-05 document ingestion. Until a type is registered the
// worker simply never claims it.
let registered = false;

function registerAllHandlers() {
  if (registered) return;
  registered = true;
  const jobQueue = require("./jobQueue.service");
  // AR-04: broadcast fan-out handlers.
  require("./broadcastJobs.service").registerBroadcastHandlers(jobQueue);
  // AR-20: email outbox (no job type - draining is interval-driven;
  // the registration call documents that, see emailOutbox.service).
  require("./emailOutbox.service").registerEmailHandlers(jobQueue);
  // AR-05: document ingestion jobs.
  require("./ingestionJobs.service").registerIngestionHandlers(jobQueue);
}

module.exports = { registerAllHandlers };
