// AR-31(c) characterization: the two seed entry points
// (services/databaseSeeder.js boot path, scripts/seed.js CLI) share ONE
// catalog/data core (services/seedCatalog.js) after AR-31(c).
//
// This file pins the BOOT-PATH seeder's exact behavior with stubbed
// models: env gates, user documents (FA-41 env-only passwords), the
// exact category payload, the exact product payload (names/prices and
// a full deep-equal snapshot — the boot-path catalog is the REDUCED
// variant; scripts/seed.js carries an enriched variant, a divergence
// documented in the AR-31 report and deliberately NOT unified), and
// the sample-order generation (deterministic via a seeded Math.random).
//
// scripts/seed.js cannot be required in-process (it connects, seeds and
// process.exit()s), so its equivalence is pinned at the shared-core
// level: the shared module's data/builders are asserted directly, and
// seed.js is asserted (by construction in the refactor) to consume
// exactly these exports.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("../audit/helpers");

const captured = { users: [], categories: null, products: null, orders: null };

class FakeUser {
  constructor(doc) { captured.users.push(doc); Object.assign(this, doc); this._id = `user-${captured.users.length}`; }
  async save() { return this; }
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
  create: async (docs) => { captured.orders = docs; return docs; },
});

const seeder = require("../../services/databaseSeeder");
const seedCatalog = require("../../services/seedCatalog");

const ENV_KEYS = ["NODE_ENV", "SEED_DEMO_DATA", "ADMIN_EMAIL", "ADMIN_PASSWORD", "SEED_CUSTOMER_PASSWORD"];
async function runBootSeed() {
  const saved = {};
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, {
    NODE_ENV: "development",
    SEED_DEMO_DATA: "true",
    ADMIN_EMAIL: "admin@example.test",
    ADMIN_PASSWORD: "test-admin-password-16",
    SEED_CUSTOMER_PASSWORD: "test-customer-password",
  });
  // Deterministic Math.random (LCG) so the sample orders are pinnable.
  const originalRandom = Math.random;
  let state = 42;
  Math.random = () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
  captured.users = []; captured.categories = null; captured.products = null; captured.orders = null;
  try {
    return await seeder.initializeDatabaseIfEmpty();
  } finally {
    Math.random = originalRandom;
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
}

test("AR-31c shared core: furnitureImages + categoriesData are the single source", () => {
  assert.equal(seedCatalog.furnitureImages.sofas.length, 3);
  assert.equal(seedCatalog.furnitureImages.beds.length, 3);
  assert.deepEqual(
    seedCatalog.categoriesData.map((c) => [c.name, c.sortOrder]),
    [["Living Room", 1], ["Bedroom", 2], ["Dining", 3], ["Lighting", 4], ["Decor", 5]],
  );
  for (const c of seedCatalog.categoriesData) {
    assert.ok(c.image.startsWith("https://images.unsplash.com/"), `category ${c.name} image`);
    assert.ok(typeof c.description === "string" && c.description.length > 10);
  }
});

test("AR-31c boot-path seed produces the pinned catalog", async () => {
  const result = await runBootSeed();
  assert.equal(result, true);

  // Users: env-only passwords, exact documents.
  const admin = captured.users.find((u) => u.role === "admin");
  assert.deepEqual(admin, {
    firstName: "Admin", lastName: "User", email: "admin@example.test",
    password: "test-admin-password-16", role: "admin", phone: "9800000000",
    isEmailVerified: true, isActive: true,
  });
  const customer = captured.users.find((u) => u.role === "customer");
  assert.deepEqual(customer, {
    firstName: "Saugat", lastName: "Shahi", email: "customer@aurainteriors.com",
    password: "test-customer-password", role: "customer", phone: "9877665544",
    isEmailVerified: true, isActive: true,
  });

  // Categories: the exact shared payload.
  assert.deepEqual(captured.categories, seedCatalog.categoriesData);

  // Products: 11 items, pinned names/prices/stock/category wiring.
  assert.equal(captured.products.length, 11);
  assert.deepEqual(
    captured.products.map((p) => [p.name, p.price, p.originalPrice, p.stock, p.category]),
    [
      ["Aura Sheesham Wood 3 Seater Sofa Cum Bed", 65999, 146999, 15, "cat:Living Room"],
      ["Albus 3 Seater Fabric Sofa (Jade Ivory)", 37999, 63999, 22, "cat:Living Room"],
      ["Avira Premium Lounge Chair (Salmon Pink)", 14999, 31999, 35, "cat:Living Room"],
      ["Calmora Solid Wood Bed with Upholstered Headboard", 45999, 89999, 10, "cat:Bedroom"],
      ["Eka Nightstand with Dual Drawers", 8499, 15999, 50, "cat:Bedroom"],
      ["Luxe 6-Seater Marble Dining Table", 89999, 159999, 5, "cat:Dining"],
      ["Hygge Upholstered Dining Chair (Set of 2)", 12999, 24999, 40, "cat:Dining"],
      ["Solis Industrial Pendant Chandelier", 7499, 14999, 25, "cat:Lighting"],
      ["Nova Adjustable Floor Lamp", 6499, 12999, 18, "cat:Lighting"],
      ["Zen Handcrafted Ceramic Vases (Set of 3)", 3499, 6999, 60, "cat:Decor"],
      ["Eclipse Round Brass Wall Mirror", 11999, 19999, 12, "cat:Decor"],
    ],
  );
  // Full snapshot of product 1 (the reduced boot-path variant, incl. its
  // boot-path-only warranty/shippingInfo).
  assert.deepEqual(captured.products[0], {
    name: "Aura Sheesham Wood 3 Seater Sofa Cum Bed",
    description: "A versatile space-saving solution crafted from premium sheesham wood with intricate cane work and luxurious upholstery. This piece seamlessly transitions from a sophisticated sofa to a comfortable bed for guests.",
    shortDescription: "Space-saving sheesham wood sofa with traditional cane weaving.",
    price: 65999,
    originalPrice: 146999,
    stock: 15,
    category: "cat:Living Room",
    images: [{ url: seedCatalog.furnitureImages.sofas[0], isPrimary: true }],
    colors: ["Walnut", "Natural"],
    materials: ["Sheesham Wood", "Cane"],
    style: "modern",
    arAvailable: true,
    dimensions: { width: 190, height: 85, depth: 95, unit: "cm" },
    warranty: "5-Year Structural Warranty",
    shippingInfo: "Ships in 7-10 business days. Includes professional assembly.",
    rating: { average: 4.8, count: 126 },
  });

  // Orders: 20, internally consistent totals, pinned cadence patterns.
  assert.equal(captured.orders.length, 20);
  for (const [i, order] of captured.orders.entries()) {
    assert.equal(order.subtotal, order.items.reduce((s, it) => s + it.price * it.quantity, 0));
    assert.equal(order.total, order.subtotal);
    assert.equal(order.paymentMethod, i % 4 === 0 ? "esewa" : "cod");
    assert.equal(order.paymentStatus, i % 4 === 0 ? "paid" : "pending");
    assert.equal(order.orderStatus, i % 10 === 0 ? "delivered" : "processing");
    assert.equal(order.isGuestOrder, false);
    assert.equal(order.guestInfo.email, "customer@aurainteriors.com");
  }
});

test("AR-31c buildSampleOrders is a pure builder over the created products", () => {
  const products = [
    { _id: "p1", name: "One", price: 100, images: [{ url: "u1" }] },
    { _id: "p2", name: "Two", price: 200, images: [{ url: "u2" }] },
  ];
  const customer = { _id: "cu1", email: "c@x.test", firstName: "A", lastName: "B", phone: "123" };
  const originalRandom = Math.random;
  let state = 7;
  Math.random = () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
  try {
    const orders = seedCatalog.buildSampleOrders(customer, products);
    assert.equal(orders.length, 20);
    for (const order of orders) {
      assert.equal(order.user, "cu1");
      assert.equal(order.subtotal, order.items.reduce((s, it) => s + it.price * it.quantity, 0));
      for (const item of order.items) assert.ok(["p1", "p2"].includes(item.product));
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
      () => seedCatalog.ensureSeedCustomer({
        log: () => {},
        messages: {
          customerCreated: (e) => `created ${e}`,
          customerExists: (e) => `exists ${e}`,
        },
      }),
      (err) => err.message === "SEED_CUSTOMER_PASSWORD is required to seed the demo customer",
    );
  } finally {
    if (savedPw === undefined) delete process.env.SEED_CUSTOMER_PASSWORD;
    else process.env.SEED_CUSTOMER_PASSWORD = savedPw;
  }
});
