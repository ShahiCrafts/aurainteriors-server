// Phase 9+10 (catalog) probe — the closing pass, exercised over
// REAL HTTP through the REAL app: createApp() from app.js (helmet /
// cors / csrfOrigin / express.json / C-14 nosqlSanitize / routers /
// error middleware), the app's own query parsing, real
// protect/restrictTo with locally signed JWTs, and real models over
// a disk-backed MMS mongod under ~/workspace/aura-catalog/mms-data.
//
// Sections: SR-P7-2 list payloads, the security battery (operator
// injection, F-910-1 attr-grammar reachability, authorization
// matrix, mutation guards, mass assignment / pollution), perf
// re-measurement on the Phase 5 fixture shape (5 handcrafted +
// 2,000 bulk = 2,005 products), and the category-tree N+1 count.
//
// Fail-tolerant like the other catalog probes: each section prints
// exactly one RESULT line; a throwing section reports error=... so
// the parent test yields line-by-line evidence.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

process.env.NODE_ENV = "test"; // error middleware: non-development shaping
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "<redacted>";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "https://frontend.example.test";
process.env.ADMIN_URL = process.env.ADMIN_URL || "https://admin.example.test";
process.env.BACKEND_URL = process.env.BACKEND_URL || "https://backend.example.test";
process.env.EMAIL_MODE = "outbox";
process.env.ESEWA_MERCHANT_ID = "DUMMYTEST";
process.env.ESEWA_SECRET_KEY = "dummy-secret-for-probe";
process.env.ESEWA_ENV = "sandbox";

const say = (line) => console.log(`RESULT ${line}`);
const clean = (v) => String(v).replace(/\s+/g, "_");

async function main() {
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "cat910-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const uri = mongod.getUri("aura_catalog_phase910_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);

  const section = async (name, fn) => {
    try { await fn(); } catch (err) { say(`${name} error=${clean(err && err.message)}`); }
  };

  try {
    const Category = require(path.join(REPO, "models/category.model"));
    const Product = require(path.join(REPO, "models/product.model"));
    const User = require(path.join(REPO, "models/user.model"));
    const ProductType = require(path.join(REPO, "models/productType.model"));
    const Room = require(path.join(REPO, "models/room.model"));
    const Collection = require(path.join(REPO, "models/collection.model"));
    const { ensureCatalogRegistry } = require(path.join(REPO, "services/catalogBootstrap.service"));

    await ensureCatalogRegistry();
    await Promise.all([Category.ensureIndexes(), Product.ensureIndexes(), User.ensureIndexes()]);

    // ---------------- fixture: categories, users, products ---------
    const living = await Category.create({ name: "P910 Living", slug: "p910-living" });
    const sofas = await Category.create({ name: "P910 Sofas", slug: "p910-sofas", parent: living._id, productType: "sofa" });
    const tables = await Category.create({ name: "P910 Tables", slug: "p910-tables", parent: living._id, productType: "table" });

    const admin = await User.create({ firstName: "Probe", lastName: "Admin", email: "p910-admin@example.test", password: "<redacted>", role: "admin" });
    const customer = await User.create({ firstName: "Probe", lastName: "Customer", email: "p910-customer@example.test", password: "<redacted>", role: "customer" });
    const jwt = require(path.join(REPO, "node_modules/jsonwebtoken"));
    const sign = (u) => jwt.sign({ id: u._id.toString() }, process.env.JWT_SECRET, {
      algorithm: "HS256", issuer: "aura-interiors", audience: "aura-interiors-api", expiresIn: "1h",
    });
    const adminToken = sign(admin);
    const customerToken = sign(customer);

    const mk = (doc) => Product.create({ description: "p910 probe", ...doc });
    // Variant product: two variants; RED purchasable (3 - 1 > 0),
    // BLUE not (0 stock). priceFrom = min enabled price = 450.
    const vp = await mk({
      name: "P910 Variant Sofa", category: sofas._id, price: 500, originalPrice: 700, stock: 3,
      style: "modern", isFeatured: true, isNewArrival: true,
      catalogAttributes: { seatingCapacity: 3, color: "#ff0000" },
      variantOptionKeys: ["color"], hasVariants: true, priceFrom: 450,
      catalogVariants: [
        { sku: "P910-RED", options: { color: "#ff0000" }, price: 450, compareAtPrice: 600, stock: 3, reservedStock: 1, enabled: true },
        { sku: "P910-BLUE", options: { color: "#0000ff" }, price: 550, stock: 0, reservedStock: 0, enabled: true },
      ],
    });
    // Legacy product, same category + style (feeds the related rail).
    const lp = await mk({
      name: "P910 Legacy Chair", category: sofas._id, price: 300, stock: 5, style: "modern",
      catalogAttributes: { seatingCapacity: 1 },
    });
    // Second variant product in the same category + style (related).
    await mk({
      name: "P910 Related Sofa", category: sofas._id, price: 520, stock: 2, style: "modern",
      variantOptionKeys: ["color"], hasVariants: true, priceFrom: 450,
      catalogVariants: [
        { sku: "P910-R1", options: { color: "#00ff00" }, price: 450, stock: 2, reservedStock: 0, enabled: true },
        { sku: "P910-R2", options: { color: "#000000" }, price: 500, stock: 0, reservedStock: 0, enabled: true },
      ],
    });
    // Two handcrafted tables (perf fixture shape: shape round/square).
    await mk({
      name: "P910 Table One", category: tables._id, price: 350, stock: 4, style: "modern",
      catalogAttributes: { shape: "round", frameMaterial: "Oak", extendable: true },
    });
    await mk({
      name: "P910 Table Two", category: tables._id, price: 450, stock: 4, style: "modern",
      catalogAttributes: { shape: "square", frameMaterial: "Oak", extendable: false },
    });

    // Inactive registry entries for the includeInactive matrix.
    await ProductType.create({ key: "p910-inactive-type", label: "P910 Inactive Type", active: false });
    await Room.create({ slug: "p910-inactive-room", label: "P910 Inactive Room", active: false });
    await Collection.create({ slug: "p910-inactive-collection", label: "P910 Inactive Collection", kind: "manual", active: false });

    // ---------------- boot the real app ----------------------------
    const { createApp } = require(path.join(REPO, "app.js"));
    const app = createApp();
    const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    async function req(method, p, { token, body, rawBody } = {}) {
      const headers = {};
      if (token) headers.authorization = `Bearer ${token}`;
      let payload;
      if (rawBody !== undefined) { headers["content-type"] = "application/json"; payload = rawBody; }
      else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
      const res = await fetch(`${baseUrl}${p}`, { method, headers, body: payload });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = undefined; }
      return { status: res.status, json };
    }

    const cardString = (p) => {
      if (!p) return "missing";
      const variants = Array.isArray(p.catalogVariants) ? p.catalogVariants : [];
      const purchasable = variants.some((v) => v.enabled !== false && (v.stock || 0) - (v.reservedStock || 0) > 0);
      return `hasVariants=${p.hasVariants} priceFrom=${p.priceFrom} variants=${variants.length} purchasable=${purchasable}`;
    };
    const findItem = (body, id) => (body && body.data && Array.isArray(body.data.products)
      ? body.data.products.find((p) => String(p._id) === String(id)) : undefined);

    // ---------------- SR-P7-2: list payloads -----------------------
    await section("p72-find", async () => {
      const r = await req("GET", "/api/v1/products?limit=50");
      say(`p72-find ${cardString(findItem(r.json, vp._id))}`);
      say(`p72-legacy ${cardString(findItem(r.json, lp._id))}`);
    });
    await section("p72-effective-sort", async () => {
      const r = await req("GET", "/api/v1/products?limit=50&sort=effectivePriceAsc");
      say(`p72-effective-sort ${cardString(findItem(r.json, vp._id))}`);
    });
    await section("p72-cursor", async () => {
      // Cursor mode is controller-level (Joi strips `cursor` over
      // HTTP — Phase 5 recorded quirk), so drive the handler with a
      // fabricated req in the facets-probe pattern.
      const productCtrl = require(path.join(REPO, "controllers/product.controller"));
      const res = { statusCode: undefined, body: undefined, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
      let err;
      productCtrl.getAllProducts({ query: { cursor: "", limit: "50" }, user: undefined, params: {}, body: {} }, res, (e) => { err = e; });
      const start = Date.now();
      while (res.body === undefined && err === undefined) {
        if (Date.now() - start > 20000) throw new Error("cursor handler did not settle");
        await new Promise((r2) => setTimeout(r2, 5));
      }
      if (err) throw err;
      say(`p72-cursor ${cardString(findItem(res.body, vp._id))}`);
    });
    await section("p72-featured", async () => {
      const r = await req("GET", "/api/v1/products/featured?limit=8");
      say(`p72-featured ${cardString(findItem(r.json, vp._id))}`);
    });
    await section("p72-new-arrivals", async () => {
      const r = await req("GET", "/api/v1/products/new-arrivals?limit=8");
      say(`p72-new-arrivals ${cardString(findItem(r.json, vp._id))}`);
    });
    await section("p72-related", async () => {
      const r = await req("GET", `/api/v1/products/${lp._id}/related?limit=4`);
      say(`p72-related ${cardString(findItem(r.json, vp._id))}`);
    });

    // ---------------- SR-P7-1 over HTTP ----------------------------
    await section("p71-http-code", async () => {
      const r = await req("POST", "/api/v1/cart", { token: customerToken, body: { productId: vp._id.toString(), quantity: 1 } });
      say(`p71-http-code ${r.json && r.json.code ? r.json.code : `missing status=${r.status} body=${clean(JSON.stringify(r.json || {}))}`}`);
    });

    // ---------------- injection battery ----------------------------
    const baseline = await req("GET", "/api/v1/products?limit=50");
    const baselineTotal = baseline.json.data.pagination.total;
    const strippedOr = async (name, p) => {
      const r = await req("GET", p);
      const total = r.json && r.json.data && r.json.data.pagination ? r.json.data.pagination.total : -1;
      say(`${name} ${r.status === 200 && total === baselineTotal ? "200-stripped" : `${r.status} total=${total} baseline=${baselineTotal}`}`);
    };
    await section("inj-attr-dollar-key", async () => {
      const r = await req("GET", "/api/v1/products?attr.color%5B%24gt%5D=x");
      say(`inj-attr-dollar-key ${r.status}`);
    });
    await section("inj-attr-where", () => strippedOr("inj-attr-where", "/api/v1/products?attr%5B%24where%5D=1"));
    await section("inj-attr-proto", async () => {
      const r = await req("GET", "/api/v1/products?attr.__proto__.x=1");
      say(`inj-attr-proto ${r.status}`);
    });
    await section("inj-attr-container-value", async () => {
      const r = await req("GET", "/api/v1/products?attr.color=red&attr.color=blue");
      say(`inj-attr-container-value ${r.status}`);
    });
    await section("inj-attr-deep-dots", async () => {
      const r = await req("GET", "/api/v1/products?attr.a.b.c=1");
      say(`inj-attr-deep-dots ${r.status}`);
    });
    await section("inj-sort-container", () => strippedOr("inj-sort-container", "/api/v1/products?sort%5B%24gt%5D=x"));
    await section("inj-categories-container", () => strippedOr("inj-categories-container", "/api/v1/products?categories%5B%24ne%5D=x"));
    await section("inj-search-container", () => strippedOr("inj-search-container", "/api/v1/products?search%5B%24regex%5D=.*"));
    await section("inj-collection-dollar", () => strippedOr("inj-collection-dollar", "/api/v1/products?collection%5B%24gt%5D=x"));
    await section("inj-collection-unknown", async () => {
      const r = await req("GET", "/api/v1/products?collection=no-such-collection");
      say(`inj-collection-unknown ${r.status}`);
    });
    // F-910-1: the legitimate grammar must WORK over HTTP, and the
    // sanitize carve-out must stay scoped to the products list.
    await section("inj-attr-filter-applies", async () => {
      const r = await req("GET", "/api/v1/products?attr.seatingCapacity=3");
      const total = r.json && r.json.data && r.json.data.pagination ? r.json.data.pagination.total : -1;
      say(`inj-attr-filter-applies ${r.status} total=${total}`);
    });
    await section("inj-dotted-other-route", async () => {
      const r = await req("GET", "/api/v1/categories?x.y=1");
      say(`inj-dotted-other-route ${r.status}`);
    });
    say(`inj-proto-clean ${{}.polluted === undefined && Object.prototype.polluted === undefined ? "clean" : "POLLUTED"}`);

    // ---------------- authorization matrix -------------------------
    const listHasInactive = (body, kind) => {
      const items = body && body.data ? (body.data[kind] || []) : [];
      return items.some((i) => i.active === false) ? "with-inactive" : "active-only";
    };
    await section("authz-types", async () => {
      const anonDef = await req("GET", "/api/v1/catalog/product-types");
      say(`authz-types-anon-default ${listHasInactive(anonDef.json, "productTypes")}`);
      const anon = await req("GET", "/api/v1/catalog/product-types?includeInactive=true");
      say(`authz-types-anon-inactive ${listHasInactive(anon.json, "productTypes")}`);
      const cust = await req("GET", "/api/v1/catalog/product-types?includeInactive=true", { token: customerToken });
      say(`authz-types-customer-inactive ${listHasInactive(cust.json, "productTypes")}`);
      const adm = await req("GET", "/api/v1/catalog/product-types?includeInactive=true", { token: adminToken });
      say(`authz-types-admin-inactive ${listHasInactive(adm.json, "productTypes")}`);
    });
    await section("authz-rooms-collections", async () => {
      const admR = await req("GET", "/api/v1/catalog/rooms?includeInactive=true", { token: adminToken });
      say(`authz-rooms-admin-inactive ${listHasInactive(admR.json, "rooms")}`);
      const anonR = await req("GET", "/api/v1/catalog/rooms?includeInactive=true");
      say(`authz-rooms-anon-inactive ${listHasInactive(anonR.json, "rooms")}`);
      const admC = await req("GET", "/api/v1/catalog/collections?includeInactive=true", { token: adminToken });
      say(`authz-collections-admin-inactive ${listHasInactive(admC.json, "collections")}`);
      const custC = await req("GET", "/api/v1/catalog/collections?includeInactive=true", { token: customerToken });
      say(`authz-collections-customer-inactive ${listHasInactive(custC.json, "collections")}`);
    });
    const writeMatrix = [
      ["post-types", "POST", "/api/v1/catalog/product-types", { key: "p910-matrix-type", label: "Matrix Type", attributeKeys: ["frameMaterial"] }],
      ["post-rooms", "POST", "/api/v1/catalog/rooms", { slug: "p910-matrix-room", label: "Matrix Room" }],
      ["post-collections", "POST", "/api/v1/catalog/collections", { slug: "p910-matrix-collection", label: "Matrix Collection", kind: "manual" }],
      ["post-attributes", "POST", "/api/v1/catalog/attributes", { key: "p910MatrixAttr", label: "Matrix Attr", type: "string" }],
      ["delete-type", "DELETE", "/api/v1/catalog/product-types/p910-inactive-type", undefined],
      ["post-variant", "POST", `/api/v1/products/${vp._id}/variants`, { sku: "P910-MATRIX-1", price: 100, stock: 1, options: { color: "#123456" } }],
      ["patch-variant", "PATCH", `/api/v1/products/${vp._id}/variants/${vp.catalogVariants[0]._id}`, { price: 999 }],
      ["post-category", "POST", "/api/v1/categories", { name: "P910 Matrix Category" }],
      ["reorder", "POST", "/api/v1/categories/reorder", { ids: [sofas._id.toString(), tables._id.toString()] }],
      ["put-assignments", "PUT", `/api/v1/categories/${sofas._id}/attributes`, { assignments: [] }],
    ];
    for (const [name, method, p, body] of writeMatrix) {
      await section(`authz-${name}`, async () => {
        const anon = await req(method, p, { body });
        say(`authz-${name}-anon ${anon.status}`);
        const cust = await req(method, p, { token: customerToken, body });
        say(`authz-${name}-customer ${cust.status}`);
      });
    }
    await section("authz-admin-success", async () => {
      const t = await req("POST", "/api/v1/catalog/product-types", { token: adminToken, body: { key: "p910-admin-type", label: "Admin Type", attributeKeys: ["frameMaterial"] } });
      say(`authz-post-types-admin ${t.status}`);
      const ro = await req("POST", "/api/v1/categories/reorder", { token: adminToken, body: { ids: [sofas._id.toString(), tables._id.toString()] } });
      say(`authz-reorder-admin ${ro.status}`);
    });

    // ---------------- mutation guards ------------------------------
    await section("guards", async () => {
      // Product slugs carry a uniqueness suffix from the model hook;
      // use the slug the API itself issued (as the storefront does).
      const patchSlug = await req("PATCH", `/api/v1/products/${vp.slug}`, { token: adminToken, body: { price: 1 } });
      say(`guard-patch-product-slug ${patchSlug.status}`);
      const postVarSlug = await req("POST", `/api/v1/products/${vp.slug}/variants`, { token: adminToken, body: { sku: "P910-G1", price: 1, options: { color: "#111111" } } });
      say(`guard-post-variant-slug ${postVarSlug.status}`);
      const delCatSlug = await req("DELETE", `/api/v1/categories/${sofas.slug}`, { token: adminToken });
      say(`guard-delete-category-slug ${delCatSlug.status}`);
      const getSlug = await req("GET", `/api/v1/products/${vp.slug}`);
      say(`guard-get-product-slug ${getSlug.status}`);
    });

    // ---------------- mass assignment / pollution ------------------
    await section("mass-type-proto", async () => {
      const raw = '{"key":"p910-proto-type","label":"Proto Type","attributeKeys":[],"__proto__":{"polluted":"yes"}}';
      await req("POST", "/api/v1/catalog/product-types", { token: adminToken, rawBody: raw });
      const polluted = {}.polluted !== undefined || Object.prototype.polluted !== undefined;
      say(`mass-type-proto ${polluted ? "POLLUTED" : "clean"}`);
    });
    await section("mass-type-extra-fields", async () => {
      const r = await req("POST", "/api/v1/catalog/product-types", {
        token: adminToken,
        body: { key: "p910-mass-type", label: "Mass Type", attributeKeys: [], isAdmin: true, role: "admin", hackerField: "x" },
      });
      const stored = await ProductType.findOne({ key: "p910-mass-type" }).lean();
      const stripped = r.status === 201 && stored && !("isAdmin" in stored) && !("hackerField" in stored) && stored.role === undefined;
      say(`mass-type-extra-fields ${stripped ? "stripped" : `LEAK create=${r.status} stored=${clean(JSON.stringify(stored || {}))}`}`);
    });
    await section("mass-variant", async () => {
      const r = await req("POST", `/api/v1/products/${vp._id}/variants`, {
        token: adminToken,
        body: { sku: "P910-MASS-1", price: 100, stock: 4, reservedStock: 99, options: { color: "#00ff00" }, bogusField: "x" },
      });
      const after = await Product.findById(vp._id).lean();
      const v = after.catalogVariants.find((x) => x.sku === "P910-MASS-1");
      say(`mass-variant-reserved ${v && v.reservedStock === 0 ? "not-settable" : `LEAK status=${r.status} reserved=${v && v.reservedStock}`}`);
      say(`mass-variant-extra-fields ${v && !("bogusField" in v) ? "stripped" : "LEAK"}`);
    });
    await section("mass-collection-rule-operator", async () => {
      const r = await req("POST", "/api/v1/catalog/collections", {
        token: adminToken,
        body: { slug: "p910-evil-collection", label: "Evil", kind: "rule", rule: { type: "attribute-match", params: { $where: "sleep(1000)" } } },
      });
      say(`mass-collection-rule-operator ${r.status === 400 ? "rejected-or-literal" : `status=${r.status}`}`);
    });
    await section("mass-assignments-proto-key", async () => {
      const r = await req("PUT", `/api/v1/categories/${sofas._id}/attributes`, {
        token: adminToken,
        body: { assignments: [{ attributeKey: "__proto__", active: true }] },
      });
      say(`mass-assignments-proto-key ${r.status}`);
    });
    await section("mass-product-catalogattrs-proto", async () => {
      const raw = '{"catalogAttributes":{"__proto__":{"polluted":"yes"}}}';
      const r = await req("PATCH", `/api/v1/products/${lp._id}`, { token: adminToken, rawBody: raw });
      const polluted = {}.polluted !== undefined || Object.prototype.polluted !== undefined;
      say(`mass-product-catalogattrs-proto ${polluted ? "POLLUTED" : r.status}`);
    });

    // ---------------- N+1 spot check -------------------------------
    await section("n1", async () => {
      // Count DATA reads only: lazy one-time createIndex auto-builds
      // fire on first model touch in a fresh process and are not
      // per-request work (verified by inspection in this phase).
      const READS = new Set(["find", "findOne", "aggregate", "countDocuments", "findOneAndUpdate", "findOneAndDelete", "updateOne", "updateMany", "insertOne", "insertMany"]);
      let ops = 0;
      mongoose.set("debug", (coll, method) => { if (READS.has(method)) ops += 1; });
      try {
        ops = 0;
        await Category.getCategoryTree();
        say(`n1-tree-queries ${ops}`);
        ops = 0;
        const nav = await req("GET", "/api/v1/catalog/navigation");
        if (nav.status !== 200) throw new Error(`navigation status ${nav.status}`);
        say(`n1-navigation-queries ${ops}`);
      } finally {
        mongoose.set("debug", false);
      }
    });

    // ---------------- perf re-measurement --------------------------
    await section("perf", async () => {
      const bulk = [];
      for (let i = 0; i < 2000; i += 1) {
        const withVariants = i % 10 === 0;
        bulk.push({
          name: `Bulk Table ${i}`,
          slug: `bulk9-table-${i}`,
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
                  { sku: `BULK9-${i}-R`, options: { color: "#ff0000" }, price: 90 + i, stock: 2, enabled: true },
                  { sku: `BULK9-${i}-B`, options: { color: "#0000ff" }, price: 95 + i, stock: 2, enabled: true },
                ],
              }
            : {}),
        });
      }
      await Product.insertMany(bulk);
      const count = await Product.countDocuments({});
      say(`perf-fixture products=${count}`);

      const timed = async (p) => {
        const started = Date.now();
        const r = await req("GET", p);
        const ms = Date.now() - started;
        if (r.status !== 200) throw new Error(`${p} -> ${r.status}`);
        return { ms, total: r.json.data.pagination.total };
      };
      const facetsQuery = "/api/v1/products?categories=p910-tables&facets=1&attr.shape=round";
      const cold = await timed(facetsQuery);
      say(`perf-facets-cold ms=${cold.ms} total=${cold.total}`);
      const warm = await timed(facetsQuery);
      say(`perf-facets-warm ms=${warm.ms} total=${warm.total}`);
      const listing = await timed("/api/v1/products?categories=p910-tables&attr.shape=round");
      say(`perf-listing ms=${listing.ms} total=${listing.total}`);
      const search = await timed("/api/v1/products?search=Bulk&limit=1");
      say(`perf-search ms=${search.ms} total=${search.total}`);
    });

    await new Promise((r) => server.close(r));
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
