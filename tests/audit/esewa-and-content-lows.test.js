// Lows batch 2: B-23 (eSewa refund field conflicts), B-31 (blog tag
// exact match, chunkText tail duplication), C-14 (operator-key
// rejection), C-08 (ObjectId param guard).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("./helpers");

// ---------- B-23(c): refund verification must reject conflicting fields ----------
let providerData;
stubModule("axios", { get: async () => ({ data: providerData }) });
const esewaVerification = require("../../services/esewaVerification.service");
const refundConfig = {
  statusUrl: "https://example.invalid/status",
  merchantId: "EPAYTEST",
};
const refundOrder = {
  orderId: "ORD-9",
  total: 100,
  paymentDetails: { transactionId: "REF-1" },
};

test("B-23: refund verification rejects a response whose legacy and modern fields conflict", async () => {
  providerData = {
    status: "FULL_REFUND",
    product_code: "EPAYTEST",
    scd: "SOMEONE-ELSE",
    transaction_uuid: "ORD-9",
    total_amount: "100.00",
    ref_id: "REF-1",
  };
  await assert.rejects(
    () => esewaVerification.verifyEsewaRefund(refundOrder, refundConfig),
    /REFUND_NOT_VERIFIED/,
  );
});

test("characterization: refund verification accepts a consistent response", async () => {
  providerData = {
    status: "FULL_REFUND",
    product_code: "EPAYTEST",
    transaction_uuid: "ORD-9",
    total_amount: "100.00",
    ref_id: "REF-1",
  };
  const ref = await esewaVerification.verifyEsewaRefund(
    refundOrder,
    refundConfig,
  );
  assert.equal(ref, "REF-1");
});

// ---------- B-31: blog tag filter is an exact match ----------
let capturedBlogFilter;
stubModule("models/blog.model.js", {
  find: (filter) => {
    capturedBlogFilter = filter;
    return makeQuery([]);
  },
  countDocuments: async () => 0,
});
stubModule("services/rssFeedService.js", {
  fetchAllFeeds: async () => {},
  updateFeaturedArticles: async () => {},
  getFeedSources: async () => [],
});
const blogController = require("../../controllers/blog.controller");

test("B-31: filtering blogs by tag matches whole tags, not substrings", async () => {
  capturedBlogFilter = undefined;
  const res = mockRes();
  blogController.getAllBlogs({ query: { tag: "art" } }, res, mockNext());
  await until(
    () => capturedBlogFilter !== undefined || res.statusCode !== undefined,
  );
  const pattern = capturedBlogFilter.tags.$in[0];
  assert.ok(pattern instanceof RegExp);
  assert.ok(pattern.test("art"), "the exact tag matches");
  assert.ok(
    !pattern.test("artistic"),
    "a longer tag containing it must NOT match",
  );
  assert.ok(!pattern.test("smart"), "a tag ending with it must NOT match");
});

// ---------- B-31: chunkText does not duplicate the tail ----------
// ---------- C-14 ----------

test("B-31: chunkText emits no fully-duplicated trailing chunk", () => {
  delete require.cache[require.resolve("../../services/ingestionService")];
  const svc = require("../../services/ingestionService");
  const text = "a".repeat(2500);
  const chunks = svc.chunkText(text);
  assert.equal(
    chunks.length,
    3,
    `expected 3 chunks for 2500 chars (1000/200 overlap), got ${chunks.length}`,
  );
  const joined = chunks.join("");
  assert.ok(
    joined.length < 2500 + 2 * 200 + 10,
    "chunks should overlap by ~200, not duplicate whole tails",
  );
  assert.ok(
    chunks[chunks.length - 1].length >= 800,
    "the final chunk should be substantial, not a sliver duplicate",
  );
});

// ---------- C-14 ----------
test("C-14: operator-style keys in body/query are rejected with 400", () => {
  const sanitize = require("../../middleware/nosqlSanitize.middleware");
  const run = (req) => {
    let err;
    let passed = false;
    sanitize(req, mockRes(), (e) => {
      err = e;
      passed = !e;
    });
    return { err, passed };
  };
  assert.equal(
    run({ body: { email: { $gt: "" } }, query: {} }).err?.statusCode,
    400,
  );
  assert.equal(
    run({ body: {}, query: { price: { $gte: "0" } } }).err?.statusCode,
    400,
  );
  assert.equal(run({ body: { "a.b": 1 }, query: {} }).err?.statusCode, 400);
  assert.equal(
    run({ body: { nested: { list: [{ $where: "x" }] } }, query: {} }).err
      ?.statusCode,
    400,
  );
  // (built via JSON.parse, as a real request body arrives - an object
  // literal would set the prototype instead of creating the key)
  assert.equal(
    run({ body: JSON.parse('{"__proto__": {"polluted": true}}'), query: {} })
      .err?.statusCode,
    400,
  );
  assert.equal(
    run({
      body: {
        email: "a@example.com",
        items: [{ productId: "x", quantity: 2 }],
      },
      query: { page: "1" },
    }).passed,
    true,
  );
  assert.equal(
    run({ body: { message: "Costs $5 and 3.5 stars" }, query: {} }).passed,
    true,
    "dollar/dot in VALUES are fine",
  );
});

// ---------- C-08 ----------
test("C-08: the ObjectId param guard accepts real ids and rejects junk with 400", () => {
  const guard = require("../../middleware/objectIdParam.middleware");
  let err;
  let passed = false;
  guard(
    {},
    mockRes(),
    (e) => {
      err = e;
      passed = !e;
    },
    "507f1f77bcf86cd799439011",
    "id",
  );
  assert.equal(passed, true);
  assert.equal(err, undefined);
  guard(
    {},
    mockRes(),
    (e) => {
      err = e;
    },
    "not-an-id",
    "id",
  );
  assert.equal(err?.statusCode, 400);
  guard(
    {},
    mockRes(),
    (e) => {
      err = e;
    },
    "507f1f77bcf86cd79943901",
    "id",
  ); // 23 chars
  assert.equal(err?.statusCode, 400);
});
