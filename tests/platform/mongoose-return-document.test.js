// Mongoose 9 deprecation guard — the `new` option for
// findOneAndUpdate()/findOneAndReplace() is deprecated and printed a
// [MONGOOSE] warning on every call (dozens per boot/request cycle).
// All call sites now use returnDocument: "after". This suite proves
// two things via a child-process MMS probe
// (fixtures/mongoose-warning-probe.js):
//   1. Exercising the main updated-document paths (rate-limit store,
//      auth limiter, scheduler lease, job queue claim, push tokens,
//      profile update, wishlist add, review admin response, discount
//      usage, email outbox claim) plus a createApp() boot emits ZERO
//      `new`-option warnings — and zero [MONGOOSE] warnings at all.
//   2. Each path still returns the UPDATED document (the behavior
//      the old option provided), not the pre-update document.
// A static grep guard in the last test keeps the deprecated spelling
// from creeping back anywhere in the source tree.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.join(__dirname, "..", "..");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "mongoose-warning-probe.js")],
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
  "mongoose guard: no `new`-option (or any [MONGOOSE]) warning on boot + main update paths",
  { timeout: 250000 },
  async () => {
    const l = await line("warnings");
    assert.equal(field(l, "newOption"), "0");
    assert.equal(field(l, "mongoose"), "0");
    assert.equal(field(l, "total"), "0");
    const boot = await line("boot");
    assert.equal(field(boot, "app"), "assembled");
  },
);

test(
  "mongoose guard: rate-limit store and auth limiter return updated counters",
  { timeout: 250000 },
  async () => {
    const rl = await line("ratelimit");
    assert.equal(field(rl, "hits"), "1,2");
    assert.equal(field(rl, "updatedDoc"), "true");
    const auth = await line("authlimit");
    assert.equal(field(auth, "next"), "2");
    assert.equal(field(auth, "count"), "2");
  },
);

test(
  "mongoose guard: scheduler lease acquisition returns the holder's updated lease",
  { timeout: 250000 },
  async () => {
    const l = await line("lease");
    assert.equal(field(l, "acquired"), "true");
    assert.equal(field(l, "loserBlocked"), "true");
  },
);

test(
  "mongoose guard: job queue claim returns the updated (processing) job",
  { timeout: 250000 },
  async () => {
    const l = await line("jobqueue");
    assert.equal(field(l, "status"), "processing");
    assert.equal(field(l, "attempts"), "1");
  },
);

test(
  "mongoose guard: push token register/invalidate return the updated token doc",
  { timeout: 250000 },
  async () => {
    const l = await line("pushtoken");
    assert.equal(field(l, "registered"), "true");
    assert.equal(field(l, "invalidated"), "true");
  },
);

test(
  "mongoose guard: profile, wishlist and review updates return updated documents",
  { timeout: 250000 },
  async () => {
    const p = await line("profile");
    assert.equal(field(p, "status"), "200");
    assert.equal(field(p, "firstName"), "After");
    const w = await line("wishlist");
    assert.equal(field(w, "status"), "200");
    assert.equal(field(w, "inWishlist"), "true");
    assert.equal(field(w, "item"), "true");
    const r = await line("review");
    assert.equal(field(r, "status"), "200");
    assert.equal(field(r, "adminComment"), "Thanks!");
  },
);

test(
  "mongoose guard: discount usage and email outbox claim use updated documents",
  { timeout: 250000 },
  async () => {
    const d = await line("discount");
    assert.equal(field(d, "afterIncrement"), "1");
    assert.equal(field(d, "final"), "2");
    assert.equal(field(d, "consumed"), "true");
    const o = await line("outbox");
    assert.equal(field(o, "processed"), "1");
  },
);

test("mongoose guard: no deprecated update options remain in source", () => {
  const skipDirs = new Set(["node_modules", ".git"]);
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) {
        const text = fs.readFileSync(full, "utf8");
        text.split("\n").forEach((ln, i) => {
          if (/\bnew:\s*(true|false)\b/.test(ln) || new RegExp("return" + "Original").test(ln)) {
            // The ESLint guard's own selector/message in
            // eslint.config.js legitimately names the old options.
            if (path.basename(full) === "eslint.config.js") return;
            offenders.push(`${path.relative(REPO, full)}:${i + 1}`);
          }
        });
      }
    }
  };
  walk(REPO);
  assert.deepEqual(offenders, []);
});
