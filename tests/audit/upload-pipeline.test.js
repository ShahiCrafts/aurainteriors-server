// AR-12 — upload pipeline: bounded fan-out + aggregate byte budget.
// The resize/process handlers fanned out per-file sharp + Cloudinary
// work with unbounded Promise.all (up to 15 files/request), and the
// only byte limits were per-file (theoretical aggregate ~15 x 25 MB).
// Fix: an in-repo promise pool caps concurrent file pipelines at 3
// (default-on, behavior-preserving — same outputs), and an aggregate
// per-request budget applies ONLY when UPLOAD_MAX_TOTAL_BYTES is set
// (unset = today's per-file limits only = today's acceptance).
// sharp and Cloudinary are stubbed via require.cache (the
// upload-security.test.js pattern); the stubs carry artificial latency
// and count how many pipelines are in flight at once.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let sharpCalls = 0;
let sharpActive = 0;
let sharpPeak = 0;
let cloudCalls = 0;
let cloudActive = 0;
let cloudPeak = 0;

function resetCounters() {
  sharpCalls = 0; sharpActive = 0; sharpPeak = 0;
  cloudCalls = 0; cloudActive = 0; cloudPeak = 0;
}

const fakeSharp = () => {
  const chain = {
    resize: () => chain,
    toFormat: () => chain,
    jpeg: () => chain,
    png: () => chain,
    toBuffer: async () => {
      sharpCalls++;
      sharpActive++; sharpPeak = Math.max(sharpPeak, sharpActive);
      await sleep(40);
      sharpActive--;
      return Buffer.alloc(32);
    },
  };
  return chain;
};
stubModule("sharp", fakeSharp);
stubModule("config/cloudinary.js", {
  uploadToCloudinary: async () => {
    cloudCalls++;
    cloudActive++; cloudPeak = Math.max(cloudPeak, cloudActive);
    await sleep(20);
    cloudActive--;
    return { secure_url: "https://example.invalid/img.jpg", public_id: "stubbed" };
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

function run(mw, req) {
  return new Promise((resolve) => mw(req, {}, (err) => resolve(err || null)));
}

test("AR-12 (a): resizeProductImages caps concurrent pipelines at 3 while ALL files still process", { timeout: 30000 }, async () => {
  resetCounters();
  const files = Array.from({ length: 10 }, (_, i) => imageFile(`p${i}.png`));
  const err = await run(uploadMw.resizeProductImages, { files });
  assert.equal(err, null, `unexpected error: ${err && err.message}`);
  assert.equal(sharpCalls, 10, "every file must still be processed");
  assert.equal(cloudCalls, 10, "every file must still be uploaded");
  assert.ok(files.every((f) => f.cloudinaryUrl && f.cloudinaryPublicId), "every file carries its Cloudinary result");
  assert.ok(sharpPeak <= 3, `peak concurrent sharp pipelines must be <= 3, saw ${sharpPeak}`);
  assert.equal(sharpPeak, 3, "the pool should actually use the cap (parallel, not serialized)");
});

test("AR-12 (a): processProductFiles caps the model-file fan-out at 3 as well", { timeout: 30000 }, async () => {
  resetCounters();
  const modelFiles = Array.from({ length: 5 }, (_, i) => glbFile(`m${i}.glb`));
  const err = await run(uploadMw.processProductFiles, { files: { modelFiles } });
  assert.equal(err, null, `unexpected error: ${err && err.message}`);
  assert.equal(cloudCalls, 5, "every model file must still be uploaded");
  assert.ok(modelFiles.every((f) => f.cloudinaryUrl && f.platform === "android"), "every model file is processed with its platform tag");
  assert.ok(cloudPeak <= 3, `peak concurrent Cloudinary pipelines must be <= 3, saw ${cloudPeak}`);
});

test("AR-12 (b): UPLOAD_MAX_TOTAL_BYTES unset — a request at today's per-file limits succeeds", { timeout: 30000 }, async () => {
  delete process.env.UPLOAD_MAX_TOTAL_BYTES;
  resetCounters();
  const files = [imageFile("a.png", 1000), imageFile("b.png", 1000), imageFile("c.png", 1000)];
  const err = await run(uploadMw.resizeProductImages, { files });
  assert.equal(err, null, `unset budget must preserve today's acceptance; got: ${err && err.message}`);
  assert.equal(cloudCalls, 3);
});

test("AR-12 (b): UPLOAD_MAX_TOTAL_BYTES set below the aggregate — the same request is rejected 400 BEFORE any processing", { timeout: 30000 }, async () => {
  process.env.UPLOAD_MAX_TOTAL_BYTES = "1500";
  try {
    resetCounters();
    const files = [imageFile("a.png", 1000), imageFile("b.png", 1000), imageFile("c.png", 1000)];
    const err = await run(uploadMw.resizeProductImages, { files });
    assert.ok(err, "expected the aggregate budget to reject the request");
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /total/i);
    assert.equal(sharpCalls, 0, "sharp must never be invoked for an over-budget request");
    assert.equal(cloudCalls, 0, "Cloudinary must never be invoked for an over-budget request");

    // The budget aggregates across BOTH groups of processProductFiles.
    resetCounters();
    const err2 = await run(uploadMw.processProductFiles, {
      files: { images: [imageFile("a.png", 1000)], modelFiles: [glbFile("m.glb", 1000)] },
    });
    assert.ok(err2, "expected the cross-group aggregate to reject");
    assert.equal(err2.statusCode, 400);
    assert.equal(sharpCalls, 0);
    assert.equal(cloudCalls, 0);
  } finally {
    delete process.env.UPLOAD_MAX_TOTAL_BYTES;
  }
});
