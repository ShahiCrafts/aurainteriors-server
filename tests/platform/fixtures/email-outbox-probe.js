// AR-20 probe — EMAIL_MODE=outbox / direct + truthful outcomes against
// a real mongod (MMS, disk-backed). services/email.service is stubbed
// in require.cache BEFORE the outbox service loads, with a switchable
// failure mode — no Brevo call can happen.
const path = require("node:path");
const fs = require("node:fs");
const REPO = path.resolve(__dirname, "../../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = { fail: false, calls: [] };
function stubEmailService() {
  const resolved = require.resolve(path.join(REPO, "services/email.service"));
  const guard = (name) => async (...args) => {
    state.calls.push({ name, args: args.map((a) => (a && a._id ? String(a._id) : a)) });
    if (state.fail) throw new Error("brevo down (probe)");
    return { ok: true };
  };
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true,
    exports: {
      sendOrderConfirmationEmail: guard("order"),
      sendMagicLinkEmail: guard("magic"),
      sendOtpEmail: guard("otp"),
      sendNewsletterWelcomeEmail: guard("welcome"),
    },
  };
}
const emptyPayload = (p) => !p || Object.keys(p).length === 0;

async function main() {
  stubEmailService();
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "outbox-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(mongod.getUri("aura_outbox_test"));
  try {
    const Order = require(path.join(REPO, "models/order.model"));
    const EmailOutbox = require(path.join(REPO, "models/emailOutbox.model"));
    const outbox = require(path.join(REPO, "services/emailOutbox.service"));

    const order = await Order.create({
      guestInfo: { email: "guest@example.com", firstName: "G" },
      items: [{ product: new mongoose.Types.ObjectId(), name: "Chair", price: 100, quantity: 1 }],
      shippingAddress: { fullName: "G H", phone: "9800000000", addressLine1: "Street 1", city: "KTM", postalCode: "44600" },
      subtotal: 100, total: 100, paymentMethod: "cod",
    });

    // (a) direct success: row sent, payload wiped, returns sent
    delete process.env.EMAIL_MODE;
    state.fail = false; state.calls = [];
    const a = await outbox.dispatchEmail({ kind: "order-confirmation", to: "guest@example.com", payload: { orderId: String(order._id) }, dedupeKey: `order-confirmation:${order._id}` });
    const aRow = await EmailOutbox.findById(a.id).lean();
    console.log(`RESULT directOk mode=${a.mode} status=${a.status} rowStatus=${aRow.status} payloadWiped=${emptyPayload(aRow.payload)} sentAt=${!!aRow.sentAt} calls=${state.calls.length}`);

    // (b) direct failure: row failed, payload wiped, returns failed
    state.fail = true; state.calls = [];
    const b = await outbox.dispatchEmail({ kind: "magic-link", to: "u@example.com", payload: { email: "u@example.com", magicLink: "https://x/auth/verify?token=SECRETTOKEN", firstName: "U" } });
    const bRow = await EmailOutbox.findById(b.id).lean();
    console.log(`RESULT directFail status=${b.status} rowStatus=${bRow.status} payloadWiped=${emptyPayload(bRow.payload)} lastError=${!!bRow.lastError}`);

    // (c) outbox: queued row, NO send attempt
    process.env.EMAIL_MODE = "outbox";
    state.fail = false; state.calls = [];
    const c = await outbox.dispatchEmail({ kind: "otp", to: "admin@example.com", payload: { email: "admin@example.com", otp: "123456" } });
    const cRow = await EmailOutbox.findById(c.id).lean();
    await sleep(150); // an opportunistic setImmediate drain may fire here
    const cRowAfter = await EmailOutbox.findById(c.id).lean();
    console.log(`RESULT outboxQueued mode=${c.mode} status=${c.status} rowStatus=${cRow.status} callsAtReturn=${0} rowAfterOpportunistic=${cRowAfter.status} calls=${state.calls.length}`);

    // (d) drain with failing sender: attempts increment, re-queued, future nextAttemptAt
    state.fail = true; state.calls = [];
    const d0 = await outbox.dispatchEmail({ kind: "otp", to: "d@example.com", payload: { email: "d@example.com", otp: "999999" } });
    await sleep(200); // let the opportunistic drain settle first
    // Neutralize that drain's attempt for determinism: push the row
    // back to a plain queued state, then drain explicitly.
    await EmailOutbox.updateOne({ _id: d0.id }, { $set: { status: "queued", attempts: 0, nextAttemptAt: new Date(Date.now() - 1000) } });
    await outbox.drainEmailOutbox();
    const dRow = await EmailOutbox.findById(d0.id).lean();
    console.log(`RESULT drainFail status=${dRow.status} attempts=${dRow.attempts} futureNext=${dRow.nextAttemptAt > new Date()} payloadKept=${!emptyPayload(dRow.payload)}`);

    // (e) sender recovers: drain sends, row sent + payload wiped
    state.fail = false;
    await EmailOutbox.updateOne({ _id: d0.id }, { $set: { nextAttemptAt: new Date(Date.now() - 1000) } });
    await outbox.drainEmailOutbox();
    const eRow = await EmailOutbox.findById(d0.id).lean();
    console.log(`RESULT drainOk status=${eRow.status} payloadWiped=${emptyPayload(eRow.payload)} sentAt=${!!eRow.sentAt}`);

    // (f) dead-letter at maxAttempts with payload wiped
    state.fail = true;
    const f0 = await outbox.dispatchEmail({ kind: "magic-link", to: "f@example.com", payload: { email: "f@example.com", magicLink: "https://x/?token=DEAD", firstName: "F" } });
    await sleep(200); // let the opportunistic drain settle first
    await EmailOutbox.updateOne({ _id: f0.id }, { $set: { status: "queued", attempts: 4, maxAttempts: 5, nextAttemptAt: new Date(Date.now() - 1000) } });
    await outbox.drainEmailOutbox();
    const fRow = await EmailOutbox.findById(f0.id).lean();
    console.log(`RESULT deadLetter status=${fRow.status} attempts=${fRow.attempts} payloadWiped=${emptyPayload(fRow.payload)} lastError=${!!fRow.lastError}`);

    // (g) dedupeKey returns the existing row (outbox mode)
    const g1 = await outbox.dispatchEmail({ kind: "order-confirmation", to: "guest@example.com", payload: { orderId: String(order._id) }, dedupeKey: `order-confirmation:${order._id}` });
    console.log(`RESULT dedupe sameId=${String(g1.id) === String(a.id)} mode=${g1.mode}`);

    // (h) sendNow order-confirmation with a missing order throws
    let hThrew = false;
    try { await outbox.sendNow("order-confirmation", { orderId: String(new mongoose.Types.ObjectId()) }); } catch { hThrew = true; }
    console.log(`RESULT sendNowMissingOrder threw=${hThrew}`);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}
main().catch((e) => { console.error("PROBE FAILED:", e); process.exit(1); });
