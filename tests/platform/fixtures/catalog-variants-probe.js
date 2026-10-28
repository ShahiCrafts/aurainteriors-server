// Child-process probe for Phase 3 (catalog) product variants:
// the promoted catalogVariants[] system end to end — SKU rules,
// combination rules, derived fields, the variantOptionKeys lock,
// Product.productType writability + resolution precedence,
// ensureDefaultVariant, and the legacy contract. Against a real
// mongodb-memory-server mongod (disk-backed dbPath under
// ~/workspace/aura-catalog/mms-data). Drives the REAL models,
// services and controllers; only req/res/next are mocked.
//
// Prints RESULT lines; tests/platform/catalog-variants.test.js
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
  const dbPath = fs.mkdtempSync(path.join(base, "catvar-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri("aura_catalog_variants_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Category = require(path.join(REPO, "models/category.model"));
  const Product = require(path.join(REPO, "models/product.model"));
  const ProductType = require(path.join(REPO, "models/productType.model"));
  const AttributeDefinition = require(
    path.join(REPO, "models/attributeDefinition.model"),
  );
  const bootstrap = require(
    path.join(REPO, "services/catalogBootstrap.service"),
  );
  const resolution = require(
    path.join(REPO, "services/attributeResolution.service"),
  );
  const variantService = require(
    path.join(REPO, "services/productVariant.service"),
  );
  const productCtrl = require(
    path.join(REPO, "controllers/product.controller"),
  );
  const variantCtrl = require(
    path.join(REPO, "controllers/productVariant.controller"),
  );

  const say = (line) => console.log(`RESULT ${line}`);

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
      if (Date.now() - start > 15000) throw new Error("handler did not settle");
      await new Promise((r) => setTimeout(r, 5));
    }
    return { res, error };
  }
  const statusOf = ({ res, error }) =>
    error ? error.statusCode : res.statusCode;
  const plain = (value) => JSON.parse(JSON.stringify(value));
  const entryOf = (attributes, key) =>
    attributes.find((entry) => entry.key === key);

  await Product.init(); // the sparse unique variant-SKU index must exist before writes
  await bootstrap.ensureCatalogRegistry();

  // Extra definitions the seed does not carry: a CLOSED enum (for
  // value-validation failures) and a multi-enum (not variant-suitable).
  await AttributeDefinition.create({
    key: "finishGrade",
    label: "Finish Grade",
    type: "enum",
    allowedValues: ["matte", "gloss"],
    appliesTo: "assigned",
    storage: "catalogAttributes",
    active: true,
  });
  await AttributeDefinition.create({
    key: "bundleParts",
    label: "Bundle Parts",
    type: "multi-enum",
    allowedValues: ["a", "b"],
    appliesTo: "assigned",
    storage: "catalogAttributes",
    active: true,
  });

  const sofaCat = await Category.create({
    name: "Sofas",
    slug: "sofas",
    productType: "sofa",
  });
  const chairCat = await Category.create({
    name: "Chairs",
    slug: "chairs",
    productType: "chair",
  });

  // ---- Product.productType writability ----
  const created = await call(productCtrl.createProduct, {
    body: {
      name: "Oslo Sofa",
      description: "A sofa",
      category: String(sofaCat._id),
      price: 500,
      sku: "SOFA-1",
      productType: "SOFA",
    },
  });
  const sofa = await Product.findOne({ sku: "SOFA-1" }).lean();
  say(
    `create-producttype status=${statusOf(created)} stored=${sofa && sofa.productType}`,
  );
  const bogus = await call(productCtrl.createProduct, {
    body: {
      name: "Bogus",
      description: "x",
      category: String(sofaCat._id),
      price: 10,
      sku: "BOGUS-1",
      productType: "hovercraft",
    },
  });
  say(`create-producttype-bogus status=${statusOf(bogus)}`);
  const sofaId = String(sofa._id);

  // ---- Legacy product: contract before any variant exists ----
  const legacy = await Product.create({
    name: "Legacy Chair",
    description: "Pre-catalog chair",
    category: chairCat._id,
    price: 100,
    originalPrice: 150,
    stock: 7,
    sku: "LEG-1",
    images: [
      { url: "https://cdn.example/a.jpg", isPrimary: true },
      { url: "https://cdn.example/b.jpg" },
    ],
  });
  const legacyDetail = await call(productCtrl.getProduct, {
    params: { id: String(legacy._id) },
  });
  const legacyPayload = plain(legacyDetail.res.body.data.product);
  say(
    `legacy-detail hasVariants=${legacyPayload.hasVariants} priceFrom=${legacyPayload.priceFrom} variants=${legacyPayload.catalogVariants.length}`,
  );
  const list = await call(productCtrl.getAllProducts, { query: {} });
  const listedLegacy = plain(list.res.body.data.products).find(
    (p) => p._id === String(legacy._id),
  );
  say(
    `legacy-list hasVariants=${listedLegacy.hasVariants} priceFrom=${listedLegacy.priceFrom} variants=${listedLegacy.catalogVariants.length}`,
  );

  // ---- Resolution precedence: the product's own type wins the type level ----
  const typed = await call(productCtrl.updateProduct, {
    params: { id: sofaId },
    body: { productType: "office_chair" },
  });
  const sofaFresh = await Product.findById(sofaId);
  const resolvedTyped = await resolution.resolveForProduct(sofaFresh);
  const lumbar = entryOf(resolvedTyped, "lumbarSupport");
  say(
    `resolve-product-type status=${statusOf(typed)} lumbar=${lumbar ? lumbar.source : "absent"} chaise=${entryOf(resolvedTyped, "chaiseOrientation") ? "present" : "absent"}`,
  );
  const plainSofa = await Product.create({
    name: "Plain Sofa",
    description: "Untyped",
    category: sofaCat._id,
    price: 300,
    sku: "PLAIN-1",
  });
  const resolvedPlain = await resolution.resolveForProduct(plainSofa);
  say(
    `resolve-category-type chaise=${entryOf(resolvedPlain, "chaiseOrientation") ? "present" : "absent"} lumbar=${entryOf(resolvedPlain, "lumbarSupport") ? "present" : "absent"}`,
  );
  const cleared = await call(productCtrl.updateProduct, {
    params: { id: sofaId },
    body: { productType: "" },
  });
  const sofaCleared = await Product.findById(sofaId).lean();
  say(
    `producttype-clear status=${statusOf(cleared)} stored=${sofaCleared.productType ? sofaCleared.productType : "empty"}`,
  );

  // ---- variantOptionKeys via the product update path ----
  const setKeys = await call(productCtrl.updateProduct, {
    params: { id: sofaId },
    body: { variantOptionKeys: ["color", "seatingCapacity"] },
  });
  const sofaKeys = await Product.findById(sofaId).lean();
  say(
    `optionkeys-set status=${statusOf(setKeys)} stored=${(sofaKeys.variantOptionKeys || []).join(",")}`,
  );
  for (const [label, keys] of [
    ["unknown", ["nope"]],
    ["field", ["dimensions"]],
    ["measurement", ["extendsLength"]],
    ["multienum", ["bundleParts"]],
  ]) {
    const attempt = await call(productCtrl.updateProduct, {
      params: { id: sofaId },
      body: { variantOptionKeys: keys },
    });
    say(`optionkeys-${label} status=${statusOf(attempt)}`);
  }

  // ---- Variant creation: validation + SKU/combination rules ----
  const createVariant = (body) =>
    call(variantCtrl.createVariant, { params: { id: sofaId }, body });
  say(
    `create-missing-key status=${statusOf(await createVariant({ sku: "MISS-1", options: { color: "#112233" }, price: 10 }))}`,
  );
  say(
    `create-extra-key status=${statusOf(await createVariant({ sku: "EXTRA-1", options: { color: "#112233", seatingCapacity: 2, upholstery: "linen" }, price: 10 }))}`,
  );
  say(
    `create-bad-value status=${statusOf(await createVariant({ sku: "BAD-1", options: { color: "#112233", seatingCapacity: "two" }, price: 10 }))}`,
  );
  say(
    `create-bad-color status=${statusOf(await createVariant({ sku: "BAD-2", options: { color: "walnut", seatingCapacity: 2 }, price: 10 }))}`,
  );
  say(
    `create-bad-sku status=${statusOf(await createVariant({ sku: "bad sku!", options: { color: "#112233", seatingCapacity: 2 }, price: 10 }))}`,
  );

  const v1 = await createVariant({
    sku: "sofa-1-wal-2",
    options: { color: "#A0522D", seatingCapacity: 2 },
    price: 450,
    stock: 5,
  });
  const v1Body = plain(v1.res.body || {});
  const v1Variant = v1Body.data ? v1Body.data.variant : {};
  const v1Product = v1Body.data ? v1Body.data.product : {};
  say(
    `create-v1 status=${statusOf(v1)} combo=${v1Variant.combinationKey} color=${v1Variant.options && v1Variant.options.color} seats=${v1Variant.options && v1Variant.options.seatingCapacity} hasVariants=${v1Product.hasVariants} priceFrom=${v1Product.priceFrom}`,
  );
  const v1Id = v1Variant._id;

  say(
    `create-dup-combo status=${statusOf(await createVariant({ sku: "OTHER-1", options: { seatingCapacity: 2, color: "#a0522d" }, price: 1 }))}`,
  );
  say(
    `create-dup-sku status=${statusOf(await createVariant({ sku: "SOFA-1-WAL-2", options: { color: "#000000", seatingCapacity: 3 }, price: 1 }))}`,
  );
  say(
    `create-dup-sku-case status=${statusOf(await createVariant({ sku: "sofa-1-wal-2", options: { color: "#000000", seatingCapacity: 3 }, price: 1 }))}`,
  );
  say(
    `create-sku-product status=${statusOf(await createVariant({ sku: "LEG-1", options: { color: "#000000", seatingCapacity: 3 }, price: 1 }))}`,
  );
  const ownSku = await createVariant({
    sku: "SOFA-1",
    options: { color: "#111111", seatingCapacity: 4 },
    price: 600,
    stock: 1,
  });
  say(`create-sku-own status=${statusOf(ownSku)}`);
  const ownId = plain(ownSku.res.body).data.variant._id;

  // Concurrent duplicate submits: same combination, then same SKU.
  const comboRace = await Promise.all([
    createVariant({
      sku: "CC-1",
      options: { color: "#222222", seatingCapacity: 5 },
      price: 700,
    }),
    createVariant({
      sku: "CC-2",
      options: { seatingCapacity: 5, color: "#222222" },
      price: 700,
    }),
  ]);
  say(
    `create-concurrent-combo statuses=${comboRace.map(statusOf).sort().join(",")}`,
  );
  const ccWinnerId = plain(comboRace.find((r) => statusOf(r) === 201).res.body)
    .data.variant._id;
  const skuRace = await Promise.all([
    createVariant({
      sku: "CC-9",
      options: { color: "#333333", seatingCapacity: 6 },
      price: 800,
    }),
    createVariant({
      sku: "CC-9",
      options: { color: "#444444", seatingCapacity: 7 },
      price: 810,
    }),
  ]);
  say(
    `create-concurrent-sku statuses=${skuRace.map(statusOf).sort().join(",")}`,
  );
  const cc9WinnerId = plain(skuRace.find((r) => statusOf(r) === 201).res.body)
    .data.variant._id;

  // ---- Option-keys lock while variants exist ----
  say(
    `optionkeys-locked status=${statusOf(await call(productCtrl.updateProduct, { params: { id: sofaId }, body: { variantOptionKeys: ["color"] } }))}`,
  );
  say(
    `optionkeys-same-set status=${statusOf(await call(productCtrl.updateProduct, { params: { id: sofaId }, body: { variantOptionKeys: ["seatingCapacity", "color"] } }))}`,
  );

  // ---- priceFrom lifecycle ----
  const v2 = await createVariant({
    sku: "V2",
    options: { color: "#000000", seatingCapacity: 3 },
    price: 400,
    stock: 2,
    enabled: false,
  });
  const v2Id = plain(v2.res.body).data.variant._id;
  const sofaNow = await Product.findById(sofaId).lean();
  say(
    `pricefrom-disabled status=${statusOf(v2)} priceFrom=${sofaNow.priceFrom}`,
  );
  const patchVariant = (variantId, body) =>
    call(variantCtrl.updateVariant, {
      params: { id: sofaId, variantId },
      body,
    });
  const enabledV2 = await patchVariant(v2Id, { enabled: true });
  say(
    `pricefrom-enable priceFrom=${plain(enabledV2.res.body).data.product.priceFrom}`,
  );
  const pricedV2 = await patchVariant(v2Id, { price: 475 });
  say(
    `pricefrom-after-v2-price priceFrom=${plain(pricedV2.res.body).data.product.priceFrom}`,
  );
  const pricedV1 = await patchVariant(v1Id, { price: 500 });
  say(
    `pricefrom-after-v1-price priceFrom=${plain(pricedV1.res.body).data.product.priceFrom}`,
  );
  say(
    `update-sku-immutable status=${statusOf(await patchVariant(v1Id, { sku: "NEW-1" }))}`,
  );
  say(
    `update-missing-variant status=${statusOf(await patchVariant("64b64c64b64c64b64c64b64c", { price: 1 }))}`,
  );
  const reservedAttempt = await patchVariant(v1Id, { reservedStock: 3 });
  say(
    `update-reserved-ignored status=${statusOf(reservedAttempt)} reserved=${plain(reservedAttempt.res.body).data.variant.reservedStock}`,
  );

  // ---- Closed-enum option values validate through the engine ----
  const fin = await Product.create({
    name: "Finish Table",
    description: "x",
    category: chairCat._id,
    price: 50,
    sku: "FIN-1",
  });
  await call(productCtrl.updateProduct, {
    params: { id: String(fin._id) },
    body: { variantOptionKeys: ["finishGrade"] },
  });
  const createFin = (body) =>
    call(variantCtrl.createVariant, { params: { id: String(fin._id) }, body });
  say(
    `create-bad-enum status=${statusOf(await createFin({ sku: "FIN-1-A", options: { finishGrade: "satin" }, price: 50 }))}`,
  );
  say(
    `create-closed-enum status=${statusOf(await createFin({ sku: "FIN-1-A", options: { finishGrade: "matte" }, price: 50 }))}`,
  );

  // ---- Deletes recompute the derived fields ----
  const deleteVariant = (variantId) =>
    call(variantCtrl.deleteVariant, { params: { id: sofaId, variantId } });
  const afterV2Delete = await deleteVariant(v2Id);
  say(
    `delete-v2 priceFrom=${plain(afterV2Delete.res.body).data.product.priceFrom}`,
  );
  await deleteVariant(ccWinnerId);
  await deleteVariant(cc9WinnerId);
  const afterV1Delete = await deleteVariant(v1Id);
  say(
    `delete-v1 priceFrom=${plain(afterV1Delete.res.body).data.product.priceFrom} hasVariants=${plain(afterV1Delete.res.body).data.product.hasVariants}`,
  );
  const afterLastDelete = await deleteVariant(ownId);
  const lastProduct = plain(afterLastDelete.res.body).data.product;
  say(
    `delete-last hasVariants=${lastProduct.hasVariants} priceFrom=${lastProduct.priceFrom}`,
  );

  // ---- ensureDefaultVariant ----
  const defaultFirst = await variantService.ensureDefaultVariant(legacy);
  const defaultVariant = plain(defaultFirst.variant);
  say(
    `default-variant created=${defaultFirst.created} sku=${defaultVariant.sku} price=${defaultVariant.price} compareAt=${defaultVariant.compareAtPrice} stock=${defaultVariant.stock} comboKey=${JSON.stringify(defaultVariant.combinationKey)} images=${(defaultVariant.images || []).length}`,
  );
  const defaultSecond = await variantService.ensureDefaultVariant(
    await Product.findById(legacy._id),
  );
  const legacyAfter = await Product.findById(legacy._id).lean();
  say(
    `default-variant-again created=${defaultSecond.created} count=${legacyAfter.catalogVariants.length} hasVariants=${legacyAfter.hasVariants} priceFrom=${legacyAfter.priceFrom}`,
  );
  const availability = variantService.productVariantAvailability(legacyAfter);
  say(
    `default-availability purchasable=${availability.purchasableCount} any=${availability.anyPurchasable}`,
  );

  const keysOnly = await Product.create({
    name: "Keys Only",
    description: "x",
    category: chairCat._id,
    price: 10,
    sku: "KEYS-1",
  });
  await call(productCtrl.updateProduct, {
    params: { id: String(keysOnly._id) },
    body: { variantOptionKeys: ["color"] },
  });
  let keysError = 0;
  try {
    await variantService.ensureDefaultVariant(
      await Product.findById(keysOnly._id),
    );
  } catch (err) {
    keysError = err.statusCode;
  }
  say(`default-keys-error status=${keysError}`);
  const noSku = await Product.create({
    name: "No SKU",
    description: "x",
    category: chairCat._id,
    price: 10,
  });
  let noSkuError = 0;
  try {
    await variantService.ensureDefaultVariant(noSku);
  } catch (err) {
    noSkuError = err.statusCode;
  }
  say(`default-nosku status=${noSkuError}`);

  // ---- A product's own type drives required-attribute enforcement ----
  await ProductType.updateOne(
    { key: "office_chair" },
    {
      $set: {
        attributeAssignments: [
          { attributeKey: "weightCapacity", required: true },
        ],
      },
    },
  );
  const missingRequired = await call(productCtrl.createProduct, {
    body: {
      name: "Ergo",
      description: "x",
      category: String(sofaCat._id),
      price: 200,
      sku: "ERGO-1",
      productType: "office_chair",
    },
  });
  say(`create-type-required status=${statusOf(missingRequired)}`);
  const withRequired = await call(productCtrl.createProduct, {
    body: {
      name: "Ergo",
      description: "x",
      category: String(sofaCat._id),
      price: 200,
      sku: "ERGO-1",
      productType: "office_chair",
      catalogAttributes: { weightCapacity: 120 },
    },
  });
  say(`create-type-required-ok status=${statusOf(withRequired)}`);

  // ---- Public detail now carries the variant additively ----
  const legacyFinal = await call(productCtrl.getProduct, {
    params: { id: String(legacy._id) },
  });
  const legacyFinalPayload = plain(legacyFinal.res.body.data.product);
  say(
    `detail-with-variants variants=${legacyFinalPayload.catalogVariants.length} hasVariants=${legacyFinalPayload.hasVariants} priceFrom=${legacyFinalPayload.priceFrom}`,
  );

  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
