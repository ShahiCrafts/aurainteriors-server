// AR-21 — commit-before-delete ordering. Product/category/profile
// update+delete paths destroyed the OLD Cloudinary assets BEFORE the
// database write that stopped referencing them; a failed save/update
// then left the live record pointing at destroyed assets (broken
// images, permanently). Fault injection: make the DB write throw and
// assert NO asset deletion was attempted; when the write succeeds,
// assert deletions happen strictly AFTER it. One shared `events` log
// per scenario records the order.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery, mockRes, mockNext, until } = require("./helpers");

let events = [];
let productDoc;
let productDbError = null;
let categoryDoc;
let categoryDbError = null;
let userDoc;
let userDbError = null;

function baseProductDoc() {
  return {
    _id: "prod1",
    name: "Chair",
    images: [{ url: "https://cdn/old.png", publicId: "old_img", isPrimary: true }],
    modelFiles: [{ url: "https://cdn/old.glb", publicId: "old_model", isExternal: false }],
    save: async () => { events.push("product.save"); if (productDbError) throw productDbError; return productDoc; },
    populate: async () => productDoc,
  };
}

stubModule("models/product.model", {
  findOne: () => makeQuery(productDoc),
  findById: () => makeQuery(productDoc),
  findByIdAndDelete: async () => { events.push("product.delete"); if (productDbError) throw productDbError; return productDoc; },
});
stubModule("models/category.model", {
  findById: () => makeQuery(categoryDoc),
  countDocuments: async () => 0,
  findByIdAndDelete: async () => { events.push("category.delete"); if (categoryDbError) throw categoryDbError; return categoryDoc; },
});
stubModule("middleware/upload.middleware", {
  deleteFile: async (publicId) => { events.push(`deleteFile:${publicId}`); return { result: "ok" }; },
  deleteFiles: async (ids) => { events.push(`deleteFiles:${ids.join(",")}`); return []; },
});
stubModule("models/user.model", {
  findById: () => makeQuery(userDoc),
  findByIdAndUpdate: async () => { events.push("user.update"); if (userDbError) throw userDbError; return userDoc; },
});
stubModule("models/revokedToken.model", { exists: async () => null, create: async () => ({}) });
stubModule("config/cloudinary", {
  deleteFromCloudinary: async (publicId) => { events.push(`deleteAvatar:${publicId}`); return { result: "ok" }; },
  uploadToCloudinary: async () => ({}),
  getCloudinaryConfig: () => ({}),
  cloudinary: {},
});

const productCtrl = require("../../controllers/product.controller");
const categoryCtrl = require("../../controllers/category.controller");
const profileCtrl = require("../../controllers/profile.controller");

function reset() { events = []; productDbError = null; categoryDbError = null; userDbError = null; }

test("AR-21 product update: a failed save leaves the product pointing at LIVE assets (no delete attempted)", async () => {
  reset();
  productDoc = baseProductDoc();
  productDbError = new Error("validation failed");
  const res = mockRes(); const next = mockNext();
  const req = {
    params: { id: "prod1" },
    body: { removeImages: JSON.stringify(["https://cdn/old.png"]), removeModelFiles: JSON.stringify(["https://cdn/old.glb"]) },
    files: undefined,
    user: { _id: "admin1", role: "admin" },
    headers: {},
  };
  productCtrl.updateProduct(req, res, next);
  await until(() => next.error !== undefined || res.body !== undefined);
  assert.ok(next.error, "the save failure must surface as an error");
  assert.deepEqual(events.filter((e) => e.startsWith("delete")), [], `no asset may be deleted when the commit fails; events: ${JSON.stringify(events)}`);
});

test("AR-21 product update: on success, replaced assets are deleted AFTER the save", async () => {
  reset();
  productDoc = baseProductDoc();
  const res = mockRes(); const next = mockNext();
  const req = {
    params: { id: "prod1" },
    body: { removeImages: JSON.stringify(["https://cdn/old.png"]) },
    files: undefined,
    user: { _id: "admin1", role: "admin" },
    headers: {},
  };
  productCtrl.updateProduct(req, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  const saveIdx = events.indexOf("product.save");
  const delIdx = events.indexOf("deleteFile:old_img");
  assert.ok(saveIdx !== -1 && delIdx !== -1, `expected save then delete; events: ${JSON.stringify(events)}`);
  assert.ok(delIdx > saveIdx, "delete must follow the commit");
});

test("AR-21 product hard delete: a failed DB delete leaves assets untouched; success deletes assets after", async () => {
  reset();
  productDoc = baseProductDoc();
  productDbError = new Error("db delete failed");
  let res = mockRes(); let next = mockNext();
  productCtrl.hardDeleteProduct({ params: { id: "prod1" }, user: { _id: "a", role: "admin" }, headers: {} }, res, next);
  await until(() => next.error !== undefined || res.body !== undefined);
  assert.ok(next.error);
  assert.deepEqual(events.filter((e) => e.startsWith("deleteF")), [], `assets must survive a failed DB delete; events: ${JSON.stringify(events)}`);

  reset();
  res = mockRes(); next = mockNext();
  productCtrl.hardDeleteProduct({ params: { id: "prod1" }, user: { _id: "a", role: "admin" }, headers: {} }, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined);
  assert.ok(events.indexOf("deleteFiles:old_img") > events.indexOf("product.delete"), `assets deleted only after the record; events: ${JSON.stringify(events)}`);
});

test("AR-21 category update + delete: image deletion follows the DB commit", async () => {
  reset();
  categoryDoc = {
    _id: "cat1", name: "Chairs", image: "https://cdn/cat-old.png", imagePublicId: "cat_old",
    save: async () => { events.push("category.save"); if (categoryDbError) throw categoryDbError; return categoryDoc; },
  };
  categoryDbError = new Error("save failed");
  let res = mockRes(); let next = mockNext();
  const req = { params: { id: "cat1" }, body: { name: "Chairs 2" }, file: { cloudinaryUrl: "https://cdn/cat-new.png", cloudinaryPublicId: "cat_new" }, user: { _id: "a", role: "admin" }, headers: {} };
  categoryCtrl.updateCategory(req, res, next);
  await until(() => next.error !== undefined || res.body !== undefined);
  assert.ok(next.error);
  assert.deepEqual(events.filter((e) => e.startsWith("deleteFile")), [], "old category image must survive a failed save");

  reset();
  categoryDbError = new Error("db delete failed");
  res = mockRes(); next = mockNext();
  categoryCtrl.deleteCategory({ params: { id: "cat1" }, user: { _id: "a", role: "admin" }, headers: {} }, res, next);
  await until(() => next.error !== undefined || res.body !== undefined);
  assert.ok(next.error);
  assert.deepEqual(events.filter((e) => e.startsWith("deleteFile")), [], "category image must survive a failed DB delete");
});

test("AR-21 profile avatar: old avatar deleted only after the user update commits", async () => {
  reset();
  userDoc = { _id: "u1", avatar: "https://cdn/ava-old.png", avatarPublicId: "ava_old" };
  userDbError = new Error("update failed");
  let res = mockRes();
  await profileCtrl.updateAvatar({ file: { cloudinaryUrl: "https://cdn/ava-new.png", cloudinaryPublicId: "ava_new" }, user: { id: "u1" }, headers: {} }, res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(events.filter((e) => e.startsWith("deleteAvatar")), [], "old avatar must survive a failed profile update");

  reset();
  res = mockRes();
  await profileCtrl.updateAvatar({ file: { cloudinaryUrl: "https://cdn/ava-new.png", cloudinaryPublicId: "ava_new" }, user: { id: "u1" }, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(events.indexOf("deleteAvatar:ava_old") > events.indexOf("user.update"), `avatar delete must follow the update; events: ${JSON.stringify(events)}`);
});
