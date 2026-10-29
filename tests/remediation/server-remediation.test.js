// Remediation (audit report follow-up): SEC-011, PERF-013, PERF-015,
// PERF-016, PERF-018 server fixes. Stub-based (tests/audit/helpers):
// no DB, no network, no real .env.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes, mockNext, until } = require("../audit/helpers");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-remediation";

// ---------------------------------------------------------------------------
// SEC-011: order id suffix lengthened to 8 chars (CSPRNG), old IDs valid
// ---------------------------------------------------------------------------
const Order = require("../../models/order.model");

test("SEC-011: generateOrderSuffix returns 8 chars from [0-9A-Z], effectively unique", () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const suffix = Order.generateOrderSuffix();
    assert.match(suffix, /^[0-9A-Z]{8}$/);
    seen.add(suffix);
  }
  assert.ok(seen.size > 1990, `expected near-unique suffixes, got ${seen.size}`);
});

test("SEC-011: tracking validator accepts both old (4-char) and new (8-char) suffix order IDs", async () => {
  const { orderTrackingSchema } = require("../../validators/order.validator");
  // Old format: AU + 8-char base36 timestamp + 4-char suffix (14 total).
  const oldId = "AU" + "M3K7Z2AB" + "AB12";
  // New format: same prefix/timestamp + 8-char suffix (18 total).
  const newId = "AU" + "M3K7Z2AB" + "AB12CD34";
  for (const orderId of [oldId, newId]) {
    const { error } = orderTrackingSchema.validate({
      orderId,
      email: "guest@example.com",
    });
    assert.equal(error, undefined, `${orderId}: ${error && error.message}`);
  }
});

// ---------------------------------------------------------------------------
// SEC-011: per email+orderId attempt limiter on POST /track
// ---------------------------------------------------------------------------
const { trackAttemptRateLimit } = require("../../middleware/rateLimit.middleware");

function limiterRes() {
  return {
    headers: {},
    statusCode: undefined,
    body: undefined,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    getHeader(k) {
      return this.headers[k];
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}

test("SEC-011: trackAttemptRateLimit throttles repeated guesses for the same email+orderId only", async () => {
  const mw = trackAttemptRateLimit(3);
  const attempt = async (email, orderId) => {
    const req = {
      body: { email, orderId },
      ip: "203.0.113.9",
      headers: {},
      socket: { remoteAddress: "203.0.113.9" },
    };
    const res = limiterRes();
    let nexted = false;
    await mw(req, res, () => {
      nexted = true;
    });
    return { nexted, res };
  };
  // Case/whitespace variants of the same pair share one bucket.
  assert.equal((await attempt("Guest@Example.com", "au111")).nexted, true);
  assert.equal((await attempt("guest@example.com", "AU111")).nexted, true);
  assert.equal((await attempt(" guest@example.com ", " AU111 ")).nexted, true);
  const blocked = await attempt("guest@example.com", "AU111");
  assert.equal(blocked.nexted, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.res.body.code, "RATE_LIMIT_EXCEEDED");
  // A different pair from the same IP is unaffected.
  assert.equal((await attempt("other@example.com", "AU222")).nexted, true);
});

// ---------------------------------------------------------------------------
// PERF-013: chat controllers clamp page/limit before the service layer
// ---------------------------------------------------------------------------
const chatServiceCalls = { getCustomerChats: [], getAllChats: [] };
stubModule("services/chatService", {
  getCustomerChats: async (userId, options) => {
    chatServiceCalls.getCustomerChats.push(options);
    return { chats: [], pagination: { page: options.page, limit: options.limit } };
  },
  getAllChats: async (options) => {
    chatServiceCalls.getAllChats.push(options);
    return { chats: [], pagination: { page: options.page, limit: options.limit } };
  },
});
stubModule("models/guestSession.model", {
  create: async (doc) => ({ _id: "gs1", ...doc }),
  updateOne: async () => ({ matchedCount: 1 }),
});
const chatCtrl = require("../../controllers/chat.controller");

test("PERF-013: getMyChats clamps limit=100000, page=-5 and non-numeric input", async () => {
  const call = async (query) => {
    const res = mockRes();
    const next = mockNext();
    chatCtrl.getMyChats({ query, user: { _id: "u1" } }, res, next);
    await until(() => res.body !== undefined || next.error !== undefined);
    assert.equal(next.error, undefined);
    return chatServiceCalls.getCustomerChats.at(-1);
  };
  assert.deepEqual(await call({ limit: "100000", page: "2" }), {
    page: 2,
    limit: 100,
    status: undefined,
  });
  assert.deepEqual(await call({ limit: "20", page: "-5" }), {
    page: 1,
    limit: 20,
    status: undefined,
  });
  assert.deepEqual(await call({ limit: "abc", page: "xyz" }), {
    page: 1,
    limit: 20,
    status: undefined,
  });
});

test("PERF-013: getAllChats clamps limit/page the same way", async () => {
  const res = mockRes();
  const next = mockNext();
  chatCtrl.getAllChats(
    { query: { limit: "100000", page: "-5" }, user: { _id: "a1" } },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined);
  const options = chatServiceCalls.getAllChats.at(-1);
  assert.equal(options.limit, 100);
  assert.equal(options.page, 1);
});

// ---------------------------------------------------------------------------
// PERF-015: TTL caches are size-bounded with eviction + expiry sweep
// ---------------------------------------------------------------------------
test("PERF-015: ttlCache caps entries with oldest-first eviction; hit/miss unchanged", () => {
  process.env.ANALYTICS_CACHE_TTL_MS = "60000";
  process.env.ANALYTICS_CACHE_MAX_ENTRIES = "3";
  const ttlCache = require("../../utils/ttlCache");
  ttlCache.clearCache();
  assert.equal(ttlCache.maxEntries(), 3);
  assert.equal(ttlCache.getCached("missing"), undefined);
  for (const key of ["a", "b", "c", "d", "e"]) ttlCache.setCached(key, { key });
  assert.equal(ttlCache._store.size, 3);
  assert.equal(ttlCache.getCached("a"), undefined, "oldest evicted");
  assert.deepEqual(ttlCache.getCached("e"), { key: "e" });
  // Sweep removes expired entries only.
  ttlCache._store.get("e").at = Date.now() - 120000;
  assert.equal(ttlCache.sweepExpired(), 1);
  assert.equal(ttlCache.getCached("e"), undefined);
  assert.deepEqual(ttlCache.getCached("d"), { key: "d" });
  ttlCache.clearCache();
  delete process.env.ANALYTICS_CACHE_MAX_ENTRIES;
});

test("PERF-015: catalogCache caps entries with oldest-first eviction; hit/miss unchanged", () => {
  const catalogCache = require("../../utils/catalogCache");
  catalogCache.invalidateCatalogCache();
  const env = { CATALOG_CACHE_MAX_ENTRIES: "3" };
  assert.equal(catalogCache.maxEntries(env), 3);
  assert.equal(catalogCache.maxEntries({}), 500);
  for (const key of ["k1", "k2", "k3", "k4"]) catalogCache.set(key, { key }, env);
  assert.equal(catalogCache._store.size, 3);
  assert.equal(catalogCache.get("k1", env), undefined, "oldest evicted");
  assert.deepEqual(catalogCache.get("k4", env), { key: "k4" });
  catalogCache._store.get("k4").at = Date.now() - 120000;
  assert.equal(catalogCache.sweepExpired(Date.now(), {}), 1);
  catalogCache.invalidateCatalogCache();
});

// ---------------------------------------------------------------------------
// PERF-016: newsletter nonce backfill is batched via bulkWrite
// ---------------------------------------------------------------------------
test("PERF-016: ensureSubscriberNonces bulk-writes per-subscriber nonces, preserves raced/existing nonces", async () => {
  const store = new Map([
    ["1", { _id: "1", unsubscribeNonce: null }],
    ["2", { _id: "2", unsubscribeNonce: "existing-nonce" }],
    ["3", { _id: "3", unsubscribeNonce: "raced-nonce" }],
  ]);
  let bulkCalls = 0;
  stubModule("models/newsletter.model", {
    bulkWrite: async (ops) => {
      bulkCalls++;
      for (const op of ops) {
        const doc = store.get(String(op.updateOne.filter._id));
        // Same conditional claim as production: only when still null.
        if (doc && doc.unsubscribeNonce === null)
          doc.unsubscribeNonce = op.updateOne.update.$set.unsubscribeNonce;
      }
      return { ok: 1 };
    },
    find: (filter) => {
      const docs = filter._id.$in
        .map((id) => store.get(String(id)))
        .filter(Boolean)
        .map((d) => ({ ...d }));
      const chain = {
        select: () => chain,
        lean: async () => docs,
      };
      return chain;
    },
  });
  const broadcastJobs = require("../../services/broadcastJobs.service");
  const subscribers = [
    { _id: "1", unsubscribeNonce: null },
    { _id: "2", unsubscribeNonce: "existing-nonce" },
    { _id: "3", unsubscribeNonce: null },
  ];
  const out = await broadcastJobs.ensureSubscriberNonces(subscribers);
  assert.equal(bulkCalls, 1, "one bulkWrite for the whole batch");
  assert.match(out[0].unsubscribeNonce, /^[a-f0-9]{48}$/);
  assert.equal(out[1].unsubscribeNonce, "existing-nonce", "untouched");
  assert.equal(
    out[2].unsubscribeNonce,
    "raced-nonce",
    "a nonce claimed concurrently wins over the generated one",
  );
  assert.notEqual(out[0].unsubscribeNonce, out[2].unsubscribeNonce);
});

// ---------------------------------------------------------------------------
// PERF-018: product list path projects an explicit allowlist
// ---------------------------------------------------------------------------
function recordingQuery(result, record) {
  const q = {
    populate() {
      return q;
    },
    select(sel) {
      record.select = sel;
      return q;
    },
    session() {
      return q;
    },
    sort() {
      return q;
    },
    skip() {
      return q;
    },
    limit() {
      return q;
    },
    lean() {
      return q;
    },
    then(onF, onR) {
      return Promise.resolve(result).then(onF, onR);
    },
    catch(onR) {
      return Promise.resolve(result).catch(onR);
    },
  };
  return q;
}
const productFindRecord = {};
stubModule("models/product.model", {
  find: () => recordingQuery([], productFindRecord),
  countDocuments: async () => 0,
  findOne: async () => null,
  aggregate: async () => [],
});
stubModule("models/category.model", {
  find: () => recordingQuery([], {}),
  findOne: () => recordingQuery(null, {}),
  getDescendantIds: async () => [],
});
stubModule("middleware/upload.middleware", {
  deleteFile: async () => {},
  deleteFiles: async () => {},
});
const productCtrl = require("../../controllers/product.controller");

test("PERF-018: plain product list path selects the render allowlist and omits internals", async () => {
  require("../../utils/catalogCache").invalidateCatalogCache();
  const res = mockRes();
  const next = mockNext();
  productCtrl.getAllProducts({ query: {}, user: undefined }, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(next.error, undefined, next.error && next.error.message);
  const sel = productFindRecord.select;
  assert.equal(typeof sel, "string", "list query must carry a projection");
  // rating is selected as its client-visible subfields only
  // (rating.average / rating.count): the bare "rating" path would
  // override the schema's select:false and leak internal rating.sum.
  for (const field of ["name", "price", "priceFrom", "hasVariants", "catalogVariants", "images", "category", "rating.average", "rating.count"])
    assert.ok(sel.split(" ").includes(field), `allowlist missing ${field}`);
  for (const internal of ["reservedStock", "__v", "rating.sum"])
    assert.ok(!sel.split(" ").includes(internal), `allowlist must omit ${internal}`);
});
