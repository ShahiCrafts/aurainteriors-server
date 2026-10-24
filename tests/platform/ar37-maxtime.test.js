// AR-37 — real-mongod fault injection: a deliberately slow tool query
// (COLLSCAN over ~100k orders, indexes dropped) issued through dbTools
// with a 5 ms budget must surface MaxTimeMSExpired and return quickly
// instead of running to completion; without a budget the same call
// returns the AR-36-bounded newest 20.
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const repo = path.join(__dirname, "..", "..");
const probe = path.join(repo, "tests", "platform", "fixtures", "ar37-maxtime-probe.js");

function runProbe() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [probe], { cwd: repo, env: { PATH: process.env.PATH, HOME: process.env.HOME }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, out }));
  });
}

function resultValue(out, key) {
  const m = out.match(new RegExp(`^RESULT ${key}=(.*)$`, "m"));
  return m ? m[1] : null;
}

test("AR-37: maxTimeMS cancels a slow dbTools query server-side (MaxTimeMSExpired), unbounded call still bounded at 20 by AR-36", { timeout: 240000 }, async () => {
  const { code, out } = await runProbe();
  assert.equal(code, 0, `probe failed:\n${out}`);
  assert.equal(resultValue(out, "directBoundedLength"), "0", `a 5 ms budget must error out (dbTools error path returns []), not complete the scan:\n${out}`);
  assert.match(resultValue(out, "directBoundedErrors") || "", /time limit|MaxTimeMSExpired/i, `the surfaced error must be the server's time-limit error:\n${out}`);
  const boundedElapsed = Number(resultValue(out, "directBoundedElapsedMs"));
  const unboundedElapsed = Number(resultValue(out, "directUnboundedElapsedMs"));
  // Coordinator note (Phase 2 verification): the deterministic proof of
  // server-side cancellation is the MaxTimeMSExpired assertion above, NOT
  // a relative wall-clock race — under full-suite parallel load both
  // elapsed values are contention-dominated and a strict bounded<unbounded
  // comparison flaked once (124 ms vs 122 ms) despite the error surfacing
  // correctly. The bounded call must still return promptly in absolute
  // terms (the scan it abandons takes ~120 ms+ of pure query time).
  assert.ok(boundedElapsed < 5000, `bounded call (${boundedElapsed} ms) must return promptly, not run the full scan (${unboundedElapsed} ms unbounded):\n${out}`);
  assert.equal(resultValue(out, "directUnboundedLength"), "20", "AR-36 bound holds on real data");
  assert.equal(resultValue(out, "directUnboundedFirst"), "TARGET-0", "newest first");
  assert.equal(resultValue(out, "directUnboundedLast"), "TARGET-19", "the newest 20 of 25");
  assert.equal(resultValue(out, "registryGenerousLength"), "20", "the registry tool path returns the same bounded history");
});
