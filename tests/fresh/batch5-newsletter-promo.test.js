// Batch 5 (FRESH remediation): FA-04, FA-05, FA-27, FA-28, FA-54, FA-60,
// FA-38, FA-30, FA-55, FA-70, FA-56. (FA-81 is a governance note.)
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};
process.env.JWT_SECRET = "jwt-secret-for-tests";

test("FA-28: newsletter tokens use NEWSLETTER_TOKEN_SECRET when set (JWT_SECRET fallback otherwise)", () => {
  const tokens = require(path.join(repo, "services/newsletterToken.service.js"));
  process.env.NEWSLETTER_TOKEN_SECRET = "dedicated-secret";
  const t = tokens.issueNewsletterToken("a@example.com", "unsubscribe", "nonce-1", 60000);
  assert.equal(tokens.verifyNewsletterToken(t, "unsubscribe").email, "a@example.com");
  delete process.env.NEWSLETTER_TOKEN_SECRET;
  // Issued under the dedicated key; must NOT verify under the JWT fallback key.
  assert.throws(() => tokens.verifyNewsletterToken(t, "unsubscribe"), /Invalid/);
  const t2 = tokens.issueNewsletterToken("a@example.com", "unsubscribe", "nonce-2", 60000);
  assert.equal(tokens.verifyNewsletterToken(t2, "unsubscribe").email, "a@example.com", "fallback still works during migration");
});

test("FA-04: generic announcement update cannot set status", async () => {
  const doc = { _id: "a1", status: "draft", title: "old", save: async function () { return this; },
                populate: async function () { return this; } };
  stub("models/announcement.model.js", { findById: async () => doc });
  stub("models/notification.model.js", {});
  stub("models/user.model.js", {});
  const svc = require(path.join(repo, "services/announcementService.js"));
  const instance = svc.updateAnnouncement ? svc : new svc();
  await instance.updateAnnouncement("a1", { title: "new", status: "published" }, "admin1");
  assert.equal(doc.title, "new");
  assert.equal(doc.status, "draft", "status transitions require the dedicated lifecycle methods");
});

test("FA-56: announcement list coerces filter values at the sink", async () => {
  let seenQuery = null;
  const chain = { sort: () => chain, skip: () => chain, limit: () => chain, populate: () => chain, lean: async () => [] };
  stub("models/announcement.model.js", {
    find: (q) => { seenQuery = q; return chain; },
    countDocuments: async () => 0,
  });
  delete require.cache[path.join(repo, "services/announcementService.js")];
  const svc = require(path.join(repo, "services/announcementService.js"));
  const instance = svc.getAllAnnouncements ? svc : new svc();
  await instance.getAllAnnouncements({ status: { $ne: null }, type: "update", isPinned: "yes" });
  assert.equal(seenQuery.status, undefined, "operator object must not reach the filter");
  assert.equal(seenQuery.type, "update");
  assert.equal(seenQuery.isPinned, undefined, "non-boolean isPinned dropped");
});

test("FA-54/FA-60: duplicate subscribe inside the cooldown neither re-sends nor overwrites source", async () => {
  let emailSent = 0;
  const subscriber = {
    email: "a@example.com", isActive: false, source: "original-source",
    confirmationExpiresAt: new Date(Date.now() + 3600e3), confirmationSentAt: new Date(),
    confirmationTokenHash: "keepme", save: async function () { return this; },
  };
  stub("models/newsletter.model.js", Object.assign(async () => {}, { findOne: async () => subscriber }));
  stub("services/email.service.js", {
    sendNewsletterConfirmationEmail: async () => { emailSent++; },
    sendNewsletterWelcomeEmail: async () => {}, sendNewsletterBroadcast: async () => {},
  });
  const controller = require(path.join(repo, "controllers/newsletter.controller.js"));
  const res = { code: null, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await controller.subscribe({ body: { email: "a@example.com", source: "attacker-source" } }, res);
  assert.equal(res.code, 200);
  assert.equal(emailSent, 0, "no re-send inside cooldown");
  assert.equal(subscriber.source, "original-source", "source attribution is creation-only");
  assert.equal(subscriber.confirmationTokenHash, "keepme", "pending token not churned");
});

test("FA-05: unsubscribe errors on no match and rotates the nonce on success", async () => {
  const tokens = require(path.join(repo, "services/newsletterToken.service.js"));
  const token = tokens.issueNewsletterToken("a@example.com", "unsubscribe", "nonce-xyz", 60000);
  let lastUpdate = null; let matched = 0;
  stub("models/newsletter.model.js", Object.assign(async () => {}, {
    updateOne: async (filter, update) => { lastUpdate = update; return { matchedCount: matched }; },
  }));
  delete require.cache[path.join(repo, "controllers/newsletter.controller.js")];
  const controller = require(path.join(repo, "controllers/newsletter.controller.js"));
  const mkRes = () => ({ code: null, status(c) { this.code = c; return this; }, json() { return this; } });
  let res = mkRes();
  await controller.unsubscribe({ body: { token } }, res);
  assert.equal(res.code, 400, "no match is an error, not a silent success");
  matched = 1; res = mkRes();
  await controller.unsubscribe({ body: { token } }, res);
  assert.equal(res.code, 200);
  assert.ok(lastUpdate.$set.unsubscribeNonce && lastUpdate.$set.unsubscribeNonce !== "nonce-xyz", "nonce rotated on use (replay-proof)");
});

test("FA-27: admin subscriber listing projects out credential material", async () => {
  let selectArg = null;
  const chain = { sort: () => chain, limit: () => chain, skip: () => chain, select: (s) => { selectArg = s; return Promise.resolve([]); } };
  stub("models/newsletter.model.js", Object.assign(async () => {}, {
    find: () => chain, countDocuments: async () => 0,
  }));
  delete require.cache[path.join(repo, "controllers/newsletter.controller.js")];
  const controller = require(path.join(repo, "controllers/newsletter.controller.js"));
  const res = { status() { return this; }, json() { return this; } };
  await controller.getSubscribers({ query: {} }, res);
  assert.ok(String(selectArg).includes("-unsubscribeNonce"), `select must exclude unsubscribeNonce, got ${selectArg}`);
});

test("FA-70: concurrent sendPromotion calls - exactly one claims the send", async () => {
  let claimed = false;
  const doc = { _id: "p1", status: "sending", targetAudience: { type: "all" }, metrics: {},
                populate: async function () { return this; }, save: async function () { return this; } };
  stub("models/promotion.model.js", {
    findById: () => ({ select: () => ({ lean: async () => ({ status: "draft" }) }) }),
    findOneAndUpdate: async () => { if (claimed) return null; claimed = true; return doc; },
    findByIdAndUpdate: async () => doc,
  });
  stub("models/user.model.js", { find: () => ({ select: () => ({ lean: async () => [] }) }) });
  stub("models/notification.model.js", { exists: async () => true });
  const svc = require(path.join(repo, "services/promotionService.js"));
  const instance = svc.sendPromotion ? svc : new svc();
  const first = await instance.sendPromotion("p1");
  assert.equal(first.success, true);
  await assert.rejects(() => instance.sendPromotion("p1"), /already being sent/);
});

test("FA-55: engagement counts only for users the promotion was delivered to", async () => {
  let incCalls = 0; let delivered = false;
  stub("models/promotion.model.js", { findByIdAndUpdate: async () => { incCalls++; return {}; } });
  stub("models/notification.model.js", { exists: async () => delivered });
  delete require.cache[path.join(repo, "services/promotionService.js")];
  const svc = require(path.join(repo, "services/promotionService.js"));
  const instance = svc.trackEngagement ? svc : new svc();
  await instance.trackEngagement("p1", "read", "user-not-delivered");
  assert.equal(incCalls, 0, "no delivery record -> no metric");
  delivered = true;
  await instance.trackEngagement("p1", "read", "user-delivered");
  assert.equal(incCalls, 1, "delivered recipient -> metric counts");
});

test("FA-30/FA-38: array and content caps in validators", () => {
  const promo = require(path.join(repo, "validators/promotion.validator.js"));
  const many = Array.from({ length: 1001 }, () => "64b64c2f9f1b2c3d4e5f6071");
  const r = promo.createPromotionSchema.validate({ title: "t", description: "d", targetAudience: { type: "custom", userIds: many } });
  assert.ok(r.error, "userIds capped at 1000");
  const news = require(path.join(repo, "validators/newsletter.validator.js"));
  const r2 = news.sendTrendSchema.validate({ subject: "hello world", htmlContent: "x".repeat(200001), textContent: "y".repeat(60) });
  assert.ok(r2.error, "htmlContent capped");
});
