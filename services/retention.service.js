// AR-27 (D-C): data retention, strictly opt-in. Each collection has
// its own RETENTION_*_DAYS env var; a var that is unset (or not a
// positive integer) means that collection is NEVER touched — the
// pre-AR-27 behavior was growth-forever, and it remains the default
// forever unless the owner sets a policy. Deletion happens ONLY
// inside runRetention() with dryRun=false and a set policy; no TTL
// indexes are created anywhere by code (TTL alternatives are
// owner-run commands in MIGRATIONS.md M-6).
//
// Predicates (cutoff = now - days):
//   notifications:    createdAt < cutoff
//   chatMessages:     createdAt < cutoff AND the message's chat is
//                     closed/resolved (open-chat history is kept)
//   blogEngagements:  kind === "view" AND createdAt < cutoff (likes
//                     are permanent engagement records, not views)
//   contacts:         status in ["resolved","closed"] AND
//                     createdAt < cutoff (unresolved mail is kept)
// Deletion is batched: find up to batchSize matching _ids, deleteMany
// by _id $in, repeat to maxBatches — a run deletes at most
// batchSize*maxBatches rows per collection, so a huge backlog drains
// over successive daily runs instead of one unbounded delete.
const Notification = require("../models/notification.model");
const ChatMessage = require("../models/chatMessage.model");
const Chat = require("../models/chat.model");
const BlogEngagement = require("../models/blogEngagement.model");
const Contact = require("../models/contact.model");

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDays = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function policies(env = process.env) {
  return {
    chatMessages: parseDays(env.RETENTION_CHAT_MESSAGE_DAYS),
    notifications: parseDays(env.RETENTION_NOTIFICATION_DAYS),
    blogEngagements: parseDays(env.RETENTION_BLOG_ENGAGEMENT_DAYS),
    contacts: parseDays(env.RETENTION_CONTACT_DAYS),
  };
}

async function deleteBatched(Model, predicate, batchSize, maxBatches) {
  let deleted = 0;
  for (let batch = 0; batch < maxBatches; batch++) {
    const docs = await Model.find(predicate).select("_id").limit(batchSize).lean();
    if (!docs.length) break;
    const res = await Model.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
    deleted += res.deletedCount || 0;
    if (docs.length < batchSize) break;
  }
  return deleted;
}

async function runRetention({ dryRun = false, batchSize = 1000, maxBatches = 10, now = new Date() } = {}) {
  const pol = policies();
  const results = { notifications: null, chatMessages: null, blogEngagements: null, contacts: null };
  const cutoff = (days) => new Date(now.getTime() - days * DAY_MS);
  const apply = async (Model, predicate) =>
    dryRun ? Model.countDocuments(predicate) : deleteBatched(Model, predicate, batchSize, maxBatches);

  if (pol.notifications !== null) {
    results.notifications = await apply(Notification, { createdAt: { $lt: cutoff(pol.notifications) } });
  }
  if (pol.chatMessages !== null) {
    // PERF-B-05 (U-9): load the closed/resolved chat ids in bounded
    // batches (the same batchSize discipline as deleteBatched above)
    // instead of one unbounded find, applying the message predicate
    // per batch — the predicate stays a flat indexed filter and the
    // end result is identical; only the peak ID-array size changes.
    let chatMessagesTotal = 0;
    let lastChatId = null;
    for (;;) {
      const idQuery = { status: { $in: ["closed", "resolved"] } };
      if (lastChatId !== null) idQuery._id = { $gt: lastChatId };
      const batch = await Chat.find(idQuery)
        .select("_id")
        .sort({ _id: 1 })
        .limit(batchSize)
        .lean();
      if (!batch.length) break;
      chatMessagesTotal += await apply(ChatMessage, {
        createdAt: { $lt: cutoff(pol.chatMessages) },
        chat: { $in: batch.map((c) => c._id) },
      });
      if (batch.length < batchSize) break;
      lastChatId = batch[batch.length - 1]._id;
    }
    results.chatMessages = chatMessagesTotal;
  }
  if (pol.blogEngagements !== null) {
    results.blogEngagements = await apply(BlogEngagement, {
      kind: "view",
      createdAt: { $lt: cutoff(pol.blogEngagements) },
    });
  }
  if (pol.contacts !== null) {
    results.contacts = await apply(Contact, {
      status: { $in: ["resolved", "closed"] },
      createdAt: { $lt: cutoff(pol.contacts) },
    });
  }

  // One structured line per run that had anything to do; a fully
  // unset configuration is silent (and touched nothing).
  if (Object.values(pol).some((days) => days !== null)) {
    console.log(JSON.stringify({ event: "retention_run", dryRun, results }));
  }
  return { dryRun, results };
}

module.exports = { policies, runRetention };
