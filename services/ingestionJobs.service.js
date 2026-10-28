// AR-05: document ingestion as durable jobs.
//   enqueueIngestion(documentId) - loads the Document and enqueues an
//     "ingest-document" job whose idempotencyKey embeds the document's
//     updatedAt, so duplicate triggers of the SAME document state
//     dedupe to one job, while any document change (retry, visibility
//     flip - both update updatedAt) allows a fresh ingestion job.
//   registerIngestionHandlers(jobQueue) - the "ingest-document"
//     handler runs IngestionService.ingestDocument under a
//     per-process concurrency cap (INGEST_CONCURRENCY, default 2):
//     ingestion is CPU/network heavy and used to run uncapped inside
//     the web process; excess jobs WAIT inside the handler (the job
//     stays claimed, heartbeats keep flowing) instead of piling onto
//     the event loop. The cap is an operational bound, default-on
//     like AR-12's upload cap - it changes no outputs.
//   runIngestionRecoverySweep() - a document stranded in "processing"
//     (restart mid-ingest, worker crash) is re-queued, or marked
//     "failed" once it has stalled INGEST_MAX_RECOVERIES times.
//     Wired into backgroundTasks as a leased 5-minute interval plus
//     one run at boot (the stranded-across-restart case).

const envInt = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

// --- per-process concurrency cap (counter + waiters) ---
let ingestActive = 0;
const ingestWaiters = [];
async function acquireIngestSlot() {
  const cap = envInt("INGEST_CONCURRENCY", 2);
  if (ingestActive < cap) {
    ingestActive += 1;
    return;
  }
  await new Promise((resolve) => ingestWaiters.push(resolve));
  ingestActive += 1;
}
function releaseIngestSlot() {
  ingestActive -= 1;
  const next = ingestWaiters.shift();
  if (next) next();
}

async function enqueueIngestion(documentId) {
  const Document = require("../models/document.model");
  const doc = await Document.findById(documentId);
  if (!doc) {
    console.log(
      `[INGESTION] enqueue skipped: document ${documentId} not found`,
    );
    return null;
  }
  const jobQueue = require("./jobQueue.service");
  return jobQueue.enqueue(
    "ingest-document",
    { documentId: String(doc._id) },
    { idempotencyKey: `ingest:${doc._id}:${doc.updatedAt.toISOString()}` },
  );
}

function registerIngestionHandlers(jobQueue) {
  jobQueue.registerHandler("ingest-document", async (job) => {
    await acquireIngestSlot();
    try {
      const IngestionService = require("./ingestionService");
      await IngestionService.ingestDocument(job.payload.documentId);
    } finally {
      releaseIngestSlot();
    }
  });
}

async function runIngestionRecoverySweep() {
  const Document = require("../models/document.model");
  const stuckAfterMs = envInt("INGEST_STUCK_AFTER_MS", 600000);
  const maxRecoveries = envInt("INGEST_MAX_RECOVERIES", 3);
  const cutoff = new Date(Date.now() - stuckAfterMs);
  const stale = await Document.find({
    status: "processing",
    updatedAt: { $lt: cutoff },
  })
    .select("_id ingestRecoveries")
    .lean();
  let requeued = 0;
  let failed = 0;
  for (const doc of stale) {
    try {
      if ((doc.ingestRecoveries || 0) < maxRecoveries) {
        // Conditional claim: only the sweep run that flips the doc
        // out of its stale "processing" state re-queues it.
        const claimed = await Document.findOneAndUpdate(
          { _id: doc._id, status: "processing", updatedAt: { $lt: cutoff } },
          { $set: { status: "pending" }, $inc: { ingestRecoveries: 1 } },
          { new: true },
        );
        if (!claimed) continue;
        await enqueueIngestion(doc._id);
        requeued += 1;
        console.log(
          `[INGESTION] Recovery sweep re-queued stalled document ${doc._id} (recovery ${claimed.ingestRecoveries}/${maxRecoveries})`,
        );
      } else {
        const claimed = await Document.findOneAndUpdate(
          { _id: doc._id, status: "processing", updatedAt: { $lt: cutoff } },
          {
            $set: {
              status: "failed",
              error:
                "Ingestion stalled repeatedly - marked failed by the recovery sweep",
            },
          },
          { new: true },
        );
        if (!claimed) continue;
        failed += 1;
        console.log(
          `[INGESTION] Recovery sweep marked document ${doc._id} failed after ${maxRecoveries} stalled recoveries`,
        );
      }
    } catch (error) {
      console.error(
        `[INGESTION] Recovery sweep failed for document ${doc._id}:`,
        error.message,
      );
    }
  }
  return { requeued, failed };
}

module.exports = {
  enqueueIngestion,
  registerIngestionHandlers,
  runIngestionRecoverySweep,
};
