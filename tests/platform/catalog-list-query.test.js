// AR-31(b) characterization: getAllProducts (product.controller) vs
// getCategoryProducts (category.controller) list filtering/pagination.
//
// Both endpoints are driven through a fixture matrix with recording model
// stubs; the EXACT filter object, sort, skip and limit each endpoint hands
// to Mongoose are pinned per endpoint. The two endpoints are NOT asserted
// to be identical to each other — their known pre-existing divergences
// (documented in the AR-31 report) are pinned as-is:
//   D1. category price/rating: `if (minPrice || maxPrice)` truthiness —
//       a 0 bound is treated as absent; getAllProducts uses
//       `!== undefined`, so a 0 bound IS applied there.
//   D2. category colors/materials: split(",") with NO trim, cap 20 items;
//       getAllProducts uses asStringList (trim, per-item 100 chars, cap 50).
//   D3. category search cap 100 chars; getAllProducts 200.
//   D4. getAllProducts applies .lean(); getCategoryProducts does not
//       (not observable through these stubs — pinned by code inspection).
//   D5. status handling: getAllProducts has role-aware status logic and
//       style/featured/newArrivals/inStock filters; getCategoryProducts
//       always pins status to [active, out_of_stock] and has none of the
//       extra filters. Response shape: category adds data.category.
//   D6. (Phase 5, catalog) price semantics: getAllProducts replaces the
//       shared builder's Product.price fragment with effective-price
//       branches (variant products match through any enabled variant's
//       price); getCategoryProducts keeps the legacy fragment. The
//       'price' key therefore no longer agrees across endpoints and is
//       pinned per endpoint below instead of in the shared loop.
// This file must pass byte-identically BEFORE and AFTER the AR-31(b)
// extraction of the shared list-filter builder.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, mockRes, mockNext, until } = require("../audit/helpers");

// Recording query stub: captures sort/skip/limit/lean and resolves to result.
function recordingQuery(result, record) {
  const q = {
    populate() {
      return q;
    },
    select() {
      return q;
    },
    session() {
      return q;
    },
    sort(s) {
      record.sort = s;
      return q;
    },
    skip(n) {
      record.skip = n;
      return q;
    },
    limit(n) {
      record.limit = n;
      return q;
    },
    lean() {
      record.lean = true;
      return q;
    },
    then(onF, onR) {
      return Promise.resolve(result).then(onF, onR);
    },
    catch(onR) {
      return Promise.resolve(result).catch(onR);
    },
  };
  return q;
}

const calls = { productFind: [], productCount: [], categoryFind: [] };
let findRecord = {};

stubModule("models/product.model", {
  find: (filter) => {
    calls.productFind.push(filter);
    return recordingQuery([], findRecord);
  },
  countDocuments: async (filter) => {
    calls.productCount.push(filter);
    return 0;
  },
  findOne: async () => null,
});
stubModule("models/category.model", {
  find: (filter) => {
    calls.categoryFind.push(filter);
    return recordingQuery([{ _id: "cat-id-1" }], {});
  },
  findOne: () =>
    recordingQuery({ _id: "cat-id-1", name: "Chairs", slug: "chairs" }, {}),
  // Phase 0.5 (Cluster A): faithful port of the model's getDescendantIds
  // BFS (models/category.model.js:93) over this harness's fixture
  // universe (one root category, no children), read through the same
  // find({}, '_id parent').lean() access pattern.
  getDescendantIds: async function (id) {
    const categories = await this.find({}, "_id parent").lean();
    const children = new Map();
    for (const category of categories) {
      const key = String(category.parent || "");
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(String(category._id));
    }
    const seen = new Set();
    const queue = [String(id)];
    while (queue.length) {
      const current = queue.shift();
      if (seen.has(current)) continue;
      seen.add(current);
      queue.push(...(children.get(current) || []));
    }
    return [...seen];
  },
});
stubModule("middleware/upload.middleware", {
  deleteFile: async () => {},
  deleteFiles: async () => {},
});

const productCtrl = require("../../controllers/product.controller");
const categoryCtrl = require("../../controllers/category.controller");

// Normalize a filter for deep comparison: RegExp -> its source+flags string.
function normalize(value) {
  if (value instanceof RegExp) return `RegExp:${value.source}:${value.flags}`;
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, normalize(value[k])]),
    );
  }
  return value;
}

async function runProducts(query, user) {
  calls.productFind = [];
  calls.productCount = [];
  calls.categoryFind = [];
  findRecord = {};
  // PERF-B-01: anonymous list responses are TTL-cached in-process;
  // isolate each scenario from the cache the way a fresh deploy
  // would be (these tests pin filter construction, not caching).
  require("../../utils/catalogCache").invalidateCatalogCache();
  const res = mockRes();
  const next = mockNext();
  productCtrl.getAllProducts({ query, user }, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getAllProducts errored: ${next.error && next.error.message}`,
  );
  return { res, filter: calls.productFind[0], record: findRecord };
}

async function runCategory(query) {
  calls.productFind = [];
  calls.productCount = [];
  findRecord = {};
  const res = mockRes();
  const next = mockNext();
  categoryCtrl.getCategoryProducts(
    { params: { id: "chairs" }, query },
    res,
    next,
  );
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `getCategoryProducts errored: ${next.error && next.error.message}`,
  );
  return { res, filter: calls.productFind[0], record: findRecord };
}

// ---------- Shared-behavior fixtures: both endpoints ----------
const SHARED_CASES = [
  { name: "no filters", query: {} },
  { name: "price range", query: { minPrice: "100", maxPrice: "500" } },
  { name: "colors", query: { colors: "red,blue" } },
  { name: "materials", query: { materials: "oak,teak" } },
  { name: "minRating", query: { minRating: "4" } },
  { name: "search", query: { search: "sofa" } },
  { name: "pagination", query: { page: "3", limit: "10" } },
  { name: "sort price asc", query: { sort: "price" } },
];

for (const c of SHARED_CASES) {
  test(`AR-31b shared case '${c.name}': shared filter keys agree across endpoints`, async () => {
    const p = await runProducts(c.query, undefined);
    const cat = await runCategory(c.query);
    const pn = normalize(p.filter);
    const cn = normalize(cat.filter);
    // Keys the shared builder owns must be identical (modulo the pinned
    // per-endpoint base keys: category adds `category`, and the status
    // key is endpoint-owned). 'price' left this loop in Phase 5 (D6):
    // getAllProducts post-processes the builder's fragment into its
    // effective-price clause, so the fragment itself is pinned per
    // endpoint in the D1/D6 test below.
    for (const key of ["colors", "materials", "rating.average", "$text"]) {
      assert.deepEqual(
        cn[key],
        pn[key],
        `shared key '${key}' diverged in case '${c.name}'`,
      );
    }
    assert.deepEqual(
      { skip: cat.record.skip, limit: cat.record.limit, sort: cat.record.sort },
      { skip: p.record.skip, limit: p.record.limit, sort: p.record.sort },
      `pagination/sort diverged in case '${c.name}'`,
    );
  });
}

test("AR-31b base filters are pinned per endpoint", async () => {
  const p = await runProducts({}, undefined);
  assert.deepEqual(normalize(p.filter), {
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  });
  assert.equal(p.record.lean, true); // getAllProducts leans (AR-47)
  const cat = await runCategory({});
  assert.deepEqual(normalize(cat.filter), {
    // Phase 0.5 (Cluster A): the owner's subtree-inclusive
    // getCategoryProducts filters category: { $in: getDescendantIds(id) }
    // (controllers/category.controller.js) where the delivered controller
    // used the scalar id. Pinned at the same whole-filter deepEqual
    // strictness; for this single-category fixture the descendant set
    // is exactly ["cat-id-1"].
    category: { $in: ["cat-id-1"] },
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  });
  assert.equal(cat.record.lean, undefined); // getCategoryProducts does NOT lean (D4)
  // Response shapes pinned.
  assert.deepEqual(Object.keys(p.res.body.data).sort(), [
    "pagination",
    "products",
  ]);
  assert.deepEqual(Object.keys(cat.res.body.data).sort(), [
    "category",
    "pagination",
    "products",
  ]);
  assert.deepEqual(cat.res.body.data.category, {
    id: "cat-id-1",
    name: "Chairs",
    slug: "chairs",
  });
});

// ---------- Pinned divergences (must NOT be silently unified) ----------
test("AR-31b D1 pinned: minPrice=0 / minRating=0 applied by getAllProducts, skipped by getCategoryProducts", async () => {
  const p = await runProducts({ minPrice: "0", minRating: "0" }, undefined);
  // Phase 5 (D6): the 0 bound is still applied by getAllProducts
  // (D1's point) but no longer lands on filter.price — it now sits
  // inside the effective-price clause's product branch (non-variant
  // products on Product.price, variant products via variant prices).
  assert.equal(normalize(p.filter).price, undefined);
  assert.deepEqual(normalize(p.filter).$and[0].$or[0], {
    hasVariants: { $ne: true },
    price: { $gte: 0 },
  });
  assert.deepEqual(normalize(p.filter)["rating.average"], { $gte: 0 });
  const cat = await runCategory({ minPrice: "0", minRating: "0" });
  assert.equal(normalize(cat.filter).price, undefined);
  assert.equal(normalize(cat.filter)["rating.average"], undefined);
  // …but a non-zero bound behaves identically.
  const cat2 = await runCategory({ minPrice: "0", maxPrice: "250" });
  assert.deepEqual(normalize(cat2.filter).price, { $lte: 250 });
});

test("AR-31b D2 pinned: whitespace in colors — getAllProducts trims, getCategoryProducts does not", async () => {
  const p = await runProducts({ colors: "red, blue" }, undefined);
  assert.deepEqual(normalize(p.filter).colors, {
    $in: ["RegExp:^red$:i", "RegExp:^blue$:i"],
  });
  const cat = await runCategory({ colors: "red, blue" });
  assert.deepEqual(normalize(cat.filter).colors, {
    $in: ["RegExp:^red$:i", "RegExp:^ blue$:i"],
  });
});

test("AR-31b D2 pinned: colors item cap — getAllProducts 50, getCategoryProducts 20", async () => {
  const many = Array.from({ length: 30 }, (_, i) => `c${i}`).join(",");
  const p = await runProducts({ colors: many }, undefined);
  assert.equal(p.filter.colors.$in.length, 30);
  const cat = await runCategory({ colors: many });
  assert.equal(cat.filter.colors.$in.length, 20);
});

test("AR-31b product-only filters stay product-only", async () => {
  const p = await runProducts(
    {
      style: "modern",
      featured: "true",
      newArrivals: "true",
      category: "cat-id-9",
    },
    undefined,
  );
  const pn = normalize(p.filter);
  assert.deepEqual(pn.style, { $in: ["modern"] });
  assert.equal(pn.isFeatured, true);
  assert.equal(pn.isNewArrival, true);
  assert.deepEqual(pn.category, { $in: ["cat-id-9"] });
  const pInStock = await runProducts({ inStock: "true" }, undefined);
  assert.deepEqual(normalize(pInStock.filter).stock, { $gt: 0 });
  assert.equal(normalize(pInStock.filter).status, "active"); // inStock REPLACES the status $in
  // Category endpoint ignores these params entirely.
  const cat = await runCategory({
    style: "modern",
    featured: "true",
    inStock: "true",
  });
  const cn = normalize(cat.filter);
  assert.equal(cn.style, undefined);
  assert.equal(cn.isFeatured, undefined);
  assert.equal(cn.stock, undefined);
  assert.deepEqual(cn.status, { $in: ["active", "out_of_stock"] });
});

test("AR-31b admin status handling stays in getAllProducts only", async () => {
  const admin = await runProducts({ status: "draft" }, { role: "admin" });
  assert.deepEqual(normalize(admin.filter).status, { $in: ["draft"] });
  const customer = await runProducts({ status: "draft" }, { role: "customer" });
  assert.deepEqual(normalize(customer.filter).status, { $in: [] }); // requested non-visible -> empty $in
});

test("AR-31b categories-by-slug resolution stays in getAllProducts", async () => {
  const p = await runProducts({ categories: "chairs" }, undefined);
  assert.deepEqual(normalize(p.filter).category, { $in: ["cat-id-1"] });
  // Phase 0.5: descendant expansion adds a second Category.find — the
  // one inside the real getDescendantIds (find({}, '_id parent')) that
  // runs after the controller's slug-resolution find. Exact count
  // still pinned, now at the new correct value.
  assert.equal(calls.categoryFind.length, 2);
});
