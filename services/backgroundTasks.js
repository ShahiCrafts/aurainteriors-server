const NotificationService = require("./notificationService");
const { withLease } = require("./schedulerLease.service");

const ONE_MINUTE = 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

// Phase 3 step 2 (AR-02): every periodic task runs under a Mongo
// scheduler lease (services/schedulerLease.service.js), so a fleet of
// web instances runs each schedule once per period instead of once
// per instance; a single instance always acquires and behaves as
// before. A lease-store error while connected fails CLOSED (the run
// is skipped and logged): duplicating a fan-out is worse than
// delaying it one period - and the promotion/announcement processors
// are additionally claim-guarded per item (AR-08 / FA-70).
async function runLeased(name, ttlMs, fn) {
  try {
    const ran = await withLease(name, ttlMs, fn);
    if (!ran) console.log(`[background] ${name}: lease held by another instance, skipping this period`);
    return ran;
  } catch (error) {
    console.error(`[background] ${name}: lease/run failed:`, error.message);
    return false;
  }
}

let attachmentInterval = null;
let emailOutboxInterval = null;
let stockReservationInterval = null;
let retentionTimeout = null;
let retentionInterval = null;
let cleaningAttachments = false;

// AR-27 (D-C): daily retention, anchored to 03:00 UTC like the
// notification cleanup's 02:00 anchor. The tick FIRST checks whether
// any RETENTION_* policy is set (positive-integer parse, mirroring
// retention.service's policies()); with none set it returns without
// touching leases or the DB — an unset deployment never writes a
// lease doc and never deletes anything. With any policy set, the
// run goes through the scheduler lease like every other task.
const RETENTION_ENV_KEYS = [
  "RETENTION_CHAT_MESSAGE_DAYS",
  "RETENTION_NOTIFICATION_DAYS",
  "RETENTION_BLOG_ENGAGEMENT_DAYS",
  "RETENTION_CONTACT_DAYS",
];
function anyRetentionPolicySet() {
  return RETENTION_ENV_KEYS.some((key) => {
    const n = Number(process.env[key]);
    return Number.isInteger(n) && n > 0;
  });
}
async function runRetentionTick() {
  if (!anyRetentionPolicySet()) return;
  await runLeased("retention", 10 * ONE_MINUTE, async () => {
    await require("./retention.service").runRetention();
  });
}

// AR-25: stock-reservation expiry sweep, leased, every 10 minutes.
// It mutates only StockReservation docs + the reservedStock counter,
// so it is wired always — with no holds it is a no-op (and with no
// database connection the service itself returns immediately).
async function expireStockReservationsTick() {
  await runLeased("stock-reservation-expiry", 9 * ONE_MINUTE, async () => {
    await require("./stockReservation.service").expireStaleHolds();
  });
}

// AR-20 drain trigger (2 of 3): every 60 s, leased, call the outbox
// drainer - but ONLY when EMAIL_MODE=outbox. The env check is inside
// the tick so direct mode never writes lease documents for this task.
async function drainEmailOutboxTick() {
  if (require("../config/appConfig").getString("EMAIL_MODE") !== "outbox") return;
  await runLeased("email-outbox-drain", 55 * 1000, async () => {
    await require("./emailOutbox.service").drainEmailOutbox();
  });
}
async function cleanupAttachments() {
  await runLeased("attachment-cleanup", 10 * ONE_MINUTE, async () => {
    if (cleaningAttachments) return;
    cleaningAttachments = true;
    try { await require("./chatUpload.service").cleanupExpiredUploads(); }
    catch (error) { console.error("[background] Attachment cleanup failed:", error.message); }
    finally { cleaningAttachments = false; }
  });
}

let promotionInterval = null;
let cleanupTimeout = null;
let cleanupInterval = null;
let guestHoldInterval = null;
let isProcessingPromotions = false;
let isCleaningNotifications = false;

async function processScheduledPromotions() {
  if (isProcessingPromotions) return;
  isProcessingPromotions = true;
  try {
    const PromotionService = require("./promotionService");
    await PromotionService.processScheduledPromotions();
  } catch (error) {
    console.error("[background] Scheduled promotion processing failed:", error.message);
  } finally {
    isProcessingPromotions = false;
  }
}

let isProcessingAnnouncements = false;
async function processScheduledAnnouncements() {
  if (isProcessingAnnouncements) return;
  isProcessingAnnouncements = true;
  try { await require("./announcementService").processScheduledAnnouncements(); }
  catch (error) { console.error("[background] Scheduled announcement processing failed:", error.message); }
  finally { isProcessingAnnouncements = false; }
}
function processScheduledContent() {
  // Each processor isolates errors so either task can proceed independently.
  runLeased("scheduled-content", 55 * 1000, async () => {
    await processScheduledPromotions();
    await processScheduledAnnouncements();
  });
}

async function cleanupExpiredNotifications() {
  await runLeased("notification-cleanup", 10 * ONE_MINUTE, async () => {
    if (isCleaningNotifications) return;
    isCleaningNotifications = true;
    try {
      await NotificationService.cleanupExpiredNotifications();
    } catch (error) {
      console.error("[background] Notification cleanup failed:", error.message);
    } finally {
      isCleaningNotifications = false;
    }
  });
}

function millisecondsUntilNextUtcHour(hour) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function startBackgroundTasks() {
  if (promotionInterval || cleanupTimeout || cleanupInterval) return;

  // Preserve the former Bull cadence without requiring Redis.
  promotionInterval = setInterval(processScheduledContent, ONE_MINUTE);
  promotionInterval.unref?.();

  cleanupTimeout = setTimeout(() => {
    cleanupExpiredNotifications();
    cleanupInterval = setInterval(cleanupExpiredNotifications, ONE_DAY);
    cleanupInterval.unref?.();
  }, millisecondsUntilNextUtcHour(2));
  cleanupTimeout.unref?.();

  attachmentInterval = setInterval(cleanupAttachments, 60 * ONE_MINUTE);
  attachmentInterval.unref?.();

  // Commit-audit C-5: the guest hold-release interval belongs here,
  // module-scope like every sibling - it was previously created inside
  // the cleanup timeout callback, so it did not exist until the first
  // 02:00 UTC tick and stopBackgroundTasks could never clear it.
  guestHoldInterval = setInterval(releaseExpiredGuestCodHolds, 60 * ONE_MINUTE);
  guestHoldInterval.unref?.();

  emailOutboxInterval = setInterval(drainEmailOutboxTick, ONE_MINUTE);
  emailOutboxInterval.unref?.();

  stockReservationInterval = setInterval(expireStockReservationsTick, 10 * ONE_MINUTE);
  stockReservationInterval.unref?.();

  retentionTimeout = setTimeout(() => {
    runRetentionTick();
    retentionInterval = setInterval(runRetentionTick, ONE_DAY);
    retentionInterval.unref?.();
  }, millisecondsUntilNextUtcHour(3));
  retentionTimeout.unref?.();

  ingestionSweepInterval = setInterval(runIngestionRecoverySweepTick, 5 * ONE_MINUTE);
  ingestionSweepInterval.unref?.();
  // Boot recovery: documents stranded in "processing" by a restart
  // are swept once at startup, not only at the first 5-minute tick.
  setImmediate(runIngestionRecoverySweepTick);

  setImmediate(cleanupAttachments);

  // Catch promotions that became due while the service was offline.
  setImmediate(processScheduledContent);
  console.log("✓ Background tasks initialized (Redis/Bull not required)");
}

function stopBackgroundTasks() {
  if (attachmentInterval) clearInterval(attachmentInterval);
  attachmentInterval = null;
  if (promotionInterval) clearInterval(promotionInterval);
  if (cleanupTimeout) clearTimeout(cleanupTimeout);
  if (cleanupInterval) clearInterval(cleanupInterval);
  if (guestHoldInterval) clearInterval(guestHoldInterval);
  if (emailOutboxInterval) clearInterval(emailOutboxInterval);
  emailOutboxInterval = null;
  if (stockReservationInterval) clearInterval(stockReservationInterval);
  stockReservationInterval = null;
  if (retentionTimeout) clearTimeout(retentionTimeout);
  retentionTimeout = null;
  if (retentionInterval) clearInterval(retentionInterval);
  retentionInterval = null;
  if (ingestionSweepInterval) clearInterval(ingestionSweepInterval);
  ingestionSweepInterval = null;
  promotionInterval = null;
  cleanupTimeout = null;
  cleanupInterval = null;
  guestHoldInterval = null;
}


let isReleasingGuestHolds = false;
// FA-09: stale PENDING guest COD reservations are auto-released when
// GUEST_COD_HOLD_RELEASE_HOURS is set (>0): the order is cancelled
// through the normal transition path. Since the 2026-10-23 deferral,
// guest COD orders no longer hold deducted stock while pending, so
// this is reservation cleanup (it also still covers any legacy
// deducted holds, whose stock the cancel path restores). Disabled by
// default - the window is a business decision (OWNER_DECISIONS.md).
async function releaseExpiredGuestCodHolds() {
  if (isReleasingGuestHolds) return;
  const hours = Number(process.env.GUEST_COD_HOLD_RELEASE_HOURS || 0);
  if (!Number.isFinite(hours) || hours <= 0) return;
  // Lease only once the feature is enabled, so a disabled release
  // never writes lease documents.
  await runLeased("guest-hold-release", 10 * ONE_MINUTE, releaseExpiredGuestCodHoldsLeased);
}

async function releaseExpiredGuestCodHoldsLeased() {
  if (isReleasingGuestHolds) return;
  const hours = Number(process.env.GUEST_COD_HOLD_RELEASE_HOURS || 0);
  if (!Number.isFinite(hours) || hours <= 0) return;
  isReleasingGuestHolds = true;
  try {
    const Order = require("../models/order.model");
    const { transitionOrder } = require("./orderTransition.service");
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const stale = await Order.find({
      isGuestOrder: true, paymentMethod: "cod",
      orderStatus: "pending", paymentStatus: { $ne: "paid" },
      createdAt: { $lt: cutoff },
    }).select("_id").lean();
    for (const { _id } of stale) {
      try {
        await transitionOrder({ _id }, "cancelled", "Guest COD hold expired without confirmation (auto-release)");
      } catch (error) {
        console.error(`[background] Guest COD hold release failed for ${_id}:`, error.message);
      }
    }
    if (stale.length) console.log(`[background] Released ${stale.length} expired guest COD hold(s)`);
  } catch (error) {
    console.error("[background] Guest COD hold release failed:", error.message);
  } finally {
    isReleasingGuestHolds = false;
  }
}

function runDocumentIngestion(documentId) {
  // AR-05: enqueue a durable ingestion job instead of running the
  // ingestion inline via setImmediate (unqueued, uncapped, lost on
  // restart). Fire-and-forget for callers, exactly as before: the
  // exported name/signature are unchanged (document.controller and
  // test stubs depend on them), enqueue errors are caught and logged
  // here, and nothing here ever throws or rejects unhandled.
  try {
    const result = require("./ingestionJobs.service").enqueueIngestion(documentId);
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        console.error(`[INGESTION] Failed to enqueue ingestion for document ${documentId}:`, error.message);
      });
    }
  } catch (error) {
    console.error(`[INGESTION] Failed to enqueue ingestion for document ${documentId}:`, error.message);
  }
}

let ingestionSweepInterval = null;
// AR-05: stuck-document recovery sweep. Leased like every other
// periodic task; the boot setImmediate run in startBackgroundTasks
// covers documents stranded in "processing" across a restart.
async function runIngestionRecoverySweepTick() {
  await runLeased("ingestion-recovery-sweep", 4 * 60 * 1000, async () => {
    await require("./ingestionJobs.service").runIngestionRecoverySweep();
  });
}

module.exports = {
  startBackgroundTasks,
  stopBackgroundTasks,
  runDocumentIngestion,
  releaseExpiredGuestCodHolds,
};
