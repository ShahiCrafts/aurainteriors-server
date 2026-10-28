// Child-process probe for Phase 5 (catalog) FACETS: derivation of
// applicable attribute facets per category context, disjunctive
// counts, the category/room/price/availability/rating facets, the
// converged /catalog/categories/:slug/facets endpoint, and a
// ~2,000-product perf smoke with the measured latency printed
// (recorded in PHASE5_NOTES; no threshold is asserted).
//
// Prints RESULT lines; tests/platform/catalog-facets.test.js
// asserts them.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "catfacets-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri("aura_catalog_facets_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Category = require(path.join(REPO, "models/category.model"));
  const Product = require(path.join(REPO, "models/product.model"));
  const bootstrap = require(
    path.join(REPO, "services/catalogBootstrap.service"),
  );
  const productCtrl = require(
    path.join(REPO, "controllers/product.controller"),
  );
  const catalogCtrl = require(
    path.join(REPO, "controllers/catalog.controller"),
  );
  const validate = require(path.join(REPO, "middleware/validate.middleware"));
  const { getProductsQuerySchema } = require(
    path.join(REPO, "validators/product.validator"),
  );
  const qs = require(path.join(REPO, "node_modules/qs"));

  const say = (line) => console.log(`RESULT ${line}`);
  await bootstrap.ensureCatalogRegistry();

  const living = await Category.create({
    name: "Probe2 Living",
    slug: "probe2-living",
  });
  const sofas = await Category.create({
    name: "Probe2 Sofas",
    slug: "probe2-sofas",
    parent: living._id,
    productType: "sofa",
  });
  await Category.create({
    name: "Probe2 Chairs",
    slug: "probe2-chairs",
    parent: living._id,
    productType: "chair",
  });
  const dining = await Category.create({
    name: "Probe2 Dining",
    slug: "probe2-dining",
  });
  const tables = await Category.create({
    name: "Probe2 Tables",
    slug: "probe2-tables",
    parent: dining._id,
    productType: "table",
  });

  const mk = (doc) => Product.create({ description: "probe", ...doc });
  await mk({
    name: "S1 Red Sofa",
    category: sofas._id,
    price: 800,
    stock: 5,
    catalogAttributes: {
      color: "#ff0000",
      seatingCapacity: 3,
      cushionFirmness: "soft",
    },
    colors: ["Red"],
    materials: ["Fabric"],
    rating: { average: 4.5, count: 10, sum: 45 },
    roomSlugs: ["living-room"],
  });
  await mk({
    name: "S2 Blue Sofa",
    category: sofas._id,
    price: 1200,
    stock: 3,
    catalogAttributes: {
      color: "#0000ff",
      seatingCapacity: 2,
      cushionFirmness: "firm",
    },
    colors: ["Blue"],
    materials: ["Leather"],
    rating: { average: 3, count: 4, sum: 12 },
    roomSlugs: ["living-room"],
  });
  await mk({
    name: "S3 Red Sofa",
    category: sofas._id,
    price: 600,
    stock: 2,
    catalogAttributes: {
      color: "#ff0000",
      seatingCapacity: 2,
      cushionFirmness: "firm",
    },
    colors: ["Red"],
    materials: ["Fabric"],
    rating: { average: 4, count: 3, sum: 12 },
    roomSlugs: ["bedroom"],
  });
  await mk({
    name: "T1 Table",
    category: tables._id,
    price: 350,
    stock: 4,
    style: "modern",
    catalogAttributes: {
      shape: "round",
      extendable: true,
      frameMaterial: "Oak",
    },
    rating: { average: 5, count: 7, sum: 35 },
    roomSlugs: ["dining-room"],
  });
  const chairs = await Category.findOne({ slug: "probe2-chairs" });
  await mk({
    name: "C1 Chair",
    category: chairs._id,
    price: 200,
    stock: 7,
    catalogAttributes: { upholstery: "Velvet", frameMaterial: "Steel" },
    rating: { average: 2.5, count: 2, sum: 5 },
  });
  await mk({
    name: "S4 Hidden Sofa",
    category: sofas._id,
    price: 100,
    stock: 9,
    status: "inactive",
    catalogAttributes: { color: "#ff0000", seatingCapacity: 9 },
  });

  async function call(handler, req) {
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        if (this.statusCode === undefined) this.statusCode = 200;
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
      if (Date.now() - start > 20000) throw new Error("handler did not settle");
      await new Promise((r) => setTimeout(r, 5));
    }
    return { res, error };
  }

  async function list(queryString) {
    const req = {
      query: qs.parse(queryString),
      user: undefined,
      params: {},
      body: {},
    };
    let validationError;
    validate(getProductsQuerySchema, "query")(req, {}, (err) => {
      validationError = err;
    });
    if (validationError) throw validationError;
    const { res, error } = await call(productCtrl.getAllProducts, req);
    if (error) throw error;
    return res.body;
  }
  const attrFacet = (body, key) =>
    body.data.facets.attributes.find((f) => f.key === key);
  const opt = (facet, value) =>
    facet.options.find((o) => String(o.value) === String(value));

  // A) Sofas scope, unfiltered facets.
  const a = await list("categories=probe2-sofas&facets=1");
  const aKeys = a.data.facets.attributes.map((f) => f.key);
  say(
    `sofa-keys has-seating=${aKeys.includes("seatingCapacity")} has-cushion=${aKeys.includes("cushionFirmness")} has-extendable=${aKeys.includes("extendable")} has-bedsize=${aKeys.includes("bedSize")}`,
  );
  const aColor = attrFacet(a, "color");
  say(
    `sofa-color red=${opt(aColor, "#ff0000").count} blue=${opt(aColor, "#0000ff").count}`,
  );
  const aCat = a.data.facets.category.options;
  say(
    `sofa-category options=${aCat.map((o) => `${o.value}:${o.count}:${o.selected}`).join("|")}`,
  );
  say(
    `sofa-price min=${a.data.facets.price.min} max=${a.data.facets.price.max}`,
  );
  say(
    `sofa-availability count=${a.data.facets.availability.options[0].count} selected=${a.data.facets.availability.options[0].selected}`,
  );
  say(
    `sofa-rating t4=${opt(a.data.facets.rating, 4).count} t3=${opt(a.data.facets.rating, 3).count}`,
  );
  const aRoom = a.data.facets.room.options;
  say(
    `sofa-room living=${opt({ options: aRoom }, "living-room").count} bedroom=${opt({ options: aRoom }, "bedroom").count}`,
  );

  // B) Disjunctive: color=red selected inside the sofas scope.
  const b = await list("categories=probe2-sofas&facets=1&attr.color=%23ff0000");
  say(`disj-total total=${b.data.pagination.total}`);
  const bColor = attrFacet(b, "color");
  say(
    `disj-color red=${opt(bColor, "#ff0000").count}:${opt(bColor, "#ff0000").selected} blue=${opt(bColor, "#0000ff").count}:${opt(bColor, "#0000ff").selected}`,
  );
  const bSeat = attrFacet(b, "seatingCapacity");
  say(`disj-seating v3=${opt(bSeat, 3).count} v2=${opt(bSeat, 2).count}`);
  say(
    `disj-price min=${b.data.facets.price.min} max=${b.data.facets.price.max}`,
  );
  const bCat = b.data.facets.category.options;
  say(
    `disj-category options=${bCat.map((o) => `${o.value}:${o.count}:${o.selected}`).join("|")}`,
  );

  // C) Derivation contrast: tables scope + unscoped.
  const c = await list("categories=probe2-tables&facets=1");
  const cKeys = c.data.facets.attributes.map((f) => f.key);
  say(
    `table-keys has-extendable=${cKeys.includes("extendable")} has-shape=${cKeys.includes("shape")} has-cushion=${cKeys.includes("cushionFirmness")}`,
  );
  const u = await list("facets=1");
  const uKeys = u.data.facets.attributes.map((f) => f.key);
  say(
    `unscoped-keys has-extendable=${uKeys.includes("extendable")} has-cushion=${uKeys.includes("cushionFirmness")}`,
  );
  const uCat = u.data.facets.category.options;
  say(
    `unscoped-category living=${uCat.find((o) => o.value === "probe2-living")?.count} sofas=${uCat.find((o) => o.value === "probe2-sofas")?.count} dining=${uCat.find((o) => o.value === "probe2-dining")?.count}`,
  );

  // F) Room facet disjunction + rating selection marking.
  const f = await list(
    "categories=probe2-sofas&facets=1&room=living-room&minRating=4",
  );
  say(`room-total total=${f.data.pagination.total}`);
  const fRoom = f.data.facets.room.options;
  say(
    `room-facet living=${opt({ options: fRoom }, "living-room").count}:${opt({ options: fRoom }, "living-room").selected} bedroom=${opt({ options: fRoom }, "bedroom").count}`,
  );
  say(
    `rating-selected t4=${opt(f.data.facets.rating, 4).selected} t3=${opt(f.data.facets.rating, 3).selected}`,
  );

  // D) Converged endpoint.
  const d = await call(catalogCtrl.getCategoryFacets, {
    params: { slug: "probe2-sofas" },
  });
  const dKeys = d.res.body.data.facets.map((facet) => facet.key);
  const dColors = d.res.body.data.facets.find(
    (facet) => facet.key === "colors",
  );
  const dSeat = d.res.body.data.facets.find(
    (facet) => facet.key === "seatingCapacity",
  );
  say(
    `endpoint status=${d.res.statusCode} total=${d.res.body.data.total} slug=${d.res.body.data.category.slug}`,
  );
  say(
    `endpoint-facets first3=${dKeys.slice(0, 3).join("|")} colors-red=${opt(dColors, "Red").count} seat3=${opt(dSeat, 3).count}`,
  );
  const d404 = await call(catalogCtrl.getCategoryFacets, {
    params: { slug: "nope" },
  });
  say(
    `endpoint-404 status=${d404.error ? d404.error.statusCode : d404.res.statusCode}`,
  );

  // E) Perf smoke: ~2,000 more products (bulk), then a faceted,
  // attribute-filtered list call over the tables scope.
  const bulk = [];
  for (let i = 0; i < 2000; i += 1) {
    const withVariants = i % 10 === 0;
    bulk.push({
      name: `Bulk Table ${i}`,
      slug: `bulk-table-${i}`,
      description: "bulk",
      category: tables._id,
      price: 100 + i,
      stock: 3,
      status: "active",
      deletedAt: null,
      catalogAttributes: {
        shape: i % 2 === 0 ? "round" : "square",
        frameMaterial: "Oak",
        extendable: i % 3 === 0,
      },
      ...(withVariants
        ? {
            hasVariants: true,
            priceFrom: 90 + i,
            variantOptionKeys: ["color"],
            catalogVariants: [
              {
                sku: `BULK-${i}-R`,
                options: { color: "#ff0000" },
                price: 90 + i,
                stock: 2,
                enabled: true,
              },
              {
                sku: `BULK-${i}-B`,
                options: { color: "#0000ff" },
                price: 95 + i,
                stock: 2,
                enabled: true,
              },
            ],
          }
        : {}),
    });
  }
  await Product.insertMany(bulk);
  const started = Date.now();
  const perf = await list("categories=probe2-tables&facets=1&attr.shape=round");
  const elapsed = Date.now() - started;
  say(
    `perf facets-ms=${elapsed} total=${perf.data.pagination.total} facet-keys=${perf.data.facets.attributes.length}`,
  );

  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
