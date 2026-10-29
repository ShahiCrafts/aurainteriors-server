// AR-20: email outbox + truthful send outcomes.
//   EMAIL_MODE=outbox — dispatchEmail writes a "queued" row (in the
//     caller's transaction when a session is passed) and the drainer
//     sends it with bounded retries; a Brevo outage no longer loses
//     the email.
//   EMAIL_MODE=direct (default) — dispatchEmail still records a row,
//     attempts the send immediately, and finalizes the row from the
//     REAL outcome, so callers report emailSent truthfully instead
//     of asserting `true`. If the bookkeeping write itself fails the
//     send is still attempted — delivery never depends on it.
// Mode is read per call; only the exact value "outbox" enables it.
// The outbox MODEL is required lazily (loadOutboxModel) rather than
// at module load: this service is required by controllers that older
// stub-based test harnesses load with a stubbed "mongoose" module (or
// a vm module whitelist), where evaluating the model file would crash
// at load time. Dispatch in direct mode treats ANY model load/write
// failure as "send without a record" (below), so those harnesses keep
// working; with a real mongoose (any real runtime) the model always
// loads.
const loadOutboxModel = () => require("../models/emailOutbox.model");

const isOutboxMode = () =>
  require("../config/appConfig").getString("EMAIL_MODE") === "outbox";

async function sendNow(kind, payload = {}) {
  const emailService = require("./email.service");
  switch (kind) {
    case "order-confirmation": {
      const Order = require("../models/order.model");
      const order = await Order.findById(payload.orderId);
      if (!order)
        throw new Error(
          `Order ${payload.orderId} not found for confirmation email`,
        );
      return emailService.sendOrderConfirmationEmail(order);
    }
    case "magic-link":
      return emailService.sendMagicLinkEmail(
        payload.email,
        payload.magicLink,
        payload.firstName,
      );
    case "otp":
      return emailService.sendOtpEmail(payload.email, payload.otp);
    case "newsletter-welcome":
      return emailService.sendNewsletterWelcomeEmail(
        payload.email,
        payload.nonce,
      );
    default:
      throw new Error(`Unknown email kind: ${kind}`);
  }
}

// Wipe the payload on terminal states: payloads can hold a raw
// magic-link token / OTP and must not sit in the DB after the attempt.
async function finalizeSent(id) {
  let EmailOutbox;
  try {
    EmailOutbox = loadOutboxModel();
  } catch {
    return;
  }
  await EmailOutbox.updateOne(
    { _id: id },
    {
      $set: { status: "sent", sentAt: new Date(), lastError: null },
      $unset: { payload: 1 },
    },
  ).catch(() => {});
}

async function finalizeFailed(id, error) {
  let EmailOutbox;
  try {
    EmailOutbox = loadOutboxModel();
  } catch {
    return;
  }
  await EmailOutbox.updateOne(
    { _id: id },
    {
      $set: {
        status: "failed",
        lastError: String(error?.message || error).slice(0, 1000),
      },
      $unset: { payload: 1 },
    },
  ).catch(() => {});
}

async function dispatchEmail(
  { kind, to, payload, dedupeKey },
  { session } = {},
) {
  if (isOutboxMode()) {
    const EmailOutbox = loadOutboxModel();
    let row;
    try {
      const doc = {
        kind,
        to,
        payload,
        status: "queued",
        nextAttemptAt: new Date(),
        ...(dedupeKey ? { dedupeKey } : {}),
      };
      if (session) {
        [row] = await EmailOutbox.create([doc], { session });
      } else {
        row = await EmailOutbox.create(doc);
      }
    } catch (error) {
      if (error && error.code === 11000 && dedupeKey) {
        const existing = await EmailOutbox.findOne({ dedupeKey });
        if (existing)
          return { mode: "outbox", status: "queued", id: existing._id };
      }
      throw error;
    }
    // Opportunistic drain (trigger 1 of 3): the leased interval and
    // the worker interval are the reliable paths; this just makes
    // the common case fast.
    setImmediate(() => {
      drainEmailOutbox().catch((e) =>
        console.error("[email-outbox] opportunistic drain failed:", e.message),
      );
    });
    return { mode: "outbox", status: "queued", id: row._id };
  }

  // Direct mode: record, attempt, finalize from the real outcome.
  // The row write is attempted only when mongoose is connected: with
  // no connection a create() would buffer for ~10 s before failing,
  // and delivery must not wait on bookkeeping (stub harnesses and
  // any disconnected moment take the send-without-record path at
  // once). In every real runtime the DB connects before traffic, so
  // the outcome IS recorded there.
  let row = null;
  try {
    const mongoose = require("mongoose");
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      throw new Error("database not connected");
    }
    const EmailOutbox = loadOutboxModel();
    row = await EmailOutbox.create({
      kind,
      to,
      payload,
      status: "sending",
      ...(dedupeKey ? { dedupeKey } : {}),
    });
  } catch (error) {
    if (error && error.code === 11000 && dedupeKey) {
      row = await loadOutboxModel()
        .findOne({ dedupeKey })
        .catch(() => null);
    }
    if (!row) {
      // The bookkeeping write failed — still attempt the send.
      console.error(
        "[email-outbox] row write failed; sending without a record:",
        error.message,
      );
      try {
        await sendNow(kind, payload);
        return { mode: "direct", status: "sent", id: null };
      } catch (sendError) {
        console.error(
          "[email-outbox] unrecorded send failed:",
          sendError.message,
        );
        return { mode: "direct", status: "failed", id: null };
      }
    }
  }
  try {
    await sendNow(kind, payload);
    await finalizeSent(row._id);
    return { mode: "direct", status: "sent", id: row._id };
  } catch (error) {
    await finalizeFailed(row._id, error);
    return { mode: "direct", status: "failed", id: row._id };
  }
}

async function drainEmailOutbox({ limit = 25 } = {}) {
  const mongoose = require("mongoose");
  if (!mongoose.connection || mongoose.connection.readyState !== 1)
    return { processed: 0 };
  const EmailOutbox = loadOutboxModel();
  const { backoffMs } = require("./jobQueue.service");
  const staleSendingBefore = new Date(Date.now() - 2 * 60 * 1000);
  let processed = 0;
  for (let n = 0; n < limit; n++) {
    const now = new Date();
    const row = await EmailOutbox.findOneAndUpdate(
      {
        $or: [
          { status: "queued", nextAttemptAt: { $lte: now } },
          { status: "sending", updatedAt: { $lte: staleSendingBefore } },
        ],
      },
      { $set: { status: "sending" } },
      { returnDocument: "after", sort: { nextAttemptAt: 1 } },
    );
    if (!row) break;
    processed++;
    try {
      await sendNow(row.kind, row.payload || {});
      await finalizeSent(row._id);
    } catch (error) {
      const attempts = (row.attempts || 0) + 1;
      const message = String(error?.message || error).slice(0, 1000);
      if (attempts >= (row.maxAttempts || 5)) {
        await EmailOutbox.updateOne(
          { _id: row._id },
          {
            $set: { status: "failed", attempts, lastError: message },
            $unset: { payload: 1 },
          },
        );
      } else {
        await EmailOutbox.updateOne(
          { _id: row._id },
          {
            $set: {
              status: "queued",
              attempts,
              lastError: message,
              nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
            },
          },
        );
      }
    }
  }
  return { processed };
}

// The outbox is drained by intervals + the opportunistic setImmediate
// in dispatchEmail, NOT by a job-queue handler type — no job rows are
// created for individual emails, so there is nothing to register.
// jobHandlers.js calls this so the (non-)registration is explicit.
function registerEmailHandlers() {
  // Intentionally a no-op: see the comment above. (Called by
  // jobHandlers.js with the queue; the argument is ignored.)
}

module.exports = {
  isOutboxMode,
  sendNow,
  dispatchEmail,
  drainEmailOutbox,
  registerEmailHandlers,
};
