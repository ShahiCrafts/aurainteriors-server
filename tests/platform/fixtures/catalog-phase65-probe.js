// Child-process probe for Phase 6.5 (server fix batch SR-P6-1..3).
// Against a real mongodb-memory-server mongod (disk-backed dbPath
// under ~/workspace/aura-catalog/mms-data). Drives the REAL Joi
// schemas (with the validate middleware's exact options), the REAL
// catalog + category controllers, the REAL resolution service and
// models; only req/res/next are mocked.
//
// SR-P6-2: product-type attributeKeys must be stored verbatim
// (AttributeDefinition keys are case-sensitive camelCase) and must
// name known definitions; a category typed by such a type must
// resolve the attribute end to end.
// SR-P6-3: the flat category list's productCount and the tree
// endpoint's count must agree (both exclude soft-deleted products).
//
// Prints RESULT lines; tests/platform/catalog-api-gaps.test.js
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
  const dbPath = fs.mkdtempSync(path.join(base, "cat65-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri("aura_catalog_phase65_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const ProductType = require(path.join(REPO, "models/productType.model"));
  const Category = require(path.join(REPO, "models/category.model"));
  const Product = require(path.join(REPO, "models/product.model"));
  const bootstrap = require(
    path.join(REPO, "services/catalogBootstrap.service"),
  );
  const catalogCtrl = require(
    path.join(REPO, "controllers/catalog.controller"),
  );
  const categoryCtrl = require(
    path.join(REPO, "controllers/category.controller"),
  );
  const { resolveForCategory } = require(
    path.join(REPO, "services/attributeResolution.service"),
  );
  const { createProductTypeSchema, updateProductTypeSchema } = require(
    path.join(REPO, "validators/catalog.validator"),
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

  // The validate middleware's exact semantics: abortEarly false,
  // stripUnknown true, req.body replaced by the validated value.
  const validated = (schema, body) => {
    const { error, value } = schema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error)
      throw new Error(`schema rejected fixture body: ${error.message}`);
    return value;
  };

  await bootstrap.ensureCatalogRegistry();

  // ---- SR-P6-2: attributeKeys stored verbatim through validate+create ----
  const createBody = validated(createProductTypeSchema, {
    key: "sr65-lounger",
    label: "SR65 Lounger",
    attributeKeys: ["frameMaterial", "seatingCapacity"],
  });
  say(`sr2-schema keys=${createBody.attributeKeys.join(",")}`);
  const created = await call(catalogCtrl.createProductType, {
    body: createBody,
  });
  say(`sr2-create status=${statusOf(created)}`);
  const stored = await ProductType.findOne({ key: "sr65-lounger" }).lean();
  say(`sr2-stored keys=${(stored.attributeKeys || []).join(",")}`);

  // ---- SR-P6-2: resolution for a category of that type surfaces the keys ----
  const typeCategory = await Category.create({
    name: "SR65 Lounger Category",
    productType: "sr65-lounger",
  });
  const resolved = await resolveForCategory(typeCategory);
  const resolvedKeys = resolved.map((entry) => entry.key);
  const frameEntry = resolved.find((entry) => entry.key === "frameMaterial");
  say(
    `sr2-resolve frame=${resolvedKeys.includes("frameMaterial")} seating=${resolvedKeys.includes("seatingCapacity")} source=${frameEntry ? frameEntry.source : "none"}`,
  );

  // ---- SR-P6-2: unknown keys rejected with the key named (create + update) ----
  const badCreateBody = validated(createProductTypeSchema, {
    key: "sr65-bad",
    label: "SR65 Bad",
    attributeKeys: ["notARealKey"],
  });
  const badCreate = await call(catalogCtrl.createProductType, {
    body: badCreateBody,
  });
  say(
    `sr2-unknown-create status=${statusOf(badCreate)} named=${Boolean(badCreate.error && /notARealKey/.test(badCreate.error.message))}`,
  );
  const badUpdateBody = validated(updateProductTypeSchema, {
    attributeKeys: ["frameMaterial", "ghostKey"],
  });
  const badUpdate = await call(catalogCtrl.updateProductType, {
    params: { key: "sr65-lounger" },
    body: badUpdateBody,
  });
  say(
    `sr2-unknown-update status=${statusOf(badUpdate)} named=${Boolean(badUpdate.error && /ghostKey/.test(badUpdate.error.message))}`,
  );
  const afterBadUpdate = await ProductType.findOne({
    key: "sr65-lounger",
  }).lean();
  say(
    `sr2-unknown-update stored=${(afterBadUpdate.attributeKeys || []).join(",")}`,
  );

  // ---- SR-P6-2: a valid update also stores keys verbatim ----
  const okUpdateBody = validated(updateProductTypeSchema, {
    attributeKeys: ["frameMaterial"],
  });
  const okUpdate = await call(catalogCtrl.updateProductType, {
    params: { key: "sr65-lounger" },
    body: okUpdateBody,
  });
  const afterOkUpdate = await ProductType.findOne({
    key: "sr65-lounger",
  }).lean();
  say(
    `sr2-update status=${statusOf(okUpdate)} stored=${(afterOkUpdate.attributeKeys || []).join(",")}`,
  );

  // ---- SR-P6-3: flat list count vs tree count with a soft-deleted product ----
  const countCategory = await Category.create({ name: "SR65 Count Category" });
  const mkCounted = (name, extra) =>
    Product.create({
      name,
      description: `Description for ${name}.`,
      category: countCategory._id,
      price: 100,
      stock: 1,
      status: "active",
      ...extra,
    });
  await mkCounted("SR65 Live Product", {});
  await mkCounted("SR65 Inactive Product", { status: "inactive" });
  await mkCounted("SR65 Deleted Product", { deletedAt: new Date() });

  const flat = await call(categoryCtrl.getAllCategories, { query: {} });
  const flatNode = flat.res.body.data.categories.find(
    (c) => String(c._id) === String(countCategory._id),
  );
  say(`sr3-flat count=${flatNode && flatNode.productCount}`);
  const tree = await call(categoryCtrl.getAllCategories, {
    query: { tree: "true" },
  });
  const treeNode = tree.res.body.data.categories.find(
    (c) => String(c._id) === String(countCategory._id),
  );
  say(`sr3-tree count=${treeNode && treeNode.productCount}`);

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
