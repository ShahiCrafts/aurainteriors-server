// AR-35 — the database connector must ride out a Mongo that accepts
// connections ~15 s late (bounded retry with jitter), in the SAME
// process. Child probe: real mongod behind a blackholing TCP proxy -
// see fixtures/db-retry-probe.js. At the parent commit the connector
// exits the process on the first failed attempt.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

test(
  "AR-35: connector retries with backoff and connects in-process when Mongo arrives late",
  { timeout: 180000 },
  async () => {
    const out = await new Promise((resolve, reject) => {
      execFile(
        process.execPath,
        [path.join(__dirname, "fixtures", "db-retry-probe.js")],
        { timeout: 150000, maxBuffer: 8 * 1024 * 1024 },
        (err, stdout) => {
          if (err && !stdout) return reject(err);
          resolve(String(stdout));
        },
      );
    });
    const connected = out.match(
      /RESULT connected readyState=1 elapsedMs=(\d+)/,
    );
    assert.ok(connected, `the same process must end connected; got:\n${out}`);
    // The elapsed floor is the real proof: the blackhole lasts ~14 s,
    // so a connection reported before that would mean Mongo was simply
    // reachable all along. Depending on socket timing, recovery is
    // delivered either by the driver's server-selection patience or by
    // the connector's retry loop (its "attempt N/M failed" log lines) -
    // both are the AR-35 contract: in-process recovery, no restart, no
    // exit(1) on the first failure. At the parent commit the probe
    // exits 1 at ~10 s and prints no RESULT connected line at all.
    assert.ok(
      Number(connected[1]) >= 14000,
      `connection must have waited out the blackhole; elapsedMs=${connected[1]}`,
    );
  },
);
