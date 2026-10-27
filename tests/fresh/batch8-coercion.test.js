// Batch 8 (FRESH remediation): FA-46, FA-49, FA-51, FA-76, FA-77, FA-26, FA-61.
// Required behavior: repeated-param arrays (?x=a&x=b) and operator objects
// (?x[$ne]=y) produce safe handling - never a 500 or a changed query.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };
function mkRes() {
  return { code: null, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}
const chain = (result) => {
  const q = { sort: () => q, skip: () => q, limit: () => q, select: () => q, populate: () => q, lean: async () => result, then: (res, rej) => Promise.resolve(result).then(res, rej) };
  return q;
};

test("FA-61: sanitizer fails closed beyond the depth cap and covers params", () => {
  const mw = require(path.join(repo, "middleware/nosqlSanitize.middleware.js"));
  const run = (req) => new Promise((resolve) => mw(req, {}, (e) => resolve(e || null)));
  return (async () => {
    // operator key at depth 12 - previously unscanned (fail-open)
    let deep = { a: { $ne: 1 } };
    for (let i = 0; i < 11; i++) deep = { a: deep };
    assert.ok(await run({ body: deep, query: {}, params: {} }), "deep operator payload rejected");
    // benign but very deep structure - also rejected (fail closed)
    let benign = { v: 1 };
    for (let i = 0; i < 12; i++) benign = { a: benign };
    assert.ok(await run({ body: benign, query: {}, params: {} }), "excess depth rejected, not passed unscanned");
    // params are covered now
    assert.ok(await run({ body: {}, query: {}, params: { id: { $gt: "" } } }), "params operator rejected");
    // ordinary payload passes
    assert.equal(await run({ body: { msg: "costs $5", nested: { ok: [1, 2] } }, query: { page: "2" }, params: {} }), null);
  })();
});

test("FA-49: getCategoryProducts survives repeated-param arrays", async () => {
  // Phase 0.5 (Cluster A): getCategoryProducts now calls
  // Category.getDescendantIds (owner change; models/category.model.js:93).
  // Faithful port of the model's BFS over this harness's fixture
  // universe (one root category, no children), read through the same
  // find({}, '_id parent').lean() access pattern.
  stub("models/category.model.js", {
    findOne: async () => ({ _id: "c1", name: "Chairs", slug: "chairs" }),
    find: () => chain([{ _id: "c1", parent: null }]),
    getDescendantIds: async function (id) {
      const categories = await this.find({}, "_id parent").lean();
      const children = new Map();
      for (const category of categories) {
        const key = String(category.parent || "");
        if (!children.has(key)) children.set(key, []);
        children.get(key).push(String(category._id));
      }
      const seen = new Set();
      const queue = [String(id)];
      while (queue.length) {
        const current = queue.shift();
        if (seen.has(current)) continue;
        seen.add(current);
        queue.push(...(children.get(current) || []));
      }
      return [...seen];
    },
  });
  stub("models/product.model.js", { find: () => chain([]), countDocuments: async () => 0 });
  const ctrl = require(path.join(repo, "controllers/category.controller.js"));
  const res = mkRes(); let nextErr = null;
  ctrl.getCategoryProducts({ params: { id: "chairs" }, query: { colors: ["red", "blue"], minPrice: { $gt: "1" }, search: ["x"] } }, res, (e) => { nextErr = e; });
  await flush();
  assert.equal(nextErr, null);
  assert.equal(res.code, 200);
});

test("FA-51: blog list drops non-scalar category values", async () => {
  let seenFilter = null;
  stub("models/blog.model.js", {
    find: (f) => { seenFilter = f; return chain([]); },
    countDocuments: async () => 0,
  });
  stub("models/blogEngagement.model.js", { create: async () => ({}) });
  const ctrl = require(path.join(repo, "controllers/blog.controller.js"));
  const res = mkRes(); let nextErr = null;
  ctrl.getAllBlogs({ query: { category: { $ne: null }, tag: ["a", "b"] }, cookies: {} }, res, (e) => { nextErr = e; });
  await flush();
  assert.equal(nextErr, null);
  assert.equal(seenFilter.category, undefined);
  assert.equal(seenFilter.tags, undefined);
});

test("FA-46: admin user list coerces role/isActive/search", async () => {
  let seenFilter = null;
  stub("models/user.model.js", {
    find: (f) => { seenFilter = f; return chain([]); },
    countDocuments: async () => 0,
  });
  const ctrl = require(path.join(repo, "controllers/user.controller.js"));
  const res = mkRes(); let nextErr = null;
  ctrl.getAllUsers({ query: { role: { $ne: "customer" }, isActive: ["true"], search: { x: 1 } } }, res, (e) => { nextErr = e; });
  await flush();
  assert.equal(nextErr, null);
  assert.equal(seenFilter.role, undefined);
  assert.equal(seenFilter.isActive, undefined);
  assert.equal(seenFilter.$or, undefined);
});

test("FA-76: getMyOrders coerces the status filter", async () => {
  let seenFilter = null;
  stub("models/order.model.js", {
    find: (f) => { seenFilter = f; return chain([]); },
    countDocuments: async () => 0,
  });
  const ctrl = require(path.join(repo, "controllers/order.controller.js"));
  const res = mkRes(); let nextErr = null;
  ctrl.getMyOrders({ query: { status: { $ne: "pending" } }, user: { _id: "64b64c2f9f1b2c3d4e5f6001" } }, res, (e) => { nextErr = e; });
  await flush();
  assert.equal(nextErr, null);
  assert.equal(seenFilter.orderStatus, undefined);
});

test("FA-26: /bulk/update is registered before /:id and its schema is strict", () => {
  const router = require(path.join(repo, "routes/contact.routes.js"));
  const paths = router.stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
  const bulkIdx = paths.indexOf("PATCH /bulk/update");
  const idIdx = paths.indexOf("PATCH /:id");
  assert.ok(bulkIdx !== -1 && idIdx !== -1, paths.join(", "));
  assert.ok(bulkIdx < idIdx, "bulk route precedes the /:id route");
  const { bulkUpdateContactSchema } = require(path.join(repo, "validators/contact.validator.js"));
  const hex = "64b64c2f9f1b2c3d4e5f6001";
  assert.equal(bulkUpdateContactSchema.validate({ ids: [hex], status: "resolved" }).error, undefined);
  assert.ok(bulkUpdateContactSchema.validate({ ids: Array(101).fill(hex), status: "resolved" }).error, "ids capped at 100");
  assert.ok(bulkUpdateContactSchema.validate({ ids: [hex], role: "admin" }).error, "unknown update fields rejected/stripped and .or requires a real field");
  assert.ok(bulkUpdateContactSchema.validate({ ids: ["not-an-id"], status: "resolved" }).error, "ids must be ObjectIds");
});
