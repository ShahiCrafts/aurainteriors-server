/**
 * Database Seeder Service
 * Safely seeds the database with initial data if it's empty
 * Development-only, explicitly enabled demo data
 *
 * Phase 8 (catalog) — seed unification: this boot path no longer
 * carries a catalog dataset of its own. The ONE canonical catalog
 * seed is the CLI (scripts/seed.js, `npm run seed`): the owner's
 * 36-category / 324-product dataset, with the registry bootstrap
 * and the VOCABULARY §3 wiring applied there. The boot path keeps
 * only the boot-appropriate, idempotent pieces:
 *   - the demo admin + customer accounts (passwords from the
 *     environment only, FA-41), created when the database is empty;
 *   - ensureCatalogRegistry() — the reference registries (product
 *     types, rooms, collections, attribute definitions) the app
 *     needs in place, inserted $setOnInsert-only so admin edits
 *     are never clobbered.
 * The retired boot dataset (5 flat categories / 11 products / 20
 * sample orders, formerly via services/seedCatalog.js) diverged
 * from the CLI catalog — two entry points produced two different
 * catalogs — and is removed from this path. Behavior by database:
 *   - fresh/empty DB: demo accounts + registries; the catalog
 *     itself arrives via `npm run seed` (or the admin UI);
 *   - existing DB (any categories/products present): untouched,
 *     exactly as before.
 * See docs/catalog/PHASE8_NOTES.md.
 */

const { getAdminCredentials } = require("../utils/adminCredentials");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
// AR-31(c): the demo-user seeding (FA-41: passwords ONLY from the
// environment) is shared via services/seedCatalog.js. Phase 8: only
// the user helpers remain in use here — the shared module's catalog
// data/builders are retired (see seedCatalog.js header).
const { ensureSeedAdmin, ensureSeedCustomer } = require("./seedCatalog");
const { ensureCatalogRegistry } = require("./catalogBootstrap.service");

/**
 * Check if database needs seeding
 * Returns true if database is empty (no categories/products exist)
 */
const isDatabaseEmpty = async () => {
  try {
    const [categoryCount, productCount] = await Promise.all([
      Category.countDocuments(),
      Product.countDocuments(),
    ]);
    return categoryCount === 0 && productCount === 0;
  } catch (error) {
    console.error("[seeder] Error checking database status:", error.message);
    return false;
  }
};

/**
 * Create or update admin and customer users
 * (AR-31(c): shared with the former boot catalog via seedCatalog;
 * Phase 8 keeps the accounts — they are provisioning, not catalog.)
 */
const seedUsers = async () => {
  console.log("[seeder] 🧑 Seeding users...");

  const messages = {
    adminCreated: (email) => `  ✓ Admin user created: ${email}`,
    adminExists: (email) => `  ✓ Admin user already exists: ${email}`,
    customerCreated: (email) => `  ✓ Customer user created: ${email}`,
    customerExists: (email) => `  ✓ Customer user already exists: ${email}`,
  };
  const adminUser = await ensureSeedAdmin({ messages });
  const customerUser = await ensureSeedCustomer({ messages });

  return { adminUser, customerUser };
};

/**
 * Ensure the canonical catalog registries exist (Phase 8: the boot
 * path's only catalog-adjacent step — reference data, not demo
 * content; $setOnInsert makes it a no-op on an already-bootstrapped
 * database).
 */
const seedRegistries = async () => {
  console.log("[seeder] 🗂️  Ensuring catalog registries...");

  const summary = await ensureCatalogRegistry();
  for (const [name, { inserted, total }] of Object.entries(summary)) {
    console.log(`  ✓ ${name}: inserted ${inserted}, total ${total}`);
  }
};

/**
 * Main seeder function - called from server.js
 */
const initializeDatabaseIfEmpty = async () => {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.SEED_DEMO_DATA !== "true"
  )
    return false;
  try {
    getAdminCredentials();
    const isEmpty = await isDatabaseEmpty();

    if (!isEmpty) {
      console.log("[seeder] ℹ️  Database already populated, skipping seed");
      return true;
    }

    console.log("[seeder] 📊 Database is empty, running initial seed...\n");

    await seedUsers();
    await seedRegistries();

    console.log("\n[seeder] ✅ Database seeding completed successfully!\n");
    return true;
  } catch (error) {
    console.error("[seeder] ❌ Database seeding failed:", error.message);
    console.error("[seeder] Stack trace:", error.stack);
    return false;
  }
};

module.exports = {
  initializeDatabaseIfEmpty,
  isDatabaseEmpty,
};
