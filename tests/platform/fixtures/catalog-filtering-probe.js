// Child-process probe for Phase 5 (catalog) faceted filtering —
// the LIST semantics: attr.* grammar over a real MMS mongod, the
// same-variant rule, hybrid legacy matching, effective price,
// variant availability, the collection dimension, the injection
// battery through the real stack (qs parse -> Joi validate ->
// controller), cursor composition, and effective-price sorting.
//
// Prints RESULT lines; tests/platform/catalog-filtering.test.js
// asserts them.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "catfilter-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const uri = mongod.getUri("aura_catalog_filtering_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Category = require(path.join(REPO, "models/category.model"));
  const Product = require(path.join(REPO, "models/product.model"));
  const Collection = require(path.join(REPO, "models/collection.model"));
  const AttributeDefinition = require(path.join(REPO, "models/attributeDefinition.model"));
  const bootstrap = require(path.join(REPO, "services/catalogBootstrap.service"));
  const productCtrl = require(path.join(REPO, "controllers/product.controller"));
  const validate = require(path.join(REPO, "middleware/validate.middleware"));
  const { getProductsQuerySchema } = require(path.join(REPO, "validators/product.validator"));
  const qs = require(path.join(REPO, "node_modules/qs"));

  const say = (line) => console.log(`RESULT ${line}`);
  await bootstrap.ensureCatalogRegistry();

  // Registry additions the seed does not carry as filterable:
  // a measurement (range/.value semantics) and a multi-enum.
  await AttributeDefinition.create([
    { key: "probeDepth", label: "Probe Depth", type: "measurement", unit: "cm", filterable: true, active: true },
    { key: "probeFeatures", label: "Probe Features", type: "multi-enum", filterable: true, active: true },
  ]);

  // ---- Category tree ----
  const living = await Category.create({ name: "Probe Living", slug: "probe-living" });
  const sofas = await Category.create({ name: "Probe Sofas", slug: "probe-sofas", parent: living._id, productType: "sofa" });
  const beds = await Category.create({ name: "Probe Beds", slug: "probe-beds", parent: living._id, productType: "bed" });
  const dining = await Category.create({ name: "Probe Dining", slug: "probe-dining" });
  const tables = await Category.create({ name: "Probe Tables", slug: "probe-tables", parent: dining._id, productType: "table" });

  // ---- Products ----
  const mk = async (doc) => {
    const product = await Product.create({ description: "probe", ...doc });
    return product;
  };
  const alpha = await mk({
    name: "Alpha Sofa", category: sofas._id, price: 800, stock: 5,
    catalogAttributes: { color: "#ff0000", seatingCapacity: 3, finish: "a+b" },
    colors: ["Red"], materials: ["Fabric"], rating: { average: 4.5, count: 10, sum: 45 },
    roomSlugs: ["living-room"],
  });
  const beta = await mk({
    name: "Beta Sofa", category: sofas._id, price: 1200, originalPrice: 1500, stock: 3,
    catalogAttributes: { color: "#0000ff", seatingCapacity: 2 },
    colors: ["Blue"], rating: { average: 3.5, count: 4, sum: 14 },
    roomSlugs: ["living-room"],
  });
  await mk({
    name: "Gamma Sofa", category: sofas._id, price: 600, stock: 0,
    catalogAttributes: { color: "#00ff00", seatingCapacity: 5 },
    colors: ["Green"], rating: { average: 2, count: 1, sum: 2 },
  });
  const delta = await mk({
    name: "Delta Bed", category: beds._id, price: 9999, stock: 8,
    hasVariants: true, priceFrom: 500, variantOptionKeys: ["color", "bedSize"],
    catalogVariants: [
      { sku: "DELTA-RK", options: { color: "#ff0000", bedSize: "King" }, price: 1000, stock: 5, enabled: true },
      { sku: "DELTA-BS", options: { color: "#0000ff", bedSize: "Single" }, price: 500, stock: 3, enabled: true },
    ],
    rating: { average: 4, count: 2, sum: 8 },
  });
  await mk({
    name: "Epsilon Bed", category: beds._id, price: 9999, stock: 12, reservedStock: 2,
    hasVariants: true, priceFrom: 300, variantOptionKeys: ["color", "bedSize"],
    catalogVariants: [
      { sku: "EPS-GQ", options: { color: "#00ff00", bedSize: "Queen" }, price: 300, stock: 2, reservedStock: 2, enabled: true },
      { sku: "EPS-RQ", options: { color: "#ff0000", bedSize: "Queen" }, price: 700, stock: 1, reservedStock: 0, enabled: true },
      { sku: "EPS-BK", options: { color: "#000000", bedSize: "King" }, price: 100, stock: 9, enabled: false },
    ],
  });
  await mk({
    name: "Zeta Bed", category: beds._id, price: 450, stock: 2,
    catalogAttributes: { bedSize: "King", color: "#ff0000" },
    rating: { average: 4, count: 3, sum: 12 },
  });
  await mk({
    name: "Eta Table", category: tables._id, price: 350, stock: 4, style: "modern",
    catalogAttributes: { shape: "round", extendable: true, probeDepth: { value: 120, unit: "cm" }, probeFeatures: ["a", "b"] },
    rating: { average: 5, count: 7, sum: 35 },
    roomSlugs: ["dining-room"],
  });
  await mk({
    name: "Theta Table", category: tables._id, price: 250, stock: 6, style: "classic",
    catalogAttributes: { shape: "square", extendable: false, probeDepth: { value: 80, unit: "cm" } },
  });
  // Never visible: an inactive and a soft-deleted red sofa.
  await mk({
    name: "Hidden Sofa", category: sofas._id, price: 100, stock: 9, status: "inactive",
    catalogAttributes: { color: "#ff0000" },
  });
  const deleted = await mk({
    name: "Deleted Sofa", category: sofas._id, price: 100, stock: 9,
    catalogAttributes: { color: "#ff0000" },
  });
  await Product.updateOne({ _id: deleted._id }, { $set: { deletedAt: new Date() } });

  // Deterministic createdAt order for cursor/sort walks. The raw
  // driver is used because Mongoose marks createdAt immutable for
  // model-level updates when timestamps are enabled.
  const order = ["Theta Table", "Eta Table", "Zeta Bed", "Epsilon Bed", "Delta Bed", "Gamma Sofa", "Beta Sofa", "Alpha Sofa"];
  for (let i = 0; i < order.length; i += 1) {
    await Product.collection.updateOne(
      { name: order[i] },
      { $set: { createdAt: new Date(Date.UTC(2026, 0, 1 + i)) } }
    );
  }

  await Collection.create([
    { slug: "probe-picks", label: "Probe Picks", kind: "manual", productIds: [alpha._id, delta._id], active: true },
    { slug: "probe-sale", label: "Probe Sale", kind: "rule", rule: { type: "on-sale", params: {} }, active: true },
  ]);

  // ---- Drive the real stack: qs -> Joi validate -> controller ----
  async function call(handler, req) {
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    };
    let error;
    const next = (err) => { error = err; };
    handler({ file: undefined, files: undefined, params: {}, body: {}, query: {}, ...req }, res, next);
    const start = Date.now();
    while (res.body === undefined && error === undefined) {
      if (Date.now() - start > 15000) throw new Error("handler did not settle");
      await new Promise((r) => setTimeout(r, 5));
    }
    return { res, error };
  }

  async function list(queryString) {
    const req = { query: qs.parse(queryString), user: undefined, params: {}, body: {} };
    let validationError;
    validate(getProductsQuerySchema, "query")(req, {}, (err) => { validationError = err; });
    if (validationError) return { status: validationError.statusCode, names: null, body: null };
    const { res, error } = await call(productCtrl.getAllProducts, req);
    if (error) return { status: error.statusCode, names: null, body: null };
    const products = res.body.data.products;
    return {
      status: res.statusCode,
      names: products.map((p) => p.name).sort(),
      total: res.body.data.pagination.total,
      body: res.body,
      products,
    };
  }
  const show = async (label, queryString) => {
    const r = await list(queryString);
    say(`${label} status=${r.status} total=${r.total} names=${r.names ? r.names.join("|") : ""}`);
    return r;
  };

  // Plain list: 8 visible products, no facets key without facets=1.
  const plain = await show("plain", "");
  say(`plain-facets facets-key=${plain.body && "facets" in plain.body.data ? "present" : "absent"}`);

  // Attribute matching: product-level legacy, variant-level, hybrid.
  await show("color-red", "attr.color=%23ff0000");
  await show("same-variant-cross", "attr.color=%23ff0000&attr.bedSize=Single");
  await show("same-variant-hit", "attr.color=%23ff0000&attr.bedSize=King");
  await show("same-variant-blue", "attr.color=%230000ff&attr.bedSize=Single");
  await show("bedsize-king", "attr.bedSize=King");
  await show("or-within", "attr.color=%23ff0000,%230000ff");
  await show("and-across", "attr.color=%23ff0000,%230000ff&attr.seatingCapacity=3");

  // Typed values: boolean, integer range, measurement, multi-enum.
  await show("extendable-true", "attr.extendable=true");
  const badBool = await list("attr.extendable=yes");
  say(`extendable-yes status=${badBool.status}`);
  await show("seating-min", "attr.seatingCapacity.min=3");
  await show("depth-min", "attr.probeDepth.min=100");
  await show("depth-exact", "attr.probeDepth=80");
  await show("features-a", "attr.probeFeatures=a");
  await show("features-c", "attr.probeFeatures=c");

  // Field-storage attributes + the untouched legacy colors param.
  await show("field-style", "attr.style=modern");
  await show("field-colors-exact", "attr.colors=Red");
  await show("field-colors-literal-case", "attr.colors=red");
  await show("legacy-colors", "colors=red");
  await show("finish-literal", "attr.finish=a%2Bb");
  await show("finish-dot-nomatch", "attr.finish=a.b");

  // Effective price, incl. same-variant price binding.
  await show("price-range", "minPrice=400&maxPrice=600");
  await show("price-bound-miss", "attr.color=%230000ff&minPrice=900&maxPrice=1100");
  await show("price-bound-hit", "attr.color=%23ff0000&minPrice=900&maxPrice=1100");

  // Availability: product-level and variant-level (reserved counts).
  await show("instock", "inStock=true");
  await show("instock-green", "inStock=true&attr.color=%2300ff00");
  await show("instock-red", "inStock=true&attr.color=%23ff0000");

  // Collection dimension.
  await show("collection-manual", "collection=probe-picks");
  await show("collection-rule", "collection=probe-sale");
  const badCollection = await list("collection=nope");
  say(`collection-unknown status=${badCollection.status}`);

  // Registry discipline + injection battery through the full stack.
  const unknownKey = await list("attr.nope=x");
  say(`unknown-key status=${unknownKey.status}`);
  const notFilterable = await list("attr.shelfCount=3");
  say(`not-filterable status=${notFilterable.status}`);
  const operatorValue = await list("attr.color[$ne]=x");
  say(`injection-operator status=${operatorValue.status}`);
  const pollution = await list("attr.__proto__=x");
  say(`injection-proto status=${pollution.status}`);
  const dotted = await list("attr.color.extra=x");
  say(`injection-dotted status=${dotted.status}`);

  // Cursor composition. NOTE (pre-existing stack behavior, pinned
  // here, unchanged by Phase 5): the Joi query schema does not
  // admit `cursor`, so the validate middleware strips it and the
  // controller never enters cursor mode through the HTTP stack —
  // the AR-19 cursor tests drive the controller directly. The walk
  // below does the same: validate first, then attach the cursor,
  // exactly like tests/platform/catalog-descendants.test.js.
  const stripped = await list("attr.color=%23ff0000&limit=2&cursor=abc");
  say(`cursor-stack stripped=${!("nextCursor" in stripped.body.data)}`);
  async function listWithCursor(queryString, cursorValue) {
    const req = { query: qs.parse(queryString), user: undefined, params: {}, body: {} };
    let validationError;
    validate(getProductsQuerySchema, "query")(req, {}, (err) => { validationError = err; });
    if (validationError) throw validationError;
    req.query.cursor = cursorValue;
    const { res, error } = await call(productCtrl.getAllProducts, req);
    if (error) throw error;
    return res.body;
  }
  const pageWalk = await list("attr.color=%23ff0000&limit=2&page=1");
  const pageWalk2 = await list("attr.color=%23ff0000&limit=2&page=2");
  const walkedNames = [...pageWalk.products, ...pageWalk2.products].map((p) => p.name);
  const cursorNames = [];
  let cursor = "";
  for (let guard = 0; guard < 6; guard += 1) {
    const body = await listWithCursor("attr.color=%23ff0000&limit=2", cursor);
    cursorNames.push(...body.data.products.map((p) => p.name));
    cursor = body.data.nextCursor;
    if (!cursor) break;
  }
  say(`cursor-walk match=${JSON.stringify(cursorNames) === JSON.stringify(walkedNames)} names=${cursorNames.join("|")}`);

  // Effective-price sort: variant products order by priceFrom;
  // body shape parity with the find() path for the same product.
  const sorted = await list("sort=effectivePriceAsc&limit=100");
  say(`sort-effective names=${sorted.products.map((p) => p.name).join("|")}`);
  const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value).sort().map((k) => [k, canonical(value[k])])
      );
    }
    return value;
  };
  const fromFind = plain.products.find((p) => p.name === "Delta Bed");
  const fromAgg = sorted.products.find((p) => p.name === "Delta Bed");
  say(
    `sort-shape-parity ok=${JSON.stringify(canonical(fromFind)) === JSON.stringify(canonical(fromAgg))}`
  );
  say(
    `sort-shape-keys find=${Object.keys(fromFind).sort().join(",")} agg=${Object.keys(fromAgg).sort().join(",")}`
  );

  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
