// Phase 4 (catalog) probe — variant-aware commerce end to end:
// cart lines, reservations, COD/eSewa deduction, capture replay,
// cancellation restore and order snapshots, against a real
// replica-set mongod (MMS, disk-backed dbPath under
// ~/workspace/aura-catalog/mms-data; checkout/capture need
// transactions, so a replica set is required).
//
// The REAL cart/order controllers + commerce services are driven
// with fabricated req/res objects (the handler pattern of the
// AR-25 probe) against the real DB. eSewa config is dummy env —
// capture is invoked at the service layer, no provider call.
// Fail-tolerant by design: every section prints exactly one RESULT
// line; a section that throws reports error=<message> so the
// parent commit yields fail-before evidence line by line.
const path = require("node:path");
const fs = require("node:fs");
const REPO = path.resolve(__dirname, "../../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

process.env.FRONTEND_URL =
  process.env.FRONTEND_URL || "https://frontend.example.test";
process.env.BACKEND_URL =
  process.env.BACKEND_URL || "https://backend.example.test";
process.env.ESEWA_MERCHANT_ID = "DUMMYTEST";
process.env.ESEWA_SECRET_KEY = "dummy-secret-for-probe";
process.env.ESEWA_ENV = "sandbox";
process.env.EMAIL_MODE = "outbox"; // no SMTP attempts from COD finalize

function mockCall() {
  const res = {
    statusCode: undefined,
    body: undefined,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
  const next = (err) => {
    next.error = err;
  };
  next.error = undefined;
  return { res, next };
}

async function untilSettled(res, next, timeoutMs = 30000) {
  const start = Date.now();
  while (res.statusCode === undefined && next.error === undefined) {
    if (Date.now() - start > timeoutMs)
      throw new Error("handler did not settle");
    await sleep(5);
  }
}

async function main() {
  const { MongoMemoryReplSet } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "catvar-commerce-"));
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ dbPath }],
  });
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(replSet.getUri("aura_variant_commerce_test"));
  const say = (line) => console.log(`RESULT ${line}`);
  const section = async (name, fn) => {
    try {
      await fn();
    } catch (err) {
      say(`${name} error=${String(err && err.message).replace(/\s+/g, "_")}`);
    }
  };
  try {
    let primaryReady = false;
    for (let i = 0; i < 60 && !primaryReady; i++) {
      try {
        const hello = await mongoose.connection.db
          .admin()
          .command({ hello: 1 });
        primaryReady = hello.isWritablePrimary === true;
      } catch {
        /* not ready */
      }
      if (!primaryReady) await sleep(500);
    }
    if (!primaryReady) throw new Error("replica set never became primary");

    const Category = require(path.join(REPO, "models/category.model"));
    const Product = require(path.join(REPO, "models/product.model"));
    const Order = require(path.join(REPO, "models/order.model"));
    const Cart = require(path.join(REPO, "models/cart.model"));
    const User = require(path.join(REPO, "models/user.model"));
    const StockReservation = require(
      path.join(REPO, "models/stockReservation.model"),
    );
    const cartCtrl = require(path.join(REPO, "controllers/cart.controller"));
    const orderCtrl = require(path.join(REPO, "controllers/order.controller"));
    const variantService = require(
      path.join(REPO, "services/productVariant.service"),
    );
    const stockReservation = require(
      path.join(REPO, "services/stockReservation.service"),
    );
    const { transitionOrder } = require(
      path.join(REPO, "services/orderTransition.service"),
    );
    const { captureEsewaPayment } = require(
      path.join(REPO, "services/esewaCapture.service"),
    );
    const { ensureCatalogRegistry } = require(
      path.join(REPO, "services/catalogBootstrap.service"),
    );

    await Promise.all([
      Category.ensureIndexes(),
      Product.ensureIndexes(),
      Order.ensureIndexes(),
      Cart.ensureIndexes(),
      User.ensureIndexes(),
      StockReservation.ensureIndexes(),
      require(path.join(REPO, "models/paymentCapture.model")).ensureIndexes(),
      require(path.join(REPO, "models/discount.model")).ensureIndexes(),
      // COD finalize writes an outbox row inside the checkout
      // transaction; the collection must exist before any
      // transaction touches it (namespace-in-transaction error
      // otherwise — observed in the fail-before run).
      require(path.join(REPO, "models/emailOutbox.model")).ensureIndexes(),
    ]);
    await ensureCatalogRegistry();

    const category = await Category.create({ name: "Commerce Probe Category" });
    const address = {
      fullName: "Probe Buyer",
      phone: "9800000000",
      addressLine1: "1 Probe St",
      city: "Kathmandu",
      postalCode: "44600",
      country: "NP",
    };

    const rawProduct = async (id) =>
      mongoose.connection.db.collection("products").findOne({ _id: id });
    const variantOf = (raw, sku) =>
      (raw.catalogVariants || []).find((v) => v.sku === sku) || {};
    const mirror = (raw) =>
      (raw.catalogVariants || []).reduce(
        (acc, v) => ({
          stock: acc.stock + (v.stock || 0),
          reserved: acc.reserved + (v.reservedStock || 0),
        }),
        { stock: 0, reserved: 0 },
      );
    const mirrorCheck = (raw) => {
      const m = mirror(raw);
      return raw.stock === m.stock && (raw.reservedStock || 0) === m.reserved
        ? "ok"
        : `bad(product=${raw.stock}/${raw.reservedStock || 0},sum=${m.stock}/${m.reserved})`;
    };

    const mkVariantProduct = async (name, price, specs) => {
      let product = await Product.create({
        name,
        description: "probe product",
        category: category._id,
        price,
        stock: 0,
        status: "active",
      });
      if (specs.optionKeys && specs.optionKeys.length) {
        await variantService.applyVariantOptionKeys(product, specs.optionKeys);
        await product.save();
      }
      const variants = {};
      for (const spec of specs.variants) {
        product = await Product.findById(product._id);
        const { variant } = await variantService.createVariant(product, spec);
        variants[spec.sku] = variant;
      }
      return { product: await Product.findById(product._id), variants };
    };
    const mkUser = async (n) =>
      User.create({
        firstName: "Probe",
        lastName: `User${n}`,
        email: `probe-user-${n}@example.com`,
        password: "probe-password-123",
      });
    const callHandler = async (fn, req) => {
      const { res, next } = mockCall();
      fn(req, res, next);
      await untilSettled(res, next);
      return { statusCode: res.statusCode, body: res.body, error: next.error };
    };
    const cartReq = (user, body, params = {}) => ({
      user: { _id: user._id },
      body,
      params,
      get: () => undefined,
    });
    const authCheckout = (user, key) =>
      callHandler(orderCtrl.authenticatedCheckout, {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: "9800000000",
        },
        body: {
          shippingAddress: address,
          useSameAddress: true,
          paymentMethod: "cod",
          idempotencyKey: key,
        },
        get: () => undefined,
      });
    const guestCheckout = (email, phone, items, paymentMethod, key) =>
      callHandler(orderCtrl.guestCheckout, {
        body: {
          email,
          firstName: "Guest",
          lastName: "Buyer",
          phone,
          idempotencyKey: key,
          items,
          shippingAddress: address,
          useSameAddress: true,
          paymentMethod,
        },
        get: () => undefined,
      });
    const orderByOrderId = async (orderId) => Order.findOne({ orderId }).lean();
    let keySeq = 0;
    const nextKey = (tag) => `p4-${tag}-${++keySeq}-abcdefghij`;

    // ---------------- Setup ----------------
    delete process.env.GUEST_STOCK_RESERVATION;
    const p1 = await mkVariantProduct("Variant Sofa", 999, {
      optionKeys: ["color"],
      variants: [
        { sku: "P1-RED", options: { color: "#FF0000" }, price: 500, stock: 2 },
        { sku: "P1-BLU", options: { color: "#0000FF" }, price: 700, stock: 1 },
        {
          sku: "P1-DIS",
          options: { color: "#00FF00" },
          price: 300,
          stock: 5,
          enabled: false,
        },
      ],
    });
    const P1 = p1.product._id;
    const V = p1.variants;
    const p2 = await Product.create({
      name: "Legacy Chair",
      description: "probe",
      category: category._id,
      price: 100,
      stock: 10,
      sku: "P2-SKU",
      status: "active",
    });
    const p3 = await mkVariantProduct("No Default Table", 400, {
      optionKeys: ["color"],
      variants: [
        { sku: "P3-GRN", options: { color: "#008000" }, price: 450, stock: 3 },
      ],
    });
    const P3 = p3.product._id;
    const V3 = p3.variants;
    const p4doc = await Product.create({
      name: "Default Lamp",
      description: "probe",
      category: category._id,
      price: 250,
      stock: 4,
      sku: "P4-SKU",
      status: "active",
      images: [{ url: "https://img.example/p4.jpg", isPrimary: true }],
    });
    await variantService.ensureDefaultVariant(p4doc);
    const P4 = p4doc._id;

    await section("setup-mirror", async () => {
      const raw = await rawProduct(P1);
      say(
        `setup-mirror stock=${raw.stock} reserved=${raw.reservedStock || 0} mirror=${mirrorCheck(raw)} hasVariants=${raw.hasVariants} priceFrom=${raw.priceFrom}`,
      );
    });

    // ---------------- Cart ----------------
    const u1 = await mkUser(1);
    await section("cart-noreq", async () => {
      const r = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, { productId: String(P1), quantity: 1 }),
      );
      say(
        `cart-noreq status=${r.error ? r.error.statusCode : r.statusCode} code=${r.error ? r.error.code : "none"}`,
      );
    });
    await section("cart-bogus", async () => {
      const r = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, {
          productId: String(P1),
          quantity: 1,
          variantId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      );
      say(
        `cart-bogus status=${r.error ? r.error.statusCode : r.statusCode} code=${r.error ? r.error.code : "none"}`,
      );
    });
    await section("cart-disabled", async () => {
      const r = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, {
          productId: String(P1),
          quantity: 1,
          variantId: String(V["P1-DIS"]._id),
        }),
      );
      say(
        `cart-disabled status=${r.error ? r.error.statusCode : r.statusCode} code=${r.error ? r.error.code : "none"}`,
      );
    });
    await section("cart-legacy-variantid", async () => {
      const r = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, {
          productId: String(p2._id),
          quantity: 1,
          variantId: String(V["P1-RED"]._id),
        }),
      );
      say(
        `cart-legacy-variantid status=${r.error ? r.error.statusCode : r.statusCode} code=${r.error ? r.error.code : "none"}`,
      );
    });
    await section("cart-add", async () => {
      const a = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, {
          productId: String(P1),
          quantity: 1,
          variantId: String(V["P1-RED"]._id),
        }),
      );
      const b = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, {
          productId: String(P1),
          quantity: 1,
          variantId: String(V["P1-RED"]._id),
        }),
      );
      assertStatus(a);
      assertStatus(b);
      const cart = await Cart.findOne({ user: u1._id }).lean();
      const line = cart.items.find((i) => String(i.product) === String(P1));
      const view = await callHandler(cartCtrl.getCart, cartReq(u1, {}));
      const viewLine = view.body.data.cart.items.find(
        (i) => String(i.product && i.product._id) === String(P1),
      );
      say(
        `cart-add lines=${cart.items.length} qty=${line.quantity} sku=${line.sku} detailPrice=${viewLine.variantDetails && viewLine.variantDetails.price} detailAvail=${viewLine.variantDetails && viewLine.variantDetails.available} subtotal=${view.body.data.cart.subtotal}`,
      );
      function assertStatus(r) {
        if (r.error) throw r.error;
      }
    });
    await section("cart-overstock", async () => {
      const r = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, {
          productId: String(P1),
          quantity: 1,
          variantId: String(V["P1-RED"]._id),
        }),
      );
      say(
        `cart-overstock status=${r.error ? r.error.statusCode : r.statusCode}`,
      );
    });
    await section("cart-update-overstock", async () => {
      const add = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, {
          productId: String(P1),
          quantity: 1,
          variantId: String(V["P1-BLU"]._id),
        }),
      );
      if (add.error) throw add.error;
      const cart = await Cart.findOne({ user: u1._id }).lean();
      const bluLine = cart.items.find((i) => i.sku === "P1-BLU");
      const upd = await callHandler(
        cartCtrl.updateCartItem,
        cartReq(u1, { quantity: 2 }, { itemId: String(bluLine._id) }),
      );
      const rm = await callHandler(
        cartCtrl.removeFromCart,
        cartReq(u1, {}, { itemId: String(bluLine._id) }),
      );
      if (rm.error) throw rm.error;
      say(
        `cart-update-overstock status=${upd.error ? upd.error.statusCode : upd.statusCode}`,
      );
    });

    // ---------------- Authenticated COD checkout ----------------
    let codOrder;
    await section("cod-checkout", async () => {
      const add = await callHandler(
        cartCtrl.addToCart,
        cartReq(u1, { productId: String(p2._id), quantity: 1 }),
      );
      if (add.error) throw add.error;
      const r = await authCheckout(u1, nextKey("cod"));
      if (r.error) throw r.error;
      codOrder = await orderByOrderId(r.body.data.order.orderId);
      const line = codOrder.items.find((i) => String(i.product) === String(P1));
      const legacy = codOrder.items.find(
        (i) => String(i.product) === String(p2._id),
      );
      const opt = (line.variantOptions || [])[0] || {};
      say(
        `cod-checkout status=${r.statusCode} price=${line.price} sku=${line.sku} variantId=${String(line.variantId) === String(V["P1-RED"]._id)} optKey=${opt.key} optLabel=${opt.label} optValue=${opt.value} tripleEmpty=${!line.variant || !line.variant.color} legacyPrice=${legacy.price} legacySku=${legacy.sku || "none"}`,
      );
    });
    await section("cod-counters", async () => {
      const raw1 = await rawProduct(P1);
      const raw2 = await rawProduct(p2._id);
      say(
        `cod-counters redStock=${variantOf(raw1, "P1-RED").stock} mirror=${mirrorCheck(raw1)} legacyStock=${raw2.stock}`,
      );
    });

    // ---------------- Checkout rejection paths ----------------
    const u2 = await mkUser(2);
    await section("co-disabled", async () => {
      await Cart.create({
        user: u2._id,
        items: [
          {
            product: P1,
            quantity: 1,
            variantId: V["P1-DIS"]._id,
            sku: "P1-DIS",
          },
        ],
      });
      const r = await authCheckout(u2, nextKey("dis"));
      const raw = await rawProduct(P1);
      say(
        `co-disabled status=${r.error ? r.error.statusCode : r.statusCode} code=${r.error ? r.error.code : "none"} disStock=${variantOf(raw, "P1-DIS").stock}`,
      );
    });
    await section("co-insufficient", async () => {
      await Cart.updateOne({ user: u2._id }, { $set: { items: [] } });
      const add = await callHandler(
        cartCtrl.addToCart,
        cartReq(u2, {
          productId: String(P1),
          quantity: 1,
          variantId: String(V["P1-BLU"]._id),
        }),
      );
      if (add.error) throw add.error;
      const fresh = await Product.findById(P1);
      await variantService.updateVariant(fresh, V["P1-BLU"]._id, { stock: 0 });
      const ordersBefore = await Order.countDocuments({ user: u2._id });
      const r = await authCheckout(u2, nextKey("ins"));
      const ordersAfter = await Order.countDocuments({ user: u2._id });
      const raw = await rawProduct(P1);
      say(
        `co-insufficient status=${r.error ? r.error.statusCode : r.statusCode} code=${r.error ? r.error.code : "none"} orders=${ordersBefore}->${ordersAfter} mirror=${mirrorCheck(raw)}`,
      );
    });

    // ---------------- Legacy cart line resolution ----------------
    const u3 = await mkUser(3);
    await section("legacy-resolve", async () => {
      await Cart.create({
        user: u3._id,
        items: [{ product: P4, quantity: 1 }],
      });
      const r = await authCheckout(u3, nextKey("leg"));
      if (r.error) throw r.error;
      const order = await orderByOrderId(r.body.data.order.orderId);
      const line = order.items[0];
      const raw = await rawProduct(P4);
      say(
        `legacy-resolve status=${r.statusCode} sku=${line.sku} price=${line.price} varStock=${variantOf(raw, "P4-SKU").stock} mirror=${mirrorCheck(raw)}`,
      );
    });
    await section("legacy-noresolve", async () => {
      await Cart.updateOne(
        { user: u3._id },
        { $set: { items: [{ product: P3, quantity: 1 }] } },
      );
      const r = await authCheckout(u3, nextKey("legno"));
      say(
        `legacy-noresolve status=${r.error ? r.error.statusCode : r.statusCode} code=${r.error ? r.error.code : "none"}`,
      );
    });

    // ---------------- Guest flows ----------------
    await section("guest-cod", async () => {
      const r = await guestCheckout(
        "guest-cod@example.com",
        "9833000001",
        [
          {
            productId: String(P3),
            variantId: String(V3["P3-GRN"]._id),
            quantity: 2,
          },
        ],
        "cod",
        nextKey("gcod"),
      );
      if (r.error) throw r.error;
      const order = await orderByOrderId(r.body.data.order.orderId);
      const raw = await rawProduct(P3);
      say(
        `guest-cod status=${r.statusCode} sku=${order.items[0].sku} price=${order.items[0].price} varStock=${variantOf(raw, "P3-GRN").stock} mirror=${mirrorCheck(raw)}`,
      );
    });

    const p5 = await mkVariantProduct("Capture Desk", 900, {
      optionKeys: ["color"],
      variants: [
        { sku: "P5-YEL", options: { color: "#FFFF00" }, price: 800, stock: 2 },
      ],
    });
    const P5 = p5.product._id;
    const V5 = p5.variants;
    await section("capture", async () => {
      const r = await guestCheckout(
        "guest-cap@example.com",
        "9833000002",
        [
          {
            productId: String(P5),
            variantId: String(V5["P5-YEL"]._id),
            quantity: 2,
          },
        ],
        "esewa",
        nextKey("cap"),
      );
      if (r.error) throw r.error;
      const placed = await orderByOrderId(r.body.data.order.orderId);
      const stockAtPlacement = variantOf(await rawProduct(P5), "P5-YEL").stock;
      const cap = await captureEsewaPayment(placed._id, "DUMMYTEST", {
        transaction_code: "TXN-P5-1",
      });
      const rawAfter = await rawProduct(P5);
      say(
        `capture status=${r.statusCode} stockAtPlacement=${stockAtPlacement} outcome=${cap.outcome} applied=${cap.applied} stockAfter=${variantOf(rawAfter, "P5-YEL").stock} mirror=${mirrorCheck(rawAfter)}`,
      );
      const replay = await captureEsewaPayment(placed._id, "DUMMYTEST", {
        transaction_code: "TXN-P5-1",
      });
      const rawReplay = await rawProduct(P5);
      say(
        `capture-replay applied=${replay.applied} outcome=${replay.outcome} stock=${variantOf(rawReplay, "P5-YEL").stock}`,
      );
    });

    const p6 = await mkVariantProduct("Shortfall Shelf", 100, {
      optionKeys: ["color"],
      variants: [
        { sku: "P6-ORG", options: { color: "#FFA500" }, price: 100, stock: 1 },
      ],
    });
    const P6 = p6.product._id;
    const V6 = p6.variants;
    await section("capture-shortfall", async () => {
      const r = await guestCheckout(
        "guest-short@example.com",
        "9833000003",
        [
          {
            productId: String(P6),
            variantId: String(V6["P6-ORG"]._id),
            quantity: 1,
          },
        ],
        "esewa",
        nextKey("short"),
      );
      if (r.error) throw r.error;
      const placed = await orderByOrderId(r.body.data.order.orderId);
      const fresh = await Product.findById(P6);
      await variantService.updateVariant(fresh, V6["P6-ORG"]._id, { stock: 0 });
      const cap = await captureEsewaPayment(placed._id, "DUMMYTEST", {
        transaction_code: "TXN-P6-1",
      });
      const after = await Order.findById(placed._id).lean();
      const raw = await rawProduct(P6);
      say(
        `capture-shortfall outcome=${cap.outcome} stock=${variantOf(raw, "P6-ORG").stock} paymentStatus=${after.paymentStatus} orderStatus=${after.orderStatus} stockDeducted=${after.stockDeducted}`,
      );
    });

    const p11 = await Product.create({
      name: "Legacy Stool",
      description: "probe",
      category: category._id,
      price: 50,
      stock: 5,
      sku: "P11-SKU",
      status: "active",
    });
    await section("legacy-guest-cod", async () => {
      const r = await guestCheckout(
        "guest-leg@example.com",
        "9833000004",
        [{ productId: String(p11._id), quantity: 2 }],
        "cod",
        nextKey("gleg"),
      );
      if (r.error) throw r.error;
      const raw = await rawProduct(p11._id);
      say(`legacy-guest-cod status=${r.statusCode} stock=${raw.stock}`);
    });

    // ---------------- Reservations (flag ON) ----------------
    process.env.GUEST_STOCK_RESERVATION = "on";
    const p7 = await mkVariantProduct("Race Bed", 600, {
      optionKeys: ["color"],
      variants: [
        { sku: "P7-WHT", options: { color: "#FFFFFF" }, price: 600, stock: 1 },
      ],
    });
    const P7 = p7.product._id;
    const V7 = p7.variants;
    let raceWinnerOrderId = null;
    await section("race-reserve", async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          guestCheckout(
            `race${i}@example.com`,
            `98440000${i}`,
            [
              {
                productId: String(P7),
                variantId: String(V7["P7-WHT"]._id),
                quantity: 1,
              },
            ],
            "esewa",
            nextKey(`race${i}`),
          ),
        ),
      );
      const successes = results.filter((r) => r.statusCode === 201);
      const raw = await rawProduct(P7);
      const v = variantOf(raw, "P7-WHT");
      const holds = await StockReservation.find({
        product: P7,
        status: "active",
      }).lean();
      if (successes.length === 1) {
        const winner = await orderByOrderId(
          successes[0].body.data.order.orderId,
        );
        raceWinnerOrderId = winner._id;
      }
      const hold = holds[0] || {};
      say(
        `race-reserve successes=${successes.length} varReserved=${v.reservedStock || 0} mirrorReserved=${raw.reservedStock || 0} holds=${holds.length} holdVariant=${String(hold.variantId) === String(V7["P7-WHT"]._id)} holdSku=${hold.sku}`,
      );
    });

    const p8 = await mkVariantProduct("Settle Wardrobe", 200, {
      optionKeys: ["color"],
      variants: [
        { sku: "P8-GRY", options: { color: "#808080" }, price: 200, stock: 5 },
      ],
    });
    const P8 = p8.product._id;
    const V8 = p8.variants;
    const mkHeldOrder = async (email, qty) => {
      const [order] = await Order.create([
        {
          isGuestOrder: true,
          guestInfo: {
            email,
            firstName: "H",
            lastName: "G",
            phone: "9855000000",
          },
          items: [
            {
              product: P8,
              variantId: V8["P8-GRY"]._id,
              sku: "P8-GRY",
              name: "Settle Wardrobe",
              price: 200,
              quantity: qty,
            },
          ],
          shippingAddress: address,
          subtotal: 200 * qty,
          total: 200 * qty,
          paymentMethod: "esewa",
          stockDeducted: false,
          paymentStatus: "pending",
          orderStatus: "pending",
          statusHistory: [{ status: "pending", note: "Order placed" }],
        },
      ]);
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await stockReservation.reserveForOrder(order, session);
        });
      } finally {
        await session.endSession();
      }
      return order;
    };
    await section("settle-double", async () => {
      const order = await mkHeldOrder("settle@example.com", 2);
      const mid = variantOf(await rawProduct(P8), "P8-GRY");
      await stockReservation.consumeForOrder(order._id);
      await stockReservation.consumeForOrder(order._id);
      const raw = await rawProduct(P8);
      const v = variantOf(raw, "P8-GRY");
      say(
        `settle-double reservedMid=${mid.reservedStock || 0} reservedAfter=${v.reservedStock || 0} stockAfter=${v.stock} mirror=${mirrorCheck(raw)}`,
      );
    });
    await section("release-double", async () => {
      const order = await mkHeldOrder("release@example.com", 2);
      await stockReservation.releaseForOrder(order._id);
      await stockReservation.releaseForOrder(order._id);
      const raw = await rawProduct(P8);
      const v = variantOf(raw, "P8-GRY");
      say(
        `release-double reservedAfter=${v.reservedStock || 0} stockAfter=${v.stock} mirror=${mirrorCheck(raw)}`,
      );
    });
    await section("expiry", async () => {
      const order = await mkHeldOrder("expiry@example.com", 1);
      await StockReservation.updateOne(
        { order: order._id },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );
      await stockReservation.expireStaleHolds();
      const raw = await rawProduct(P8);
      const v = variantOf(raw, "P8-GRY");
      const hold = await StockReservation.findOne({ order: order._id }).lean();
      say(
        `expiry reservedAfter=${v.reservedStock || 0} holdStatus=${hold.status} mirror=${mirrorCheck(raw)}`,
      );
    });

    // Reservation blocks a direct COD purchase; release unblocks it.
    const u4 = await mkUser(4);
    await section("race-cod", async () => {
      const add = await callHandler(
        cartCtrl.addToCart,
        cartReq(u4, {
          productId: String(P7),
          quantity: 1,
          variantId: String(V7["P7-WHT"]._id),
        }),
      );
      if (add.error) throw add.error;
      const blocked = await authCheckout(u4, nextKey("block"));
      await transitionOrder(
        { _id: raceWinnerOrderId },
        "cancelled",
        "probe release",
      );
      const rawMid = await rawProduct(P7);
      const after = await authCheckout(u4, nextKey("after"));
      const raw = await rawProduct(P7);
      const v = variantOf(raw, "P7-WHT");
      say(
        `race-cod blockedStatus=${blocked.error ? blocked.error.statusCode : blocked.statusCode} blockedCode=${blocked.error ? blocked.error.code : "none"} reservedAfterRelease=${variantOf(rawMid, "P7-WHT").reservedStock || 0} afterStatus=${after.error ? after.error.statusCode : after.statusCode} varStock=${v.stock} mirror=${mirrorCheck(raw)}`,
      );
    });

    // Two authenticated COD checkouts race for the last variant unit.
    const p9 = await mkVariantProduct("Race Pink Chair", 300, {
      optionKeys: ["color"],
      variants: [
        { sku: "P9-PNK", options: { color: "#FFC0CB" }, price: 300, stock: 1 },
      ],
    });
    const P9 = p9.product._id;
    const V9 = p9.variants;
    await section("race-cod-concurrent", async () => {
      const u5 = await mkUser(5);
      const u6 = await mkUser(6);
      await Cart.create({
        user: u5._id,
        items: [
          {
            product: P9,
            quantity: 1,
            variantId: V9["P9-PNK"]._id,
            sku: "P9-PNK",
          },
        ],
      });
      await Cart.create({
        user: u6._id,
        items: [
          {
            product: P9,
            quantity: 1,
            variantId: V9["P9-PNK"]._id,
            sku: "P9-PNK",
          },
        ],
      });
      const results = await Promise.all([
        authCheckout(u5, nextKey("cc1")),
        authCheckout(u6, nextKey("cc2")),
      ]);
      const successes = results.filter((r) => r.statusCode === 201).length;
      const orders = await Order.countDocuments({ "items.product": P9 });
      const raw = await rawProduct(P9);
      say(
        `race-cod-concurrent successes=${successes} orders=${orders} varStock=${variantOf(raw, "P9-PNK").stock} mirror=${mirrorCheck(raw)}`,
      );
    });

    // ---------------- Snapshot integrity ----------------
    await section("snapshot", async () => {
      const fresh = await Product.findById(P1);
      await variantService.updateVariant(fresh, V["P1-RED"]._id, {
        price: 55555,
      });
      const fresh2 = await Product.findById(P1);
      await variantService.deleteVariant(fresh2, V["P1-RED"]._id);
      const reread = await Order.findById(codOrder._id).lean();
      const line = reread.items.find((i) => String(i.product) === String(P1));
      const opt = (line.variantOptions || [])[0] || {};
      say(
        `snapshot price=${line.price} sku=${line.sku} optValue=${opt.value} productRead=${reread.orderId ? "ok" : "bad"}`,
      );
    });
    await section("snapshot-cancel", async () => {
      const { order } = await transitionOrder(
        { _id: codOrder._id },
        "cancelled",
        "probe cancel after variant delete",
      );
      const raw1 = await rawProduct(P1);
      const raw2 = await rawProduct(p2._id);
      say(
        `snapshot-cancel status=${order.orderStatus} review=${order.inventoryReviewRequired} mirror=${mirrorCheck(raw1)} legacyStock=${raw2.stock}`,
      );
    });

    // ---------------- Cancel restores exactly once ----------------
    const p10 = await mkVariantProduct("Cancel Brown Sofa", 150, {
      optionKeys: ["color"],
      variants: [
        { sku: "P10-BRN", options: { color: "#A52A2A" }, price: 150, stock: 3 },
      ],
    });
    const P10 = p10.product._id;
    const V10 = p10.variants;
    await section("cancel-restore", async () => {
      const u7 = await mkUser(7);
      const add = await callHandler(
        cartCtrl.addToCart,
        cartReq(u7, {
          productId: String(P10),
          quantity: 2,
          variantId: String(V10["P10-BRN"]._id),
        }),
      );
      if (add.error) throw add.error;
      const placed = await authCheckout(u7, nextKey("cr"));
      if (placed.error) throw placed.error;
      const order = await orderByOrderId(placed.body.data.order.orderId);
      const stockPlaced = variantOf(await rawProduct(P10), "P10-BRN").stock;
      await transitionOrder({ _id: order._id }, "cancelled", "probe cancel");
      const stockCancelled = variantOf(await rawProduct(P10), "P10-BRN").stock;
      let second = "ok";
      try {
        await transitionOrder(
          { _id: order._id },
          "cancelled",
          "probe cancel again",
        );
        second = "no-throw";
      } catch {
        second = "error";
      }
      const raw = await rawProduct(P10);
      say(
        `cancel-restore stockPlaced=${stockPlaced} stockCancelled=${stockCancelled} secondCancel=${second} stockFinal=${variantOf(raw, "P10-BRN").stock} mirror=${mirrorCheck(raw)}`,
      );
    });
  } finally {
    await mongoose.disconnect().catch(() => {});
    await replSet.stop().catch(() => {});
    fs.rmSync(dbPath, { recursive: true, force: true });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
