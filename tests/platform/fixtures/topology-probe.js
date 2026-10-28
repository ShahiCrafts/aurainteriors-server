// AR-06 topology probe — run as a CHILD process by boot-matrix.test.js
// case (e), so mongodb-memory-server and mongoose handles never live in
// the test-runner process (an earlier in-process version passed all
// assertions but kept the runner alive on dangling MMS handles).
//
// Prints markers the parent asserts on:
//   STANDALONE_TXN_ERROR: <message>   (checkout-shaped transaction fails)
//   SERVER_REFUSES_STANDALONE        (AR-06: boot-time topology check
//                                      exits non-zero with the fatal
//                                      replica-set line; /health never
//                                      answers)
//   REPLSET_TXN_OK                    (same transaction succeeds)
//   SERVER_BOOTS_ON_REPLSET           (the check passes on a replica
//                                      set and the server serves)
// Exits 0 only if every step behaved as designed.
const { spawn } = require("node:child_process");
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
const PORT_STANDALONE = 39406;
const PORT_REPLSET = 39407;
const FATAL_SNIPPET = "requires MongoDB running as a replica set";

async function waitForHealth(port, timeoutMs = 25000) {
  const start = Date.now();
  for (;;) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.status === 200) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - start > timeoutMs)
      throw new Error("server did not come up");
    await new Promise((r) => setTimeout(r, 300));
  }
}

function spawnServer(port, mongoUri) {
  const child = spawn("node", ["server.js"], {
    cwd: repo,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: "development",
      PORT: String(port),
      GOOGLE_CLIENT_ID: "dummy",
      GOOGLE_CLIENT_SECRET: "dummy",
      MONGO_URI: mongoUri,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (d) => {
    out += d;
  });
  child.stderr.on("data", (d) => {
    out += d;
  });
  return { child, output: () => out };
}

// AR-06: the server must REFUSE to boot on a standalone mongod - it
// exits non-zero with the fatal topology line and /health never
// answers. Throws if the server comes up or stays up.
async function expectStandaloneRefusal(mongoUri) {
  const { child, output } = spawnServer(PORT_STANDALONE, mongoUri);
  const start = Date.now();
  try {
    for (;;) {
      if (child.exitCode !== null) break;
      try {
        const r = await fetch(`http://127.0.0.1:${PORT_STANDALONE}/health`);
        if (r.status === 200)
          throw new Error(
            "server answered /health on a standalone mongod (no boot refusal)",
          );
      } catch (err) {
        if (/answered \/health/.test(err.message)) throw err;
        /* not up yet - expected */
      }
      if (Date.now() - start > 30000)
        throw new Error(
          "server did not exit on a standalone mongod within 30s (no boot refusal)",
        );
      await new Promise((r) => setTimeout(r, 300));
    }
    if (child.exitCode === 0)
      throw new Error(
        "server exited 0 on a standalone mongod (expected a non-zero refusal)",
      );
    if (!output().includes(FATAL_SNIPPET)) {
      throw new Error(
        `fatal topology line missing from server output:\n${output()}`,
      );
    }
    console.log(`STANDALONE_EXIT_CODE: ${child.exitCode}`);
    console.log("SERVER_REFUSES_STANDALONE");
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

async function main() {
  const {
    MongoMemoryServer,
    MongoMemoryReplSet,
  } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  fs.mkdirSync(MMS_SCRATCH, { recursive: true });
  const standaloneDir = fs.mkdtempSync(path.join(MMS_SCRATCH, "standalone-"));
  const replDir = fs.mkdtempSync(path.join(MMS_SCRATCH, "repl-"));
  let standalone;
  let replSet;
  let serverChild;
  try {
    standalone = await MongoMemoryServer.create({
      instance: { dbPath: standaloneDir, storageEngine: "wiredTiger" },
    });
    const standaloneUri = standalone.getUri("boottest");

    await mongoose.connect(standaloneUri);
    const session = await mongoose.startSession();
    let txnError = null;
    try {
      await session.withTransaction(async () => {
        await mongoose.connection.db
          .collection("probe")
          .insertOne({ x: 1 }, { session });
      });
    } catch (err) {
      txnError = err;
    } finally {
      await session.endSession();
    }
    if (!txnError)
      throw new Error(
        "transaction on standalone mongod unexpectedly succeeded",
      );
    console.log(`STANDALONE_TXN_ERROR: ${txnError.message}`);
    await mongoose.disconnect();

    // AR-06: the server now REFUSES to boot against the standalone
    // URI - the boot-time topology check (config/topology.js) exits
    // non-zero with a fatal line naming the replica-set requirement.
    await expectStandaloneRefusal(standaloneUri);

    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
      instanceOpts: [{ dbPath: replDir }],
    });
    const replUri = replSet.getUri("boottest");
    await mongoose.connect(replUri);
    // create() can resolve before the member elects itself primary; a
    // transaction attempted in that window fails with the standalone
    // error. Wait for a writable primary first.
    let primaryReady = false;
    for (let i = 0; i < 60 && !primaryReady; i++) {
      try {
        const hello = await mongoose.connection.db
          .admin()
          .command({ hello: 1 });
        primaryReady = hello.isWritablePrimary === true;
      } catch {
        /* not ready yet */
      }
      if (!primaryReady) await new Promise((r) => setTimeout(r, 500));
    }
    if (!primaryReady)
      throw new Error("replica set member never became a writable primary");
    const session2 = await mongoose.startSession();
    try {
      await session2.withTransaction(async () => {
        await mongoose.connection.db
          .collection("probe")
          .insertOne({ x: 1 }, { session: session2 });
      });
    } finally {
      await session2.endSession();
    }
    const written = await mongoose.connection.db
      .collection("probe")
      .countDocuments();
    if (written !== 1)
      throw new Error(`expected 1 written probe doc, saw ${written}`);
    console.log("REPLSET_TXN_OK");
    await mongoose.disconnect();

    // AR-06: against the replica set the same boot proceeds - the
    // topology check passes and the server serves /health.
    const replBoot = spawnServer(PORT_REPLSET, replUri);
    serverChild = replBoot.child;
    await waitForHealth(PORT_REPLSET);
    console.log("SERVER_BOOTS_ON_REPLSET");
    serverChild.kill("SIGKILL");
    await new Promise((r) => serverChild.once("exit", r));
    serverChild = undefined;
  } finally {
    if (serverChild) serverChild.kill("SIGKILL");
    if (replSet) await replSet.stop();
    if (standalone) await standalone.stop();
    fs.rmSync(standaloneDir, { recursive: true, force: true });
    fs.rmSync(replDir, { recursive: true, force: true });
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(`PROBE_FAIL: ${err.message}`);
    process.exit(1);
  },
);
