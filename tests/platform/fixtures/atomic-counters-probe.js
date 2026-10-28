// Child-process probe for AR-23 (atomic $inc counters). Runs against
// a real mongodb-memory-server mongod (disk-backed dbPath under
// ~/workspace/aura-audit/mms-data - this VM's /tmp is a 512 MB tmpfs).
//
// Scenarios (each loads SEPARATE document copies, like separate
// requests/processes would, then fires the model method concurrently):
//   (a) promotion updateMetrics: 100 parallel +1 events on one
//       promotion must land EXACTLY +100 with zero errors, and an
//       invalid field must still throw (validation preserved).
//   (b) discount incrementUsage at limit-1 (4/5): 10 parallel calls
//       must yield EXACTLY ONE success, the rest null, zero errors,
//       and the stored count must end EXACTLY at the limit (5).
//   (c) user updateLoginActivity: 50 parallel calls must persist
//       loginCount EXACTLY 50 and set lastLogin - the method itself
//       persists atomically (callers no longer save the whole user).
// Prints RESULT lines.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "atomic-counters-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri("aura_atomic_counters_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Promotion = require(path.join(REPO, "models/promotion.model"));
  const Discount = require(path.join(REPO, "models/discount.model"));
  const User = require(path.join(REPO, "models/user.model"));
  const owner = new mongoose.Types.ObjectId();

  // (a) promotion metrics
  const promo = await Promotion.create({
    title: "Counter probe",
    description: "probe",
    createdBy: owner,
  });
  const promoCopies = await Promise.all(
    Array.from({ length: 100 }, () => Promotion.findById(promo._id)),
  );
  const promoResults = await Promise.allSettled(
    promoCopies.map((p) => p.updateMetrics("sentCount", 1)),
  );
  const promoErrors = promoResults.filter(
    (r) => r.status === "rejected",
  ).length;
  let validation = "did-not-throw";
  try {
    await promoCopies[0].updateMetrics("bogusField", 1);
  } catch (e) {
    validation = /Invalid metric field/.test(e.message)
      ? "threw"
      : `threw-other:${e.message}`;
  }
  const promoAfter = await Promotion.findById(promo._id).lean();
  console.log(
    `RESULT promo sentCount=${promoAfter.metrics.sentCount} errors=${promoErrors}` +
      ` inMemory=${promoCopies[0].metrics.sentCount} validation=${validation}`,
  );

  // (b) discount usage limit
  const discount = await Discount.create({
    code: "PROBE23",
    discountPercentage: 10,
    minimumOrderAmount: 0,
    expiryDate: new Date(Date.now() + 86400_000),
    maxUsageLimit: 5,
    currentUsageCount: 4,
    createdBy: owner,
  });
  const discountCopies = await Promise.all(
    Array.from({ length: 10 }, () => Discount.findById(discount._id)),
  );
  const discountResults = await Promise.allSettled(
    discountCopies.map((d) => d.incrementUsage()),
  );
  const dErrors = discountResults.filter((r) => r.status === "rejected").length;
  const dSuccess = discountResults.filter(
    (r) => r.status === "fulfilled" && r.value != null,
  ).length;
  const dNull = discountResults.filter(
    (r) => r.status === "fulfilled" && r.value == null,
  ).length;
  const discountAfter = await Discount.findById(discount._id).lean();
  console.log(
    `RESULT discount finalCount=${discountAfter.currentUsageCount} success=${dSuccess} nulls=${dNull} errors=${dErrors}`,
  );

  // (c) user login bookkeeping
  const user = await User.create({
    email: "login-probe@example.com",
    firstName: "Probe",
  });
  const userCopies = await Promise.all(
    Array.from({ length: 50 }, () => User.findById(user._id)),
  );
  const loginResults = await Promise.allSettled(
    userCopies.map((u) => u.updateLoginActivity()),
  );
  const loginErrors = loginResults.filter(
    (r) => r.status === "rejected",
  ).length;
  const userAfter = await User.findById(user._id).lean();
  console.log(
    `RESULT login loginCount=${userAfter.loginCount} lastLoginSet=${userAfter.lastLogin != null}` +
      ` errors=${loginErrors} inMemoryCount=${userCopies[0].loginCount} inMemoryDirty=${userCopies[0].isModified("loginCount")}`,
  );

  await mongoose.disconnect();
  await mongod.stop({ doCleanup: true, force: true });
}

main().then(
  () => process.exit(0),
  (err) => {
    console.log(`RESULT probe-error ${err && err.message}`);
    process.exit(2);
  },
);
