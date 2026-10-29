// Mongoose `new` option deprecation guard — child-process MMS probe.
//
// Exercises the main findOneAndUpdate / findByIdAndUpdate paths that
// previously passed the deprecated new-true option (rate-limit
// store, auth limiter, scheduler lease, job queue claim, push tokens,
// profile update, wishlist add, review helpful vote, discount usage,
// email outbox claim) plus a createApp() boot, while collecting every
// process warning. The parent test asserts ZERO warnings matching
// /the `new` option/ (and zero [MONGOOSE] deprecations at all), and
// that each path still returns the UPDATED document (the behavior
// returnDocument: "after" must preserve).
//
// services/email.service is stubbed in require.cache BEFORE the
// outbox service can load it — no network/email call can happen.
const path = require("node:path");
const REPO = path.resolve(__dirname, "../../..");

const warnings = [];
process.on("warning", (w) => {
  warnings.push(`${w.name}: ${w.message}`);
});

function stubEmailService() {
  const resolved = require.resolve(path.join(REPO, "services/email.service"));
  const ok = async () => ({ ok: true });
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {
      sendOrderConfirmationEmail: ok,
      sendMagicLinkEmail: ok,
      sendOtpEmail: ok,
      sendNewsletterWelcomeEmail: ok,
    },
  };
}

// catchAsync handlers return no promise (they .catch(next) internally),
// so controller calls are awaited by polling for the response/error.
async function waitFor(cond, timeoutMs = 10000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 25));
  }
  return true;
}

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    set() {
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

async function main() {
  stubEmailService();
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const mongod = await MongoMemoryServer.create();
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(mongod.getUri("aura_mongoose_warning_test"));
  const say = (line) => console.log(`RESULT ${line}`);
  try {
    // Boot: app factory assembly.
    const { createApp } = require(path.join(REPO, "app.js"));
    createApp();
    say("boot app=assembled");

    // Rate-limit store: increments return the updated counter.
    const Store = require(path.join(REPO, "middleware/mongoRateLimitStore"));
    const store = new Store("guardprobe");
    store.init({ windowMs: 60000 });
    const hit1 = await store.increment("k1");
    const hit2 = await store.increment("k1");
    say(
      `ratelimit hits=${hit1.totalHits},${hit2.totalHits} updatedDoc=${hit2.totalHits === 2}`,
    );

    // Auth limiter: two passes, the stored counter reaches 2 (the
    // limiter's limit check reads the UPDATED document).
    const { createAuthLimiter } = require(
      path.join(REPO, "middleware/authRateLimit.middleware"),
    );
    const limit = createAuthLimiter("guardprobe", 100, 100);
    let nextCount = 0;
    for (let i = 0; i < 2; i++) {
      await limit(
        { body: { email: "Guard@Example.com" }, ip: "127.0.0.1", socket: {} },
        fakeRes(),
        () => nextCount++,
      );
    }
    const AuthAttempt = require(path.join(REPO, "models/authAttempt.model"));
    const attempt = await AuthAttempt.findOne({}).lean();
    say(`authlimit next=${nextCount} count=${attempt && attempt.count}`);

    // Scheduler lease: first holder wins with its holderId on the
    // returned (updated) doc; a second holder is blocked.
    const lease = require(path.join(REPO, "services/schedulerLease.service"));
    const doc = await lease.tryAcquire("guard-lease", "holder-A", 5000);
    const loser = await lease.tryAcquire("guard-lease", "holder-B", 5000);
    say(
      `lease acquired=${!!doc && doc.holderId === "holder-A"} loserBlocked=${loser === null}`,
    );

    // Job queue: claim returns the updated job (processing, attempts 1).
    const jq = require(path.join(REPO, "services/jobQueue.service"));
    await jq.enqueue("guard-type", { x: 1 });
    const claimed = await jq.claimNext("worker-guard");
    say(
      `jobqueue status=${claimed && claimed.status} attempts=${claimed && claimed.attempts}`,
    );

    // Push tokens: register returns the active upserted doc;
    // invalidate returns the updated doc with isActive=false.
    const push = require(path.join(REPO, "services/pushTokenService"));
    const uid = new mongoose.Types.ObjectId();
    const reg = await push.registerPushToken({
      userId: uid,
      deviceId: "dev-guard",
      token: "tok-guard",
      deviceName: "Phone",
      platform: "android",
    });
    const inv = await push.invalidateToken("tok-guard", "guard");
    say(
      `pushtoken registered=${reg && reg.isActive === true} invalidated=${inv && inv.isActive === false}`,
    );

    // Profile update (controller): the response carries the UPDATED
    // user (firstName after the update, not before).
    const User = require(path.join(REPO, "models/user.model"));
    const user = await User.create({
      firstName: "Before",
      email: "guard-profile@example.com",
    });
    const profile = require(path.join(REPO, "controllers/profile.controller"));
    const pres = fakeRes();
    await profile.updateProfile(
      { user: { id: user._id }, body: { firstName: "After" } },
      pres,
    );
    say(
      `profile status=${pres.statusCode} firstName=${pres.body && pres.body.data.user.firstName}`,
    );

    // Wishlist add (controller): response wishlist contains the
    // product (the write returns the updated wishlist via projection).
    const Product = require(path.join(REPO, "models/product.model"));
    const product = await Product.create({
      name: "Guard Chair",
      description: "Chair used by the mongoose warning guard probe.",
      category: new mongoose.Types.ObjectId(),
      price: 100,
      stock: 3,
    });
    const wishlist = require(path.join(REPO, "controllers/wishlist.controller"));
    const wres = fakeRes();
    let werr = null;
    wishlist.addToWishlist(
      { user: { _id: user._id }, body: { productId: String(product._id) } },
      wres,
      (e) => {
        werr = e;
      },
    );
    await waitFor(() => wres.statusCode !== null || werr !== null);
    const wItem =
      wres.body && wres.body.data ? wres.body.data.item : null;
    say(
      `wishlist status=${wres.statusCode} err=${werr ? werr.message : "none"} inWishlist=${wres.body && wres.body.data && wres.body.data.inWishlist} item=${!!wItem}`,
    );

    // Review addAdminResponse (controller): the response review is
    // the UPDATED document (adminResponse set by this call).
    // (markHelpful is not exercised here: it has a pre-existing,
    // unrelated Mongoose 9 bug — it passes a pipeline array without
    // updatePipeline: true and errors identically with the old
    // new-true option. See work/mongoose/mongoose-report.md.)
    const Review = require(path.join(REPO, "models/review.model"));
    const author = await User.create({
      firstName: "Author",
      email: "guard-author@example.com",
    });
    const review = await Review.create({
      product: product._id,
      user: author._id,
      rating: 5,
      comment: "Great chair",
    });
    const reviews = require(path.join(REPO, "controllers/review.controller"));
    const rres = fakeRes();
    let rerr = null;
    reviews.addAdminResponse(
      {
        params: { reviewId: String(review._id) },
        body: { comment: "Thanks!" },
        user: { _id: user._id },
      },
      rres,
      (e) => {
        rerr = e;
      },
    );
    await waitFor(() => rres.statusCode !== null || rerr !== null);
    const rReview =
      rres.body && rres.body.data ? rres.body.data.review : null;
    say(
      `review status=${rres.statusCode} err=${rerr ? rerr.message : "none"} adminComment=${rReview && rReview.adminResponse && rReview.adminResponse.comment}`,
    );

    // Discount: model incrementUsage and the checkout usage service
    // both resolve to the UPDATED discount (count moves 0 -> 1 -> 2).
    const Discount = require(path.join(REPO, "models/discount.model"));
    const discount = await Discount.create({
      code: "GUARD10",
      discountPercentage: 10,
      expiryDate: new Date(Date.now() + 86400000),
      minimumOrderAmount: 0,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const inc = await discount.incrementUsage();
    const { consumeDiscountUsage } = require(
      path.join(REPO, "services/discountUsage.service"),
    );
    const order = {
      discountCode: { code: "GUARD10", percentage: 10 },
      subtotal: 100,
      discountUsageConsumed: false,
    };
    await consumeDiscountUsage(order);
    const finalDiscount = await Discount.findById(discount._id).lean();
    say(
      `discount afterIncrement=${inc && inc.currentUsageCount} final=${finalDiscount && finalDiscount.currentUsageCount} consumed=${order.discountUsageConsumed}`,
    );

    // Email outbox: drain claims the queued row through the updated
    // findOneAndUpdate path and processes it (send is stubbed).
    const EmailOutbox = require(path.join(REPO, "models/emailOutbox.model"));
    await EmailOutbox.create({
      kind: "otp",
      payload: { email: "guard@example.com", otp: "123456" },
      status: "queued",
      nextAttemptAt: new Date(Date.now() - 1000),
    });
    const outbox = require(path.join(REPO, "services/emailOutbox.service"));
    const drain = await outbox.drainEmailOutbox({ limit: 1 });
    say(`outbox processed=${drain.processed}`);

    // Let any async warning delivery flush, then report.
    await new Promise((r) => setTimeout(r, 300));
    const newOption = warnings.filter((w) => /the `new` option/.test(w));
    const mongooseWarnings = warnings.filter((w) => /MONGOOSE|mongoose/i.test(w));
    say(
      `warnings total=${warnings.length} newOption=${newOption.length} mongoose=${mongooseWarnings.length}`,
    );
    for (const w of warnings) say(`warning ${w.split("\n")[0]}`);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("PROBE FAILED", e);
    process.exit(1);
  });
