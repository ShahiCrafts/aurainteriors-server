// AR-02 (D1) — RATE_LIMIT_STORE=mongo (default memory = current
// behavior). Child-process MMS probe: fixtures/rate-limit-store-probe.js.
// Justification for MMS over stubModule: the store's contract IS its
// atomic findOneAndUpdate/upsert behavior against a real store —
// two instances over one database must share counters (that sharing
// is what makes limits hold across N server processes instead of
// multiplying by N), and the upsert race / expiry reset only exist
// against a real MongoDB.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

const REPO = path.join(__dirname, "..", "..");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "rate-limit-store-probe.js")],
      { timeout: 240000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
    );
  });
}
let cached;
const probe = async () => {
  if (!cached) cached = runProbe();
  return cached;
};
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print RESULT ${prefix}; got: ${out}`);
  return l;
};
const field = (l, name) => {
  const m = l.match(new RegExp(`${name}=([^ ]*)`));
  return m ? m[1] : null;
};

test(
  "AR-02/D1 modules exist (store + counter model)",
  { timeout: 250000 },
  async () => {
    const l = await line("modules");
    assert.equal(field(l, "store"), "true");
    assert.equal(field(l, "model"), "true");
  },
);

test(
  "AR-02/D1 two instances with the SAME prefix share counts",
  { timeout: 250000 },
  async () => {
    const l = await line("shared");
    assert.equal(field(l, "a1"), "1");
    assert.equal(field(l, "b2"), "2");
    assert.equal(field(l, "a3"), "3");
    assert.equal(field(l, "resetIsDate"), "true");
  },
);

test(
  "AR-02/D1 different prefixes are isolated",
  { timeout: 250000 },
  async () => {
    const l = await line("isolated");
    assert.equal(field(l, "otherFirst"), "1");
  },
);

test(
  "AR-02/D1 an expired window resets on the next increment",
  { timeout: 250000 },
  async () => {
    const l = await line("expired");
    assert.equal(field(l, "totalHits"), "1");
    assert.equal(field(l, "resetFuture"), "true");
  },
);

test("AR-02/D1 decrement never goes below 0", { timeout: 250000 }, async () => {
  const l = await line("decrement");
  assert.equal(field(l, "afterDec"), "1");
  assert.equal(field(l, "afterFloor"), "0");
});

test(
  "AR-02/D1 resetKey clears and resetAll empties",
  { timeout: 250000 },
  async () => {
    const l = await line("resetKey");
    assert.equal(field(l, "cleared"), "true");
    assert.equal(field(l, "afterResetInc"), "1");
    const l2 = await line("resetAll");
    assert.equal(field(l2, "remaining"), "0");
  },
);

test(
  "AR-02/D1 middleware loads with RATE_LIMIT_STORE unset (MemoryStore default) and =mongo",
  { timeout: 60000 },
  async () => {
    const load = (env) =>
      new Promise((resolve, reject) => {
        execFile(
          process.execPath,
          [
            "-e",
            "const m = require('./middleware/rateLimit.middleware');" +
              "const names = ['chatRateLimit','sendMessageRateLimit','startChatRateLimit','publicEndpointRateLimit','userRateLimit','standardReadLimiter','standardWriteLimiter','adminReadLimiter','adminWriteLimiter'];" +
              "for (const n of names) { if (typeof m[n] === 'undefined') { console.error('missing ' + n); process.exit(2); } }" +
              "console.log('LOAD_OK');",
          ],
          { cwd: REPO, env: { ...process.env, ...env }, timeout: 30000 },
          (err, stdout, stderr) => {
            if (err)
              return reject(new Error(`load failed: ${stderr || err.message}`));
            resolve(String(stdout));
          },
        );
      });
    assert.match(await load({}), /LOAD_OK/);
    assert.match(await load({ RATE_LIMIT_STORE: "mongo" }), /LOAD_OK/);
  },
);
