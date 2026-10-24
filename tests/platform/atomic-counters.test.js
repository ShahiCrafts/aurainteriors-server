// AR-23 — counter maintenance by read-modify-write save() loses
// concurrent increments (promotion metrics, discount usage, user
// login bookkeeping). The fixes are atomic $inc updates:
//   - Promotion.updateMetrics: updateOne $inc (validation kept).
//     Caller audit: NO live callers - promotionService.trackEngagement
//     already does its own atomic $inc (C-09); announcement /
//     notification paths never call the model method. The method is
//     kept (and made safe) rather than deleted.
//   - Discount.incrementUsage: single findOneAndUpdate whose filter
//     carries the limit predicate ($expr, same guard as
//     discountUsage.service, which is what checkout actually uses).
//     Caller audit: NO live callers anywhere in the repo. Return
//     contract: the updated document, or null at the limit.
//   - User.updateLoginActivity: now async; persists via
//     updateOne($set lastLogin, $inc loginCount). Callers were the
//     three Google-callback paths in config/passport.js, each of
//     which previously had to save() the whole user document.
// Child-process probe (real mongod, disk-backed dbPath) - see
// fixtures/atomic-counters-probe.js. Before the fix the promotion
// scenario lands ~1 of 100 increments (the rest die on VersionError),
// the discount scenario throws VersionErrors, and login bookkeeping
// never reaches the database at all (count 0).
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "atomic-counters-probe.js")],
      { timeout: 180000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      }
    );
  });
}

let cached;
async function probe() {
  if (!cached) cached = runProbe();
  return cached;
}
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print a RESULT ${prefix} line; got: ${out}`);
  return l;
};
const field = (l, name) => {
  const m = l.match(new RegExp(`${name}=([^ ]*)`));
  return m ? m[1] : null;
};

test("AR-23 (a): 100 parallel promotion metric events land exactly +100, validation intact", { timeout: 190000 }, async () => {
  const l = await line("promo");
  assert.equal(field(l, "sentCount"), "100", `metrics must increase by exactly 100; got: ${l}`);
  assert.equal(field(l, "errors"), "0", `no increment may fail; got: ${l}`);
  assert.equal(field(l, "inMemory"), "1", "the caller's own copy mirrors its increment");
  assert.equal(field(l, "validation"), "threw", "an invalid metric field must still throw");
});

test("AR-23 (b): discount increments stop exactly at maxUsageLimit under parallelism", { timeout: 190000 }, async () => {
  const l = await line("discount");
  assert.equal(field(l, "finalCount"), "5", `count must end exactly at the limit; got: ${l}`);
  assert.equal(field(l, "success"), "1", `exactly one of 10 parallel increments may succeed from limit-1; got: ${l}`);
  assert.equal(field(l, "nulls"), "9", "the other nine must resolve null (limit reached), not throw");
  assert.equal(field(l, "errors"), "0");
});

test("AR-23 (c): 50 parallel logins persist loginCount exactly 50 and set lastLogin", { timeout: 190000 }, async () => {
  const l = await line("login");
  assert.equal(field(l, "loginCount"), "50", `loginCount must be exact; got: ${l}`);
  assert.equal(field(l, "lastLoginSet"), "true");
  assert.equal(field(l, "errors"), "0");
  assert.equal(field(l, "inMemoryDirty"), "false",
    "the in-memory mirror must not dirty the document (a later caller save must not rewrite loginCount as a stale absolute value)");
});
