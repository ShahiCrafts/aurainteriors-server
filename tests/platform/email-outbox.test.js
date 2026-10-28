// AR-20 — EMAIL_MODE=outbox (default direct) + truthful outcomes.
// Child-process MMS probe: fixtures/email-outbox-probe.js.
// Justification for MMS over stubModule: dispatch/drain semantics are
// DB-state transitions (claim, attempts, backoff, dedupe unique index,
// payload wiping) — only a real store proves them. The email provider
// itself IS stubbed in the probe (switchable failure), so no Brevo
// call can happen. Checkout-level emailSent truthfulness is NOT
// covered here: no existing harness drives guestCheckout against a
// replica-set MMS cheaply (checkout requires transactions); the
// controller change is a direct substitution of the recorded dispatch
// result for the previous unconditional `true`, and dispatch itself
// is fully covered below. This gap is recorded in the tracker.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "email-outbox-probe.js")],
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
  "AR-20 (a): direct success — row sent, payload wiped, dispatch returns sent",
  { timeout: 250000 },
  async () => {
    const l = await line("directOk");
    assert.equal(field(l, "mode"), "direct");
    assert.equal(field(l, "status"), "sent");
    assert.equal(field(l, "rowStatus"), "sent");
    assert.equal(field(l, "payloadWiped"), "true");
    assert.equal(field(l, "sentAt"), "true");
    assert.equal(field(l, "calls"), "1");
  },
);

test(
  "AR-20 (b): direct failure — row failed, payload wiped (no token at rest), returns failed",
  { timeout: 250000 },
  async () => {
    const l = await line("directFail");
    assert.equal(field(l, "status"), "failed");
    assert.equal(field(l, "rowStatus"), "failed");
    assert.equal(field(l, "payloadWiped"), "true");
    assert.equal(field(l, "lastError"), "true");
  },
);

test(
  "AR-20 (c): outbox — dispatch returns queued; opportunistic drain then sends it",
  { timeout: 250000 },
  async () => {
    const l = await line("outboxQueued");
    assert.equal(field(l, "mode"), "outbox");
    assert.equal(field(l, "status"), "queued");
    assert.equal(field(l, "rowAfterOpportunistic"), "sent");
    assert.equal(field(l, "calls"), "1");
  },
);

test(
  "AR-20 (d): drain with failing sender — attempts increment, re-queued with future nextAttemptAt, payload kept for retry",
  { timeout: 250000 },
  async () => {
    const l = await line("drainFail");
    assert.equal(field(l, "status"), "queued");
    assert.equal(field(l, "attempts"), "1");
    assert.equal(field(l, "futureNext"), "true");
    assert.equal(field(l, "payloadKept"), "true");
  },
);

test(
  "AR-20 (e): sender recovers — drain sends, row sent + payload wiped",
  { timeout: 250000 },
  async () => {
    const l = await line("drainOk");
    assert.equal(field(l, "status"), "sent");
    assert.equal(field(l, "payloadWiped"), "true");
    assert.equal(field(l, "sentAt"), "true");
  },
);

test(
  "AR-20 (f): dead-letter at maxAttempts with payload wiped",
  { timeout: 250000 },
  async () => {
    const l = await line("deadLetter");
    assert.equal(field(l, "status"), "failed");
    assert.equal(field(l, "attempts"), "5");
    assert.equal(field(l, "payloadWiped"), "true");
    assert.equal(field(l, "lastError"), "true");
  },
);

test(
  "AR-20 (g): dedupeKey returns the existing row",
  { timeout: 250000 },
  async () => {
    const l = await line("dedupe");
    assert.equal(field(l, "sameId"), "true");
  },
);

test(
  "AR-20 (h): sendNow order-confirmation throws when the order is missing",
  { timeout: 250000 },
  async () => {
    const l = await line("sendNowMissingOrder");
    assert.equal(field(l, "threw"), "true");
  },
);
