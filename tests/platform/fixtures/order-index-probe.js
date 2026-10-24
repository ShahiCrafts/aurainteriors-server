// AR-03 probe — run as a CHILD process (same isolation rationale as
// topology-probe.js: mongodb-memory-server handles must not live in the
// test-runner process).
//
// Asserts against a REAL mongod (mongodb-memory-server, disk-backed
// dbPath under ~/workspace/aura-audit/mms-data):
//   - Order.ensureIndexes() completes WITHOUT throwing
//   - the live orders index on idempotencyKey is unique AND sparse
// Prints markers the parent test asserts on:
//   ENSURE_INDEXES_OK | ENSURE_INDEXES_THREW: <msg>
//   IDEMPOTENCY_INDEX: <json of the index spec or null>
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repo = path.join(__dirname, "..", "..", "..");
const MMS_SCRATCH = path.join(os.homedir(), "workspace", "aura-audit", "mms-data");

async function main() {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  fs.mkdirSync(MMS_SCRATCH, { recursive: true });
  const dbDir = fs.mkdtempSync(path.join(MMS_SCRATCH, "orderidx-"));
  let mongod;
  try {
    mongod = await MongoMemoryServer.create({ instance: { dbPath: dbDir, storageEngine: "wiredTiger" } });
    await mongoose.connect(mongod.getUri("indextest"));
    const Order = require(path.join(repo, "models", "order.model"));
    let threw = null;
    try {
      await Order.ensureIndexes();
    } catch (err) {
      threw = err;
    }
    console.log(threw ? `ENSURE_INDEXES_THREW: ${threw.message}` : "ENSURE_INDEXES_OK");
    const indexes = await mongoose.connection.db.collection("orders").indexes();
    const idem = indexes.find((i) => i.key && i.key.idempotencyKey === 1) || null;
    console.log(`IDEMPOTENCY_INDEX: ${JSON.stringify(idem)}`);
    await mongoose.disconnect();
  } finally {
    if (mongod) await mongod.stop();
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
}

main().then(
  () => process.exit(0),
  (err) => { console.error(`PROBE_FAIL: ${err.message}`); process.exit(1); },
);
