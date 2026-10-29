// Regression: markHelpful pipeline update on Mongoose 9.
//
// controllers/review.controller.js markHelpful passes an aggregation
// pipeline array to Review.findOneAndUpdate. Without
// `updatePipeline: true` in the options, Mongoose 9 rejects every
// call ("Cannot pass an array to query updates unless the
// `updatePipeline` option is set") — the endpoint was broken on
// every vote. The fix adds `updatePipeline: true` alongside
// `returnDocument: "after"` (the pattern already used by the
// wishlist controller and Review.applyRatingDelta).
//
// This suite drives the real controller against a real mongod via
// the child-process probe in fixtures/review-mark-helpful-probe.js
// and asserts the vote toggles atomically and returns/stores the
// UPDATED document.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "review-mark-helpful-probe.js")],
      { timeout: 180000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
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

test(
  "markHelpful should succeed and increment the helpful count when a non-author votes",
  { timeout: 190000 },
  async () => {
    const first = await line("first");
    assert.match(first, /status=200/);
    assert.match(first, /error=none/);
    assert.match(first, /count=1/);
    assert.match(first, /voted=true/);
    const stored = await line("stored-after-first");
    assert.match(stored, /count=1/);
    assert.match(stored, /votes=[0-9a-f]{24}/);
  },
);

test(
  "markHelpful should toggle the vote off when the same user votes again",
  { timeout: 190000 },
  async () => {
    const second = await line("second");
    assert.match(second, /status=200/);
    assert.match(second, /count=0/);
    assert.match(second, /voted=false/);
    const stored = await line("stored-after-second");
    assert.match(stored, /count=0 votes=0/);
  },
);

test(
  "markHelpful should still refuse self-votes with a 400",
  { timeout: 190000 },
  async () => {
    const self = await line("self");
    assert.match(self, /errorCode=400/);
  },
);
