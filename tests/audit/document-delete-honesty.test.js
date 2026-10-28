// AR-22 — document delete must report per-system outcomes honestly.
// deleteDocument swallowed Qdrant/Cloudinary failures (and even logged
// "✓ Deleted file from Cloudinary" when the delete had actually
// failed, because deleteFile reports failure by returning null, not by
// throwing) and always answered "deleted successfully from both
// database and vector store". The internal fix (per-system outcome
// tracking + structured, alertable logs) is unconditional; the
// RESPONSE change is gated behind DOCUMENT_DELETE_HONEST_STATUS
// (default off = current shape) per the safety rule.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery, mockRes, mockNext } = require("./helpers");

let qdrantError = null;
let cloudinaryFails = false;
const docDoc = { _id: "64b64c2f4f5a6b7c8d9e0f55", filePublicId: "docs/file1" };

class FakeQdrantClient {
  async delete() {
    if (qdrantError) throw qdrantError;
    return { status: "completed" };
  }
}
// OA-1 (AR-32 completion): QDRANT_URL has no localhost fallback any
// more - set it explicitly; the FakeQdrantClient stub below intercepts
// construction, so no network happens. Env-setup only.
process.env.QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
stubModule("@qdrant/js-client-rest", { QdrantClient: FakeQdrantClient });
stubModule("services/backgroundTasks", {
  runDocumentIngestion: async () => {},
});
stubModule("models/document.model", {
  findById: () => makeQuery(docDoc),
  findByIdAndDelete: async () => docDoc,
});
stubModule("middleware/upload.middleware", {
  deleteFile: async () => (cloudinaryFails ? null : { result: "ok" }),
});

const ctrl = require("../../controllers/document.controller");
const FLAG = "DOCUMENT_DELETE_HONEST_STATUS";

async function runDelete() {
  const res = mockRes();
  const next = mockNext();
  await ctrl.deleteDocument(
    {
      params: { id: String(docDoc._id) },
      user: { _id: "a", role: "admin" },
      headers: {},
    },
    res,
    next,
  );
  assert.equal(
    next.error,
    undefined,
    `unexpected next(error): ${next.error && next.error.message}`,
  );
  return res;
}

function captureLogs() {
  const logs = [];
  const origError = console.error;
  const origLog = console.log;
  console.error = (...a) => logs.push(a.map(String).join(" "));
  console.log = (...a) => logs.push(a.map(String).join(" "));
  return {
    logs,
    restore: () => {
      console.error = origError;
      console.log = origLog;
    },
  };
}

test("AR-22 flag OFF (default): partial failure keeps the legacy response shape BUT is logged as a structured partial-failure record", async () => {
  delete process.env[FLAG];
  qdrantError = new Error("qdrant unreachable");
  cloudinaryFails = false;
  const cap = captureLogs();
  try {
    const res = await runDelete();
    assert.equal(res.statusCode, 200);
    assert.deepEqual(
      res.body,
      {
        status: "success",
        message:
          "Document deleted successfully from both database and vector store",
      },
      "default shape must be preserved exactly",
    );
    const rec = cap.logs.find(
      (l) =>
        l.includes("document_delete_partial") &&
        l.includes('"qdrant":"failed"'),
    );
    assert.ok(
      rec,
      `a structured partial-failure record naming the failed system must be logged; logs: ${JSON.stringify(cap.logs)}`,
    );
  } finally {
    cap.restore();
    qdrantError = null;
  }
});

test("AR-22 flag ON: partial failure is a VISIBLE status with per-system outcomes", async () => {
  process.env[FLAG] = "on";
  qdrantError = new Error("qdrant unreachable");
  cloudinaryFails = true;
  const cap = captureLogs();
  try {
    const res = await runDelete();
    assert.equal(res.statusCode, 200);
    assert.equal(
      res.body.status,
      "partial",
      `partial failure must not claim success; body: ${JSON.stringify(res.body)}`,
    );
    assert.deepEqual(res.body.data.outcomes, {
      qdrant: "failed",
      cloudinary: "failed",
      database: "ok",
    });
    assert.match(res.body.message, /qdrant/i);
    assert.match(res.body.message, /cloudinary/i);
  } finally {
    cap.restore();
    delete process.env[FLAG];
    qdrantError = null;
    cloudinaryFails = false;
  }
});

test("AR-22 flag ON: full success keeps the original success shape; a failed Cloudinary delete is never logged as success", async () => {
  process.env[FLAG] = "on";
  qdrantError = null;
  cloudinaryFails = false;
  let cap = captureLogs();
  try {
    const res = await runDelete();
    assert.deepEqual(res.body, {
      status: "success",
      message:
        "Document deleted successfully from both database and vector store",
    });
  } finally {
    cap.restore();
  }

  delete process.env[FLAG];
  cloudinaryFails = true;
  cap = captureLogs();
  try {
    await runDelete();
    assert.ok(
      !cap.logs.some((l) => l.includes("✓ Deleted file from Cloudinary")),
      `a failed delete must not be logged as deleted; logs: ${JSON.stringify(cap.logs)}`,
    );
    assert.ok(
      cap.logs.some(
        (l) =>
          l.includes("document_delete_partial") &&
          l.includes('"cloudinary":"failed"'),
      ),
      "the cloudinary failure must appear in the structured record",
    );
  } finally {
    cap.restore();
    cloudinaryFails = false;
  }
});
