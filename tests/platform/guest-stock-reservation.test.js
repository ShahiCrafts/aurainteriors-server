// AR-25 — GUEST_STOCK_RESERVATION=on (default off) + always-on
// guest_stock_confirm_failure counter.
// Part A (in-process, stubbed Product): prepareOrderItems must count
// held stock ONLY when the flag is on — flag off pins the pre-fix
// behavior byte-for-byte (no reservedStock in the select, no
// effective-stock math).
// Part B (child-process replica-set MMS probe):
// fixtures/guest-stock-reservation-probe.js. Justification for MMS +
// replica set over stubs: placement, reservation, confirmation and
// capture all run inside multi-document transactions against the
// same product document — only a real transactional store proves
// exactly-3-of-10 and consume/release/expiry accounting.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");
const { stubModule } = require("../audit/helpers");

// ---- Part A: prepareOrderItems effective-stock behavior ----
let prepSelect;
function prepQuery(products) {
  const q = {
    select(arg) {
      prepSelect = arg;
      return q;
    },
    session() {
      return q;
    },
    then(onF, onR) {
      return Promise.resolve(products).then(onF, onR);
    },
    catch(onR) {
      return Promise.resolve(products).catch(onR);
    },
  };
  return q;
}
const prepProduct = {
  _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  name: "Prep Chair",
  price: 10,
  stock: 5,
  reservedStock: 2,
  images: [],
};
stubModule("models/product.model.js", { find: () => prepQuery([prepProduct]) });
const { prepareOrderItems } = require("../../services/checkoutItems.service");

test("AR-25 A1: flag OFF — prepareOrderItems ignores reservedStock and does not select it", async () => {
  delete process.env.GUEST_STOCK_RESERVATION;
  prepSelect = undefined;
  const items = await prepareOrderItems(
    [{ productId: prepProduct._id, quantity: 4 }],
    null,
  );
  assert.equal(
    items.length,
    1,
    "stock 5 covers quantity 4 when holds are not counted",
  );
  assert.ok(
    prepSelect && !String(prepSelect).includes("reservedStock"),
    `flag off must not request reservedStock (byte-identical behavior), select was: ${prepSelect}`,
  );
});

test("AR-25 A2: flag ON — prepareOrderItems counts held stock in BOTH checks and selects reservedStock", async () => {
  process.env.GUEST_STOCK_RESERVATION = "on";
  try {
    prepSelect = undefined;
    // effective stock = 5 - 2 = 3: quantity 4 fails the per-item check
    await assert.rejects(
      () =>
        prepareOrderItems([{ productId: prepProduct._id, quantity: 4 }], null),
      (err) => err.statusCode === 400,
    );
    assert.ok(
      String(prepSelect).includes("reservedStock"),
      `flag on must explicitly select reservedStock, select was: ${prepSelect}`,
    );
    // combined-quantity check: two lines of 2 against effective 3
    await assert.rejects(
      () =>
        prepareOrderItems(
          [
            { productId: prepProduct._id, quantity: 2 },
            { productId: prepProduct._id, quantity: 2 },
          ],
          null,
        ),
      (err) => err.statusCode === 400 && /combined/.test(err.message),
    );
    const ok = await prepareOrderItems(
      [{ productId: prepProduct._id, quantity: 3 }],
      null,
    );
    assert.equal(ok.length, 1, "quantity 3 fits the effective stock of 3");
  } finally {
    delete process.env.GUEST_STOCK_RESERVATION;
  }
});

// ---- Part B: replica-set MMS probe ----
function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "guest-stock-reservation-probe.js")],
      { timeout: 240000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
    );
  });
}
let cached;
const probe = async () => {
  if (!cached) cached = runProbe();
  return cached;
};
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print RESULT ${prefix}; got: ${out}`);
  return l;
};
const field = (l, name) => {
  const m = l.match(new RegExp(`${name}=([^ ]*)`));
  return m ? m[1] : null;
};

test(
  "AR-25 B1: flag OFF — 10 concurrent guest eSewa placements all succeed, zero holds",
  { timeout: 250000 },
  async () => {
    const l = await line("flagOff");
    assert.equal(field(l, "successes"), "10");
    assert.equal(field(l, "reserved"), "0");
    assert.equal(field(l, "activeHolds"), "0");
  },
);

test(
  "AR-25 B2: flag ON — exactly 3 of 10 succeed, 7 fail 400, reservedStock 3, 3 active holds",
  { timeout: 250000 },
  async () => {
    const l = await line("flagOn");
    assert.equal(field(l, "successes"), "3");
    assert.equal(field(l, "fail400"), "7");
    assert.equal(field(l, "otherFail"), "0");
    assert.equal(field(l, "reserved"), "3");
    assert.equal(field(l, "activeHolds"), "3");
    assert.equal(
      field(l, "selectReserved"),
      "3",
      "reservedStock must be returned when explicitly selected despite select:false",
    );
  },
);

test(
  "AR-25 B3: confirmation via transitionOrder consumes the hold and deducts stock exactly once",
  { timeout: 250000 },
  async () => {
    const l = await line("consume");
    assert.equal(field(l, "reservedBefore"), "2");
    assert.equal(field(l, "stockAfter"), "3");
    assert.equal(field(l, "reservedAfter"), "0");
    assert.equal(field(l, "holdStatus"), "consumed");
    assert.equal(field(l, "stockDeducted"), "true");
  },
);

test(
  "AR-25 B4: cancellation releases the hold — reserved decremented, stock untouched",
  { timeout: 250000 },
  async () => {
    const l = await line("release");
    assert.equal(field(l, "stockAfter"), "5");
    assert.equal(field(l, "reservedAfter"), "0");
    assert.equal(field(l, "holdStatus"), "released");
  },
);

test(
  "AR-25 B5: expiry — past-expiry hold gates until the sweep, then placement succeeds (TTL lag)",
  { timeout: 250000 },
  async () => {
    const l = await line("expiry");
    assert.equal(field(l, "beforeErr"), "400");
    assert.equal(field(l, "reservedAfterSweep"), "0");
    assert.equal(field(l, "holdStatus"), "expired");
    assert.equal(field(l, "afterCode"), "201");
  },
);

test(
  "AR-25 B6: counter (flag OFF) — drained guest COD confirmation throws 409 and increments (commitGuestCodStock)",
  { timeout: 250000 },
  async () => {
    const l = await line("counterCod");
    assert.equal(field(l, "threw"), "409");
    assert.equal(Number(field(l, "after")), Number(field(l, "before")) + 1);
    assert.equal(field(l, "logSource"), "true");
  },
);

test(
  "AR-25 B7: counter (flag OFF) — drained guest eSewa capture is review_required and increments (esewaCapture)",
  { timeout: 250000 },
  async () => {
    const l = await line("counterCapture");
    assert.equal(field(l, "outcome"), "review_required");
    assert.equal(Number(field(l, "after")), Number(field(l, "before")) + 1);
    assert.equal(field(l, "logSource"), "true");
  },
);
