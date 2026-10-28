// AR-42 — exactly one default address per user, enforced atomically.
// Child probe on real mongod: 10 parallel switchDefault calls must
// leave exactly one default. See fixtures/address-default-probe.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "address-default-probe.js")],
      { timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
    );
  });
}

test(
  "AR-42: ten parallel default switches leave exactly one default",
  { timeout: 150000 },
  async () => {
    const out = await runProbe();
    const line = out.split("\n").find((l) => l.startsWith("RESULT"));
    assert.ok(line, `probe must print a RESULT line; got: ${out}`);
    assert.match(
      line,
      /defaultCount=1/,
      `exactly one default must survive parallel switches; got: ${line}`,
    );
  },
);
