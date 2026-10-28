// Child-process probe for AR-41's migration (MIGRATIONS.md M-2):
// proves that a TTL index anchored to lastActivityAt (the migration's
// target state) keeps ACTIVE sessions alive while reaping idle ones.
// Uses a SCRATCH collection with a 3-second TTL (the production value
// is 86400 s) and a shortened TTL monitor interval, on a real
// mongodb-memory-server mongod with a DISK-BACKED dbPath under
// ~/workspace/aura-audit/mms-data (this VM's /tmp is a 512 MB tmpfs).
// The "active" document is touched with the same conditional update
// resolveGuestSession performs. Prints one RESULT line.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "guestttl-"));
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: "wiredTiger",
      args: ["--setParameter", "ttlMonitorSleepSecs=2"],
    },
  });
  const uri = mongod.getUri("aura_guest_ttl_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);

  // Scratch model mirroring the migrated GuestSession index state:
  // TTL on lastActivityAt (3 s here; 86400 s in production per M-2).
  const scratchSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
  });
  scratchSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: 3 });
  const Scratch = mongoose.model("GuestTtlScratch", scratchSchema);
  await Scratch.ensureIndexes();

  const now = Date.now();
  await Scratch.create([
    {
      sessionId: "idle",
      createdAt: new Date(now - 60_000),
      lastActivityAt: new Date(now - 60_000),
    },
    {
      sessionId: "active",
      createdAt: new Date(now - 60_000),
      lastActivityAt: new Date(now - 1_000),
    },
  ]);

  // Keep "active" active for ~9 seconds (three TTL windows), touching
  // it the way resolveGuestSession does (conditional $set).
  for (let i = 0; i < 4; i++) {
    await sleep(2200);
    await Scratch.updateOne(
      { sessionId: "active" },
      { $set: { lastActivityAt: new Date() } },
    );
  }

  const remaining = (await Scratch.find({}).select("sessionId").lean())
    .map((d) => d.sessionId)
    .sort();
  console.log(`RESULT remaining=${remaining.join(",")}`);

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
