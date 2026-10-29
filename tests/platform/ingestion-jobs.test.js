// AR-05 — document ingestion as durable jobs + embed-then-swap +
// stuck-document recovery sweep.
//
// Part 1 (stubbed, style of tests/audit/infrastructure-guards.test.js B-10):
// a RECORDING Qdrant fake proves ingestDocument now embeds and
// upserts the new version BEFORE deleting the old one, that the
// delete only removes points from previous runs (must_not on
// ingestRun), that a failed embedding leaves the old vectors fully
// intact (no delete at all), and that INGEST_MAX_CHUNKS_PER_JOB
// rejects an oversized document before any Qdrant call.
//
// Part 2 (MMS child probe, fixtures/ingestion-jobs-probe.js): the
// recovery sweep, enqueue dedupe and the handler concurrency cap
// against a real mongod.
//
// Part 3 (stubbed): backgroundTasks.runDocumentIngestion keeps its
// name/signature for controllers, but now ENQUEUES via
// ingestionJobs.enqueueIngestion and never throws / never leaves an
// unhandled rejection when the enqueue fails.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");
const { stubModule, until } = require("../audit/helpers");

// ---------- Part 1: embed-then-swap ordering (stubbed) ----------
const qdrantCalls = [];
let embeddingShouldFail = false;

class RecordingQdrant {
  async getCollections() {
    return { collections: [{ name: "knowledge_base" }] };
  }
  async delete(...args) {
    qdrantCalls.push({ op: "delete", args });
    return {};
  }
  async upsert(...args) {
    qdrantCalls.push({ op: "upsert", args });
    return {};
  }
}
stubModule("@qdrant/js-client-rest", { QdrantClient: RecordingQdrant });

const doc = {
  _id: "doc1",
  fileName: "a.txt",
  fileType: "txt",
  fileUrl: "https://example.invalid/a.txt",
  filePublicId: null,
  visibility: "private",
  status: "pending",
  error: null,
  async save() {
    return this;
  },
};
stubModule("models/document.model.js", { findById: async () => doc });
stubModule("utils/guardedFetch.js", {
  guardedFetch: async () => ({
    ok: true,
    status: 200,
    buffer: async () =>
      Buffer.from("alpha beta gamma delta epsilon zeta eta theta"),
  }),
});

process.env.NVIDIA_API_KEY = "dummy";
// OA-1 (AR-32 completion): QDRANT_URL has no localhost fallback any
// more - set it explicitly; the RecordingQdrant stub above intercepts
// construction, so no network happens. Env-setup only.
process.env.QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const realFetch = global.fetch;
global.fetch = async () => {
  if (embeddingShouldFail) throw new Error("embedding provider down (test)");
  return {
    ok: true,
    text: async () => "",
    json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
  };
};

delete require.cache[require.resolve("../../services/ingestionService")];
const ingestionService = require("../../services/ingestionService");

function resetDoc() {
  doc.status = "pending";
  doc.error = null;
  qdrantCalls.length = 0;
  embeddingShouldFail = false;
  delete process.env.INGEST_MAX_CHUNKS_PER_JOB;
}

test("AR-05: embed-then-swap - upsert precedes delete, delete excludes the new run, points carry ingestRun", async () => {
  resetDoc();
  const result = await ingestionService.ingestDocument("doc1");
  assert.equal(result.success, true);
  assert.equal(doc.status, "indexed");
  const ops = qdrantCalls.map((c) => c.op);
  assert.deepEqual(
    ops,
    ["upsert", "delete"],
    `expected upsert BEFORE delete, got: ${ops.join(",")}`,
  );
  const upsertPoints = qdrantCalls[0].args[1].points;
  assert.ok(upsertPoints.length >= 1);
  const runId = upsertPoints[0].payload.ingestRun;
  assert.ok(
    typeof runId === "string" && runId.length > 0,
    "points must carry payload.ingestRun",
  );
  assert.ok(
    upsertPoints.every((p) => p.payload.ingestRun === runId),
    "one run id per ingestion",
  );
  const filter = qdrantCalls[1].args[1].filter;
  assert.deepEqual(filter.must, [
    { key: "documentId", match: { value: "doc1" } },
  ]);
  assert.deepEqual(
    filter.must_not,
    [{ key: "ingestRun", match: { value: runId } }],
    "the swap delete must exclude the just-upserted run",
  );
});

test("AR-05: embedding failure leaves old vectors intact - no delete, no upsert", async () => {
  resetDoc();
  embeddingShouldFail = true;
  await assert.rejects(
    () => ingestionService.ingestDocument("doc1"),
    /embedding provider down/,
  );
  assert.equal(doc.status, "failed");
  assert.deepEqual(
    qdrantCalls.map((c) => c.op),
    [],
    "a failed re-embed must not delete (or upsert) anything - the previous version stays searchable",
  );
});

test("AR-05: INGEST_MAX_CHUNKS_PER_JOB rejects oversized documents before any Qdrant call", async () => {
  resetDoc();
  // Long text -> several chunks under the 1000-char chunker; cap of 1 must bite.
  const longDocFetch = async () => ({
    ok: true,
    status: 200,
    buffer: async () => Buffer.from("lorem ipsum dolor sit amet ".repeat(200)),
  });
  // Re-point the guardedFetch stub at the long payload for this test.
  const gfPath = require.resolve("../../utils/guardedFetch");
  const savedGf = require.cache[gfPath].exports;
  require.cache[gfPath].exports = { guardedFetch: longDocFetch };
  process.env.INGEST_MAX_CHUNKS_PER_JOB = "1";
  try {
    await assert.rejects(
      () => ingestionService.ingestDocument("doc1"),
      /INGEST_MAX_CHUNKS_PER_JOB/,
    );
  } finally {
    require.cache[gfPath].exports = savedGf;
    delete process.env.INGEST_MAX_CHUNKS_PER_JOB;
  }
  assert.equal(doc.status, "failed");
  assert.deepEqual(
    qdrantCalls.map((c) => c.op),
    [],
    "cap rejection happens before initCollection/upsert/delete",
  );
});

// ---------- Part 3: runDocumentIngestion enqueues (stubbed) ----------
test("AR-05: backgroundTasks.runDocumentIngestion enqueues and never throws on enqueue failure", async () => {
  const enqueued = [];
  let enqueueShouldFail = false;
  stubModule("services/notificationService.js", {
    cleanupExpiredNotifications: async () => {},
  });
  stubModule("services/ingestionJobs.service.js", {
    enqueueIngestion: async (id) => {
      if (enqueueShouldFail) throw new Error("queue unavailable (test)");
      enqueued.push(id);
      return { _id: "job1" };
    },
    runIngestionRecoverySweep: async () => ({ requeued: 0, failed: 0 }),
    registerIngestionHandlers: () => {},
  });
  delete require.cache[require.resolve("../../services/backgroundTasks")];
  const tasks = require("../../services/backgroundTasks");
  assert.equal(typeof tasks.runDocumentIngestion, "function");
  tasks.runDocumentIngestion("doc-9");
  await until(() => enqueued.length === 1);
  assert.deepEqual(enqueued, ["doc-9"]);
  enqueueShouldFail = true;
  assert.doesNotThrow(() => tasks.runDocumentIngestion("doc-10"));
  // Give the rejected enqueue a chance to surface as an unhandled
  // rejection (which would fail this test file at process level).
  await new Promise((r) => setTimeout(r, 50));
});

// ---------- Part 2: MMS probe (sweep / dedupe / concurrency) ----------
function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "ingestion-jobs-probe.js")],
      { timeout: 240000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
    );
  });
}
let cached;
const probe = async () => {
  if (!cached) cached = runProbe();
  return cached;
};
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print RESULT ${prefix}; got: ${out}`);
  return l;
};
const field = (l, name) => {
  const m = l.match(new RegExp(`${name}=([^ ]*)`));
  return m ? m[1] : null;
};

test(
  "AR-05 (probe): recovery sweep requeues stale, fails maxed, leaves fresh alone",
  { timeout: 250000 },
  async () => {
    const l = await line("sweep");
    assert.equal(field(l, "requeued"), "1");
    assert.equal(field(l, "failed"), "1");
    assert.equal(field(l, "staleStatus"), "pending");
    assert.equal(field(l, "staleRecoveries"), "1");
    assert.equal(field(l, "staleJobs"), "1");
    assert.equal(field(l, "maxedStatus"), "failed");
    assert.equal(field(l, "maxedErrorSet"), "true");
    assert.equal(field(l, "freshStatus"), "processing");
    assert.equal(field(l, "freshRecoveries"), "0");
  },
);

test(
  "AR-05 (probe): enqueueIngestion dedupes same-state triggers, allows re-ingest after a change",
  { timeout: 250000 },
  async () => {
    const l = await line("dedupe");
    assert.equal(field(l, "firstJobs"), "1");
    assert.equal(field(l, "sameId"), "true");
    assert.equal(field(l, "afterChangeJobs"), "2");
    assert.equal(field(l, "newId"), "true");
    assert.equal(field(l, "missingIsNull"), "true");
  },
);

test(
  "AR-05 (probe): ingest-document handler never exceeds INGEST_CONCURRENCY",
  { timeout: 250000 },
  async () => {
    const l = await line("concurrency");
    assert.equal(field(l, "peak"), "2");
  },
);

// Restore the global fetch stub for any later file sharing state.
test.after(() => {
  global.fetch = realFetch;
});
