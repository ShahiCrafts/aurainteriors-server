// Child-process probe for AR-24 (incremental product rating). Runs
// against a real mongodb-memory-server mongod (disk-backed dbPath
// under ~/workspace/aura-audit/mms-data - /tmp is a 512 MB tmpfs).
//
// PROPERTY TEST: a seeded-PRNG mix of >= 1000 create / edit-rating /
// approval-flip / delete / rating-neutral-update operations against
// ONE product, performed through exactly the model entry points the
// app uses (createReview -> Review.create; updateReview and admin
// toggleApproval -> findOne + doc.save(); deleteReview ->
// Review.findOneAndDelete; addAdminResponse -> findOneAndUpdate).
// Afterwards the stored rating.average / rating.count / rating.sum
// must equal a from-scratch aggregation over the reviews collection
// (computed through the RAW driver, bypassing the instrumented
// Mongoose aggregate). Review.aggregate is wrapped with a counter:
// on the incremental path it must NEVER fire during the mix.
//
// LEGACY LEG: a second product whose rating.sum is $unset and whose
// reviews were inserted via the raw driver (pre-existing data, no
// hooks) with a bogus stored rating - one normal review create must
// lazily initialize the sum via the from-scratch recompute and land
// exactly on the true aggregation.
// Prints RESULT lines.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

// Deterministic PRNG so the mix is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "review-rating-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const uri = mongod.getUri("aura_review_rating_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Product = require(path.join(REPO, "models/product.model"));
  const Review = require(path.join(REPO, "models/review.model"));
  const User = require(path.join(REPO, "models/user.model"));

  let aggregateCalls = 0;
  const realAggregate = Review.aggregate.bind(Review);
  Review.aggregate = (...args) => { aggregateCalls += 1; return realAggregate(...args); };

  const category = new mongoose.Types.ObjectId();
  const product = await Product.create({
    name: "Rating Probe Chair",
    slug: "rating-probe-chair",
    description: "probe",
    category,
    price: 100,
    stock: 10,
  });
  const users = [];
  for (let i = 0; i < 80; i++) {
    users.push(await User.create({ email: `rater${i}@example.com`, firstName: `R${i}` }));
  }

  const rand = mulberry32(20261024);
  const live = new Map(); // userId -> reviewId
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  let ops = 0;

  const doCreate = async () => {
    const free = users.filter((u) => !live.has(String(u._id)));
    if (!free.length) return;
    const user = pick(free);
    const review = await Review.create({
      product: product._id,
      user: user._id,
      rating: 1 + Math.floor(rand() * 5),
      title: "t",
      comment: "c",
    });
    live.set(String(user._id), review._id);
    ops += 1;
  };
  const withLive = async (fn) => {
    if (!live.size) return doCreate();
    const userId = pick([...live.keys()]);
    await fn(userId, live.get(userId));
    ops += 1;
  };

  // Run until >= 1300 COUNTED operations (some rolls no-op, e.g. a
  // create when every user already has a live review).
  for (let i = 0; i < 6000 && ops < 1300; i++) {
    const roll = rand();
    if (roll < 0.35) {
      await doCreate();
    } else if (roll < 0.60) {
      // edit rating (updateReview path: findOne + save)
      await withLive(async (_u, reviewId) => {
        const doc = await Review.findById(reviewId);
        if (!doc) return;
        doc.rating = 1 + Math.floor(rand() * 5);
        await doc.save();
      });
    } else if (roll < 0.80) {
      // approval flip (admin toggleApproval path: findOne + save)
      await withLive(async (_u, reviewId) => {
        const doc = await Review.findById(reviewId);
        if (!doc) return;
        doc.isApproved = !doc.isApproved;
        await doc.save();
      });
    } else if (roll < 0.92) {
      // delete (deleteReview path: findOneAndDelete)
      await withLive(async (userId, reviewId) => {
        await Review.findOneAndDelete({ _id: reviewId });
        live.delete(userId);
      });
    } else {
      // rating-neutral admin response (addAdminResponse path)
      await withLive(async (_u, reviewId) => {
        await Review.findOneAndUpdate(
          { _id: reviewId },
          { adminResponse: { comment: "thanks", respondedAt: new Date() } }
        );
      });
    }
  }

  const expectedOf = async (productId) => {
    const rows = await Review.collection
      .aggregate([
        { $match: { product: productId, isApproved: true } },
        { $group: { _id: null, sum: { $sum: "$rating" }, count: { $sum: 1 } } },
      ])
      .toArray();
    const sum = rows.length ? rows[0].sum : 0;
    const count = rows.length ? rows[0].count : 0;
    const avg = count ? Math.round((sum / count) * 10) / 10 : 0;
    return { sum, count, avg };
  };

  const expected = await expectedOf(product._id);
  const stored = await Product.findById(product._id).select("+rating.sum").lean(); // +rating.sum: internal field is select:false (never in payloads); the probe reads it explicitly
  const avgDiff = Math.abs((stored.rating?.average ?? -1) - expected.avg);
  console.log(
    `RESULT rating ops=${ops} aggregateCalls=${aggregateCalls}` +
    ` storedAvg=${stored.rating?.average} storedCount=${stored.rating?.count} storedSum=${stored.rating?.sum ?? "absent"}` +
    ` expectedAvg=${expected.avg} expectedCount=${expected.count} expectedSum=${expected.sum} avgDiff=${avgDiff}`
  );

  // Legacy leg: sum absent, bogus stored rating, reviews pre-inserted
  // through the raw driver (no hooks ran for them).
  const legacy = await Product.create({
    name: "Legacy Probe Sofa",
    slug: "legacy-probe-sofa",
    description: "probe",
    category,
    price: 200,
    stock: 5,
  });
  const legacyDocs = [];
  for (let i = 0; i < 30; i++) {
    legacyDocs.push({
      product: legacy._id,
      user: users[i]._id,
      rating: (i % 5) + 1,
      comment: "legacy",
      isApproved: i % 4 !== 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await Review.collection.insertMany(legacyDocs);
  await Product.collection.updateOne(
    { _id: legacy._id },
    { $unset: { "rating.sum": "" }, $set: { "rating.average": 4.9, "rating.count": 999 } }
  );
  // One ordinary write through the app entry point must initialize.
  await Review.create({
    product: legacy._id,
    user: users[40]._id,
    rating: 2,
    title: "new",
    comment: "first tracked review",
  });
  const legacyExpected = await expectedOf(legacy._id);
  const legacyStored = await Product.findById(legacy._id).select("+rating.sum").lean();
  const legacyAvgDiff = Math.abs((legacyStored.rating?.average ?? -1) - legacyExpected.avg);
  console.log(
    `RESULT legacy storedAvg=${legacyStored.rating?.average} storedCount=${legacyStored.rating?.count} storedSum=${legacyStored.rating?.sum ?? "absent"}` +
    ` expectedAvg=${legacyExpected.avg} expectedCount=${legacyExpected.count} expectedSum=${legacyExpected.sum} avgDiff=${legacyAvgDiff}`
  );

  await mongoose.disconnect();
  await mongod.stop({ doCleanup: true, force: true });
}

main().then(
  () => process.exit(0),
  (err) => { console.log(`RESULT probe-error ${err && err.message}`); process.exit(2); }
);
