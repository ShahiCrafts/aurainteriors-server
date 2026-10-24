// Infra batch: B-17 (error handler robustness), B-13 (targeted rate
// limiters for public endpoints), B-10 (signed URL in logs).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

const errorHandler = require("../../middleware/error.middleware");

function mockRes() {
  return {
    statusCode: undefined, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}
function runError(err) {
  const res = mockRes();
  errorHandler(err, {}, res, () => {});
  return res;
}

// ---------- B-17 ----------
test("B-17: a 11000 error without keyPattern returns 400 instead of crashing the handler", () => {
  process.env.NODE_ENV = "production";
  const err = new Error("E11000 duplicate key error collection: users");
  err.code = 11000;
  let res;
  assert.doesNotThrow(() => { res = runError(err); }, "error handler must not throw on a bare 11000");
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /duplicate/i);
});

test("characterization: a 11000 with keyPattern names the field", () => {
  process.env.NODE_ENV = "production";
  const err = new Error("E11000 duplicate key error");
  err.code = 11000;
  err.keyPattern = { email: 1 };
  const res = runError(err);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /email/);
});

test("B-17: the file-size message no longer quotes a wrong 5MB limit", () => {
  process.env.NODE_ENV = "production";
  const err = new Error("File too large");
  err.name = "MulterError";
  err.code = "LIMIT_FILE_SIZE";
  const res = runError(err);
  assert.equal(res.statusCode, 400);
  assert.doesNotMatch(res.body.message, /5\s?MB/, "limits are 10-50MB depending on the route; the message must not claim 5MB");
});

test("characterization: unknown errors stay a generic 500 in production", () => {
  process.env.NODE_ENV = "production";
  const res = runError(new Error("kaboom with internals"));
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Something went wrong");
});

// ---------- B-13 ----------
test("B-13: public endpoint limiter factory exists and enforces its budget", async () => {
  const rateLimitMw = require("../../middleware/rateLimit.middleware");
  assert.equal(typeof rateLimitMw.publicEndpointRateLimit, "function", "a reusable public-endpoint limiter should be exported");
  const express = require("express");
  const app = express();
  app.post("/track", rateLimitMw.publicEndpointRateLimit(3), (req, res) => res.json({ ok: true }));
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${base}/track`, { method: "POST" });
      statuses.push(res.status);
      await res.arrayBuffer();
    }
    assert.deepEqual(statuses, [200, 200, 200, 429], `expected the 4th request to be limited, got ${statuses}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

// ---------- B-10 ----------
test("B-10: ingestion never logs the signed Cloudinary download URL", async () => {
  const SECRET = "SECRET_SIGNATURE_XYZ";
  stubModule("pdf-parse", { PDFParse: class { async getText() { return { text: "" }; } } });
  stubModule("@qdrant/js-client-rest", { QdrantClient: class {} });
  stubModule("models/document.model.js", {
    findById: async () => ({
      _id: "doc1", fileName: "a.txt", fileType: "txt",
      fileUrl: "https://example.invalid/a.txt", filePublicId: "pub1",
      status: "pending", async save() {},
    }),
  });
  stubModule("config/cloudinary.js", { getCloudinaryConfig: () => ({}) });
  stubModule("cloudinary", {
    v2: { utils: { private_download_url: () => `https://res.example/download?signature=${SECRET}` } },
  });
  const realLog = console.log; const realWarn = console.warn; const realError = console.error;
  const captured = [];
  console.log = (...a) => captured.push(a.join(" "));
  console.warn = (...a) => captured.push(a.join(" "));
  console.error = (...a) => captured.push(a.join(" "));
  const realFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    statusText: "OK",
    arrayBuffer: async () => new TextEncoder().encode("hello world, this is a test document").buffer,
    json: async () => ({}),
  });
  try {
    delete require.cache[require.resolve("../../services/ingestionService")];
    const worker = require("../../services/ingestionService"); // exports a singleton instance
    await worker.ingestDocument("doc1").catch(() => {});
  } finally {
    console.log = realLog; console.warn = realWarn; console.error = realError;
    global.fetch = realFetch;
  }
  const leaked = captured.filter((line) => line.includes(SECRET));
  assert.deepEqual(leaked, [], `signed URL leaked into logs: ${leaked[0] || ""}`);
});
