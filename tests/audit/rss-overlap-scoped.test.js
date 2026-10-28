// AR-40 — RSS cycle overlap guard + scoped featured rewrite.
// fetchAllFeeds had no in-flight guard: the 6-hour interval, the
// startup timer, and the admin refresh endpoint could (and on a slow
// feed, would) run concurrent cycles, double-ingesting and racing
// the featured rewrite. And updateFeaturedArticles rewrote the WHOLE
// collection's flags twice per cycle (updateMany({}) to unfeature
// everything, then a second write for the new set). These tests use
// a fast in-memory Blog stub: fetchFeed is exercised via a stubbed
// parser-free path - fetchAllFeeds is driven with zero real network
// by stubbing the Blog model and counting executions through the
// per-feed delay loop's observable effects.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery } = require("./helpers");

// --- Blog stub ------------------------------------------------------------
let updateManyCalls = [];
let bulkWriteCalls = 0;
const blogDocs = [
  { _id: "b1", isFeatured: true },
  { _id: "b2", isFeatured: true },
  { _id: "b3", isFeatured: false },
  { _id: "b4", isFeatured: false },
  { _id: "b5", isFeatured: false },
];
stubModule("models/blog.model", {
  bulkWrite: async () => {
    bulkWriteCalls += 1;
    return { upsertedCount: 0 };
  },
  findOne: () => makeQuery(null),
  updateOne: async () => ({}),
  find: () => makeQuery(blogDocs.map((d) => ({ _id: d._id }))),
  updateMany: async (filter, update) => {
    updateManyCalls.push({ filter, update });
    return { modifiedCount: 0 };
  },
});

// Every feed fetch fails instantly and deterministically (no network
// in tests); a cycle is then just the 8 per-feed 1 s politeness
// delays, which is what keeps a cycle "in flight" for the overlap
// assertion below.
stubModule("utils/guardedFetch", {
  guardedFetch: async () => {
    throw new Error("network disabled in tests");
  },
});

const rss = require("../../services/rssFeedService");

test("AR-40: updateFeaturedArticles touches only documents whose flag actually changes", async () => {
  updateManyCalls = [];
  await rss.updateFeaturedArticles(2);
  assert.equal(
    updateManyCalls.length,
    2,
    `expected exactly 2 scoped writes, got ${JSON.stringify(updateManyCalls)}`,
  );
  const [unfeature, feature] = updateManyCalls;
  // No whole-collection rewrite: every write must be flag-scoped.
  for (const call of updateManyCalls) {
    assert.ok(
      call.filter &&
        (call.filter.isFeatured === true || call.filter.isFeatured === false),
      `every featured rewrite must be scoped by the current flag value; got filter ${JSON.stringify(call.filter)}`,
    );
  }
  assert.equal(
    unfeature.filter.isFeatured,
    true,
    "unfeature pass targets currently-featured docs only",
  );
  assert.deepEqual(unfeature.update, { $set: { isFeatured: false } });
  assert.equal(
    feature.filter.isFeatured,
    false,
    "feature pass targets currently-unfeatured docs only",
  );
  assert.deepEqual(feature.update, { $set: { isFeatured: true } });
  const chosen = feature.filter._id.$in.map(String).sort();
  const excluded = unfeature.filter._id.$nin.map(String).sort();
  assert.deepEqual(
    excluded,
    chosen,
    "the unfeature pass must exclude exactly the newly chosen set",
  );
  assert.equal(
    chosen.length,
    2,
    "exactly the requested number of articles is featured",
  );
});

test(
  "AR-40: overlapping fetchAllFeeds invocations execute the cycle once; the second reports itself skipped",
  { timeout: 90000 },
  async () => {
    bulkWriteCalls = 0;
    // Start a cycle, then immediately invoke again: the second call must
    // return AT ONCE with skipped:true (not queue a second feed loop).
    const cycleA = rss.fetchAllFeeds();
    const rB = await Promise.race([
      rss.fetchAllFeeds(),
      new Promise((r) => setTimeout(() => r("still-running"), 3000)),
    ]);
    assert.notEqual(
      rB,
      "still-running",
      "an overlapping invocation must return immediately, not run a second cycle",
    );
    assert.equal(
      rB.skipped,
      true,
      `the overlapping call must report itself skipped; got ${JSON.stringify(rB)}`,
    );
    const rA = await cycleA;
    assert.ok(
      rA && rA.skipped !== true && typeof rA.errors === "number",
      "the first call runs the real cycle",
    );
    // After completion the guard must release: a later call runs again.
    const rC = await rss.fetchAllFeeds();
    assert.ok(
      rC && rC.skipped !== true,
      "the guard must release after the cycle completes",
    );
  },
);
