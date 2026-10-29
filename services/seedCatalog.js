// AR-31(c): the ONE shared seed catalog/data core, consumed by both
// seed entry points:
//   - services/databaseSeeder.js (boot path: server.js calls
//     initializeDatabaseIfEmpty in development with SEED_DEMO_DATA=true)
//   - scripts/seed.js (`npm run seed`, destructive-reseed CLI)
// Neither entry point is retired (owner decision), but everything the
// two agreed on now lives here exactly once: the image set, the
// category data, the demo-user seeding (FA-41: passwords ONLY from the
// environment), category creation, and sample-order generation.
//
// NOT unified — deliberately: the two entry points' PRODUCT documents
// diverge (scripts/seed.js carries an enriched variant — sku, tags,
// meta, weight, longer descriptions, an extra color per product,
// dimensions on all 11; the boot path carries a reduced variant that
// alone sets warranty/shippingInfo on the first product). Picking a
// winner would change what one entry point seeds, so each file keeps
// its own productsData (built from the shared furnitureImages below)
// until the owner picks the canonical catalog. See the AR-31 report.
//
// Phase 8 (catalog) UPDATE — the canonical catalog is now chosen:
// scripts/seed.js (the owner's self-contained 36-category /
// 324-product dataset) is the ONE catalog seed path, and the boot
// path no longer seeds a catalog at all (demo accounts + the
// registry bootstrap only — see databaseSeeder.js). Consequences
// for this module:
//   - ensureSeedAdmin / ensureSeedCustomer remain LIVE (the boot
//     path's account provisioning, FA-41 semantics unchanged);
//   - furnitureImages / categoriesData / createSeedCategories /
//     buildSampleOrders have NO production consumer anymore. They
//     are retained as the AR-31 record (and their characterization
//     tests) pending an owner decision on removal — nothing in the
//     running app reads them. See docs/catalog/PHASE8_NOTES.md.
//
// Log shape: callers pass their own message strings via `messages`,
// so each entry point's console output is byte-identical to before.
const { getAdminCredentials } = require("../utils/adminCredentials");
const User = require("../models/user.model");
const Category = require("../models/category.model");

const furnitureImages = {
  sofas: [
    "/images/seed/seed-house-exterior-evening.webp",
    "/images/seed/seed-bedroom-bed-linen.webp",
    "/images/seed/seed-living-room-sofa-tv.webp",
  ],
  beds: [
    "/images/seed/seed-apartment-living-room.webp",
    "/images/seed/seed-bedroom-dark-bed.webp",
    "/images/seed/seed-bedroom-wardrobe-bed.webp",
  ],
  dining: [
    "/images/seed/seed-house-exterior-evening.webp",
    "/images/seed/seed-bedroom-bed-linen.webp",
  ],
  chairs: [
    "/images/seed/seed-living-room-sofa-tv.webp",
    "/images/seed/seed-apartment-living-room.webp",
  ],
  decor: [
    "/images/seed/seed-bedroom-dark-bed.webp",
    "/images/seed/seed-bedroom-wardrobe-bed.webp",
    "/images/seed/seed-house-exterior-evening.webp",
  ],
  lighting: [
    "/images/seed/seed-bedroom-bed-linen.webp",
    "/images/seed/seed-living-room-sofa-tv.webp",
  ],
};

// Identical at both entry points (verified by scripted deep-diff).
const categoriesData = [
  {
    name: "Living Room",
    description:
      "Designer sofas and accent chairs for a statement living space.",
    image: furnitureImages.sofas[0],
    sortOrder: 1,
  },
  {
    name: "Bedroom",
    description:
      "Premium beds and nightstands for the ultimate sleep experience.",
    image: furnitureImages.beds[0],
    sortOrder: 2,
  },
  {
    name: "Dining",
    description: "Elegant dining sets and sideboards for shared moments.",
    image: furnitureImages.dining[0],
    sortOrder: 3,
  },
  {
    name: "Lighting",
    description: "Sculptural lighting to illuminate your home with style.",
    image: furnitureImages.lighting[0],
    sortOrder: 4,
  },
  {
    name: "Decor",
    description: "Curated objects and wall art for the finishing touch.",
    image: furnitureImages.decor[0],
    sortOrder: 5,
  },
];

/**
 * Create the admin user if absent (credentials from the environment
 * via getAdminCredentials). An existing account is never touched.
 * `messages`: { adminCreated(email), adminExists(email) } — each
 * entry point supplies its own historic log wording.
 */
const ensureSeedAdmin = async ({ log = console.log, messages }) => {
  const { email: adminEmail, password } = getAdminCredentials();
  let adminUser = await User.findOne({ email: adminEmail });

  if (!adminUser) {
    adminUser = new User({
      firstName: "Admin",
      lastName: "User",
      email: adminEmail,
      password,
      role: "admin",
      phone: "9800000000",
      isEmailVerified: true,
      isActive: true,
    });
    await adminUser.save();
    log(messages.adminCreated(adminEmail));
  } else {
    log(messages.adminExists(adminEmail));
  }
  return adminUser;
};

/**
 * Create the demo customer if absent. FA-41: the password comes from
 * SEED_CUSTOMER_PASSWORD only — seeding refuses without it, and an
 * existing account's password is never touched.
 * `messages`: { customerCreated(email), customerExists(email) }.
 */
const ensureSeedCustomer = async ({ log = console.log, messages }) => {
  const customerEmail = "customer@aurainteriors.com";
  let customerUser = await User.findOne({ email: customerEmail });

  if (!customerUser) {
    const { SEED_CUSTOMER_PASSWORD: customerPassword } = process.env;
    if (!customerPassword) {
      throw new Error(
        "SEED_CUSTOMER_PASSWORD is required to seed the demo customer",
      );
    }
    customerUser = new User({
      firstName: "Saugat",
      lastName: "Shahi",
      email: customerEmail,
      password: customerPassword,
      role: "customer",
      phone: "9877665544",
      isEmailVerified: true,
      isActive: true,
    });
    await customerUser.save();
    log(messages.customerCreated(customerEmail));
  } else {
    log(messages.customerExists(customerEmail));
  }
  return customerUser;
};

/**
 * Create the shared categories and return { createdCategories, catMap }
 * (catMap: category name -> created _id). Logging stays with callers.
 */
const createSeedCategories = async () => {
  const createdCategories = await Category.create(categoriesData);
  const catMap = {};
  createdCategories.forEach((c) => (catMap[c.name] = c._id));
  return { createdCategories, catMap };
};

/**
 * Build the 20 sample orders for the demo customer over the created
 * products. Pure builder (Math.random-driven, exactly the algorithm
 * both entry points used); callers persist with Order.create.
 */
const buildSampleOrders = (customerUser, products) => {
  const orders = [];
  const numOrders = 20;
  const now = new Date();

  for (let i = 0; i < numOrders; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const numItems = Math.floor(Math.random() * 3) + 1;
    const orderItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const prod = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      orderItems.push({
        product: prod._id,
        name: prod.name,
        price: prod.price,
        quantity: qty,
        image: prod.images[0].url,
      });
      subtotal += prod.price * qty;
    }

    orders.push({
      user: customerUser._id,
      guestInfo: {
        email: customerUser.email,
        firstName: customerUser.firstName,
        lastName: customerUser.lastName,
        phone: customerUser.phone || "9800000000",
      },
      items: orderItems,
      shippingAddress: {
        fullName: `${customerUser.firstName} ${customerUser.lastName}`,
        phone: customerUser.phone || "9800000000",
        addressLine1: "Baneshwor-10",
        city: "Kathmandu",
        postalCode: "44600",
        country: "Nepal",
      },
      subtotal,
      total: subtotal,
      paymentMethod: i % 4 === 0 ? "esewa" : "cod",
      paymentStatus: i % 4 === 0 ? "paid" : "pending",
      orderStatus: i % 10 === 0 ? "delivered" : "processing",
      createdAt: date,
      orderedAt: date,
      isGuestOrder: false,
    });
  }

  return orders;
};

module.exports = {
  furnitureImages,
  categoriesData,
  ensureSeedAdmin,
  ensureSeedCustomer,
  createSeedCategories,
  buildSampleOrders,
};
