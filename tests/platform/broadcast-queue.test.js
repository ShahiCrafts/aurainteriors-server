// AR-04 — BROADCAST_MODE=queue (default inline). Child-process MMS
// probe: tests/platform/fixtures/broadcast-queue-probe.js.
// Justification for MMS over stubModule: the headline guarantee is
// that a promotion handler RE-RUN creates zero duplicate notifications
// — that is NotificationService's DB-backed per-recipient dedupe
// (deterministic _id from idempotencyKey), which only a real store
// can prove. The email provider is stubbed in the probe.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "broadcast-queue-probe.js")],
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
  "AR-04 (a): flag OFF — promotion sends inline, no job rows",
  { timeout: 250000 },
  async () => {
    const l = await line("inlinePromo");
    assert.equal(field(l, "success"), "true");
    assert.equal(field(l, "notif"), "3");
    assert.equal(field(l, "jobs"), "0");
    assert.equal(field(l, "queued"), "false");
  },
);

test(
  "AR-04 (b): flag OFF — announcement fan-out is immediate",
  { timeout: 250000 },
  async () => {
    const l = await line("inlineAnn");
    assert.equal(field(l, "queued"), "false");
    assert.equal(field(l, "status"), "published");
    assert.equal(field(l, "notif"), "6"); // 3 promo + 3 announcement (all active users)
  },
);

test(
  "AR-04 (c): flag ON — promotion enqueues, handler sends, re-run creates zero duplicates",
  { timeout: 250000 },
  async () => {
    const l = await line("queuePromo");
    assert.equal(field(l, "queued"), "true");
    assert.equal(field(l, "jobType"), "broadcast-promotion");
    assert.ok(field(l, "jobKey")?.startsWith("broadcast:promotion:"));
    assert.equal(field(l, "notifBefore"), "6");
    assert.equal(field(l, "notifAfter"), "9");
    assert.equal(field(l, "notifRerun"), "9");
    assert.equal(field(l, "promoStatus"), "sent");
  },
);

test(
  "AR-04 (d): flag ON — promotion controller returns 202 + jobId",
  { timeout: 250000 },
  async () => {
    const l = await line("queuePromoCtrl");
    assert.equal(field(l, "status"), "202");
    assert.equal(field(l, "queued"), "true");
    assert.equal(field(l, "hasJobId"), "true");
  },
);

test(
  "AR-04 (e): flag ON — announcement publishes, fan-out only via handler; controller 202",
  { timeout: 250000 },
  async () => {
    const l = await line("queueAnn");
    assert.equal(field(l, "queued"), "true");
    assert.equal(field(l, "hasJobId"), "true");
    assert.equal(field(l, "status"), "published");
    assert.equal(field(l, "notifMid"), field(l, "notifBefore"));
    assert.equal(
      Number(field(l, "notifAfter")),
      Number(field(l, "notifBefore")) + 3,
    );
    const c = await line("queueAnnCtrl");
    assert.equal(field(c, "status"), "202");
    assert.equal(field(c, "queued"), "true");
    assert.equal(field(c, "hasJobId"), "true");
    assert.equal(field(c, "hasAnn"), "true");
  },
);

test(
  "AR-04 (f): flag ON — newsletter returns 202 + job, handler ensures nonces and sends",
  { timeout: 250000 },
  async () => {
    const l = await line("queueNews");
    assert.equal(field(l, "status"), "202");
    assert.equal(field(l, "queued"), "true");
    assert.equal(field(l, "payloadSubject"), "Trend");
    assert.equal(field(l, "hasCampaign"), "true");
    assert.equal(field(l, "callsAfterEnqueue"), field(l, "callsBefore"));
    assert.equal(
      Number(field(l, "callsAfterHandler")),
      Number(field(l, "callsBefore")) + 1,
    );
    assert.equal(field(l, "nonceEnsured"), "true");
  },
);

test(
  "AR-04 (g): flag OFF — newsletter inline unchanged (200, immediate send, no job)",
  { timeout: 250000 },
  async () => {
    const l = await line("inlineNews");
    assert.equal(field(l, "status"), "200");
    assert.equal(field(l, "success"), "true");
    assert.equal(field(l, "jobsAfter"), field(l, "jobsBefore"));
  },
);
