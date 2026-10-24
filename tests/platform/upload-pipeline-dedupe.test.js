// AR-31(d) characterization: resizeProductImages and processProductFiles
// carried byte-identical copies of the per-file product-image pipeline
// (sharp resize -> jpeg -> Cloudinary upload -> attach results). After
// AR-31(d) both call ONE shared pipeline. This file pins, for BOTH
// handlers: the exact sharp configuration, the exact Cloudinary upload
// options, the req-file mutations, the compression log line, and each
// handler's own error wrapping (which differs and must stay different).
// Must pass byte-identically BEFORE and AFTER the extraction.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("../audit/helpers");

const sharpConfigs = [];
const uploads = [];
let sharpShouldThrow = false;

function fakeSharp(buffer) {
  const config = { inputLength: buffer.length };
  sharpConfigs.push(config);
  const chain = {
    resize: (w, h, opts) => { config.resize = [w, h, opts]; return chain; },
    toFormat: (f) => { config.format = f; return chain; },
    jpeg: (opts) => { config.jpeg = opts; return chain; },
    png: () => chain,
    toBuffer: async () => {
      if (sharpShouldThrow) throw new Error("sharp boom");
      return Buffer.alloc(50, 7); // deterministic "resized" output
    },
  };
  return chain;
}
stubModule("sharp", fakeSharp);
stubModule("config/cloudinary.js", {
  uploadToCloudinary: async (buffer, options) => {
    uploads.push({ bufferLength: buffer.length, options });
    return { secure_url: "https://example.invalid/img.jpg", public_id: options.public_id };
  },
  deleteFromCloudinary: async () => ({}),
});

const uploadMw = require("../../middleware/upload.middleware");

const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const imageFile = (name, size = 1000) => ({
  buffer: Buffer.concat([PNG_HEAD, Buffer.alloc(Math.max(0, size - PNG_HEAD.length))]),
  originalname: name,
  mimetype: "image/png",
  size,
});
const glbFile = (name, size = 1000) => ({
  buffer: Buffer.concat([Buffer.from("glTF"), Buffer.alloc(Math.max(0, size - 4))]),
  originalname: name,
  mimetype: "model/gltf-binary",
  size,
});
const usdzFile = (name, size = 1000) => ({
  buffer: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(Math.max(0, size - 4))]),
  originalname: name,
  mimetype: "model/vnd.usdz+zip",
  size,
});

function run(mw, req) {
  return new Promise((resolve) => mw(req, {}, (err) => resolve(err || null)));
}

async function captureConsole(fn) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => { lines.push(args.join(" ")); };
  try { return { result: await fn(), lines }; }
  finally { console.log = original; }
}

test("AR-31d both handlers run the identical per-file image pipeline", async () => {
  // resizeProductImages (req.files is an array)
  sharpConfigs.length = 0; uploads.length = 0;
  const filesA = [imageFile("a.png", 1000), imageFile("b.png", 2000)];
  const runA = await captureConsole(() => run(uploadMw.resizeProductImages, { files: filesA }));
  assert.equal(runA.result, null);
  const configsA = structuredClone(sharpConfigs);
  const uploadsA = uploads.map((u) => ({ bufferLength: u.bufferLength, folder: u.options.folder, resource_type: u.options.resource_type }));
  const attachedA = filesA.map((f) => [f.cloudinaryUrl, typeof f.cloudinaryPublicId]);

  // processProductFiles (req.files.images)
  sharpConfigs.length = 0; uploads.length = 0;
  const filesB = [imageFile("a.png", 1000), imageFile("b.png", 2000)];
  const runB = await captureConsole(() => run(uploadMw.processProductFiles, { files: { images: filesB } }));
  assert.equal(runB.result, null);

  assert.deepEqual(sharpConfigs, configsA, "sharp configuration must be identical across handlers");
  assert.deepEqual(configsA, [
    { inputLength: 1000, resize: [1200, 1200, { fit: "inside", withoutEnlargement: true }], format: "jpeg", jpeg: { quality: 80, progressive: true } },
    { inputLength: 2000, resize: [1200, 1200, { fit: "inside", withoutEnlargement: true }], format: "jpeg", jpeg: { quality: 80, progressive: true } },
  ]);
  assert.deepEqual(uploads.map((u) => ({ bufferLength: u.bufferLength, folder: u.options.folder, resource_type: u.options.resource_type })), uploadsA);
  assert.deepEqual(uploadsA, [
    { bufferLength: 50, folder: "aura/products", resource_type: "image" },
    { bufferLength: 50, folder: "aura/products", resource_type: "image" },
  ]);
  for (const u of uploads) assert.match(u.options.public_id, /^product-\d+-[0-9a-f]{16}$/);
  assert.deepEqual(filesB.map((f) => [f.cloudinaryUrl, typeof f.cloudinaryPublicId]), attachedA);
  assert.deepEqual(attachedA, [
    ["https://example.invalid/img.jpg", "string"],
    ["https://example.invalid/img.jpg", "string"],
  ]);
  // Identical compression log lines (modulo nothing — same inputs).
  assert.deepEqual(runB.lines, runA.lines);
  assert.match(runA.lines[0], /^\[Product Image Compression\] a\.png: 1\.0KB → 0\.0KB \(95\.0% reduction\)$/);
});

test("AR-31d error wrapping stays handler-specific", async () => {
  sharpShouldThrow = true;
  try {
    const errA = await run(uploadMw.resizeProductImages, { files: [imageFile("x.png")] });
    assert.equal(errA.statusCode, 500);
    assert.equal(errA.message, "Error processing images. Please try again.");
    const errB = await run(uploadMw.processProductFiles, { files: { images: [imageFile("x.png")] } });
    assert.equal(errB.statusCode, 500);
    assert.equal(errB.message, "Error processing files. Please try again.");
  } finally {
    sharpShouldThrow = false;
  }
});

test("AR-31d model-file pipeline is pinned (processProductFiles only)", async () => {
  uploads.length = 0;
  const models = [glbFile("m1.glb", 1234), usdzFile("m2.usdz", 777)];
  const err = await run(uploadMw.processProductFiles, { files: { modelFiles: models } });
  assert.equal(err, null);
  assert.equal(uploads.length, 2);
  const byExt = Object.fromEntries(uploads.map((u) => [u.options.public_id.split(".").pop(), u]));
  assert.equal(byExt.glb.options.folder, "aura/models");
  assert.equal(byExt.glb.options.resource_type, "raw");
  assert.match(byExt.glb.options.public_id, /^model-\d+-[0-9a-f]{16}\.glb$/);
  assert.match(byExt.usdz.options.public_id, /^model-\d+-[0-9a-f]{16}\.usdz$/);
  const glb = models.find((m) => m.originalname.endsWith(".glb"));
  const usdz = models.find((m) => m.originalname.endsWith(".usdz"));
  assert.equal(glb.platform, "android");
  assert.equal(glb.format, "glb");
  assert.equal(glb.fileSize, 1234);
  assert.equal(usdz.platform, "ios");
  assert.equal(usdz.format, "usdz");
  assert.equal(usdz.fileSize, 777);
  assert.ok(models.every((m) => m.cloudinaryUrl === "https://example.invalid/img.jpg"));
});

test("AR-31d empty/absent files are a pass-through for both handlers", async () => {
  assert.equal(await run(uploadMw.resizeProductImages, { files: [] }), null);
  assert.equal(await run(uploadMw.resizeProductImages, {}), null);
  assert.equal(await run(uploadMw.processProductFiles, { files: {} }), null);
  assert.equal(await run(uploadMw.processProductFiles, {}), null);
});
