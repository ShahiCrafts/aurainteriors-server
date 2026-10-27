// Child-process probe for Phase 1 (catalog) category hierarchy:
// materialized `ancestors` + `depth` on Category, maintained by the
// create/update controllers from the `parent` links (the source of
// truth). Against a real mongodb-memory-server mongod (disk-backed
// dbPath under ~/workspace/aura-catalog/mms-data - /tmp is a 512 MB
// tmpfs here). Drives the REAL category controller + models; only
// req/res/next are mocked (HTTP + auth wiring for these routes is
// covered by tests/platform/slug-routes.test.js).
//
// Prints RESULT lines; tests/platform/catalog-ancestors.test.js
// asserts them. At the pre-Phase-1 commit the model has no
// ancestors/depth fields, so the RESULT values report the missing
// maintenance (ancestors=-1) and the test fails.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "cathier-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const uri = mongod.getUri("aura_catalog_hierarchy_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Category = require(path.join(REPO, "models/category.model"));
  const Product = require(path.join(REPO, "models/product.model"));
  const categoryCtrl = require(path.join(REPO, "controllers/category.controller"));
  // Registries must exist for the productType/roomSlugs write
  // validation exercised below.
  await require(path.join(REPO, "services/catalogBootstrap.service")).ensureCatalogRegistry();

  const say = (line) => console.log(`RESULT ${line}`);

  // catchAsync handlers do not return their promise; poll for the
  // response/error like tests/audit/helpers' until().
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

  const create = async (name, parent) => {
    const { res, error } = await call(categoryCtrl.createCategory, {
      body: { name, ...(parent ? { parent: String(parent) } : {}) },
    });
    if (error) throw new Error(`create ${name} failed: ${error.message}`);
    return res.body.data.category;
  };
  const update = (id, body) =>
    call(categoryCtrl.updateCategory, { params: { id: String(id) }, body });
  const remove = (id) => call(categoryCtrl.deleteCategory, { params: { id: String(id) } });
  const fresh = async (id) => Category.findById(id).lean();

  const fmtAnc = (doc) =>
    doc && Array.isArray(doc.ancestors) ? doc.ancestors.map(String).join(",") : "-1";

  // ---- Build a 5-deep chain A -> B -> C -> D -> E, plus X -> Y ----
  const A = await create("Hier A");
  const B = await create("Hier B", A._id);
  const C = await create("Hier C", B._id);
  const D = await create("Hier D", C._id);
  const E = await create("Hier E", D._id);
  const X = await create("Hier X");
  const Y = await create("Hier Y", X._id);

  const eDoc = await fresh(E._id);
  say(`chain root ancestors=${fmtAnc(await fresh(A._id))} depth=${(await fresh(A._id)).depth}`);
  say(`chain leaf ancestors=${fmtAnc(eDoc)} depth=${eDoc.depth}`);
  say(`chain leaf order=${fmtAnc(eDoc) === [A._id, B._id, C._id, D._id].map(String).join(",")}`);

  // ---- Reparent a LEAF (E) under Y ----
  await update(E._id, { parent: String(Y._id) });
  const e2 = await fresh(E._id);
  say(`reparent-leaf ancestors=${fmtAnc(e2)} depth=${e2.depth}`);

  // ---- Reparent a SUBTREE ROOT (C, carrying D) under X ----
  await update(C._id, { parent: String(X._id) });
  const c2 = await fresh(C._id);
  const d2 = await fresh(D._id);
  say(`reparent-subtree root ancestors=${fmtAnc(c2)} depth=${c2.depth}`);
  say(`reparent-subtree child ancestors=${fmtAnc(d2)} depth=${d2.depth}`);

  // ---- Move D to root ----
  await update(D._id, { parent: null });
  const d3 = await fresh(D._id);
  say(`move-to-root ancestors=${fmtAnc(d3)} depth=${d3.depth}`);

  // ---- Cycle attempts: self, own child, own grandchild (X tree: X -> Y -> E, X -> C) ----
  const selfCycle = await update(X._id, { parent: String(X._id) });
  say(`cycle-self status=${selfCycle.error ? selfCycle.error.statusCode : selfCycle.res.statusCode}`);
  const childCycle = await update(X._id, { parent: String(Y._id) });
  say(`cycle-child status=${childCycle.error ? childCycle.error.statusCode : childCycle.res.statusCode}`);
  const grandchildCycle = await update(X._id, { parent: String(E._id) });
  say(`cycle-grandchild status=${grandchildCycle.error ? grandchildCycle.error.statusCode : grandchildCycle.res.statusCode}`);
  // A rejected reparent must leave the stored hierarchy untouched.
  const xAfter = await fresh(X._id);
  say(`cycle-untouched parent=${xAfter.parent === null} ancestors=${fmtAnc(xAfter)}`);

  // ---- Delete guards ----
  const delParent = await remove(X._id); // X still has children Y and C
  say(`delete-with-children status=${delParent.error ? delParent.error.statusCode : delParent.res.statusCode}`);
  await Product.create({
    name: "Hier Guard Product",
    description: "Product that blocks deletion of its category.",
    category: B._id,
    price: 100,
    stock: 1,
  });
  const delWithProducts = await remove(B._id);
  say(`delete-with-products status=${delWithProducts.error ? delWithProducts.error.statusCode : delWithProducts.res.statusCode}`);
  const delLeaf = await remove(E._id); // leaf, no products
  say(`delete-leaf status=${delLeaf.error ? delLeaf.error.statusCode : delLeaf.res.statusCode}`);

  // ---- Tree productCount (Q9): subtree rollup of non-deleted products ----
  const T1 = await create("Tree Root");
  const T2 = await create("Tree Mid", T1._id);
  const T3 = await create("Tree Leaf", T2._id);
  const mkProduct = (name, category) =>
    Product.create({ name, description: `Description for ${name}.`, category, price: 50, stock: 1 });
  await mkProduct("Tree Product One", T3._id);
  await mkProduct("Tree Product Two", T3._id);
  await mkProduct("Tree Product Three", T2._id);
  const deleted = await mkProduct("Tree Product Deleted", T3._id);
  await Product.updateOne({ _id: deleted._id }, { $set: { deletedAt: new Date() } });
  const tree = await Category.getCategoryTree();
  const t1Node = tree.find((n) => String(n._id) === String(T1._id));
  const t2Node = t1Node && t1Node.subcategories.find((n) => String(n._id) === String(T2._id));
  const t3Node = t2Node && t2Node.subcategories.find((n) => String(n._id) === String(T3._id));
  say(`tree-counts root=${t1Node && t1Node.productCount} mid=${t2Node && t2Node.productCount} leaf=${t3Node && t3Node.productCount}`);

  // ---- Catalog fields on category writes (Phase 1) ----
  const createRaw = (body) => call(categoryCtrl.createCategory, { body });
  const typedCat = await createRaw({ name: "Typed Category", productType: "sofa", roomSlugs: ["living-room"] });
  const typedDoc = typedCat.res ? await fresh(typedCat.res.body.data.category._id) : null;
  say(`cat-fields status=${typedCat.error ? typedCat.error.statusCode : typedCat.res.statusCode} type=${typedDoc && typedDoc.productType} rooms=${typedDoc && typedDoc.roomSlugs.join(",")}`);
  const badType = await createRaw({ name: "Bad Type Category", productType: "not-a-type" });
  say(`cat-type-unknown status=${badType.error ? badType.error.statusCode : badType.res.statusCode}`);
  const badRoom = await createRaw({ name: "Bad Room Category", roomSlugs: ["not-a-room"] });
  say(`cat-rooms-unknown status=${badRoom.error ? badRoom.error.statusCode : badRoom.res.statusCode}`);
  const cleared = await update(typedDoc._id, { productType: null, roomSlugs: [] });
  const clearedDoc = await fresh(typedDoc._id);
  say(`cat-fields-clear status=${cleared.error ? cleared.error.statusCode : cleared.res.statusCode} type=${clearedDoc.productType || "unset"} rooms=${clearedDoc.roomSlugs.length}`);

  // ---- Sibling reorder (Phase 1) ----
  const R = await create("Reorder Root");
  const R1 = await create("Reorder One", R._id);
  const R2 = await create("Reorder Two", R._id);
  const R3 = await create("Reorder Three", R._id);
  const reordered = await call(categoryCtrl.reorderCategories, {
    body: { ids: [String(R3._id), String(R1._id), String(R2._id)] },
  });
  const orderNames = reordered.res
    ? reordered.res.body.data.categories.map((c) => c.name).join("|")
    : "error";
  say(`reorder status=${reordered.error ? reordered.error.statusCode : reordered.res.statusCode} order=${orderNames}`);
  const mixed = await call(categoryCtrl.reorderCategories, {
    body: { ids: [String(R1._id), String(T1._id)] }, // different parents
  });
  say(`reorder-mixed status=${mixed.error ? mixed.error.statusCode : mixed.res.statusCode}`);
  const unknownId = await call(categoryCtrl.reorderCategories, {
    body: { ids: [String(R1._id), "64b64c64b64c64b64c64b64c"] },
  });
  say(`reorder-unknown status=${unknownId.error ? unknownId.error.statusCode : unknownId.res.statusCode}`);

  await mongoose.disconnect();
  await mongod.stop({ doCleanup: true, force: true });
}

main().then(
  () => process.exit(0),
  (err) => { console.log(`RESULT probe-error ${err && err.message}`); process.exit(2); }
);
