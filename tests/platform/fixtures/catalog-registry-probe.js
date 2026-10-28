// Child-process probe for Phase 1 (catalog) DB-backed registries:
// product types (this section), rooms and collections (added with
// their models). Against a real mongodb-memory-server mongod
// (disk-backed dbPath under ~/workspace/aura-catalog/mms-data).
// Drives the REAL bootstrap service + catalog controllers + models;
// only req/res/next are mocked (route + auth wiring for admin
// endpoints follows the pattern proven by slug-routes).
//
// Prints RESULT lines; tests/platform/catalog-registry.test.js
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
  const dbPath = fs.mkdtempSync(path.join(base, "catreg-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri("aura_catalog_registry_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Category = require(path.join(REPO, "models/category.model"));
  const bootstrap = require(
    path.join(REPO, "services/catalogBootstrap.service"),
  );
  const catalogCtrl = require(
    path.join(REPO, "controllers/catalog.controller"),
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

  // ---- Bootstrap: idempotent, fills missing keys only ----
  const first = await bootstrap.ensureCatalogRegistry();
  say(
    `bootstrap-first types inserted=${first.productTypes.inserted} total=${first.productTypes.total}`,
  );
  say(
    `bootstrap-first rooms inserted=${first.rooms.inserted} total=${first.rooms.total}`,
  );
  say(
    `bootstrap-first collections inserted=${first.collections.inserted} total=${first.collections.total}`,
  );
  const second = await bootstrap.ensureCatalogRegistry();
  say(
    `bootstrap-second types inserted=${second.productTypes.inserted} total=${second.productTypes.total}`,
  );
  say(
    `bootstrap-second rooms inserted=${second.rooms.inserted} total=${second.rooms.total}`,
  );
  say(
    `bootstrap-second collections inserted=${second.collections.inserted} total=${second.collections.total}`,
  );

  // ---- Product types: public reads ----
  const list = await call(catalogCtrl.listProductTypes, {});
  say(
    `types-list status=${statusOf(list)} count=${list.res.body.data.productTypes.length}`,
  );
  const sofa = await call(catalogCtrl.getProductType, {
    params: { key: "sofa" },
  });
  say(
    `type-get status=${statusOf(sofa)} department=${sofa.res.body.data.productType.categoryKey} attrs=${sofa.res.body.data.productType.attributeKeys.length}`,
  );
  const missing = await call(catalogCtrl.getProductType, {
    params: { key: "no-such-type" },
  });
  say(`type-get-missing status=${statusOf(missing)}`);

  // ---- Product types: admin writes ----
  const created = await call(catalogCtrl.createProductType, {
    body: { key: "pouf", label: "Pouf" },
  });
  say(`type-create status=${statusOf(created)}`);
  const duplicate = await call(catalogCtrl.createProductType, {
    body: { key: "pouf", label: "Pouf Again" },
  });
  say(`type-create-duplicate status=${statusOf(duplicate)}`);
  const updated = await call(catalogCtrl.updateProductType, {
    params: { key: "pouf" },
    body: { label: "Pouf Deluxe" },
  });
  const poufAfter = await call(catalogCtrl.getProductType, {
    params: { key: "pouf" },
  });
  say(
    `type-update status=${statusOf(updated)} label-ok=${poufAfter.res.body.data.productType.label === "Pouf Deluxe"}`,
  );
  const keyChange = await call(catalogCtrl.updateProductType, {
    params: { key: "pouf" },
    body: { key: "beanbag" },
  });
  say(`type-key-change status=${statusOf(keyChange)}`);
  // Delete guard: a type referenced by a category cannot be deleted.
  await Category.create({
    name: "Registry Guard Category",
    productType: "sofa",
  });
  const delInUse = await call(catalogCtrl.deleteProductType, {
    params: { key: "sofa" },
  });
  say(`type-delete-in-use status=${statusOf(delInUse)}`);
  const delFree = await call(catalogCtrl.deleteProductType, {
    params: { key: "pouf" },
  });
  say(`type-delete status=${statusOf(delFree)}`);

  // ---- Rooms: registry + read paths ----
  const Product = require(path.join(REPO, "models/product.model"));
  const productCtrl = require(
    path.join(REPO, "controllers/product.controller"),
  );

  const roomsList = await call(catalogCtrl.listRooms, {});
  say(
    `rooms-list status=${statusOf(roomsList)} count=${roomsList.res.body.data.rooms.length}`,
  );

  const roomCat = await Category.create({ name: "Registry Room Category" });
  const mkProduct = (name, roomSlugs, status = "active") =>
    Product.create({
      name,
      description: `Description for ${name}.`,
      category: roomCat._id,
      price: 100,
      stock: 1,
      status,
      roomSlugs,
    });
  const dual = await mkProduct("Room Dual Product", [
    "living-room",
    "small-spaces",
  ]);
  await mkProduct("Room Second Living Product", ["living-room"]);
  await mkProduct("Room Inactive Product", ["living-room"], "inactive");
  const bedroomProduct = await mkProduct("Room Bedroom Product", ["bedroom"]);

  const living = await call(catalogCtrl.getRoom, {
    params: { slug: "living-room" },
    query: {},
  });
  say(
    `room-products status=${statusOf(living)} total=${living.res.body.data.pagination.total} count=${living.res.body.data.products.length}`,
  );
  const livingPage2 = await call(catalogCtrl.getRoom, {
    params: { slug: "living-room" },
    query: { limit: "1", page: "2" },
  });
  say(
    `room-products-page total=${livingPage2.res.body.data.pagination.total} pages=${livingPage2.res.body.data.pagination.pages} count=${livingPage2.res.body.data.products.length}`,
  );
  const small = await call(catalogCtrl.getRoom, {
    params: { slug: "small-spaces" },
    query: {},
  });
  const smallIds = small.res.body.data.products.map((p) => String(p._id));
  say(
    `room-dual total=${small.res.body.data.pagination.total} same=${smallIds.length === 1 && smallIds[0] === String(dual._id)}`,
  );
  const missingRoom = await call(catalogCtrl.getRoom, {
    params: { slug: "no-such-room" },
    query: {},
  });
  say(`room-missing status=${statusOf(missingRoom)}`);

  // ---- Product write path: roomSlugs validated against the registry ----
  const createdWithRooms = await call(productCtrl.createProduct, {
    body: {
      name: "Controller Room Product",
      description: "Created through the product controller with rooms.",
      category: String(roomCat._id),
      price: 120,
      stock: 2,
      roomSlugs: ["living-room"],
    },
  });
  say(`product-create-rooms status=${statusOf(createdWithRooms)}`);
  const createdUnknownRoom = await call(productCtrl.createProduct, {
    body: {
      name: "Controller Unknown Room Product",
      description: "Must be rejected: unregistered room slug.",
      category: String(roomCat._id),
      price: 120,
      stock: 2,
      roomSlugs: ["no-such-room"],
    },
  });
  say(`product-create-rooms-unknown status=${statusOf(createdUnknownRoom)}`);
  const clearTarget = await call(productCtrl.createProduct, {
    body: {
      name: "Controller Clear Rooms Product",
      description: "Room assignment cleared by update below.",
      category: String(roomCat._id),
      price: 80,
      stock: 1,
      roomSlugs: ["bedroom"],
    },
  });
  const clearId = clearTarget.res.body.data.product._id;
  const updateUnknown = await call(productCtrl.updateProduct, {
    params: { id: String(clearId) },
    body: { roomSlugs: ["no-such-room"] },
  });
  say(`product-update-rooms-unknown status=${statusOf(updateUnknown)}`);
  const cleared = await call(productCtrl.updateProduct, {
    params: { id: String(clearId) },
    body: { roomSlugs: [] },
  });
  const clearDoc = await Product.findById(clearId).lean();
  say(
    `product-update-rooms-clear status=${statusOf(cleared)} cleared=${clearDoc.roomSlugs.length === 0}`,
  );

  // ---- GET /products?room= list dimension ----
  const roomFilter = await call(productCtrl.getAllProducts, {
    query: { room: "living-room" },
  });
  const roomFilterIds = roomFilter.res.body.data.products.map((p) =>
    String(p._id),
  );
  say(
    `products-room-filter total=${roomFilter.res.body.data.pagination.total} has-bedroom=${roomFilterIds.includes(String(bedroomProduct._id))}`,
  );

  // ---- Rooms: admin writes ----
  const roomCreated = await call(catalogCtrl.createRoom, {
    body: { slug: "gaming-room", label: "Gaming Room" },
  });
  say(`room-create status=${statusOf(roomCreated)}`);
  const roomDuplicate = await call(catalogCtrl.createRoom, {
    body: { slug: "gaming-room", label: "Gaming Room Two" },
  });
  say(`room-create-duplicate status=${statusOf(roomDuplicate)}`);
  const roomSlugChange = await call(catalogCtrl.updateRoom, {
    params: { slug: "gaming-room" },
    body: { slug: "play-room" },
  });
  say(`room-slug-change status=${statusOf(roomSlugChange)}`);
  const roomDelInUse = await call(catalogCtrl.deleteRoom, {
    params: { slug: "living-room" },
  });
  say(`room-delete-in-use status=${statusOf(roomDelInUse)}`);
  const roomDeleted = await call(catalogCtrl.deleteRoom, {
    params: { slug: "gaming-room" },
  });
  say(`room-delete status=${statusOf(roomDeleted)}`);

  // ---- Collections ----
  const Order = require(path.join(REPO, "models/order.model"));
  const mkFull = (doc) =>
    Product.create({
      description: `Description for ${doc.name}.`,
      category: roomCat._id,
      stock: 1,
      status: "active",
      ...doc,
    });

  const collList = await call(catalogCtrl.listCollections, {});
  say(
    `collections-list status=${statusOf(collList)} count=${collList.res.body.data.collections.length}`,
  );

  // Manual membership: curated order preserved, unpublished dropped.
  const mA = await mkFull({ name: "Collection Manual A", price: 10 });
  const mB = await mkFull({ name: "Collection Manual B", price: 10 });
  const mHidden = await mkFull({
    name: "Collection Manual Hidden",
    price: 10,
    status: "inactive",
  });
  const manualCreated = await call(catalogCtrl.createCollection, {
    body: {
      slug: "probe-manual",
      label: "Probe Manual",
      kind: "manual",
      productIds: [String(mB._id), String(mHidden._id), String(mA._id)],
    },
  });
  say(`collection-manual-create status=${statusOf(manualCreated)}`);
  const manual = await call(catalogCtrl.getCollection, {
    params: { slug: "probe-manual" },
    query: {},
  });
  const manualIds = manual.res.body.data.products.map((p) => String(p._id));
  say(
    `collection-manual total=${manual.res.body.data.pagination.total} order=${manualIds.join(",") === [mB._id, mA._id].map(String).join(",")}`,
  );
  const manualUnknown = await call(catalogCtrl.createCollection, {
    body: {
      slug: "probe-manual-bad",
      label: "Probe Manual Bad",
      kind: "manual",
      productIds: ["64b64c64b64c64b64c64b64c"],
    },
  });
  say(`collection-manual-unknown status=${statusOf(manualUnknown)}`);
  const manualEmpty = await call(catalogCtrl.getCollection, {
    params: { slug: "living-room-collection" },
    query: {},
  });
  say(
    `collection-manual-empty total=${manualEmpty.res.body.data.pagination.total}`,
  );

  // On sale: originalPrice > price only (equal and absent excluded).
  const saleP = await mkFull({
    name: "Collection Sale Product",
    price: 80,
    originalPrice: 100,
  });
  await mkFull({
    name: "Collection Equal Price Product",
    price: 100,
    originalPrice: 100,
  });
  const onSale = await call(catalogCtrl.getCollection, {
    params: { slug: "on-sale" },
    query: {},
  });
  const onSaleIds = onSale.res.body.data.products.map((p) => String(p._id));
  say(
    `collection-onsale total=${onSale.res.body.data.pagination.total} ok=${onSaleIds.length === 1 && onSaleIds[0] === String(saleP._id)}`,
  );

  // Featured: the existing flag.
  const featuredP = await mkFull({
    name: "Collection Featured Product",
    price: 10,
    isFeatured: true,
  });
  const featured = await call(catalogCtrl.getCollection, {
    params: { slug: "featured-picks" },
    query: {},
  });
  const featuredIds = featured.res.body.data.products.map((p) => String(p._id));
  say(
    `collection-featured total=${featured.res.body.data.pagination.total} ok=${featuredIds.length === 1 && featuredIds[0] === String(featuredP._id)}`,
  );

  // New arrivals: createdAt window (seeded rule = 30 days).
  const oldP = await mkFull({ name: "Collection Old Product", price: 10 });
  // Backdate past the 30-day window. Mongoose protects createdAt on
  // model updates, so the fixture writes through the raw driver —
  // this simulates a product that genuinely is 60 days old.
  await Product.collection.updateOne(
    { _id: oldP._id },
    { $set: { createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
  );
  const arrivals = await call(catalogCtrl.getCollection, {
    params: { slug: "new-arrivals" },
    query: { limit: "100" },
  });
  const arrivalIds = arrivals.res.body.data.products.map((p) => String(p._id));
  say(
    `collection-newarrivals has-old=${arrivalIds.includes(String(oldP._id))} has-fresh=${arrivalIds.includes(String(featuredP._id))}`,
  );

  // Best sellers: real order quantities, cancelled orders excluded.
  const sellerA = await mkFull({ name: "Collection Seller A", price: 10 });
  const sellerB = await mkFull({ name: "Collection Seller B", price: 10 });
  const sellerC = await mkFull({ name: "Collection Seller C", price: 10 });
  const mkOrder = (items, orderStatus) =>
    Order.create({
      isGuestOrder: true,
      guestInfo: { email: "buyer@example.invalid" },
      items,
      shippingAddress: {
        fullName: "Probe Buyer",
        phone: "9800000000",
        addressLine1: "Line 1",
        city: "Kathmandu",
        postalCode: "44600",
      },
      subtotal: 100,
      total: 100,
      paymentMethod: "cod",
      orderStatus,
    });
  await mkOrder(
    [
      { product: sellerA._id, name: sellerA.name, price: 10, quantity: 5 },
      { product: sellerB._id, name: sellerB.name, price: 10, quantity: 3 },
    ],
    "confirmed",
  );
  await mkOrder(
    [{ product: sellerC._id, name: sellerC.name, price: 10, quantity: 100 }],
    "cancelled",
  );
  const sellers = await call(catalogCtrl.getCollection, {
    params: { slug: "best-sellers" },
    query: {},
  });
  const sellerIds = sellers.res.body.data.products.map((p) => String(p._id));
  say(
    `collection-bestsellers total=${sellers.res.body.data.pagination.total} order=${sellerIds.join(",") === [sellerA._id, sellerB._id].map(String).join(",")} has-cancelled=${sellerIds.includes(String(sellerC._id))}`,
  );

  // Attribute match: catalogAttributes equality on a known key.
  const oakP = await mkFull({
    name: "Collection Oak Product",
    price: 10,
    catalogAttributes: { frameMaterial: "oak" },
  });
  await mkFull({
    name: "Collection Walnut Product",
    price: 10,
    catalogAttributes: { frameMaterial: "walnut" },
  });
  const attrCreated = await call(catalogCtrl.createCollection, {
    body: {
      slug: "probe-oak",
      label: "Probe Oak",
      kind: "rule",
      rule: {
        type: "attribute-match",
        params: { key: "frameMaterial", value: "oak" },
      },
    },
  });
  say(`collection-attrmatch-create status=${statusOf(attrCreated)}`);
  const attrMatch = await call(catalogCtrl.getCollection, {
    params: { slug: "probe-oak" },
    query: {},
  });
  const attrIds = attrMatch.res.body.data.products.map((p) => String(p._id));
  say(
    `collection-attrmatch total=${attrMatch.res.body.data.pagination.total} ok=${attrIds.length === 1 && attrIds[0] === String(oakP._id)}`,
  );
  const attrBadKey = await call(catalogCtrl.createCollection, {
    body: {
      slug: "probe-bad-attr",
      label: "Probe Bad Attr",
      kind: "rule",
      rule: { type: "attribute-match", params: { key: "notAKey", value: "x" } },
    },
  });
  say(`collection-attrmatch-badkey status=${statusOf(attrBadKey)}`);

  // Admin guards: duplicate slug, slug immutability, delete.
  const collDuplicate = await call(catalogCtrl.createCollection, {
    body: {
      slug: "probe-manual",
      label: "Probe Manual Again",
      kind: "manual",
      productIds: [],
    },
  });
  say(`collection-create-duplicate status=${statusOf(collDuplicate)}`);
  const collSlugChange = await call(catalogCtrl.updateCollection, {
    params: { slug: "probe-manual" },
    body: { slug: "renamed-manual" },
  });
  say(`collection-slug-change status=${statusOf(collSlugChange)}`);
  const collDeleted = await call(catalogCtrl.deleteCollection, {
    params: { slug: "probe-manual" },
  });
  say(`collection-delete status=${statusOf(collDeleted)}`);

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
