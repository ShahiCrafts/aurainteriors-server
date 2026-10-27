require("dotenv").config();
const mongoose = require("mongoose");
const { connectDatabase } = require("../config/database");
const {
  migrateCategoryAncestors,
  migrateCategoryWiring,
  migrateProductTypeKeys,
  migrateDefaultVariants,
} = require("../services/catalogMigration.service");

// Operator command (Phase 8): run the catalog data migrations
// against an EXISTING database —
//   category-ancestors  Category.ancestors/depth backfill
//   category-wiring      VOCABULARY §3 productType/roomSlugs
//   product-type-keys    SR-P6-2 lowercased attributeKeys repair
//   default-variants     default variant per legacy product
// Usage:
//   node scripts/migrateCatalog.js [--dry-run] [--only <name>]
// Default runs all four in the order above. Every migration is
// idempotent (a second run changes nothing) and prints a JSON
// report whose entries carry BEFORE values — keep the output: it
// is the rollback map (see docs/catalog/PHASE8_NOTES.md). Fresh
// installs do not need this: the canonical seed (npm run seed)
// performs the equivalent steps inline. Connection pattern follows
// scripts/ensureCatalog.js.
const MIGRATIONS = {
  "category-ancestors": migrateCategoryAncestors,
  "category-wiring": migrateCategoryWiring,
  "product-type-keys": migrateProductTypeKeys,
  "default-variants": migrateDefaultVariants,
};

(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    const dryRun = process.argv.includes("--dry-run");
    const onlyIndex = process.argv.indexOf("--only");
    const only = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];
    if (only && !MIGRATIONS[only]) {
      throw new Error(`Unknown migration "${only}" (expected one of: ${Object.keys(MIGRATIONS).join(", ")})`);
    }
    await connectDatabase();
    const names = only ? [only] : Object.keys(MIGRATIONS);
    for (const name of names) {
      const report = await MIGRATIONS[name]({ dryRun });
      console.log(JSON.stringify(report, null, 2));
    }
    console.log(`Catalog migrations complete (${dryRun ? "dry run — nothing written" : "applied"})`);
  } catch (error) {
    console.error(`Catalog migration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
