// Direct (signed, browser -> Cloudinary) chat uploads: the sign
// step is stateless; the complete step must verify the asset
// against Cloudinary's record and write the same ledger row the
// proxied upload writes. Cloudinary + models are stubbed via
// require.cache before the service loads (tests/audit/helpers).
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("../audit/helpers");

const ledgerRows = [];
let resourceResult = null;
let resourceError = null;

stubModule("config/cloudinary.js", {
  uploadToCloudinary: async () => {
    throw new Error("proxied upload not used in these tests");
  },
  deleteFromCloudinary: async () => {},
  signDirectUploadParams: ({ folder, publicId }) => ({
    cloudName: "demo-cloud",
    apiKey: "1234567890",
    timestamp: 1700000000,
    signature: "signed-params",
    folder,
    publicId,
  }),
  getDirectUploadResource: async () => {
    if (resourceError) throw resourceError;
    return resourceResult;
  },
});
stubModule("models/chatUpload.model.js", {
  create: async (row) => {
    ledgerRows.push(row);
    return row;
  },
  findOne: async () => null,
  updateOne: async () => ({ matchedCount: 1 }),
});
stubModule("models/chatMessage.model.js", {});

const service = require("../../services/chatUpload.service");

const UUID = "3f9c1d2e-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

test.beforeEach(() => {
  ledgerRows.length = 0;
  resourceResult = null;
  resourceError = null;
});

test("signDirectUpload returns signed params for one image asset", () => {
  const signed = service.signDirectUpload();
  assert.equal(signed.cloudName, "demo-cloud");
  assert.equal(signed.apiKey, "1234567890");
  assert.equal(signed.signature, "signed-params");
  assert.equal(signed.folder, "aura/chat");
  assert.equal(signed.resourceType, "image");
  assert.match(signed.publicId, /^[a-f0-9-]{36}$/i);
});

test("completeDirectUpload verifies the asset and writes the ledger row", async () => {
  resourceResult = {
    format: "jpg",
    bytes: 54321,
    secure_url: `https://res.cloudinary.com/demo-cloud/image/upload/aura/chat/${UUID}.jpg`,
  };
  const out = await service.completeDirectUpload("chat-1", "actor-1", {
    publicId: UUID,
    fileName: "profile photo.jpg",
  });
  assert.equal(ledgerRows.length, 1);
  assert.equal(ledgerRows[0].chat, "chat-1");
  assert.equal(ledgerRows[0].actor, "actor-1");
  assert.equal(ledgerRows[0].publicId, `aura/chat/${UUID}`);
  assert.equal(ledgerRows[0].resourceType, "image");
  assert.ok(ledgerRows[0].expiresAt > new Date());
  assert.deepEqual(out.attachment, {
    fileName: "profile photo.jpg",
    fileUrl: resourceResult.secure_url,
    fileType: "image",
    fileSize: 54321,
  });
});

test("completeDirectUpload rejects a malformed publicId before any lookup", async () => {
  await assert.rejects(
    () =>
      service.completeDirectUpload("chat-1", "actor-1", {
        publicId: "../../etc/passwd",
        fileName: "x.jpg",
      }),
    (err) => err.statusCode === 400,
  );
  assert.equal(ledgerRows.length, 0);
});

test("completeDirectUpload rejects an asset Cloudinary cannot verify", async () => {
  resourceError = new Error("not found");
  await assert.rejects(
    () =>
      service.completeDirectUpload("chat-1", "actor-1", {
        publicId: UUID,
        fileName: "x.jpg",
      }),
    (err) => err.statusCode === 400,
  );
  assert.equal(ledgerRows.length, 0);
});

test("completeDirectUpload rejects disallowed formats and oversize assets", async () => {
  resourceResult = {
    format: "tiff",
    bytes: 100,
    secure_url: "https://res.cloudinary.com/x/y.tiff",
  };
  await assert.rejects(
    () =>
      service.completeDirectUpload("chat-1", "actor-1", {
        publicId: UUID,
        fileName: "x.tiff",
      }),
    (err) => err.statusCode === 400,
  );
  resourceResult = {
    format: "png",
    bytes: 11 * 1024 * 1024,
    secure_url: "https://res.cloudinary.com/x/y.png",
  };
  await assert.rejects(
    () =>
      service.completeDirectUpload("chat-1", "actor-1", {
        publicId: UUID,
        fileName: "x.png",
      }),
    (err) => err.statusCode === 400,
  );
  assert.equal(ledgerRows.length, 0);
});
