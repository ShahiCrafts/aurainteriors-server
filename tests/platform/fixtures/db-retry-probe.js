// Child-process probe for AR-35 (database connect retry). A real
// mongodb-memory-server mongod sits behind a small TCP proxy that
// BLACKHOLES connections for the first ~14 seconds (accepts and
// swallows, never forwards) and then starts proxying. The app's own
// config/database connector is then asked to connect through the
// proxy: the first attempt must fail (serverSelectionTimeoutMS is
// 10 s), and the bounded retry must carry the SAME process to a
// successful connection once the proxy opens - no restart.
// (mongodb-memory-server's own startup delay is NOT used as the
// delay mechanism; the proxy is.) Prints RESULT lines; exits 0 only
// on a successful in-process connection.
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");

const REPO = path.resolve(__dirname, "../../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "dbretry-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const mongoPort = Number(new URL(mongod.getUri()).port);

  const blackholeUntil = Date.now() + 14000;
  const held = new Set();
  const proxy = net.createServer((client) => {
    if (Date.now() < blackholeUntil) {
      held.add(client);
      client.on("data", () => {});
      client.on("close", () => held.delete(client));
      client.on("error", () => {});
      return;
    }
    const upstream = net.connect(mongoPort, "127.0.0.1");
    client.pipe(upstream);
    upstream.pipe(client);
    client.on("error", () => upstream.destroy());
    upstream.on("error", () => client.destroy());
  });
  await new Promise((r) => proxy.listen(0, "127.0.0.1", r));
  const proxyPort = proxy.address().port;
  console.log(`RESULT proxy-ready port=${proxyPort}`);

  process.env.MONGO_URI = `mongodb://127.0.0.1:${proxyPort}`;
  const startedAt = Date.now();
  const { connectDatabase } = require(path.join(REPO, "config/database"));
  await connectDatabase(); // parent code process.exit(1)s on first failure
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  console.log(
    `RESULT connected readyState=${mongoose.connection.readyState} elapsedMs=${Date.now() - startedAt}`,
  );

  await mongoose.disconnect();
  for (const s of held) s.destroy();
  proxy.close();
  await mongod.stop({ doCleanup: true, force: true });
  await sleep(50);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.log(`RESULT probe-error ${err && err.message}`);
    process.exit(2);
  },
);
