// AR-41 (migration semantics) — with the TTL index re-anchored to
// lastActivityAt (MIGRATIONS.md M-2), an actively-touched session
// survives multiple TTL windows while an idle one is reaped. Child
// probe on real mongod, scratch collection, 3 s TTL - see
// fixtures/guest-ttl-probe.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "guest-ttl-probe.js")],
      { timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
    );
  });
}

test(
  "AR-41: activity-anchored TTL keeps the active session and reaps the idle one",
  { timeout: 150000 },
  async () => {
    const out = await runProbe();
    const line = out.split("\n").find((l) => l.startsWith("RESULT"));
    assert.ok(line, `probe must print a RESULT line; got: ${out}`);
    assert.equal(
      line,
      "RESULT remaining=active",
      `only the active session may survive; got: ${line}`,
    );
  },
);
