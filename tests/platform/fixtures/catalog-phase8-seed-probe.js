// Child-process probe for Phase 8 (catalog) — the seed smoke test.
// Runs the CANONICAL seed path (scripts/seed.js runSeeder, the
// owner's CLI entry point) against an EMPTY MMS mongod
// (disk-backed dbPath under ~/workspace/aura-catalog/mms-data) and
// asserts the fresh-install contract end to end:
//   - the full registry is bootstrapped (27 types / 9 rooms /
//     10 collections / 38 attribute definitions);
//   - 36 categories, all with ancestors/depth populated by the
//     seed's rebuild step;
//   - VOCABULARY §3 wiring present (Category.productType/roomSlugs,
//     Product.roomSlugs), with lighting left untyped/unpinned;
//   - products keep their source prices/stock (compared against
//     the seed's own data literal — nothing invented in transit);
//   - a leaf category's facets response is sane and nonzero;
//   - a second runSeeder (upsert) creates nothing new.
// Prints RESULT lines; tests/platform/catalog-seed-wiring.test.js
// asserts them.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");
const DB_NAME = "aura_catalog_phase8_seed";

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "cat8seed-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri(DB_NAME);

  const seed = require(path.join(REPO, "scripts/seed.js"));
  const say = (line) => console.log(`RESULT ${line}`);

  const env = {
    NODE_ENV: "development",
    SEED_DEMO_DATA: "true",
    MONGO_URI: uri,
    MONGO_DB_NAME: DB_NAME,
    SEED_CUSTOMER_PASSWORD: "phase8-seed-password",
  };
  const options = {
    env,
    log: () => {},
    getAdminCredentials: () => ({
      email: "admin@phase8.test",
      password: "phase8-admin-password",
    }),
  };

  // ---- first run: fresh install ----
  const first = await seed.runSeeder(options);
  say(
    `seed-first created=${first.categoriesCreated}/${first.productsCreated} updated=${first.categoriesUpdated}/${first.productsUpdated}`,
  );
  say(
    `seed-first wiring=${first.wiring.categoriesTyped}/${first.wiring.categoriesWithRooms}/${first.wiring.productsWithRooms}`,
  );

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Category = require(path.join(REPO, "models/category.model"));
  const Product = require(path.join(REPO, "models/product.model"));
  const ProductType = require(path.join(REPO, "models/productType.model"));
  const Room = require(path.join(REPO, "models/room.model"));
  const Collection = require(path.join(REPO, "models/collection.model"));
  const AttributeDefinition = require(
    path.join(REPO, "models/attributeDefinition.model"),
  );
  const User = require(path.join(REPO, "models/user.model"));
  const catalogCtrl = require(
    path.join(REPO, "controllers/catalog.controller"),
  );

  say(
    `registry counts=${await ProductType.countDocuments()}/${await Room.countDocuments()}/${await Collection.countDocuments()}/${await AttributeDefinition.countDocuments()}`,
  );
  say(
    `users=${await User.countDocuments({ email: { $in: ["admin@phase8.test", "customer@example.invalid"] } })}`,
  );

  const categories = await Category.find({}).lean();
  say(`categories count=${categories.length}`);
  const roots = categories.filter((c) => !c.parent);
  const leaves = categories.filter((c) => c.parent);
  say(
    `categories ancestry roots=${roots.every((c) => (c.ancestors || []).length === 0 && c.depth === 0)} leaves=${leaves.every((c) => (c.ancestors || []).length === 1 && c.depth === 1 && String(c.ancestors[0]) === String(c.parent))}`,
  );

  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  say(
    `wiring sofas=${bySlug["upholstered-sofas"].productType}/${(bySlug["upholstered-sofas"].roomSlugs || []).join(",")}`,
  );
  say(
    `wiring desks=${bySlug["office-desks"].productType}/${(bySlug["office-desks"].roomSlugs || []).join(",")}`,
  );
  say(
    `wiring tables=${bySlug["living-room-tables"].productType || "none"}/${(bySlug["living-room-tables"].roomSlugs || []).join(",")}`,
  );
  say(
    `wiring lighting=${bySlug.lighting.productType || "none"}/${(bySlug.lighting.roomSlugs || []).length}`,
  );
  say(
    `wiring kitchen=${bySlug["kitchen-furniture"].productType || "none"}/${(bySlug["kitchen-furniture"].roomSlugs || []).length}`,
  );

  const products = await Product.find({}).lean();
  say(`products count=${products.length}`);
  const sourceBySku = new Map(seed.data.products.map((p) => [p.sku, p]));
  const spotSkus = ["AUR-DEMO-001-01", "AUR-DEMO-026-03", "AUR-DEMO-076-02"];
  const spotOk = spotSkus.every((sku) => {
    const doc = products.find((p) => p.sku === sku);
    const src = sourceBySku.get(sku);
    return (
      doc &&
      src &&
      doc.price === src.price &&
      doc.stock === src.stock &&
      doc.originalPrice === src.originalPrice
    );
  });
  say(`products source-values=${spotOk}`);
  const sofaProduct = products.find((p) => p.sku === "AUR-DEMO-001-01");
  say(`products sofa-rooms=${(sofaProduct.roomSlugs || []).join(",")}`);
  const lightingSource = seed.data.products.find(
    (p) => p.categoryKey === "ceiling-lighting",
  );
  const lightingProduct = products.find((p) => p.sku === lightingSource.sku);
  say(`products lighting-rooms=${(lightingProduct.roomSlugs || []).length}`);

  // ---- facets over the seeded catalog (real controller) ----
  async function call(handler, req) {
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    let error;
    const next = (err) => {
      error = err;
    };
    handler(
      {
        file: undefined,
        files: undefined,
        params: {},
        body: {},
        query: {},
        ...req,
      },
      res,
      next,
    );
    const start = Date.now();
    while (res.body === undefined && error === undefined) {
      if (Date.now() - start > 30000) throw new Error("handler did not settle");
      await new Promise((r) => setTimeout(r, 5));
    }
    return { res, error };
  }
  const facetsResult = await call(catalogCtrl.getCategoryFacets, {
    params: { slug: "bed-frames" },
  });
  const facetsData = facetsResult.res.body && facetsResult.res.body.data;
  const maxOptionCount = facetsData
    ? Math.max(
        0,
        ...facetsData.facets.flatMap((f) => f.options.map((o) => o.count)),
      )
    : 0;
  say(
    `facets bed-frames total=${facetsData && facetsData.total} facets=${facetsData && facetsData.facets.length} maxcount=${maxOptionCount}`,
  );

  await mongoose.disconnect();

  // ---- second run: upsert against the populated DB ----
  const second = await seed.runSeeder(options);
  say(
    `seed-second created=${second.categoriesCreated}/${second.productsCreated} updated=${second.categoriesUpdated}/${second.productsUpdated}`,
  );

  await mongoose.connect(uri);
  say(
    `after-second counts=${await Category.countDocuments()}/${await Product.countDocuments()}/${await ProductType.countDocuments()}`,
  );
  await mongoose.disconnect();
  await mongod.stop({ doCleanup: true, force: true });
}

main().then(
  () => process.exit(0),
  (err) => {
    console.log(`RESULT probe-error ${err && err.message}`);
    process.exit(2);
  },
);
