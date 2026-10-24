// AR-24 — Product.rating used to be recomputed by aggregating ALL of
// a product's approved reviews on EVERY review write (post-save +
// post-findOneAndDelete hooks called calcAverageRating). It is now
// maintained incrementally and EXACTLY: an internal rating.sum is
// kept next to average/count, each write applies its known delta in
// ONE atomic pipeline update, and calcAverageRating survives as the
// from-scratch recompute used (a) to lazily initialize rating.sum on
// legacy products that predate the field (no migration) and (b) for
// reconciliation.
//
// Write-path audit (every path that can change a review's rating
// contribution - rating value or isApproved):
//   createReview      -> Review.create            -> save hook      COVERED
//   updateReview      -> findOne + doc.save()     -> save hook      COVERED
//   admin toggleApproval -> findOne + doc.save()  -> save hook      COVERED
//   deleteReview      -> Review.findOneAndDelete -> delete hook    COVERED
//   addAdminResponse  -> findOneAndUpdate (adminResponse only)      NO rating effect
//   markHelpful       -> findOneAndUpdate (helpful fields only)     NO rating effect
//   No other Review writes exist in controllers/services/scripts
//   (grep-verified); seeders write rating directly onto Product
//   (fabricated demo values, replaced by the first real review write
//   under BOTH the old recompute and the new lazy init).
//
// PROPERTY TEST (child-process probe, real mongod - see
// fixtures/review-rating-probe.js): >= 1000 mixed operations, after
// which stored average/count/sum must equal a from-scratch
// aggregation. Tolerance: count and sum are integers and must match
// EXACTLY; average is the round-to-0.1 of an integer ratio computed
// in IEEE-754 doubles on both sides, so |diff| <= 1e-9 absorbs only
// representation noise (a rounding-mode divergence would differ by
// a full 0.1 and fail). During the mix, Review.aggregate must never
// run on the write path (aggregateCalls = 0) - that is the
// fail-before discriminator: the old hooks aggregated once per
// save/delete.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "review-rating-probe.js")],
      { timeout: 300000, maxBuffer: 4 * 1024 * 1024 },
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

test("AR-24 property: >=1000 mixed review ops leave rating exactly equal to a from-scratch aggregation, with zero aggregations on the write path", { timeout: 310000 }, async () => {
  const l = await line("rating");
  assert.ok(Number(field(l, "ops")) >= 1000, `the mix must run >= 1000 ops; got: ${l}`);
  assert.equal(field(l, "aggregateCalls"), "0",
    `no full aggregation may run on the review write path; got: ${l}`);
  assert.equal(field(l, "storedCount"), field(l, "expectedCount"), `count must match exactly; got: ${l}`);
  assert.equal(field(l, "storedSum"), field(l, "expectedSum"), `sum must match exactly; got: ${l}`);
  assert.ok(Number(field(l, "avgDiff")) <= 1e-9, `average must match within 1e-9; got: ${l}`);
});

test("AR-24 legacy: a product without rating.sum is lazily initialized exactly on its first tracked write", { timeout: 310000 }, async () => {
  const l = await line("legacy");
  assert.equal(field(l, "storedCount"), field(l, "expectedCount"), `count must match exactly; got: ${l}`);
  assert.equal(field(l, "storedSum"), field(l, "expectedSum"), `sum must be initialized to the true sum; got: ${l}`);
  assert.ok(Number(field(l, "avgDiff")) <= 1e-9, `average must match within 1e-9; got: ${l}`);
});
