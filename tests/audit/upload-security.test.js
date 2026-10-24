// Upload class: B-01 (content sniffing), B-03 (3D model filter/content),
// B-04 (document filter/content), B-05 (multer field/part limits).
// The main upload path trusted the client-supplied MIME type and, on the
// category path, uploaded the raw bytes untouched. Tests stub Cloudinary
// and use a real sharp-generated PNG for the valid-image cases.
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

let uploadCalls;
stubModule("config/cloudinary.js", {
  uploadToCloudinary: async (buffer, options) => {
    uploadCalls.push({ size: buffer.length, options });
    return { secure_url: "https://example.invalid/img.jpg", public_id: "stubbed" };
  },
  deleteFromCloudinary: async () => ({}),
});

const sharp = require("sharp");
const uploadMw = require("../../middleware/upload.middleware");

let pngBuffer;
before(async () => {
  pngBuffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } } }).png().toBuffer();
  uploadCalls = [];
});

function run(mw, req) {
  return new Promise((resolve) => {
    const res = {};
    mw(req, res, (err) => resolve(err || null));
  });
}
const HTML_BYTES = Buffer.from("<html><body><script>alert(1)</script></body></html>");
const EXE_BYTES = Buffer.from([0x4d, 0x5a, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00]);

// ---------- B-01: magic-byte / content verification ----------
test("B-01: avatar upload rejects non-image bytes labelled as an image (400, not 500)", async () => {
  uploadCalls = [];
  const err = await run(uploadMw.resizeAvatar, {
    file: { buffer: HTML_BYTES, mimetype: "image/png", originalname: "x.png" },
    user: { id: "u1" },
  });
  assert.ok(err, "expected an error");
  assert.equal(err.statusCode, 400);
  assert.equal(uploadCalls.length, 0, "nothing should reach Cloudinary");
});

test("B-01: category upload rejects non-image bytes instead of storing them raw", async () => {
  uploadCalls = [];
  const err = await run(uploadMw.resizeCategoryImage, {
    file: { buffer: HTML_BYTES, mimetype: "image/svg+xml", originalname: "x.svg" },
    user: { id: "u1" },
  });
  assert.ok(err, "expected an error");
  assert.equal(err.statusCode, 400);
  assert.equal(uploadCalls.length, 0);
});

test("characterization: category upload accepts a real PNG", async () => {
  uploadCalls = [];
  const req = { file: { buffer: pngBuffer, mimetype: "image/png", originalname: "x.png" }, user: { id: "u1" } };
  const err = await run(uploadMw.resizeCategoryImage, req);
  assert.equal(err, null);
  assert.equal(uploadCalls.length, 1);
  assert.ok(req.file.cloudinaryUrl);
});

test("characterization (ND-3 boundary): SVG is still accepted on the category path pending the owner's format decision", async () => {
  uploadCalls = [];
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>');
  const err = await run(uploadMw.resizeCategoryImage, {
    file: { buffer: svg, mimetype: "image/svg+xml", originalname: "x.svg" },
    user: { id: "u1" },
  });
  assert.equal(err, null);
  assert.equal(uploadCalls.length, 1);
});

test("characterization: avatar upload accepts a real PNG and re-encodes it", async () => {
  uploadCalls = [];
  const req = { file: { buffer: pngBuffer, mimetype: "image/png", originalname: "x.png" }, user: { id: "u1" } };
  const err = await run(uploadMw.resizeAvatar, req);
  assert.equal(err, null);
  assert.equal(uploadCalls.length, 1);
});

// ---------- B-03: 3D model content ----------
test("B-03: a non-GLB binary named .glb is rejected before upload", async () => {
  uploadCalls = [];
  const err = await run(uploadMw.processProductFiles, {
    files: { modelFiles: [{ buffer: EXE_BYTES, originalname: "model.glb", mimetype: "application/octet-stream", size: EXE_BYTES.length }] },
  });
  assert.ok(err, "expected an error");
  assert.equal(err.statusCode, 400);
  assert.equal(uploadCalls.length, 0);
});

test("characterization: a real GLB (glTF magic) is accepted", async () => {
  uploadCalls = [];
  const glb = Buffer.concat([Buffer.from("glTF"), Buffer.from([2, 0, 0, 0, 12, 0, 0, 0])]);
  const err = await run(uploadMw.processProductFiles, {
    files: { modelFiles: [{ buffer: glb, originalname: "model.glb", mimetype: "model/gltf-binary", size: glb.length }] },
  });
  assert.equal(err, null);
  assert.equal(uploadCalls.length, 1);
});

// ---------- B-04: document content must match the claimed type ----------
test("B-04: PDF bytes named .docx are rejected", async () => {
  uploadCalls = [];
  const err = await run(uploadMw.processDocumentFile, {
    file: { buffer: Buffer.from("%PDF-1.7\n%fake"), originalname: "evil.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  });
  assert.ok(err, "expected an error");
  assert.equal(err.statusCode, 400);
  assert.equal(uploadCalls.length, 0);
});

test("B-04: binary bytes named .txt are rejected", async () => {
  uploadCalls = [];
  const err = await run(uploadMw.processDocumentFile, {
    file: { buffer: EXE_BYTES, originalname: "notes.txt", mimetype: "text/plain" },
  });
  assert.ok(err, "expected an error");
  assert.equal(err.statusCode, 400);
  assert.equal(uploadCalls.length, 0);
});

test("characterization: a real PDF and a real text file are accepted", async () => {
  uploadCalls = [];
  const reqPdf = { file: { buffer: Buffer.from("%PDF-1.7\n%fake"), originalname: "a.pdf", mimetype: "application/pdf" } };
  assert.equal(await run(uploadMw.processDocumentFile, reqPdf), null);
  assert.equal(reqPdf.processedDocument.fileType, "pdf");
  const reqTxt = { file: { buffer: Buffer.from("plain text content"), originalname: "a.txt", mimetype: "text/plain" } };
  assert.equal(await run(uploadMw.processDocumentFile, reqTxt), null);
  assert.equal(reqTxt.processedDocument.fileType, "txt");
});

// ---------- B-05 + filter behavior over real multipart HTTP ----------
const express = require("express");
async function withServer(app, fn) {
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try { return await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((r) => server.close(r)); }
}
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  res.status(err.statusCode || 500).json({ code: err.code || "ERR", message: err.message });
}

test("B-05: multipart field-count flood is rejected by multer limits", async () => {
  const app = express();
  app.post("/files", uploadMw.uploadProductFiles, (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  await withServer(app, async (base) => {
    const fd = new FormData();
    fd.append("images", new Blob([pngBuffer], { type: "image/png" }), "x.png");
    for (let i = 0; i < 300; i++) fd.append(`field${i}`, "x");
    const res = await fetch(`${base}/files`, { method: "POST", body: fd });
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(body.code, "LIMIT_FIELD_COUNT", `expected LIMIT_FIELD_COUNT, got ${JSON.stringify(body)}`);
  });
});

test("B-04: document filter no longer lets an arbitrary MIME through on a .csv filename", async () => {
  const app = express();
  app.post("/doc", uploadMw.uploadDocumentFile, (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  await withServer(app, async (base) => {
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("a,b\n1,2")], { type: "application/x-msdownload" }), "data.csv");
    const res = await fetch(`${base}/doc`, { method: "POST", body: fd });
    assert.equal(res.status, 400, `expected the filter to reject, got ${res.status}`);
  });
});
