// AR-04: BROADCAST_MODE=queue (default inline = current behavior).
// Promotion sends, announcement notifications and newsletter
// broadcasts are enqueued as durable jobs (services/jobQueue.service)
// and fanned out by the worker instead of inside the admin request /
// scheduler tick. The mode is read PER CALL: only the exact value
// "queue" enables queue mode.
const crypto = require("crypto");
const AppError = require("../utils/AppError");

const isQueueMode = () => require("../config/appConfig").getString("BROADCAST_MODE") === "queue";

async function enqueuePromotion(promotionId) {
  const jobQueue = require("./jobQueue.service");
  return jobQueue.enqueue(
    "broadcast-promotion",
    { promotionId: String(promotionId) },
    { idempotencyKey: `broadcast:promotion:${promotionId}` }
  );
}

async function enqueueAnnouncement(announcementId) {
  const jobQueue = require("./jobQueue.service");
  return jobQueue.enqueue(
    "broadcast-announcement",
    { announcementId: String(announcementId) },
    { idempotencyKey: `broadcast:announcement:${announcementId}` }
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
async function ensureSubscriberNonces(subscribers) {
  const Newsletter = require("../models/newsletter.model");
  for (const subscriber of subscribers) {
    if (!subscriber.unsubscribeNonce) {
      const nonce = crypto.randomBytes(24).toString("hex");
      const updated = await Newsletter.findOneAndUpdate(
        { _id: subscriber._id, unsubscribeNonce: null },
        { $set: { unsubscribeNonce: nonce } },
        { new: true }
      );
      const current = updated || (await Newsletter.findById(subscriber._id));
      subscriber.unsubscribeNonce = current.unsubscribeNonce;
    }
  }
  return subscribers;
}

function registerBroadcastHandlers(jobQueue) {
  jobQueue.registerHandler("broadcast-promotion", async (job, { updateProgress }) => {
    const PromotionService = require("./promotionService");
    await updateProgress({ progress: { stage: "sending" } });
    let result;
    try {
      result = await PromotionService.performPromotionSend(job.payload.promotionId);
    } catch (error) {
      // Idempotent completion: a re-run after the promotion already
      // sent (or is being sent by the claim owner elsewhere) is a
      // SUCCESS, not a failure. Crash safety for duplicates comes
      // from NotificationService's per-recipient dedupe on the
      // notificationData idempotencyKey `promo-<id>`.
      const already =
        error instanceof AppError &&
        ((error.statusCode === 400 && /already been sent/.test(error.message)) ||
          (error.statusCode === 409 && /already being sent/.test(error.message)));
      if (!already) throw error;
      await updateProgress({ progress: { stage: "done", alreadySent: true } });
      return;
    }
    await updateProgress({
      progress: {
        stage: "done",
        sent: result?.metrics?.sentCount ?? null,
        failed: result?.metrics?.failedCount ?? null,
      },
    });
  });

  jobQueue.registerHandler("broadcast-announcement", async (job, { updateProgress }) => {
    const AnnouncementService = require("./announcementService");
    const Announcement = require("../models/announcement.model");
    const announcement = await Announcement.findById(job.payload.announcementId);
    if (!announcement) throw new AppError("Announcement not found", 404);
    await updateProgress({ progress: { stage: "sending" } });
    await AnnouncementService.performAnnouncementBroadcast(announcement);
    await updateProgress({ progress: { stage: "done" } });
  });

  jobQueue.registerHandler("newsletter-broadcast", async (job, { updateProgress }) => {
    const Newsletter = require("../models/newsletter.model");
    const emailService = require("./email.service");
    const { subject, htmlContent } = job.payload;
    const subscribers = await Newsletter.find({ isActive: true }).select("email unsubscribeNonce");
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
      const result = await emailService.sendNewsletterBroadcast(slice, subject, htmlContent);
      sent += result.successful || 0;
      failed += result.failed || 0;
      await updateProgress({ progress: { sent, failed, total }, resumeFrom: i + slice.length });
    }
    if (total === 0) {
      await updateProgress({ progress: { sent: 0, failed: 0, total: 0 }, resumeFrom: 0 });
    }
  });
}

module.exports = {
  isQueueMode,
  enqueuePromotion,
  enqueueAnnouncement,
  enqueueNewsletter,
  ensureSubscriberNonces,
  registerBroadcastHandlers,
};
