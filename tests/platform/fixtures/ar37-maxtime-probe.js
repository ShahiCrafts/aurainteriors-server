// AR-37 probe — run as a CHILD process against a real mongod
// (mongodb-memory-server, disk-backed dbPath under
// ~/workspace/aura-audit/mms-data; this VM's /tmp is a 512 MB tmpfs).
//
// Fault injection: the orders collection is seeded with ~100k documents
// and its indexes are DROPPED (except _id), so Order.find({user}) is a
// full collection scan + sort. Then:
//   - dbTools.getOrderHistory with { maxTimeMS: 5 } must FAIL FAST with
//     a MaxTimeMSExpired server error (surfaced via the dbTools error
//     log, result []) instead of completing the scan;
//   - the same call with NO budget returns the bounded newest 20
//     (AR-36) after completing the scan;
//   - registry.execute with a generous budget returns the same 20
//     through the tool path.
// Prints RESULT lines the parent test asserts on.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repo = path.join(__dirname, "..", "..", "..");
const MMS_SCRATCH = path.join(
  os.homedir(),
  "workspace",
  "aura-audit",
  "mms-data",
);
const T0 = Date.UTC(2025, 0, 1);
const OTHER_COUNT = 100000;
const TARGET_COUNT = 25;

async function main() {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  fs.mkdirSync(MMS_SCRATCH, { recursive: true });
  const dbDir = fs.mkdtempSync(path.join(MMS_SCRATCH, "ar37maxtime-"));
  let mongod;
  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbPath: dbDir, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(mongod.getUri("ar37maxtime"));
    const coll = mongoose.connection.db.collection("orders");
    await coll.dropIndexes().catch(() => {});

    const targetUser = new mongoose.Types.ObjectId();
    const otherUser = new mongoose.Types.ObjectId();
    const baseDoc = (user, orderId, createdAt) => ({
      user,
      orderId,
      orderStatus: "delivered",
      paymentMethod: "cod",
      paymentStatus: "paid",
      total: 100,
      subtotal: 100,
      isGuestOrder: false,
      shippingAddress: {
        fullName: "Fixture",
        phone: "9800000000",
        addressLine1: "1 Main St",
        city: "Kathmandu",
        country: "Nepal",
        postalCode: "44600",
      },
      items: [{ name: "Item", price: 100, quantity: 1 }],
      createdAt,
      updatedAt: createdAt,
    });

    for (let start = 0; start < OTHER_COUNT; start += 5000) {
      const batch = [];
      for (let i = start; i < Math.min(start + 5000, OTHER_COUNT); i++) {
        batch.push(baseDoc(otherUser, `OTHER-${i}`, new Date(T0 + i * 1000)));
      }
      await coll.insertMany(batch);
    }
    const targetDocs = [];
    for (let j = 0; j < TARGET_COUNT; j++) {
      // j = 0 is the NEWEST target order.
      targetDocs.push(
        baseDoc(
          targetUser,
          `TARGET-${j}`,
          new Date(T0 + (OTHER_COUNT + TARGET_COUNT - j) * 1000),
        ),
      );
    }
    await coll.insertMany(targetDocs);
    console.log(`RESULT seeded=${await coll.countDocuments({})}`);

    const errorLines = [];
    const origError = console.error;
    console.error = (...args) => {
      errorLines.push(args.map(String).join(" "));
    };

    const dbTools = require(path.join(repo, "services", "dbTools"));
    const registry = require(
      path.join(repo, "services", "chatV2", "tools", "registry"),
    );

    let t = Date.now();
    const bounded = await dbTools.getOrderHistory(
      { userId: targetUser.toString() },
      { maxTimeMS: 5 },
    );
    const boundedElapsed = Date.now() - t;
    console.error = origError;
    console.log(
      `RESULT directBoundedLength=${Array.isArray(bounded) ? bounded.length : "n/a"}`,
    );
    console.log(`RESULT directBoundedElapsedMs=${boundedElapsed}`);
    console.log(
      `RESULT directBoundedErrors=${errorLines.join(" | ") || "none"}`,
    );

    t = Date.now();
    const unbounded = await dbTools.getOrderHistory({
      userId: targetUser.toString(),
    });
    const unboundedElapsed = Date.now() - t;
    console.log(
      `RESULT directUnboundedLength=${Array.isArray(unbounded) ? unbounded.length : "n/a"}`,
    );
    console.log(`RESULT directUnboundedElapsedMs=${unboundedElapsed}`);
    console.log(
      `RESULT directUnboundedFirst=${unbounded && unbounded[0] ? unbounded[0].orderId : "none"}`,
    );
    console.log(
      `RESULT directUnboundedLast=${unbounded && unbounded.length ? unbounded[unbounded.length - 1].orderId : "none"}`,
    );

    const viaRegistry = await registry.execute(
      "getOrderHistory",
      {},
      { userId: targetUser.toString(), chatId: "probe" },
      { timeoutMs: 30000 },
    );
    console.log(
      `RESULT registryGenerousLength=${Array.isArray(viaRegistry) ? viaRegistry.length : "n/a"}`,
    );

    await mongoose.disconnect();
  } finally {
    if (mongod) await mongod.stop({ doCleanup: true, force: true });
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(`PROBE_FAIL: ${err.stack || err.message}`);
    process.exit(1);
  },
);
