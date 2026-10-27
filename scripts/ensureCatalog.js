require("dotenv").config();
const mongoose = require("mongoose");
const { connectDatabase } = require("../config/database");
const { ensureCatalogRegistry } = require("../services/catalogBootstrap.service");

// Operator command (Phase 1): idempotently ensure the canonical
// catalog registries (product types; rooms/collections as their
// models land) exist in the database. Safe to re-run: inserts are
// $setOnInsert only, so existing records — including admin edits —
// are never modified. Not part of app boot (Phase 8 owns seed
// unification, Q4); run manually or from deployment tooling.
(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    await connectDatabase();
    const summary = await ensureCatalogRegistry();
    for (const [name, { inserted, total }] of Object.entries(summary)) {
      console.log(`${name}: inserted ${inserted}, total ${total}`);
    }
    console.log("Catalog registry bootstrap complete");
  } catch (error) {
    console.error(`Catalog registry bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
