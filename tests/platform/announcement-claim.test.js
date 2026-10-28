// AR-08 — scheduled announcements need the atomic claim pattern
// promotions already have (FA-70): two concurrent processor ticks must
// publish and fan out EXACTLY once. Child-process probe (real mongod
// via mongodb-memory-server, disk-backed dbPath) - see
// fixtures/announcement-claim-probe.js. Before the fix both ticks read
// status "scheduled", both published, both fanned out (notifyCount=2).
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "announcement-claim-probe.js")],
      { timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
    );
  });
}

test(
  "AR-08: two concurrent scheduled-announcement ticks publish + fan out exactly once",
  { timeout: 150000 },
  async () => {
    const out = await runProbe();
    const line = out.split("\n").find((l) => l.startsWith("RESULT"));
    assert.ok(line, `probe must print a RESULT line; got: ${out}`);
    assert.match(
      line,
      /status=published/,
      `the announcement must end published; got: ${line}`,
    );
    assert.match(
      line,
      /notifyCount=1/,
      `fan-out must happen exactly once across both ticks; got: ${line}`,
    );
    assert.match(
      line,
      /processedTotal=1/,
      `exactly one tick may report the publish; got: ${line}`,
    );
  },
);
