// AR-04: BROADCAST_MODE=queue (default inline = current behavior).
// Promotion sends, announcement notifications and newsletter
// broadcasts are enqueued as durable jobs (services/jobQueue.service)
// and fanned out by the worker instead of inside the admin request /
// scheduler tick. The mode is read PER CALL: only the exact value
// "queue" enables queue mode.
const crypto = require("crypto");
const AppError = require("../utils/AppError");

const isQueueMode = () =>
  require("../config/appConfig").getString("BROADCAST_MODE") === "queue";

async function enqueuePromotion(promotionId) {
  const jobQueue = require("./jobQueue.service");
  return jobQueue.enqueue(
    "broadcast-promotion",
    { promotionId: String(promotionId) },
    { idempotencyKey: `broadcast:promotion:${promotionId}` },
  );
}

async function enqueueAnnouncement(announcementId) {
  const jobQueue = require("./jobQueue.service");
  return jobQueue.enqueue(
    "broadcast-announcement",
    { announcementId: String(announcementId) },
    { idempotencyKey: `broadcast:announcement:${announcementId}` },
  );
}

async function enqueueNewsletter({ subject, htmlContent, textContent }) {
  const jobQueue = require("./jobQueue.service");
  // No idempotencyKey: each admin submission is a distinct campaign.
  return jobQueue.enqueue("newsletter-broadcast", {
    subject,
    htmlContent,
    textContent,
    campaignId: crypto.randomBytes(16).toString("hex"),
  });
}

// Shared by the newsletter controller (inline mode) and the queued
// handler: existing active subscriptions need a nonce before their
// next email (extracted verbatim from newsletter.controller sendTrend).
// PERF-016 (remediation): the per-subscriber sequential
// findOneAndUpdate + findById loop is now batched — conditional
// updateOne ops via bulkWrite in batches of 500, then ONE re-read per
// batch to populate the local nonce values. Semantics are identical:
// a nonce is generated per subscriber, written only when the stored
// nonce is still null (race-safe claim, same filter as before), and
// every subscriber ends up carrying its stored nonce.
const NONCE_BATCH_SIZE = 500;
async function ensureSubscriberNonces(subscribers) {
  const Newsletter = require("../models/newsletter.model");
  const missing = (subscribers || []).filter((s) => !s.unsubscribeNonce);
  for (let i = 0; i < missing.length; i += NONCE_BATCH_SIZE) {
    const batch = missing.slice(i, i + NONCE_BATCH_SIZE);
    await Newsletter.bulkWrite(
      batch.map((subscriber) => ({
        updateOne: {
          filter: { _id: subscriber._id, unsubscribeNonce: null },
          update: {
            $set: {
              unsubscribeNonce: crypto.randomBytes(24).toString("hex"),
            },
          },
        },
      })),
      { ordered: false },
    );
    const fresh = await Newsletter.find({
      _id: { $in: batch.map((s) => s._id) },
    })
      .select("unsubscribeNonce")
      .lean();
    const byId = new Map(fresh.map((doc) => [String(doc._id), doc]));
    for (const subscriber of batch) {
      const doc = byId.get(String(subscriber._id));
      if (doc) subscriber.unsubscribeNonce = doc.unsubscribeNonce;
    }
  }
  return subscribers;
}

function registerBroadcastHandlers(jobQueue) {
  jobQueue.registerHandler(
    "broadcast-promotion",
    async (job, { updateProgress }) => {
      const PromotionService = require("./promotionService");
      await updateProgress({ progress: { stage: "sending" } });
      let result;
      try {
        result = await PromotionService.performPromotionSend(
          job.payload.promotionId,
        );
      } catch (error) {
        // Idempotent completion: a re-run after the promotion already
        // sent (or is being sent by the claim owner elsewhere) is a
        // SUCCESS, not a failure. Crash safety for duplicates comes
        // from NotificationService's per-recipient dedupe on the
        // notificationData idempotencyKey `promo-<id>`.
        const already =
          error instanceof AppError &&
          ((error.statusCode === 400 &&
            /already been sent/.test(error.message)) ||
            (error.statusCode === 409 &&
              /already being sent/.test(error.message)));
        if (!already) throw error;
        await updateProgress({
          progress: { stage: "done", alreadySent: true },
        });
        return;
      }
      await updateProgress({
        progress: {
          stage: "done",
          sent: result?.metrics?.sentCount ?? null,
          failed: result?.metrics?.failedCount ?? null,
        },
      });
    },
  );

  jobQueue.registerHandler(
    "broadcast-announcement",
    async (job, { updateProgress }) => {
      const AnnouncementService = require("./announcementService");
      const Announcement = require("../models/announcement.model");
      const announcement = await Announcement.findById(
        job.payload.announcementId,
      );
      if (!announcement) throw new AppError("Announcement not found", 404);
      await updateProgress({ progress: { stage: "sending" } });
      await AnnouncementService.performAnnouncementBroadcast(announcement);
      await updateProgress({ progress: { stage: "done" } });
    },
  );

  jobQueue.registerHandler(
    "newsletter-broadcast",
    async (job, { updateProgress }) => {
      const Newsletter = require("../models/newsletter.model");
      const emailService = require("./email.service");
      const { subject, htmlContent } = job.payload;
      const subscribers = await Newsletter.find({ isActive: true }).select(
        "email unsubscribeNonce",
      );
      await ensureSubscriberNonces(subscribers);
      const total = subscribers.length;
      // Crash-resume: newsletter email has no provider-side idempotency,
      // so progress is recorded per slice and a restarted handler skips
      // every slice before payload.resumeFrom.
      let sent = job.payload.progress?.sent || 0;
      let failed = job.payload.progress?.failed || 0;
      const start = job.payload.resumeFrom || 0;
      for (let i = start; i < total; i += 250) {
        const slice = subscribers.slice(i, i + 250);
        const result = await emailService.sendNewsletterBroadcast(
          slice,
          subject,
          htmlContent,
        );
        sent += result.successful || 0;
        failed += result.failed || 0;
        await updateProgress({
          progress: { sent, failed, total },
          resumeFrom: i + slice.length,
        });
      }
      if (total === 0) {
        await updateProgress({
          progress: { sent: 0, failed: 0, total: 0 },
          resumeFrom: 0,
        });
      }
    },
  );
}

module.exports = {
  isQueueMode,
  enqueuePromotion,
  enqueueAnnouncement,
  enqueueNewsletter,
  ensureSubscriberNonces,
  registerBroadcastHandlers,
};
