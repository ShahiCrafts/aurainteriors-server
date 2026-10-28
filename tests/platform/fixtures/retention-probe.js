// AR-27 probe — RETENTION_* policies (UNSET = nothing is ever
// deleted) against a real mongod (MMS, disk-backed dbPath under
// ~/workspace/aura-audit/mms-data). No transactions are needed, so a
// standalone suffices. Rows are seeded with backdated createdAt via
// the raw driver (Mongoose timestamps would overwrite them on the
// model path). The dry-run SCRIPT is smoke-tested as a child process
// against this probe's own MMS URI (MONGO_URI + MONGO_DB_NAME env —
// the shared connector's dbName option overrides the URI path).
// Fail-tolerant at the parent commit: reports module/script
// availability instead of dying on the require.
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const REPO = path.resolve(__dirname, "../../..");
const DB_NAME = "aura_retention_test";
const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "retention-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri(DB_NAME);
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  try {
    let retention = null;
    try {
      retention = require(path.join(REPO, "services/retention.service"));
    } catch {
      retention = null;
    }
    const scriptExists = fs.existsSync(
      path.join(REPO, "scripts/retention-dry-run.js"),
    );
    console.log(
      `RESULT modules retention=${!!retention} script=${scriptExists}`,
    );

    const db = mongoose.connection.db;
    const oid = () => new mongoose.Types.ObjectId();
    const now = Date.now();
    const old = new Date(now - 40 * DAY);
    const recent = new Date(now - 1 * DAY);

    const closedChat = oid();
    const resolvedChat = oid();
    const openChat = oid();
    await db.collection("chats").insertMany([
      { _id: closedChat, status: "closed", createdAt: old, updatedAt: old },
      { _id: resolvedChat, status: "resolved", createdAt: old, updatedAt: old },
      { _id: openChat, status: "ai_handling", createdAt: old, updatedAt: old },
    ]);
    const userId = oid();
    await db.collection("notifications").insertMany([
      {
        _id: oid(),
        recipient: userId,
        type: "order",
        title: "old",
        message: "old",
        createdAt: old,
        updatedAt: old,
      },
      {
        _id: oid(),
        recipient: userId,
        type: "order",
        title: "new",
        message: "new",
        createdAt: recent,
        updatedAt: recent,
      },
    ]);
    const msg = (chat, createdAt, content) => ({
      _id: oid(),
      chat,
      senderRole: "customer",
      content,
      createdAt,
      updatedAt: createdAt,
    });
    const oldClosedMsg = msg(closedChat, old, "old in closed");
    const oldResolvedMsg = msg(resolvedChat, old, "old in resolved");
    const oldOpenMsg = msg(openChat, old, "old in open");
    const newClosedMsg = msg(closedChat, recent, "new in closed");
    await db
      .collection("chatmessages")
      .insertMany([oldClosedMsg, oldResolvedMsg, oldOpenMsg, newClosedMsg]);
    const blogId = oid();
    const eng = (kind, createdAt, actor) => ({
      _id: oid(),
      blog: blogId,
      actor,
      kind,
      createdAt,
    });
    const oldView = eng("view", old, "anon:old-view");
    const oldLike = eng("like", old, "anon:old-like");
    const newView = eng("view", recent, "anon:new-view");
    await db
      .collection("blogengagements")
      .insertMany([oldView, oldLike, newView]);
    const contact = (status, createdAt, email) => ({
      _id: oid(),
      name: "Probe",
      email,
      subject: "Hi",
      message: "hello",
      status,
      createdAt,
      updatedAt: createdAt,
    });
    const oldResolved = contact("resolved", old, "old-resolved@example.com");
    const oldClosed = contact("closed", old, "old-closed@example.com");
    const oldNew = contact("new", old, "old-new@example.com");
    const newResolved = contact("resolved", recent, "new-resolved@example.com");
    await db
      .collection("contacts")
      .insertMany([oldResolved, oldClosed, oldNew, newResolved]);

    const counts = async () => ({
      notifications: await db.collection("notifications").countDocuments({}),
      chatMessages: await db.collection("chatmessages").countDocuments({}),
      blogEngagements: await db
        .collection("blogengagements")
        .countDocuments({}),
      contacts: await db.collection("contacts").countDocuments({}),
    });
    const exists = async (coll, id) =>
      (await db.collection(coll).countDocuments({ _id: id })) === 1;
    const fmt = (r) =>
      ["notifications", "chatMessages", "blogEngagements", "contacts"]
        .map((k) => `${k}=${r[k] === null ? "null" : r[k]}`)
        .join(" ");

    if (!retention) {
      console.log("RESULT unset skipped=module-missing");
      console.log("RESULT dryRun skipped=module-missing");
      console.log("RESULT scriptSmoke skipped=module-missing");
      console.log("RESULT realRun skipped=module-missing");
      console.log("RESULT batchBound skipped=module-missing");
      return;
    }

    // (a) All envs unset: run deletes 0, reports nulls, logs nothing.
    for (const k of [
      "RETENTION_CHAT_MESSAGE_DAYS",
      "RETENTION_NOTIFICATION_DAYS",
      "RETENTION_BLOG_ENGAGEMENT_DAYS",
      "RETENTION_CONTACT_DAYS",
    ])
      delete process.env[k];
    const beforeA = await counts();
    const logLines = [];
    const origLog = console.log;
    console.log = (...a) => {
      logLines.push(a.join(" "));
    };
    const unsetRun = await retention.runRetention();
    const unsetDry = await retention.runRetention({ dryRun: true });
    console.log = origLog;
    const afterA = await counts();
    const retentionLogsA = logLines.filter((l) =>
      l.includes("retention_run"),
    ).length;
    console.log(
      `RESULT unset ${fmt(unsetRun.results)} dry=${fmt(unsetDry.results)} deleted=${beforeA.notifications - afterA.notifications + beforeA.chatMessages - afterA.chatMessages + beforeA.blogEngagements - afterA.blogEngagements + beforeA.contacts - afterA.contacts} retentionLogs=${retentionLogsA}`,
    );

    // (b) Policies set (30d): dry-run counts EXACTLY, deletes nothing.
    process.env.RETENTION_NOTIFICATION_DAYS = "30";
    process.env.RETENTION_CHAT_MESSAGE_DAYS = "30";
    process.env.RETENTION_BLOG_ENGAGEMENT_DAYS = "30";
    process.env.RETENTION_CONTACT_DAYS = "30";
    const dry = await retention.runRetention({ dryRun: true });
    const afterDry = await counts();
    console.log(
      `RESULT dryRun ${fmt(dry.results)} totalAfter=${afterDry.notifications + afterDry.chatMessages + afterDry.blogEngagements + afterDry.contacts} totalBefore=${beforeA.notifications + beforeA.chatMessages + beforeA.blogEngagements + beforeA.contacts}`,
    );

    // (c) Dry-run SCRIPT smoke: child process against this MMS URI.
    const scriptOut = await new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [path.join(REPO, "scripts/retention-dry-run.js")],
        {
          env: {
            ...process.env,
            MONGO_URI: uri,
            MONGO_DB_NAME: DB_NAME,
            RETENTION_NOTIFICATION_DAYS: "30",
            RETENTION_CHAT_MESSAGE_DAYS: "30",
            RETENTION_BLOG_ENGAGEMENT_DAYS: "30",
            RETENTION_CONTACT_DAYS: "30",
          },
        },
      );
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => {
        out += d;
      });
      child.stderr.on("data", (d) => {
        err += d;
      });
      child.on("exit", (code) => resolve({ code, out, err }));
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          /* already done */
        }
        resolve({ code: -1, out, err: err + " TIMEOUT" });
      }, 60000);
    });
    const scriptLines = scriptOut.out.split("\n").filter(Boolean);
    console.log(
      `RESULT scriptSmoke exit=${scriptOut.code} lines=${scriptLines.length} notifLine=${scriptLines.some((l) => /notifications: 1 rows older than 30 days WOULD be deleted/.test(l))} chatLine=${scriptLines.some((l) => /chatMessages: 2 rows older than 30 days WOULD be deleted/.test(l))} err=${scriptOut.err ? "yes" : "no"}`,
    );

    // (d) Real run: deletes exactly the eligible rows.
    const real = await retention.runRetention();
    console.log(
      `RESULT realRun ${fmt(real.results)} keepNewNotif=${await exists("notifications", (await db.collection("notifications").findOne({ title: "new" }))._id)} keepOldOpenMsg=${await exists("chatmessages", oldOpenMsg._id)} keepNewClosedMsg=${await exists("chatmessages", newClosedMsg._id)} goneOldClosedMsg=${!(await exists("chatmessages", oldClosedMsg._id))} keepOldLike=${await exists("blogengagements", oldLike._id)} goneOldView=${!(await exists("blogengagements", oldView._id))} keepOldNewContact=${await exists("contacts", oldNew._id)} keepNewResolved=${await exists("contacts", newResolved._id)} goneOldResolved=${!(await exists("contacts", oldResolved._id))}`,
    );

    // (e) Batch bound: 7 extra old notifications; batchSize 2 x
    // maxBatches 2 deletes exactly 4; a second run gets the rest.
    const extra = Array.from({ length: 7 }, (_, i) => ({
      _id: oid(),
      recipient: userId,
      type: "order",
      title: `batch${i}`,
      message: "x",
      createdAt: old,
      updatedAt: old,
    }));
    await db.collection("notifications").insertMany(extra);
    const bounded = await retention.runRetention({
      batchSize: 2,
      maxBatches: 2,
    });
    const remainingAfterBound = await db
      .collection("notifications")
      .countDocuments({ title: /^batch/ });
    const rest = await retention.runRetention({ batchSize: 2, maxBatches: 2 });
    const remainingAfterRest = await db
      .collection("notifications")
      .countDocuments({ title: /^batch/ });
    console.log(
      `RESULT batchBound first=${bounded.results.notifications} remainingAfterBound=${remainingAfterBound} second=${rest.results.notifications} remainingAfterRest=${remainingAfterRest}`,
    );
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("PROBE FAILED:", e);
    process.exit(1);
  });
