// AR-16 — real-mongod probe: the rewritten getChatStats response-time
// aggregation must return the IDENTICAL average as the original
// $lookup pipeline on a fixture dataset (200 chats / 10,000 messages,
// inserted in createdAt order), and its explain must examine far fewer
// documents than the total message count (no materialization of all
// messages per chat).
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const repo = path.join(__dirname, "..", "..");
const probe = path.join(repo, "tests", "platform", "fixtures", "ar16-chat-stats-probe.js");

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

test("AR-16: new getChatStats pipeline matches the original on a real-mongod fixture and examines far fewer docs", { timeout: 180000 }, async () => {
  const { code, out } = await runProbe();
  assert.equal(code, 0, `probe failed:\n${out}`);
  assert.equal(resultValue(out, "totalMessages"), "10000");
  const expected = Number(resultValue(out, "expectedAvgMinutes"));
  const oldAvg = Number(resultValue(out, "oldAvgMinutes"));
  const newAvg = Number(resultValue(out, "newAvgMinutes"));
  assert.equal(oldAvg, expected, `sanity: the original pipeline must match the fixture expectation:\n${out}`);
  assert.equal(newAvg, expected, `the rewritten pipeline must be identical to the original on this fixture:\n${out}`);
  const stats = JSON.parse(resultValue(out, "stats"));
  assert.equal(stats.totalChats, 192, "8 of 200 chats are soft-deleted");
  assert.equal(stats.avgResponseTimeMinutes, expected);
  const docsExamined = Number(resultValue(out, "docsExamined"));
  assert.ok(Number.isFinite(docsExamined), `probe must report docsExamined:\n${out}`);
  assert.ok(docsExamined < 5000, `new pipeline must examine far fewer than 10,000 message docs (got ${docsExamined}):\n${out}`);
  assert.equal(resultValue(out, "pipelineHasChatmessagesLookup"), "false", "the new pipeline must not $lookup into chatmessages");
  assert.equal(resultValue(out, "lookupFroms"), "chats", "the only $lookup is against the small chats collection");
});
