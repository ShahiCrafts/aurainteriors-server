// Commit-audit C-3 regression: FA-41 removed the hardcoded demo
// customer password from scripts/seed.js (env-only via
// SEED_CUSTOMER_PASSWORD, seeding refuses without it). The duplicate
// boot-path seeder, services/databaseSeeder.js, was missed: its
// seedUsers still created the same demo account with a hardcoded,
// publicly-known password literal. Mirror of the FA-41 rule: the
// password comes from SEED_CUSTOMER_PASSWORD, seeding refuses without
// it, and an existing account is never touched.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("../audit/helpers");

const userInstances = [];
class FakeUser {
  constructor(doc) { userInstances.push(doc); Object.assign(this, doc); }
  async save() { return this; }
}
FakeUser.findOne = async () => null; // empty DB: neither user exists yet
stubModule("models/user.model", FakeUser);
stubModule("models/category.model", {
  countDocuments: async () => 0,
  create: async () => { throw new Error("stop-after-users"); },
  insertMany: async () => { throw new Error("stop-after-users"); },
});
stubModule("models/product.model", { countDocuments: async () => 0 });
stubModule("models/order.model", {});
// Phase 8 (harness only): the boot path now also ensures the
// catalog registries after user seeding; stub the bootstrap so
// this password-focused test never touches a real mongoose
// connection. Assertions below are unchanged.
stubModule("services/catalogBootstrap.service", { ensureCatalogRegistry: async () => ({}) });

const seeder = require("../../services/databaseSeeder");

const ENV_KEYS = ["NODE_ENV", "SEED_DEMO_DATA", "ADMIN_EMAIL", "ADMIN_PASSWORD", "SEED_CUSTOMER_PASSWORD"];
async function runSeed(extraEnv) {
  const saved = {};
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, {
    NODE_ENV: "development",
    SEED_DEMO_DATA: "true",
    ADMIN_EMAIL: "admin@example.test",
    ADMIN_PASSWORD: "test-admin-password",
  }, extraEnv);
  userInstances.length = 0;
  try {
    return await seeder.initializeDatabaseIfEmpty();
  } finally {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
}

test("C-3: boot-path seeder refuses to create the demo customer without SEED_CUSTOMER_PASSWORD", async () => {
  const result = await runSeed({});
  assert.equal(result, false, "seeding must refuse (and report failure) rather than invent a password");
  const customer = userInstances.find((u) => u.email === "customer@aurainteriors.com");
  assert.equal(customer, undefined, "no demo customer may be created without an env-supplied password");
  assert.ok(userInstances.some((u) => u.role === "admin"), "the admin (env credentials) is still seeded first");
});

test("C-3: with SEED_CUSTOMER_PASSWORD set, the demo customer is created with exactly that password", async () => {
  await runSeed({ SEED_CUSTOMER_PASSWORD: "test-seed-password-123" });
  const customer = userInstances.find((u) => u.email === "customer@aurainteriors.com");
  assert.ok(customer, "the demo customer should be created once the password is supplied");
  assert.equal(customer.password, "test-seed-password-123");
});
