// AR-04 probe — BROADCAST_MODE=queue against a real mongod (MMS,
// disk-backed dbPath under ~/workspace/aura-audit/mms-data).
// services/email.service is stubbed in require.cache BEFORE any module
// that destructures it loads, so no Brevo call can happen; notification
// fan-out runs for real against the memory mongod (that is the point:
// dedupe on re-run must be proven against the real Notification store).
const path = require("node:path");
const fs = require("node:fs");
const REPO = path.resolve(__dirname, "../../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const broadcastCalls = [];
function stubEmailService() {
  const resolved = require.resolve(path.join(REPO, "services/email.service"));
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true,
    exports: {
      sendNewsletterBroadcast: async (subs, subject) => {
        broadcastCalls.push({ count: subs.length, subject, emails: subs.map((s) => s.email) });
        return { successful: subs.length, failed: 0, total: subs.length };
      },
      sendNewsletterConfirmationEmail: async () => {},
      sendNewsletterWelcomeEmail: async () => {},
      sendNewsletterBroadcastCalls: broadcastCalls,
    },
  };
}

async function until(fn, timeout = 5000) {
  const start = Date.now();
  while (!fn()) { if (Date.now() - start > timeout) throw new Error("until timeout"); await sleep(10); }
}

function mockRes() {
  return { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

async function main() {
  stubEmailService();
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "broadcast-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(mongod.getUri("aura_broadcast_test"));
  try {
    require(path.join(REPO, "models/discount.model")); // registered for promotion populate()
    const User = require(path.join(REPO, "models/user.model"));
    const Promotion = require(path.join(REPO, "models/promotion.model"));
    const Announcement = require(path.join(REPO, "models/announcement.model"));
    const Newsletter = require(path.join(REPO, "models/newsletter.model"));
    const Notification = require(path.join(REPO, "models/notification.model"));
    const Job = require(path.join(REPO, "models/job.model"));
    const PromotionService = require(path.join(REPO, "services/promotionService"));
    const AnnouncementService = require(path.join(REPO, "services/announcementService"));
    const broadcastJobs = require(path.join(REPO, "services/broadcastJobs.service"));
    const newsletterCtrl = require(path.join(REPO, "controllers/newsletter.controller"));
    const promotionCtrl = require(path.join(REPO, "controllers/promotion.controller"));
    const announcementCtrl = require(path.join(REPO, "controllers/announcement.controller"));

    const handlers = new Map();
    broadcastJobs.registerBroadcastHandlers({ registerHandler: (t, fn) => handlers.set(t, fn) });
    const runHandler = async (type, payload) => {
      const job = { _id: "probe-job", payload: { ...payload } };
      const patches = [];
      await handlers.get(type)(job, { workerId: "probe", updateProgress: async (p) => { patches.push(p); Object.assign(job.payload, p); }, heartbeat: async () => true });
      return patches;
    };

    const admin = await User.create({ email: "admin@example.com", firstName: "A", role: "admin" });
    await User.create({ email: "u1@example.com", firstName: "U1" });
    await User.create({ email: "u2@example.com", firstName: "U2" });
    const mkPromo = (title) => Promotion.create({ title, description: "desc", shortDescription: "short", targetAudience: { type: "all" }, createdBy: admin._id, status: "draft" });

    // (a) inline promo: sends immediately, no job rows
    delete process.env.BROADCAST_MODE;
    const p1 = await mkPromo("Inline Promo");
    const r1 = await PromotionService.sendPromotion(p1._id);
    const notifA = await Notification.countDocuments({});
    const jobsA = await Job.countDocuments({ type: "broadcast-promotion" });
    console.log(`RESULT inlinePromo success=${r1.success} notif=${notifA} jobs=${jobsA} queued=${!!r1.queued}`);

    // (b) inline announcement: fan-out immediate
    const a1 = await Announcement.create({ title: "Inline Ann", content: "hello content", createdBy: admin._id, status: "draft" });
    const pub1 = await AnnouncementService.publishAnnouncement(a1._id, admin._id);
    const notifB = await Notification.countDocuments({});
    console.log(`RESULT inlineAnn queued=${!!(pub1 && pub1.queued)} notif=${notifB} status=${pub1.status}`);

    // (c) queue promo: enqueues, zero new notifications until handler; re-run dedupes
    process.env.BROADCAST_MODE = "queue";
    const p2 = await mkPromo("Queued Promo");
    const r2 = await PromotionService.sendPromotion(p2._id);
    const notifBefore = await Notification.countDocuments({});
    const job2 = r2.jobId ? await Job.findById(r2.jobId).lean() : null;
    await runHandler("broadcast-promotion", { promotionId: String(p2._id) });
    const notifAfter = await Notification.countDocuments({});
    const promoAfter = await Promotion.findById(p2._id).lean();
    await runHandler("broadcast-promotion", { promotionId: String(p2._id) });
    const notifRerun = await Notification.countDocuments({});
    console.log(`RESULT queuePromo queued=${!!r2.queued} jobType=${job2 ? job2.type : "none"} jobKey=${job2 ? job2.idempotencyKey : "none"} notifBefore=${notifBefore} notifAfter=${notifAfter} notifRerun=${notifRerun} promoStatus=${promoAfter.status}`);

    // (d) queue promo via controller -> 202 shape
    const p3 = await mkPromo("Queued Promo Ctrl");
    const resD = mockRes();
    promotionCtrl.sendPromotion({ params: { id: String(p3._id) }, user: { _id: admin._id } }, resD, (e) => { resD.err = e; });
    await until(() => resD.body || resD.err);
    console.log(`RESULT queuePromoCtrl status=${resD.statusCode} queued=${resD.body?.data?.queued} hasJobId=${!!resD.body?.data?.jobId} err=${resD.err ? resD.err.message : "none"}`);

    // (e) queue announcement: publish 202 via service+controller, fan-out only via handler
    const a2 = await Announcement.create({ title: "Queued Ann", content: "queued content", createdBy: admin._id, status: "draft" });
    const notifEBefore = await Notification.countDocuments({});
    const pub2 = await AnnouncementService.publishAnnouncement(a2._id, admin._id);
    const notifEMid = await Notification.countDocuments({});
    await runHandler("broadcast-announcement", { announcementId: String(a2._id) });
    const notifEAfter = await Notification.countDocuments({});
    console.log(`RESULT queueAnn queued=${!!(pub2 && pub2.queued)} hasJobId=${!!(pub2 && pub2.jobId)} status=${pub2.announcement ? pub2.announcement.status : pub2.status} notifBefore=${notifEBefore} notifMid=${notifEMid} notifAfter=${notifEAfter}`);
    const a3 = await Announcement.create({ title: "Queued Ann Ctrl", content: "ctrl content", createdBy: admin._id, status: "draft" });
    const resE = mockRes();
    announcementCtrl.publishAnnouncement({ params: { id: String(a3._id) }, user: { _id: admin._id } }, resE, (e) => { resE.err = e; });
    await until(() => resE.body || resE.err);
    console.log(`RESULT queueAnnCtrl status=${resE.statusCode} queued=${resE.body?.data?.queued} hasJobId=${!!resE.body?.data?.jobId} hasAnn=${!!resE.body?.data?.announcement} err=${resE.err ? resE.err.message : "none"}`);

    // (f) newsletter queue: 202 + job payload intact, no sends until handler; handler ensures nonces + slices
    await Newsletter.create({ email: "s1@example.com", isActive: true, unsubscribeNonce: "nonce1" });
    await Newsletter.create({ email: "s2@example.com", isActive: true });
    await Newsletter.create({ email: "s3@example.com", isActive: true, unsubscribeNonce: "nonce3" });
    const callsBefore = broadcastCalls.length;
    const resF = mockRes();
    await newsletterCtrl.sendTrend({ body: { subject: "Trend Q", htmlContent: "<p>hi</p>", textContent: "hi" } }, resF);
    const nlJob = await Job.findOne({ type: "newsletter-broadcast" }).sort({ createdAt: -1 }).lean();
    const callsAfterEnqueue = broadcastCalls.length;
    const patches = await runHandler("newsletter-broadcast", nlJob.payload);
    const s2 = await Newsletter.findOne({ email: "s2@example.com" }).lean();
    console.log(`RESULT queueNews status=${resF.statusCode} queued=${resF.body?.data?.queued} hasJobId=${!!resF.body?.data?.jobId} payloadSubject=${nlJob?.payload?.subject} hasCampaign=${!!nlJob?.payload?.campaignId} callsBefore=${callsBefore} callsAfterEnqueue=${callsAfterEnqueue} callsAfterHandler=${broadcastCalls.length} nonceEnsured=${!!s2.unsubscribeNonce} lastProgress=${JSON.stringify(patches[patches.length - 1]?.progress || null)}`);

    // (g) newsletter inline: unchanged 200, sends immediately, no new job
    delete process.env.BROADCAST_MODE;
    const jobsBeforeG = await Job.countDocuments({ type: "newsletter-broadcast" });
    const resG = mockRes();
    await newsletterCtrl.sendTrend({ body: { subject: "Trend Inline", htmlContent: "<p>hi</p>", textContent: "hi" } }, resG);
    const jobsAfterG = await Job.countDocuments({ type: "newsletter-broadcast" });
    console.log(`RESULT inlineNews status=${resG.statusCode} success=${resG.body?.success} calls=${broadcastCalls.length} jobsBefore=${jobsBeforeG} jobsAfter=${jobsAfterG}`);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}
main().catch((e) => { console.error("PROBE FAILED:", e); process.exit(1); });
