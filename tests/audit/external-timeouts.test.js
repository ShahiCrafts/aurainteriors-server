// AR-09 — third-party calls had NO timeouts (the Brevo axios instance
// set none; Cloudinary upload/destroy relied on SDK defaults), and
// Cloudinary destroy failures disappeared into a bare console line.
// Fault injection: a local black-hole HTTP server that accepts
// requests and never replies, plus a never-calling-back Cloudinary
// uploader stub. Every call must fail VISIBLY within the configured
// deadline instead of hanging the request/job behind it.
// Env must be set before the modules load (both read config at
// require/call time in this file's isolated process).
process.env.BREVO_TIMEOUT_MS = "300";
// OA-1 (AR-32 completion): EMAIL_FROM has no fallback any more - set
// it explicitly (the send path resolves it via requireAtUse before
// the Brevo call). Env-setup only.
process.env.EMAIL_FROM = process.env.EMAIL_FROM || '"Aura Interiors <noreply@example.com>"';
process.env.EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL || "https://example.test/aura-logo.png"; // lead review item 3: logo has no hardcoded fallback either
process.env.CLOUDINARY_TIMEOUT_MS = "300";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

function blackHoleServer() {
  return new Promise((resolve) => {
    const server = http.createServer(() => { /* accept, never reply */ });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function settleWithin(promise, ms) {
  const started = Date.now();
  const outcome = await Promise.race([
    promise.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e })),
    new Promise((r) => setTimeout(() => r({ pending: true }), ms)),
  ]);
  return { ...outcome, elapsed: Date.now() - started };
}

test("AR-09: Brevo send to a black-hole endpoint fails within the configured deadline", { timeout: 30000 }, async () => {
  const server = await blackHoleServer();
  process.env.BREVO_API_BASE_URL = `http://127.0.0.1:${server.address().port}/v3`;
  try {
    const email = require("../../services/email.service");
    const r = await settleWithin(email.sendOtpEmail("user@example.com", "123456"), 5000);
    assert.ok(!r.pending, "send must not hang past the deadline on an unresponsive Brevo endpoint");
    assert.equal(r.ok, false, "send must reject (not silently succeed) when Brevo never replies");
    assert.ok(r.elapsed < 3000, `failure must arrive near the 300 ms configured deadline, took ${r.elapsed} ms`);
    assert.match(String(r.e && (r.e.code || r.e.message)), /ECONNABORTED|timeout/i, `error must identify the timeout; got ${r.e && r.e.message}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

test("AR-09: Cloudinary upload to a never-calling-back uploader rejects within the deadline", { timeout: 30000 }, async () => {
  const { cloudinary, uploadToCloudinary } = require("../../config/cloudinary");
  const original = cloudinary.uploader.upload_stream;
  cloudinary.uploader.upload_stream = () => ({ end() { /* swallow the buffer, never call back */ } });
  try {
    const r = await settleWithin(uploadToCloudinary(Buffer.from("fake-image")), 5000);
    assert.ok(!r.pending, "upload must not hang forever when Cloudinary never responds");
    assert.equal(r.ok, false, "upload must reject on deadline expiry");
    assert.ok(r.elapsed < 3000, `failure must arrive near the 300 ms deadline, took ${r.elapsed} ms`);
    assert.match(String(r.e && r.e.message), /timed out/i);
  } finally {
    cloudinary.uploader.upload_stream = original;
  }
});

test("AR-09: a hung Cloudinary destroy resolves as a VISIBLE failure (structured log + null) within the deadline", { timeout: 30000 }, async () => {
  const { cloudinary, deleteFromCloudinary } = require("../../config/cloudinary");
  const original = cloudinary.uploader.destroy;
  cloudinary.uploader.destroy = () => new Promise(() => { /* never settles */ });
  const logs = [];
  const origError = console.error;
  console.error = (...args) => { logs.push(args.map(String).join(" ")); };
  try {
    const r = await settleWithin(deleteFromCloudinary("products/hung-asset"), 5000);
    assert.ok(!r.pending, "destroy must not hang forever - the old code awaited the SDK with no bound");
    assert.equal(r.v, null, "failure keeps the long-standing null signal callers tolerate");
    assert.ok(r.elapsed < 3000, `failure must surface near the 300 ms deadline, took ${r.elapsed} ms`);
    const structured = logs.find((l) => l.includes("cloudinary_delete_failed") && l.includes("products/hung-asset"));
    assert.ok(structured, `destroy failure must be logged as a structured, alertable record naming the asset; logs: ${JSON.stringify(logs)}`);
  } finally {
    console.error = origError;
    cloudinary.uploader.destroy = original;
  }
});
