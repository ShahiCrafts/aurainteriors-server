// CodeQL class B, point-of-use sites patched in this run: the product
// category checks and the admin announcement list filters.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes, mockNext, until } = require("../audit/helpers");

// --- product create: object category must 400 before any DB lookup
let categoryLookups = [];
stubModule("models/product.model.js", { find: () => { throw new Error("not reached"); } });
stubModule("models/category.model.js", {
  findById: (id) => { categoryLookups.push(id); return Promise.resolve({ _id: id }); },
  find: () => ({ select: () => Promise.resolve([]) }),
});
stubModule("middleware/upload.middleware.js", { deleteFile: async () => {}, deleteFiles: async () => {} });
const productController = require("../../controllers/product.controller");

test("CQ-B: createProduct rejects a container category without querying it", async () => {
  categoryLookups = [];
  const res = mockRes();
  const next = mockNext();
  await productController.createProduct(
    { body: { name: "Chair", category: { $ne: null }, price: "100" }, files: {}, user: { role: "admin" } },
    res, next,
  );
  await until(() => next.error !== undefined || res.statusCode !== undefined);
  assert.equal(next.error?.statusCode, 400);
  assert.equal(categoryLookups.length, 0, "the object must never reach findById");
});

// --- announcement admin list: operator filters become "no filter"
let serviceOptions;
stubModule("services/announcementService.js", {
  getAllAnnouncements: async (options) => {
    serviceOptions = options;
    return { announcements: [], pagination: { total: 0, page: 1, pages: 0 } };
  },
});
const announcementController = require("../../controllers/announcement.controller");

test("CQ-B: announcement list filters are enum-forced at the point of use", async () => {
  const res = mockRes();
  const next = mockNext();
  await announcementController.getAllAnnouncements(
    { query: { status: { $ne: "draft" }, type: ["general"], priority: "high", isPinned: { $eq: true } } },
    res, next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(serviceOptions.status, undefined, "object status -> no filter");
  assert.equal(serviceOptions.type, undefined, "array type -> no filter");
  assert.equal(serviceOptions.priority, "high", "valid enum values pass through");
  assert.equal(serviceOptions.isPinned, undefined, "object isPinned -> no filter");

  const res2 = mockRes();
  await announcementController.getAllAnnouncements(
    { query: { status: "published", isPinned: "true" } }, res2, mockNext(),
  );
  await until(() => res2.body !== undefined);
  assert.equal(serviceOptions.status, "published");
  assert.equal(serviceOptions.isPinned, true);
});
