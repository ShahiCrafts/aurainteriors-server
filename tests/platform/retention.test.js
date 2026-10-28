// AR-27 — RETENTION_* policies (D-C): UNSET means nothing is ever
// deleted. Child-process MMS probe: fixtures/retention-probe.js.
// Justification for MMS over stubs: the guarantees are deletion
// semantics against real collections (batched deleteMany by _id,
// closed/resolved-chat scoping, per-kind and per-status predicates,
// batch bounds) — only a real store proves exactly which rows die
// and which survive. The dry-run script is smoke-tested inside the
// probe as a child process against the probe's own MMS URI.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "retention-probe.js")],
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
  "AR-27 (a): all envs unset — runRetention deletes 0, reports nulls, logs nothing",
  { timeout: 250000 },
  async () => {
    const l = await line("unset");
    assert.equal(field(l, "notifications"), "null");
    assert.equal(field(l, "chatMessages"), "null");
    assert.equal(field(l, "blogEngagements"), "null");
    assert.equal(field(l, "contacts"), "null");
    assert.equal(field(l, "deleted"), "0");
    assert.equal(field(l, "retentionLogs"), "0");
  },
);

test(
  "AR-27 (b): dry-run with policies set counts exactly and deletes nothing",
  { timeout: 250000 },
  async () => {
    const l = await line("dryRun");
    assert.equal(field(l, "notifications"), "1");
    assert.equal(
      field(l, "chatMessages"),
      "2",
      "old messages in closed AND resolved chats",
    );
    assert.equal(field(l, "blogEngagements"), "1", "old VIEW engagements only");
    assert.equal(field(l, "contacts"), "2", "old resolved AND closed contacts");
    assert.equal(
      field(l, "totalAfter"),
      field(l, "totalBefore"),
      "dry-run must not delete",
    );
  },
);

test(
  "AR-27 (c): dry-run script smoke — exit 0, per-policy WOULD-be-deleted lines against a live DB",
  { timeout: 250000 },
  async () => {
    const l = await line("scriptSmoke");
    assert.equal(field(l, "exit"), "0");
    assert.equal(field(l, "notifLine"), "true");
    assert.equal(field(l, "chatLine"), "true");
  },
);

test(
  "AR-27 (d): real run deletes exactly the eligible rows and keeps every protected row",
  { timeout: 250000 },
  async () => {
    const l = await line("realRun");
    assert.equal(field(l, "notifications"), "1");
    assert.equal(field(l, "chatMessages"), "2");
    assert.equal(field(l, "blogEngagements"), "1");
    assert.equal(field(l, "contacts"), "2");
    assert.equal(field(l, "keepNewNotif"), "true");
    assert.equal(
      field(l, "keepOldOpenMsg"),
      "true",
      "old message in an OPEN chat is kept",
    );
    assert.equal(
      field(l, "keepNewClosedMsg"),
      "true",
      "new message in a closed chat is kept",
    );
    assert.equal(field(l, "goneOldClosedMsg"), "true");
    assert.equal(
      field(l, "keepOldLike"),
      "true",
      "old LIKE engagement is kept (views only)",
    );
    assert.equal(field(l, "goneOldView"), "true");
    assert.equal(
      field(l, "keepOldNewContact"),
      "true",
      "old contact still in 'new' status is kept",
    );
    assert.equal(field(l, "keepNewResolved"), "true");
    assert.equal(field(l, "goneOldResolved"), "true");
  },
);

test(
  "AR-27 (e): batch bound — a bounded run deletes exactly batchSize*maxBatches, the next run gets the rest",
  { timeout: 250000 },
  async () => {
    const l = await line("batchBound");
    assert.equal(field(l, "first"), "4");
    assert.equal(field(l, "remainingAfterBound"), "3");
    assert.equal(field(l, "second"), "3");
    assert.equal(field(l, "remainingAfterRest"), "0");
  },
);
