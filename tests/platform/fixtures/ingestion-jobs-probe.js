// AR-05 probe — ingestion recovery sweep + enqueue dedupe + handler
// concurrency cap against a real mongod (MMS, disk-backed dbPath
// under ~/workspace/aura-audit/mms-data - this VM's /tmp is a 512 MB
// tmpfs). Runs as a CHILD process so MMS/mongoose handles never live
// in the test runner.
//
// Scenarios:
//   (a) recovery sweep: a stale "processing" doc is requeued
//       (status "pending", ingestRecoveries 1, an ingest job exists);
//       a doc already at INGEST_MAX_RECOVERIES becomes "failed" with
//       the sweep's error; a fresh "processing" doc is untouched.
//   (b) enqueueIngestion dedupe: two triggers of the same document
//       state produce ONE job; after the document changes (updatedAt
//       moves) a new job is allowed; a missing document returns null.
//   (c) handler concurrency: with INGEST_CONCURRENCY=2, five handler
//       invocations never run IngestionService.ingestDocument more
//       than 2 at a time (the service is monkeypatched with a
//       counting stub - Qdrant is never touched).
// Prints RESULT lines; exits non-zero on any infrastructure error.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "ingest-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(mongod.getUri("aura_ingest_test"));
  try {
    const Document = require(path.join(REPO, "models/document.model"));
    const Job = require(path.join(REPO, "models/job.model"));
    const ingestionJobs = require(path.join(REPO, "services/ingestionJobs.service"));
    const uploadedBy = new mongoose.Types.ObjectId();
    const mkDoc = (over) => Document.create({
      fileName: "doc.txt", fileType: "txt", fileUrl: "https://example.invalid/doc.txt",
      uploadedBy, ...over,
    });
    // Age a document's updatedAt directly in the collection (mongoose
    // update helpers would re-stamp updatedAt to now).
    const age = (id, ms) => mongoose.connection.db.collection("documents")
      .updateOne({ _id: id }, { $set: { updatedAt: new Date(Date.now() - ms) } });

    // (a) recovery sweep
    const stale = await mkDoc({ status: "processing", ingestRecoveries: 0 });
    const maxed = await mkDoc({ status: "processing", ingestRecoveries: 3 });
    const fresh = await mkDoc({ status: "processing", ingestRecoveries: 0 });
    await age(stale._id, 3600 * 1000);
    await age(maxed._id, 3600 * 1000);
    const summary = await ingestionJobs.runIngestionRecoverySweep();
    const staleAfter = await Document.findById(stale._id).lean();
    const maxedAfter = await Document.findById(maxed._id).lean();
    const freshAfter = await Document.findById(fresh._id).lean();
    const staleJobs = await Job.countDocuments({ type: "ingest-document", "payload.documentId": String(stale._id) });
    console.log(
      `RESULT sweep requeued=${summary.requeued} failed=${summary.failed}` +
      ` staleStatus=${staleAfter.status} staleRecoveries=${staleAfter.ingestRecoveries} staleJobs=${staleJobs}` +
      ` maxedStatus=${maxedAfter.status} maxedErrorSet=${typeof maxedAfter.error === "string" && maxedAfter.error.length > 0}` +
      ` freshStatus=${freshAfter.status} freshRecoveries=${freshAfter.ingestRecoveries}`
    );

    // (b) enqueue dedupe keyed on the document state (updatedAt)
    const dedupeDoc = await mkDoc({ status: "pending" });
    const j1 = await ingestionJobs.enqueueIngestion(dedupeDoc._id);
    const j2 = await ingestionJobs.enqueueIngestion(dedupeDoc._id);
    const beforeChange = await Job.countDocuments({ type: "ingest-document", "payload.documentId": String(dedupeDoc._id) });
    await sleep(25); // updatedAt is millisecond-resolution
    await Document.findByIdAndUpdate(dedupeDoc._id, { $set: { fileName: "renamed.txt" } });
    const j3 = await ingestionJobs.enqueueIngestion(dedupeDoc._id);
    const afterChange = await Job.countDocuments({ type: "ingest-document", "payload.documentId": String(dedupeDoc._id) });
    const missing = await ingestionJobs.enqueueIngestion(new mongoose.Types.ObjectId());
    console.log(
      `RESULT dedupe firstJobs=${beforeChange} sameId=${String(j1._id) === String(j2._id)}` +
      ` afterChangeJobs=${afterChange} newId=${String(j3._id) !== String(j1._id)} missingIsNull=${missing === null}`
    );

    // (c) handler concurrency cap
    const IngestionService = require(path.join(REPO, "services/ingestionService"));
    let active = 0; let peak = 0;
    IngestionService.ingestDocument = async () => {
      active += 1; peak = Math.max(peak, active);
      await sleep(120);
      active -= 1;
    };
    process.env.INGEST_CONCURRENCY = "2";
    const handlers = {};
    ingestionJobs.registerIngestionHandlers({ registerHandler: (type, h) => { handlers[type] = h; } });
    await Promise.all(Array.from({ length: 5 }, () =>
      handlers["ingest-document"]({ payload: { documentId: String(dedupeDoc._id) } }, {})));
    delete process.env.INGEST_CONCURRENCY;
    console.log(`RESULT concurrency peak=${peak}`);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error("PROBE ERROR:", err); process.exit(1); });
