// AR-27 (D-C): retention dry-run — prints, per policy, how many rows
// a real run WOULD delete, and deletes NOTHING. Operator-only
// command (never called by the server). Connection pattern follows
// scripts/create-admin.js: the shared config/database connector
// (timeouts, pool options, retry, dbName default). Configuration
// comes from the environment (RETENTION_*_DAYS + MONGO_URI), exactly
// as the server reads it — run it with the server's env to preview
// the server's behavior.
const mongoose = require("mongoose");
const { connectDatabase } = require("../config/database");
const { policies, runRetention } = require("../services/retention.service");

(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    await connectDatabase();
    const pol = policies();
    const { results } = await runRetention({ dryRun: true });
    const lines = [
      [
        "RETENTION_NOTIFICATION_DAYS",
        "notifications",
        pol.notifications,
        results.notifications,
      ],
      [
        "RETENTION_CHAT_MESSAGE_DAYS",
        "chatMessages",
        pol.chatMessages,
        results.chatMessages,
      ],
      [
        "RETENTION_BLOG_ENGAGEMENT_DAYS",
        "blogEngagements",
        pol.blogEngagements,
        results.blogEngagements,
      ],
      ["RETENTION_CONTACT_DAYS", "contacts", pol.contacts, results.contacts],
    ];
    for (const [envName, key, days, count] of lines) {
      if (days === null) {
        console.log(`${envName} unset - skipped (nothing would be deleted)`);
      } else {
        console.log(
          `${key}: ${count} rows older than ${days} days WOULD be deleted`,
        );
      }
    }
  } catch (error) {
    console.error("Retention dry-run failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
