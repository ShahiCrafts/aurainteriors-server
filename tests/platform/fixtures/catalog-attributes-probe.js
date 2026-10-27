// Child-process probe for Phase 2 (catalog) attribute engine:
// definitions registry + CRUD guards, category assignment
// endpoints, inheritance resolution, product write integration,
// the DB-backed /catalog/schema, and the collection attribute-
// match switch to DB definitions. Against a real
// mongodb-memory-server mongod (disk-backed dbPath under
// ~/workspace/aura-catalog/mms-data). Drives the REAL bootstrap,
// models, services and controllers; only req/res/next are mocked.
//
// Prints RESULT lines; tests/platform/catalog-attributes.test.js
// asserts them.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "catattr-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const uri = mongod.getUri("aura_catalog_attributes_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Category = require(path.join(REPO, "models/category.model"));
  const Product = require(path.join(REPO, "models/product.model"));
  const AttributeDefinition = require(path.join(REPO, "models/attributeDefinition.model"));
  const bootstrap = require(path.join(REPO, "services/catalogBootstrap.service"));
  const resolution = require(path.join(REPO, "services/attributeResolution.service"));
  const catalogCtrl = require(path.join(REPO, "controllers/catalog.controller"));
  const categoryCtrl = require(path.join(REPO, "controllers/category.controller"));
  const productCtrl = require(path.join(REPO, "controllers/product.controller"));

  const say = (line) => console.log(`RESULT ${line}`);

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
  const statusOf = ({ res, error }) => (error ? error.statusCode : res.statusCode);
  const entryOf = (attributes, key) => attributes.find((entry) => entry.key === key);

  // ---- Bootstrap: definitions seeded idempotently ----
  const first = await bootstrap.ensureCatalogRegistry();
  say(`bootstrap-first attributes inserted=${first.attributeDefinitions.inserted} total=${first.attributeDefinitions.total}`);
  const second = await bootstrap.ensureCatalogRegistry();
  say(`bootstrap-second attributes inserted=${second.attributeDefinitions.inserted} total=${second.attributeDefinitions.total}`);
  // An admin edit survives a bootstrap rerun ($setOnInsert).
  await AttributeDefinition.updateOne({ key: "frameMaterial" }, { $set: { label: "Frame Material EDITED" } });
  await bootstrap.ensureAttributeDefinitions();
  const edited = await AttributeDefinition.findOne({ key: "frameMaterial" }).lean();
  say(`bootstrap-edit-survives ok=${edited.label === "Frame Material EDITED"}`);
  await AttributeDefinition.updateOne({ key: "frameMaterial" }, { $set: { label: "Frame Material" } });

  // ---- Definition CRUD + guards ----
  const defCreated = await call(catalogCtrl.createAttributeDefinition, {
    body: { key: "probeFinish", label: "Probe Finish", type: "enum" },
  });
  say(`def-create status=${statusOf(defCreated)}`);
  const defDuplicate = await call(catalogCtrl.createAttributeDefinition, {
    body: { key: "probeFinish", label: "Probe Finish Again", type: "enum" },
  });
  say(`def-create-duplicate status=${statusOf(defDuplicate)}`);
  const defBadBounds = await call(catalogCtrl.createAttributeDefinition, {
    body: { key: "probeBadBounds", label: "Bad Bounds", type: "integer", min: 10, max: 5 },
  });
  say(`def-create-bad-bounds status=${statusOf(defBadBounds)}`);
  const defList = await call(catalogCtrl.listAttributeDefinitions, {});
  say(`def-list status=${statusOf(defList)} count=${defList.res.body.data.attributeDefinitions.length}`);
  const defGet = await call(catalogCtrl.getAttributeDefinition, { params: { key: "probeFinish" } });
  say(`def-get status=${statusOf(defGet)}`);
  const defMissing = await call(catalogCtrl.getAttributeDefinition, { params: { key: "noSuchDef" } });
  say(`def-get-missing status=${statusOf(defMissing)}`);
  const defPatched = await call(catalogCtrl.updateAttributeDefinition, {
    params: { key: "probeFinish" },
    body: { label: "Probe Finish Deluxe", type: "string" }, // unused yet: type change allowed
  });
  say(`def-update status=${statusOf(defPatched)}`);
  const defKeyChange = await call(catalogCtrl.updateAttributeDefinition, {
    params: { key: "probeFinish" },
    body: { key: "probeFinishRenamed" },
  });
  say(`def-key-change status=${statusOf(defKeyChange)}`);

  // Type change is blocked once a product carries a value.
  const guardCat = await Category.create({ name: "Attr Guard Category" });
  await Product.create({
    name: "Attr Guard Product",
    description: "Carries seatingCapacity.",
    category: guardCat._id,
    price: 10,
    stock: 1,
    catalogAttributes: { seatingCapacity: 3 },
  });
  const defTypeInUse = await call(catalogCtrl.updateAttributeDefinition, {
    params: { key: "seatingCapacity" },
    body: { type: "decimal" },
  });
  say(`def-type-change-in-use status=${statusOf(defTypeInUse)}`);
  const defHardInUse = await call(catalogCtrl.deleteAttributeDefinition, {
    params: { key: "seatingCapacity" },
    query: { hard: "true" },
  });
  say(`def-hard-delete-in-use status=${statusOf(defHardInUse)}`);

  // Soft delete deactivates; hard delete of an unreferenced,
  // unused definition succeeds.
  const defSoft = await call(catalogCtrl.deleteAttributeDefinition, { params: { key: "probeFinish" } });
  const probeFinishDoc = await AttributeDefinition.findOne({ key: "probeFinish" }).lean();
  say(`def-soft-delete status=${statusOf(defSoft)} active=${probeFinishDoc.active}`);
  await call(catalogCtrl.createAttributeDefinition, {
    body: { key: "probeTemp", label: "Probe Temp", type: "string" },
  });
  const defHard = await call(catalogCtrl.deleteAttributeDefinition, {
    params: { key: "probeTemp" },
    query: { hard: "true" },
  });
  const probeTempGone = await AttributeDefinition.findOne({ key: "probeTemp" }).lean();
  say(`def-hard-delete status=${statusOf(defHard)} gone=${probeTempGone === null}`);

  // Hard delete is blocked while a category assignment references
  // the key (firmness gets its assignment below, so test the guard
  // AFTER the tree exists — see def-hard-delete-referenced further
  // down).

  // ---- Category tree + assignment endpoints ----
  // root -> mid (sofa) -> leaf -> deep ; root -> sibling (bed) ;
  // root -> requiredChild ; plain (standalone).
  const root = await Category.create({ name: "Attr Root" });
  const mid = await Category.create({ name: "Attr Mid", parent: root._id, productType: "sofa" });
  const leaf = await Category.create({ name: "Attr Leaf", parent: mid._id });
  const deep = await Category.create({ name: "Attr Deep", parent: leaf._id });
  const sibling = await Category.create({ name: "Attr Sibling", parent: root._id, productType: "bed" });
  const requiredChild = await Category.create({ name: "Attr Required Child", parent: root._id });
  const plain = await Category.create({ name: "Attr Plain" });

  const setAttrs = (id, assignments) =>
    call(categoryCtrl.setCategoryAttributeAssignments, { params: { id: String(id) }, body: { assignments } });

  // Endpoint validation battery (on a throwaway category).
  const throwaway = await Category.create({ name: "Attr Throwaway" });
  const assignUnknown = await setAttrs(throwaway._id, [{ attributeKey: "notAKey" }]);
  say(`assign-unknown status=${statusOf(assignUnknown)}`);
  const assignField = await setAttrs(throwaway._id, [{ attributeKey: "dimensions" }]);
  say(`assign-field-key status=${statusOf(assignField)}`);
  const assignBadDefault = await setAttrs(throwaway._id, [
    { attributeKey: "seatingCapacity", defaultValue: "abc" },
  ]);
  say(`assign-bad-default status=${statusOf(assignBadDefault)}`);
  const assignDuplicate = await setAttrs(throwaway._id, [
    { attributeKey: "shape" },
    { attributeKey: "shape" },
  ]);
  say(`assign-duplicate status=${statusOf(assignDuplicate)}`);
  // Replace semantics: set A, then set B — own list becomes B only.
  await setAttrs(throwaway._id, [{ attributeKey: "shape", required: true }]);
  const replaced = await setAttrs(throwaway._id, [{ attributeKey: "doorType", defaultValue: "hinged" }]);
  say(`assign-replace status=${statusOf(replaced)}`);
  const ownList = await call(categoryCtrl.getCategoryAttributeAssignments, { params: { id: String(throwaway._id) } });
  const ownKeys = ownList.res.body.data.assignments.map((a) => a.attributeKey);
  say(`assign-own-list keys=${ownKeys.join(",")} default=${ownList.res.body.data.assignments[0].defaultValue}`);

  // The inheritance scenario.
  await setAttrs(root._id, [{ attributeKey: "frameMaterial", required: true, displayGroup: "Root Group" }]);
  await setAttrs(mid._id, [{ attributeKey: "frameMaterial", required: false }]);
  await setAttrs(leaf._id, [{ attributeKey: "upholstery", active: false }]);
  await setAttrs(sibling._id, [{ attributeKey: "doorType", required: true, defaultValue: "hinged" }]);

  const deepResolved = await resolution.resolveForCategory(deep.toObject());
  const fm = entryOf(deepResolved, "frameMaterial");
  say(`resolve-deep frameMaterial required=${fm.required} group=${fm.displayGroup} source=${fm.source}`);
  say(`resolve-deep upholstery absent=${entryOf(deepResolved, "upholstery") === undefined}`);
  const sc = entryOf(deepResolved, "seatingCapacity");
  say(`resolve-deep seatingCapacity source=${sc && sc.source} required=${sc && sc.required}`);
  const mat = entryOf(deepResolved, "material");
  say(`resolve-deep material source=${mat && mat.source}`);
  say(`resolve-deep doorType absent=${entryOf(deepResolved, "doorType") === undefined}`);
  say(`resolve-deep price storage=${(entryOf(deepResolved, "price") || {}).storage}`);

  const siblingResolved = await resolution.resolveForCategory(sibling.toObject());
  const sFm = entryOf(siblingResolved, "frameMaterial");
  say(`resolve-sibling frameMaterial required=${sFm.required} source=${sFm.source}`);
  const sDoor = entryOf(siblingResolved, "doorType");
  say(`resolve-sibling doorType required=${sDoor.required} default=${sDoor.defaultValue}`);
  say(`resolve-sibling bedSize source=${(entryOf(siblingResolved, "bedSize") || {}).source}`);
  say(`resolve-sibling seatingCapacity absent=${entryOf(siblingResolved, "seatingCapacity") === undefined}`);

  // Hard-delete guard: firmness referenced by a category assignment.
  await setAttrs(throwaway._id, [{ attributeKey: "firmness" }]);
  const defHardReferenced = await call(catalogCtrl.deleteAttributeDefinition, {
    params: { key: "firmness" },
    query: { hard: "true" },
  });
  say(`def-hard-delete-referenced status=${statusOf(defHardReferenced)}`);
  await setAttrs(throwaway._id, []);

  // Type-level overrides: sofa seatingCapacity becomes required at
  // the TYPE level; mid's subtree inherits that (no category
  // assignment for it yet) — then a category assignment on leaf
  // beats the type.
  const typeOverride = await call(catalogCtrl.updateProductType, {
    params: { key: "sofa" },
    body: { attributeAssignments: [{ attributeKey: "seatingCapacity", required: true }] },
  });
  say(`type-override status=${statusOf(typeOverride)}`);
  const typeResolved = await resolution.resolveForProductType("sofa");
  const tSc = entryOf(typeResolved.attributes, "seatingCapacity");
  say(`resolve-type seatingCapacity required=${tSc.required} source=${tSc.source}`);
  const midResolved = await resolution.resolveForCategory(mid.toObject());
  const mSc = entryOf(midResolved, "seatingCapacity");
  say(`resolve-mid seatingCapacity required=${mSc.required} source=${mSc.source}`);
  await setAttrs(leaf._id, [
    { attributeKey: "upholstery", active: false },
    { attributeKey: "seatingCapacity", required: false },
  ]);
  const deepResolved2 = await resolution.resolveForCategory(deep.toObject());
  const dSc = entryOf(deepResolved2, "seatingCapacity");
  say(`resolve-deep seatingCapacity-after required=${dSc.required} source=${dSc.source}`);

  // Resolution endpoints (public reads).
  const bySlug = await call(catalogCtrl.getCategoryAttributes, { params: { ref: deep.slug } });
  const bySlugFm = bySlug.res.body.data.attributes.find((a) => a.key === "frameMaterial");
  say(`endpoint-category-attrs status=${statusOf(bySlug)} frameMaterial-required=${bySlugFm.required}`);
  const byId = await call(catalogCtrl.getCategoryAttributes, { params: { ref: String(deep._id) } });
  say(`endpoint-category-attrs-by-id status=${statusOf(byId)}`);
  const catMissing = await call(catalogCtrl.getCategoryAttributes, { params: { ref: "no-such-category" } });
  say(`endpoint-category-attrs-missing status=${statusOf(catMissing)}`);
  const typeAttrs = await call(catalogCtrl.getProductTypeAttributes, { params: { key: "sofa" } });
  const typeAttrsKeys = typeAttrs.res.body.data.attributes.map((a) => a.key);
  say(`endpoint-type-attrs status=${statusOf(typeAttrs)} has-seating=${typeAttrsKeys.includes("seatingCapacity")} has-doorType=${typeAttrsKeys.includes("doorType")}`);
  const typeMissing = await call(catalogCtrl.getProductTypeAttributes, { params: { key: "no-such-type" } });
  say(`endpoint-type-attrs-missing status=${statusOf(typeMissing)}`);

  // ---- Product write integration ----
  const mkBody = (over) => ({
    name: "Attr Write Product",
    description: "Created through the product controller.",
    category: String(plain._id),
    price: 100,
    stock: 1,
    ...over,
  });
  const countBefore = await Product.countDocuments();
  const createdValid = await call(productCtrl.createProduct, {
    body: mkBody({ catalogAttributes: { color: "#F0A", frameMaterial: " oak ", seatingCapacity: 3 } }),
  });
  say(`product-create-attrs status=${statusOf(createdValid)}`);
  const createdDoc = await Product.findById(createdValid.res.body.data.product._id).lean();
  say(`product-create-normalized color=${createdDoc.catalogAttributes.color} frameMaterial=${createdDoc.catalogAttributes.frameMaterial}`);

  const createdUnknown = await call(productCtrl.createProduct, {
    body: mkBody({ name: "Attr Unknown Product", catalogAttributes: { notAKey: 1 } }),
  });
  say(`product-create-unknown status=${statusOf(createdUnknown)} msg=${createdUnknown.error ? createdUnknown.error.message : ""}`);
  const createdInvalid = await call(productCtrl.createProduct, {
    body: mkBody({ name: "Attr Invalid Product", catalogAttributes: { seatingCapacity: "three" } }),
  });
  say(`product-create-invalid status=${statusOf(createdInvalid)}`);
  const createdFieldKey = await call(productCtrl.createProduct, {
    body: mkBody({ name: "Attr FieldKey Product", catalogAttributes: { dimensions: { length: 1, width: 1, height: 1 } } }),
  });
  say(`product-create-field-key status=${statusOf(createdFieldKey)}`);
  const createdPolluted = await call(productCtrl.createProduct, {
    body: mkBody({ name: "Attr Polluted Product", catalogAttributes: '{"__proto__": {"polluted": true}}' }),
  });
  say(`product-create-pollution status=${statusOf(createdPolluted)} polluted=${({}).polluted}`);
  const countAfterFailures = await Product.countDocuments();
  say(`product-create-failures-persisted delta=${countAfterFailures - countBefore - 1}`);

  // Required enforcement: requiredChild inherits root's
  // frameMaterial { required: true }.
  const createdMissingRequired = await call(productCtrl.createProduct, {
    body: mkBody({ name: "Attr Missing Required", category: String(requiredChild._id) }),
  });
  say(`product-create-required-missing status=${statusOf(createdMissingRequired)} msg=${createdMissingRequired.error ? createdMissingRequired.error.message : ""}`);
  const createdWithRequired = await call(productCtrl.createProduct, {
    body: mkBody({
      name: "Attr With Required",
      category: String(requiredChild._id),
      catalogAttributes: { frameMaterial: "oak" },
    }),
  });
  say(`product-create-required-ok status=${statusOf(createdWithRequired)}`);

  // Partial update that touches neither catalogAttributes nor
  // category does NOT enforce required — the product is created
  // directly (legacy-style, no attributes) in requiredChild.
  const legacy = await Product.create({
    name: "Attr Legacy Product",
    description: "No attributes, as legacy data has none.",
    category: requiredChild._id,
    price: 50,
    stock: 1,
  });
  const partialUpdate = await call(productCtrl.updateProduct, {
    params: { id: String(legacy._id) },
    body: { price: 999 },
  });
  say(`product-update-partial status=${statusOf(partialUpdate)}`);
  // An update WITH catalogAttributes enforces the full contract
  // (replace semantics: the provided map is the new map).
  const updateMissingRequired = await call(productCtrl.updateProduct, {
    params: { id: String(legacy._id) },
    body: { catalogAttributes: { seatingCapacity: 2 } },
  });
  say(`product-update-attrs-required status=${statusOf(updateMissingRequired)}`);
  const updateAttrs = await call(productCtrl.updateProduct, {
    params: { id: String(legacy._id) },
    body: { catalogAttributes: { frameMaterial: "walnut" } },
  });
  say(`product-update-attrs status=${statusOf(updateAttrs)}`);
  const updateInvalid = await call(productCtrl.updateProduct, {
    params: { id: String(legacy._id) },
    body: { catalogAttributes: { frameMaterial: "oak", seatingCapacity: "x" } },
  });
  const legacyAfter = await Product.findById(legacy._id).lean();
  say(`product-update-invalid status=${statusOf(updateInvalid)} stored=${legacyAfter.catalogAttributes.frameMaterial}/${legacyAfter.catalogAttributes.seatingCapacity}`);

  // Category-only change: cannot strand the product in a category
  // whose required attributes it lacks; with the value present
  // (written directly, legacy-style) the move succeeds.
  const mover = await Product.create({
    name: "Attr Mover Product",
    description: "Will change category.",
    category: plain._id,
    price: 60,
    stock: 1,
  });
  const moveBlocked = await call(productCtrl.updateProduct, {
    params: { id: String(mover._id) },
    body: { category: String(requiredChild._id) },
  });
  const moverAfterBlocked = await Product.findById(mover._id).lean();
  say(`product-move-blocked status=${statusOf(moveBlocked)} stayed=${String(moverAfterBlocked.category) === String(plain._id)}`);
  await Product.updateOne({ _id: mover._id }, { $set: { catalogAttributes: { frameMaterial: "oak" } } });
  const moveOk = await call(productCtrl.updateProduct, {
    params: { id: String(mover._id) },
    body: { category: String(requiredChild._id) },
  });
  say(`product-move-ok status=${statusOf(moveOk)}`);

  // ---- /catalog/schema serves the DB registries ----
  await call(catalogCtrl.createAttributeDefinition, {
    body: { key: "schemaProbe", label: "Schema Probe", type: "string" },
  });
  const schema = await call(catalogCtrl.getSchema, {});
  const schemaData = schema.res.body.data;
  say(`schema status=${schema.res.body.status} seating-type=${schemaData.definitions.seatingCapacity.type} has-probe=${"schemaProbe" in schemaData.definitions} has-soft-deleted=${"probeFinish" in schemaData.definitions}`);
  say(`schema sofa-includes=${schemaData.productTypes.sofa.includes("seatingCapacity")} rooms-has-living=${schemaData.rooms.includes("living-room")}`);

  // ---- Collection attribute-match now reads DB definitions ----
  // "firmness" is a Phase 2 definition that does NOT exist in the
  // static config: a 201 here proves the DB is the source.
  const firmProduct = await Product.create({
    name: "Attr Firm Product",
    description: "Firm mattress.",
    category: plain._id,
    price: 10,
    stock: 1,
    status: "active",
    catalogAttributes: { firmness: "firm" },
  });
  const collCreated = await call(catalogCtrl.createCollection, {
    body: {
      slug: "probe-firm",
      label: "Probe Firm",
      kind: "rule",
      rule: { type: "attribute-match", params: { key: "firmness", value: "firm" } },
    },
  });
  say(`collection-db-key-create status=${statusOf(collCreated)}`);
  const collResolved = await call(catalogCtrl.getCollection, { params: { slug: "probe-firm" }, query: {} });
  const collIds = collResolved.res.body.data.products.map((p) => String(p._id));
  say(`collection-db-key-resolve total=${collResolved.res.body.data.pagination.total} ok=${collIds.length === 1 && collIds[0] === String(firmProduct._id)}`);

  await mongoose.disconnect();
  await mongod.stop({ doCleanup: true, force: true });
}

main().then(
  () => process.exit(0),
  (err) => { console.log(`RESULT probe-error ${err && err.message}`); process.exit(2); }
);
