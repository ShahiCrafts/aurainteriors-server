// AR-25 probe — GUEST_STOCK_RESERVATION (default off) + always-on
// guest_stock_confirm_failure counter, against a real replica-set
// mongod (MMS, disk-backed dbPath under ~/workspace/aura-audit/mms-data;
// checkout/capture need transactions, so a replica set is required).
// The REAL guestCheckout handler is driven with fabricated req/res
// objects (the handler pattern used by the stub suites, but against a
// real DB); the eSewa config is dummy env — no provider call happens
// on the placement path (payment data is only generated locally).
//
// The probe is fail-tolerant by design so it can run at the parent
// commit for fail-before evidence: sections that need the new modules
// report module availability instead of dying on the require.
const path = require("node:path");
const fs = require("node:fs");
const REPO = path.resolve(__dirname, "../../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// OA-1 (AR-32 completion): FRONTEND_URL/BACKEND_URL have no fallbacks
// any more and guestCheckout builds eSewa payment URLs from BACKEND_URL
// via requireAtUse - set both explicitly. Env-setup only.
process.env.FRONTEND_URL =
  process.env.FRONTEND_URL || "https://frontend.example.test";
process.env.BACKEND_URL =
  process.env.BACKEND_URL || "https://backend.example.test";
process.env.ESEWA_MERCHANT_ID = "DUMMYTEST";
process.env.ESEWA_SECRET_KEY = "dummy-secret-for-probe";
process.env.ESEWA_ENV = "sandbox";

// Capture structured metric lines emitted via console.error.
const metricLines = [];
const origError = console.error.bind(console);
console.error = (...args) => {
  const s = args
    .map((a) => (typeof a === "string" ? a : String((a && a.message) || a)))
    .join(" ");
  metricLines.push(s);
};

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

async function untilSettled(res, next, timeoutMs = 20000) {
  const start = Date.now();
  while (res.statusCode === undefined && next.error === undefined) {
    if (Date.now() - start > timeoutMs)
      throw new Error("guestCheckout did not settle");
    await sleep(5);
  }
}

async function main() {
  const { MongoMemoryReplSet } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "guest-stock-"));
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ dbPath }],
  });
  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(replSet.getUri("aura_guest_stock_test"));
  try {
    // Wait for a writable primary before any transaction.
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
    const orderCtrl = require(path.join(REPO, "controllers/order.controller"));
    const { transitionOrder } = require(
      path.join(REPO, "services/orderTransition.service"),
    );
    const { captureEsewaPayment } = require(
      path.join(REPO, "services/esewaCapture.service"),
    );
    let reservation = null;
    let metrics = null;
    try {
      reservation = require(
        path.join(REPO, "services/stockReservation.service"),
      );
    } catch {
      reservation = null;
    }
    try {
      metrics = require(path.join(REPO, "services/guestStockMetrics.service"));
    } catch {
      metrics = null;
    }
    console.log(
      `RESULT modules reservation=${!!reservation} metrics=${!!metrics}`,
    );

    // Warmup: let every model's autoIndex build finish BEFORE any
    // concurrent transactions run — index builds racing transactions
    // fail them with catalog-change / IX-lock errors (observed at the
    // parent commit: 0/10 placements on a cold DB). ensureIndexes
    // awaits the builds.
    await Promise.all([
      Category.ensureIndexes(),
      Product.ensureIndexes(),
      Order.ensureIndexes(),
      require(path.join(REPO, "models/paymentCapture.model")).ensureIndexes(),
      require(path.join(REPO, "models/cart.model")).ensureIndexes(),
      require(path.join(REPO, "models/discount.model")).ensureIndexes(),
    ]);
    if (reservation) {
      try {
        await require(
          path.join(REPO, "models/stockReservation.model"),
        ).ensureIndexes();
      } catch {
        /* reported via modules line */
      }
    }

    const category = await Category.create({ name: "Probe Category" });
    const mkProduct = async (name, stock) =>
      Product.create({
        name,
        description: "probe product",
        category: category._id,
        price: 100,
        stock,
        status: "active",
      });
    const rawProduct = async (id) =>
      mongoose.connection.db.collection("products").findOne({ _id: id });
    const activeHolds = async (filter = {}) => {
      try {
        return await mongoose.connection.db
          .collection("stockreservations")
          .countDocuments({ status: "active", ...filter });
      } catch {
        return 0;
      }
    };

    const address = {
      fullName: "Guest Buyer",
      phone: "9800000000",
      addressLine1: "1 Guest St",
      city: "Kathmandu",
      postalCode: "44600",
      country: "NP",
    };
    const callCheckout = async (email, phone, productId, key, quantity = 1) => {
      const { res, next } = mockCall();
      const req = {
        body: {
          email,
          firstName: "Guest",
          lastName: "Buyer",
          phone,
          idempotencyKey: key,
          items: [{ productId: String(productId), quantity }],
          shippingAddress: address,
          useSameAddress: true,
          paymentMethod: "esewa",
        },
        get: () => undefined,
      };
      orderCtrl.guestCheckout(req, res, next);
      await untilSettled(res, next);
      return { statusCode: res.statusCode, error: next.error };
    };

    // (a) Flag OFF characterization: 10 concurrent guest eSewa
    // placements against a 3-stock product — today's window: all 10
    // succeed, zero holds, reservedStock stays 0/absent.
    delete process.env.GUEST_STOCK_RESERVATION;
    const pOff = await mkProduct("Flag Off Chair", 3);
    const offResults = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        callCheckout(
          `off${i}@example.com`,
          `98110000${i}`,
          pOff._id,
          `probe-off-key-${i}-abcdefgh`,
        ),
      ),
    );
    const offOk = offResults.filter((r) => r.statusCode === 201).length;
    const offRaw = await rawProduct(pOff._id);
    console.log(
      `RESULT flagOff successes=${offOk} reserved=${offRaw.reservedStock || 0} activeHolds=${await activeHolds()}`,
    );

    // (b) Flag ON: exactly 3 of 10 concurrent placements succeed; the
    // other 7 fail 400; reservedStock === 3 with 3 active holds.
    process.env.GUEST_STOCK_RESERVATION = "on";
    const pOn = await mkProduct("Flag On Chair", 3);
    const onResults = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        callCheckout(
          `on${i}@example.com`,
          `98220000${i}`,
          pOn._id,
          `probe-on-key-${i}-abcdefgh`,
        ),
      ),
    );
    const onOk = onResults.filter((r) => r.statusCode === 201).length;
    const on400 = onResults.filter(
      (r) => r.error && r.error.statusCode === 400,
    ).length;
    const onOther = onResults.length - onOk - on400;
    const onRaw = await rawProduct(pOn._id);
    const onHolds = await activeHolds({ product: pOn._id });
    // Explicit-select check: reservedStock (select:false) must be
    // returned when named in the .select(...) string.
    const selected = await Product.findById(pOn._id)
      .select("_id stock reservedStock")
      .lean();
    console.log(
      `RESULT flagOn successes=${onOk} fail400=${on400} otherFail=${onOther} reserved=${onRaw.reservedStock || 0} activeHolds=${onHolds} selectReserved=${selected ? selected.reservedStock : "missing"}`,
    );

    if (reservation) {
      const mkPendingCod = async (product, quantity) =>
        Order.create({
          isGuestOrder: true,
          guestInfo: {
            email: "pending@example.com",
            firstName: "P",
            lastName: "G",
            phone: "9800000001",
          },
          items: [
            { product: product._id, name: product.name, price: 100, quantity },
          ],
          shippingAddress: address,
          subtotal: 100 * quantity,
          total: 100 * quantity,
          paymentMethod: "cod",
          stockDeducted: false,
          paymentStatus: "pending",
          orderStatus: "pending",
          statusHistory: [{ status: "pending", note: "Order placed" }],
        });
      const reserveInTxn = async (order) => {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await reservation.reserveForOrder(order, session);
          });
        } finally {
          await session.endSession();
        }
      };
      const holdOf = async (orderId) =>
        mongoose.connection.db
          .collection("stockreservations")
          .findOne({ order: orderId });

      // (c) Hold consumption: confirm a held pending guest COD order
      // via transitionOrder — hold consumed, reserved back to 0,
      // stock deducted exactly once.
      const pConsume = await mkProduct("Consume Chair", 5);
      const oConsume = await mkPendingCod(pConsume, 2);
      await reserveInTxn(oConsume);
      const reservedBefore =
        (await rawProduct(pConsume._id)).reservedStock || 0;
      await transitionOrder(
        { _id: oConsume._id },
        "confirmed",
        "probe confirm",
      );
      const rawAfterConsume = await rawProduct(pConsume._id);
      const holdAfterConsume = await holdOf(oConsume._id);
      const orderAfterConsume = await Order.findById(oConsume._id).lean();
      console.log(
        `RESULT consume reservedBefore=${reservedBefore} stockAfter=${rawAfterConsume.stock} reservedAfter=${rawAfterConsume.reservedStock || 0} holdStatus=${holdAfterConsume && holdAfterConsume.status} stockDeducted=${orderAfterConsume.stockDeducted}`,
      );

      // (d) Cancel path releases: reserved decremented, hold released,
      // stock untouched.
      const pRelease = await mkProduct("Release Chair", 5);
      const oRelease = await mkPendingCod(pRelease, 2);
      await reserveInTxn(oRelease);
      await transitionOrder({ _id: oRelease._id }, "cancelled", "probe cancel");
      const rawAfterRelease = await rawProduct(pRelease._id);
      const holdAfterRelease = await holdOf(oRelease._id);
      console.log(
        `RESULT release stockAfter=${rawAfterRelease.stock} reservedAfter=${rawAfterRelease.reservedStock || 0} holdStatus=${holdAfterRelease && holdAfterRelease.status}`,
      );

      // (e) Expiry: a past-expiry hold still gates via the COUNTER
      // until the sweep runs (TTL lag); after expireStaleHolds the
      // same placement succeeds.
      const pExpiry = await mkProduct("Expiry Chair", 1);
      const oExpiry = await Order.create({
        isGuestOrder: true,
        guestInfo: {
          email: "expiry@example.com",
          firstName: "E",
          lastName: "G",
          phone: "9800000002",
        },
        items: [
          { product: pExpiry._id, name: pExpiry.name, price: 100, quantity: 1 },
        ],
        shippingAddress: address,
        subtotal: 100,
        total: 100,
        paymentMethod: "esewa",
        stockDeducted: false,
        paymentStatus: "pending",
        orderStatus: "pending",
        statusHistory: [{ status: "pending", note: "Order placed" }],
      });
      await reserveInTxn(oExpiry);
      await mongoose.connection.db
        .collection("stockreservations")
        .updateOne(
          { order: oExpiry._id },
          { $set: { expiresAt: new Date(Date.now() - 1000) } },
        );
      const beforeSweep = await callCheckout(
        "expirynew@example.com",
        "9833000011",
        pExpiry._id,
        "probe-expiry-key-a-abcdefgh",
      );
      await reservation.expireStaleHolds();
      const expRaw = await rawProduct(pExpiry._id);
      const expHold = await holdOf(oExpiry._id);
      const afterSweep = await callCheckout(
        "expirynew2@example.com",
        "9833000012",
        pExpiry._id,
        "probe-expiry-key-b-abcdefgh",
      );
      console.log(
        `RESULT expiry beforeCode=${beforeSweep.statusCode || 0} beforeErr=${beforeSweep.error ? beforeSweep.error.statusCode : 0} reservedAfterSweep=${expRaw.reservedStock || 0} holdStatus=${expHold && expHold.status} afterCode=${afterSweep.statusCode || 0} afterErr=${afterSweep.error ? afterSweep.error.statusCode : 0}`,
      );
    } else {
      console.log("RESULT consume skipped=module-missing");
      console.log("RESULT release skipped=module-missing");
      console.log("RESULT expiry skipped=module-missing");
    }

    // (f) Always-on counter, flag OFF (i): pending guest COD order
    // whose stock is drained — transition to confirmed throws 409
    // AND the counter increments with source commitGuestCodStock.
    delete process.env.GUEST_STOCK_RESERVATION;
    const counterBefore = () =>
      metrics ? metrics.getGuestStockConfirmFailures() : -1;
    const pCod = await mkProduct("Counter Cod Chair", 1);
    await Product.updateOne({ _id: pCod._id }, { $set: { stock: 0 } });
    const oCod = await Order.create({
      isGuestOrder: true,
      guestInfo: {
        email: "countercod@example.com",
        firstName: "C",
        lastName: "G",
        phone: "9800000003",
      },
      items: [{ product: pCod._id, name: pCod.name, price: 100, quantity: 1 }],
      shippingAddress: address,
      subtotal: 100,
      total: 100,
      paymentMethod: "cod",
      stockDeducted: false,
      paymentStatus: "pending",
      orderStatus: "pending",
      statusHistory: [{ status: "pending", note: "Order placed" }],
    });
    const codBefore = counterBefore();
    metricLines.length = 0;
    let codThrew = null;
    try {
      await transitionOrder({ _id: oCod._id }, "confirmed", "probe confirm");
    } catch (e) {
      codThrew = e;
    }
    const codLog = metricLines.some(
      (l) =>
        l.includes("guest_stock_confirm_failure") &&
        l.includes("commitGuestCodStock"),
    );
    console.log(
      `RESULT counterCod threw=${codThrew ? codThrew.statusCode : 0} before=${codBefore} after=${counterBefore()} logSource=${codLog}`,
    );

    // (g) Always-on counter (ii): eSewa capture for a guest order
    // whose stock was drained after placement — outcome
    // review_required AND the counter increments (source esewaCapture).
    const pCap = await mkProduct("Counter Capture Chair", 1);
    const oCap = await Order.create({
      isGuestOrder: true,
      guestInfo: {
        email: "countercap@example.com",
        firstName: "C",
        lastName: "G",
        phone: "9800000004",
      },
      items: [{ product: pCap._id, name: pCap.name, price: 100, quantity: 1 }],
      shippingAddress: address,
      subtotal: 100,
      total: 100,
      paymentMethod: "esewa",
      stockDeducted: false,
      paymentStatus: "pending",
      orderStatus: "pending",
      statusHistory: [{ status: "pending", note: "Order placed" }],
    });
    await Product.updateOne({ _id: pCap._id }, { $set: { stock: 0 } });
    const capBefore = counterBefore();
    metricLines.length = 0;
    const capture = await captureEsewaPayment(oCap._id, "DUMMYTEST", {
      transaction_code: "PROBE-TXN-1",
    });
    const capLog = metricLines.some(
      (l) =>
        l.includes("guest_stock_confirm_failure") && l.includes("esewaCapture"),
    );
    console.log(
      `RESULT counterCapture outcome=${capture.outcome} before=${capBefore} after=${counterBefore()} logSource=${capLog}`,
    );
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    origError("PROBE FAILED:", e);
    process.exit(1);
  });
