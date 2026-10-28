// Seed entry points — history and current contract.
//
// AR-31(c) originally unified the two entry points' shared pieces
// in services/seedCatalog.js and this file pinned the BOOT-PATH
// seeder's divergent reduced catalog (5 categories / 11 products /
// 20 sample orders) as characterization.
//
// Phase 8 (catalog) supersedes that arrangement (Q4 decided for
// the catalog program): scripts/seed.js — the owner's
// self-contained 36-category / 324-product dataset — is the ONE
// canonical catalog seed, and the boot path
// (services/databaseSeeder.js) seeds NO catalog anymore. On an
// empty database it provisions the demo accounts (unchanged,
// FA-41 env-only passwords) and ensures the catalog registries via
// the bootstrap; fresh catalog content arrives via `npm run seed`.
// The retired boot-catalog pins (exact category/product payloads,
// sample-order snapshot) are therefore gone from this file — the
// dataset they pinned no longer exists in any entry point.
// services/seedCatalog.js is retained: its user helpers stay live,
// its catalog builders are kept as the AR-31 record (see its
// header); the pure-builder and FA-41 pins below still guard them.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("../audit/helpers");

const captured = { users: [], categories: null, products: null, orders: null };
let registryCalls = 0;

class FakeUser {
  constructor(doc) {
    captured.users.push(doc);
    Object.assign(this, doc);
    this._id = `user-${captured.users.length}`;
  }
  async save() {
    return this;
  }
}
FakeUser.findOne = async () => null;
stubModule("models/user.model", FakeUser);
stubModule("models/category.model", {
  countDocuments: async () => 0,
  create: async (docs) => {
    captured.categories = docs;
    return docs.map((d) => ({ ...d, _id: `cat:${d.name}` }));
  },
});
stubModule("models/product.model", {
  countDocuments: async () => 0,
  create: async (docs) => {
    captured.products = docs;
    return docs.map((d, i) => ({ ...d, _id: `prod-${i}` }));
  },
});
stubModule("models/order.model", {
  create: async (docs) => {
    captured.orders = docs;
    return docs;
  },
});
stubModule("services/catalogBootstrap.service", {
  ensureCatalogRegistry: async () => {
    registryCalls += 1;
    return {};
  },
});

const seeder = require("../../services/databaseSeeder");
const seedCatalog = require("../../services/seedCatalog");

const ENV_KEYS = [
  "NODE_ENV",
  "SEED_DEMO_DATA",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "SEED_CUSTOMER_PASSWORD",
];
async function runBootSeed() {
  const saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  Object.assign(process.env, {
    NODE_ENV: "development",
    SEED_DEMO_DATA: "true",
    ADMIN_EMAIL: "admin@example.test",
    ADMIN_PASSWORD: "test-admin-password-16",
    SEED_CUSTOMER_PASSWORD: "test-customer-password",
  });
  captured.users = [];
  captured.categories = null;
  captured.products = null;
  captured.orders = null;
  registryCalls = 0;
  try {
    return await seeder.initializeDatabaseIfEmpty();
  } finally {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("Phase 8 boot path: demo accounts + registry bootstrap, and NO catalog writes", async () => {
  const result = await runBootSeed();
  assert.equal(result, true);

  // Users: env-only passwords, exact documents (unchanged from the
  // AR-31c/FA-41 contract).
  const admin = captured.users.find((u) => u.role === "admin");
  assert.deepEqual(admin, {
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.test",
    password: "test-admin-password-16",
    role: "admin",
    phone: "9800000000",
    isEmailVerified: true,
    isActive: true,
  });
  const customer = captured.users.find((u) => u.role === "customer");
  assert.deepEqual(customer, {
    firstName: "Saugat",
    lastName: "Shahi",
    email: "customer@aurainteriors.com",
    password: "test-customer-password",
    role: "customer",
    phone: "9877665544",
    isEmailVerified: true,
    isActive: true,
  });

  // The registry bootstrap ran exactly once...
  assert.equal(registryCalls, 1);
  // ...and the boot path wrote no categories, products or orders:
  // the catalog comes from the canonical CLI seed only.
  assert.equal(captured.categories, null);
  assert.equal(captured.products, null);
  assert.equal(captured.orders, null);
});

test("AR-31c buildSampleOrders is a pure builder over the created products (retained module)", () => {
  const products = [
    { _id: "p1", name: "One", price: 100, images: [{ url: "u1" }] },
    { _id: "p2", name: "Two", price: 200, images: [{ url: "u2" }] },
  ];
  const customer = {
    _id: "cu1",
    email: "c@x.test",
    firstName: "A",
    lastName: "B",
    phone: "123",
  };
  const originalRandom = Math.random;
  let state = 7;
  Math.random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  try {
    const orders = seedCatalog.buildSampleOrders(customer, products);
    assert.equal(orders.length, 20);
    for (const order of orders) {
      assert.equal(order.user, "cu1");
      assert.equal(
        order.subtotal,
        order.items.reduce((s, it) => s + it.price * it.quantity, 0),
      );
      for (const item of order.items)
        assert.ok(["p1", "p2"].includes(item.product));
    }
  } finally {
    Math.random = originalRandom;
  }
});

test("AR-31c ensureSeedCustomer preserves the FA-41 env-only rule", async () => {
  const savedPw = process.env.SEED_CUSTOMER_PASSWORD;
  delete process.env.SEED_CUSTOMER_PASSWORD;
  try {
    await assert.rejects(
      () =>
        seedCatalog.ensureSeedCustomer({
          log: () => {},
          messages: {
            customerCreated: (e) => `created ${e}`,
            customerExists: (e) => `exists ${e}`,
          },
        }),
      (err) =>
        err.message ===
        "SEED_CUSTOMER_PASSWORD is required to seed the demo customer",
    );
  } finally {
    if (savedPw === undefined) delete process.env.SEED_CUSTOMER_PASSWORD;
    else process.env.SEED_CUSTOMER_PASSWORD = savedPw;
  }
});
