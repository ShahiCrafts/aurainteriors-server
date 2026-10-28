// AR-02 (D1) probe — RATE_LIMIT_STORE=mongo store semantics against a
// real mongod (MMS, disk-backed dbPath under
// ~/workspace/aura-audit/mms-data; standalone suffices — no
// transactions). Two store INSTANCES over one database stand in for
// two server processes: same prefix = shared counters, different
// prefix = isolated buckets (the per-limiter isolation MemoryStore
// gives each limiter instance today).
// Fail-tolerant at the parent commit: reports module availability
// instead of dying on the require.
const path = require("node:path");
const fs = require("node:fs");
const REPO = path.resolve(__dirname, "../../..");
const DB_NAME = "aura_rate_limit_test";

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "ratelimit-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri(DB_NAME);
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  try {
    let Store = null;
    try {
      Store = require(path.join(REPO, "middleware/mongoRateLimitStore"));
    } catch {
      Store = null;
    }
    let Model = null;
    try {
      Model = require(path.join(REPO, "models/rateLimitCounter.model"));
    } catch {
      Model = null;
    }
    console.log(`RESULT modules store=${!!Store} model=${!!Model}`);
    if (!Store || !Model) {
      console.log("RESULT shared skipped=module-missing");
      console.log("RESULT isolated skipped=module-missing");
      console.log("RESULT expired skipped=module-missing");
      console.log("RESULT decrement skipped=module-missing");
      console.log("RESULT resetKey skipped=module-missing");
      return;
    }
    await Model.ensureIndexes();
    const WINDOW = 60000;
    const mk = (prefix) => {
      const s = new Store(prefix);
      s.init({ windowMs: WINDOW });
      return s;
    };

    // (a) same prefix, two instances: counts are shared.
    const a = mk("shared");
    const b = mk("shared");
    const a1 = await a.increment("k1");
    const b2 = await b.increment("k1");
    const a3 = await a.increment("k1");
    console.log(
      `RESULT shared a1=${a1.totalHits} b2=${b2.totalHits} a3=${a3.totalHits} resetIsDate=${a1.resetTime instanceof Date}`,
    );

    // (b) different prefix: isolated bucket space.
    const c = mk("other");
    const c1 = await c.increment("k1");
    console.log(`RESULT isolated otherFirst=${c1.totalHits}`);

    // (c) expired window: a counter whose resetAt is in the past is
    // reset by the next increment (hits restart at 1, fresh resetAt).
    await Model.create({
      _id: "exp:oldkey",
      hits: 5,
      resetAt: new Date(Date.now() - 1000),
    });
    const exp = mk("exp");
    const e1 = await exp.increment("oldkey");
    console.log(
      `RESULT expired totalHits=${e1.totalHits} resetFuture=${e1.resetTime.getTime() > Date.now()}`,
    );

    // (d) decrement never goes below 0.
    const d = mk("dec");
    await d.increment("k");
    await d.increment("k");
    await d.decrement("k");
    const afterDec = await Model.findById("dec:k").lean();
    await d.decrement("k");
    await d.decrement("k");
    await d.decrement("k");
    const afterFloor = await Model.findById("dec:k").lean();
    console.log(
      `RESULT decrement afterDec=${afterDec.hits} afterFloor=${afterFloor.hits}`,
    );

    // (e) resetKey clears; the next increment restarts at 1.
    const r = mk("rst");
    await r.increment("k");
    await r.resetKey("k");
    const gone = await Model.findById("rst:k").lean();
    const r1 = await r.increment("k");
    console.log(
      `RESULT resetKey cleared=${gone === null} afterResetInc=${r1.totalHits}`,
    );

    // (f) resetAll clears the store's counters.
    await r.resetAll();
    const remaining = await Model.countDocuments({});
    console.log(`RESULT resetAll remaining=${remaining}`);
  } finally {
    await mongoose.disconnect().catch(() => {});
    await mongod.stop().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("PROBE_ERROR", err);
    process.exit(1);
  });
