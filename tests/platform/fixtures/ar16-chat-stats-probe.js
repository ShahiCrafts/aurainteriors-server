// AR-16 probe — run as a CHILD process against a real mongod
// (mongodb-memory-server, disk-backed dbPath under
// ~/workspace/aura-audit/mms-data; this VM's /tmp is a 512 MB tmpfs).
//
// Seeds 200 chats x 50 messages (10,000 messages, inserted per chat in
// createdAt order, so the ORIGINAL pipeline's "$lookup array order"
// first admin message is also the earliest admin message) and then:
//   - runs the ORIGINAL getChatStats response-time pipeline verbatim
//     (Chat $lookup over ALL chatmessages) -> oldAvgMinutes
//   - runs the FIXED service getChatStats() -> newAvgMinutes
//   - computes the expected average from the fixture parameters
//     (first admin offset per eligible chat) -> expectedAvgMinutes
//   - explains the NEW pipeline (exported by chatService as
//     _firstAdminResponsePipeline) and sums totalDocsExamined over all
//     explain stages -> docsExamined (must be far below 10,000)
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
const T0 = Date.UTC(2025, 0, 1, 12, 0, 0);
const STATUSES = [
  "ai_handling",
  "escalated",
  "agent_handling",
  "resolved",
  "closed",
];
const N_CHATS = 200;
const MSGS_PER_CHAT = 50;

function firstAdminMinutes(i) {
  return (i % 9) + 2;
}
function hasAdmin(i) {
  return i % 20 !== 19;
}
function isDeleted(i) {
  return i % 25 === 24;
}

async function main() {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  fs.mkdirSync(MMS_SCRATCH, { recursive: true });
  const dbDir = fs.mkdtempSync(path.join(MMS_SCRATCH, "ar16stats-"));
  let mongod;
  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbPath: dbDir, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(mongod.getUri("ar16stats"));
    const Chat = require(path.join(repo, "models", "chat.model"));
    const ChatMessage = require(path.join(repo, "models", "chatMessage.model"));
    await Chat.ensureIndexes();
    await ChatMessage.ensureIndexes();
    // AR-16/M-5: the {senderRole,chat,createdAt} index is a MIGRATIONS.md M-5 owner-run index (not model-declared); build it explicitly so this probe measures the with-migration plan.
    await ChatMessage.collection.createIndex({
      senderRole: 1,
      chat: 1,
      createdAt: 1,
    });

    const senderId = new mongoose.Types.ObjectId();
    const chatsCol = mongoose.connection.db.collection("chats");
    const msgsCol = mongoose.connection.db.collection("chatmessages");

    const chatDocs = [];
    for (let i = 0; i < N_CHATS; i++) {
      chatDocs.push({
        _id: new mongoose.Types.ObjectId(),
        customer: senderId,
        status: STATUSES[i % STATUSES.length],
        createdAt: new Date(T0 + i * 3600000),
        updatedAt: new Date(T0 + i * 3600000),
        lastMessageAt: new Date(T0 + i * 3600000),
        deletedAt: isDeleted(i) ? new Date(T0 + i * 3600000) : null,
        metadata: { botActive: true },
      });
    }
    await chatsCol.insertMany(chatDocs);

    // Insert per chat in createdAt order (offsets ascending).
    for (let i = 0; i < N_CHATS; i++) {
      const chatCreated = T0 + i * 3600000;
      const docs = [];
      for (let m = 1; m <= MSGS_PER_CHAT; m++) {
        const isAdmin =
          hasAdmin(i) &&
          (m === firstAdminMinutes(i) ||
            m === firstAdminMinutes(i) + 20 ||
            m === firstAdminMinutes(i) + 35);
        docs.push({
          chat: chatDocs[i]._id,
          sender: senderId,
          senderRole: isAdmin ? "admin" : "customer",
          messageType: "text",
          content: `msg ${m}`,
          createdAt: new Date(chatCreated + m * 60000),
          updatedAt: new Date(chatCreated + m * 60000),
          deletedAt: null,
          isInternalNote: false,
        });
      }
      await msgsCol.insertMany(docs);
    }
    const totalMessages = await msgsCol.countDocuments({});
    console.log(`RESULT totalMessages=${totalMessages}`);

    // Expected average over eligible chats (not deleted, has an admin reply).
    const eligible = [];
    for (let i = 0; i < N_CHATS; i++)
      if (!isDeleted(i) && hasAdmin(i)) eligible.push(firstAdminMinutes(i));
    const expectedAvgMinutes = Math.round(
      eligible.reduce((a, b) => a + b, 0) / eligible.length,
    );
    console.log(`RESULT expectedAvgMinutes=${expectedAvgMinutes}`);
    console.log(`RESULT eligibleChats=${eligible.length}`);

    // ORIGINAL pipeline, verbatim from pre-fix getChatStats.
    const oldRows = await Chat.aggregate([
      { $match: { status: { $in: STATUSES }, deletedAt: null } },
      {
        $lookup: {
          from: "chatmessages",
          localField: "_id",
          foreignField: "chat",
          as: "messages",
        },
      },
      {
        $project: {
          createdAt: 1,
          firstAdminMessage: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$messages",
                  as: "msg",
                  cond: { $eq: ["$$msg.senderRole", "admin"] },
                },
              },
              0,
            ],
          },
        },
      },
      { $match: { "firstAdminMessage.createdAt": { $exists: true } } },
      {
        $project: {
          responseTime: {
            $subtract: ["$firstAdminMessage.createdAt", "$createdAt"],
          },
        },
      },
      { $group: { _id: null, avgResponseTime: { $avg: "$responseTime" } } },
    ]);
    const oldAvgMinutes = oldRows.length
      ? Math.round(oldRows[0].avgResponseTime / 1000 / 60)
      : null;
    console.log(`RESULT oldAvgMinutes=${oldAvgMinutes}`);

    // FIXED service.
    const service = require(path.join(repo, "services", "chatService"));
    const stats = await service.getChatStats();
    console.log(`RESULT newAvgMinutes=${stats.avgResponseTimeMinutes}`);
    console.log(`RESULT stats=${JSON.stringify(stats)}`);

    // Explain of the NEW pipeline.
    if (typeof service._firstAdminResponsePipeline === "function") {
      const pipeline = service._firstAdminResponsePipeline();
      console.log(
        `RESULT pipelineFrom=${JSON.stringify(pipeline.map((s) => Object.keys(s)[0]))}`,
      );
      const explain =
        await ChatMessage.aggregate(pipeline).explain("executionStats");
      let docsExamined = 0;
      const walk = (node) => {
        if (!node || typeof node !== "object") return;
        for (const [k, v] of Object.entries(node)) {
          if (k === "totalDocsExamined" && typeof v === "number")
            docsExamined += v;
          else walk(v);
        }
      };
      walk(explain);
      console.log(`RESULT docsExamined=${docsExamined}`);
      // A $lookup INTO chatmessages is the forbidden shape; the string
      // "chatmessages" also appears in the explain as the aggregation's
      // own namespace, so check the pipeline's $lookup targets directly.
      const lookupFroms = pipeline
        .filter((s) => s.$lookup)
        .map((s) => s.$lookup.from);
      console.log(
        `RESULT pipelineHasChatmessagesLookup=${lookupFroms.includes("chatmessages")}`,
      );
      console.log(`RESULT lookupFroms=${lookupFroms.join(",")}`);
    } else {
      console.log("RESULT pipelineFrom=missing-hook");
    }

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
