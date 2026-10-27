// Phase 4 (catalog) — variant-aware commerce, end to end.
// The probe (fixtures/catalog-variant-commerce-probe.js) drives
// the real cart/order controllers and commerce services against
// a real MMS replica set; this file pins its RESULT lines, plus
// in-process schema/validator pins for the new fields.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(__dirname, "fixtures", "catalog-variant-commerce-probe.js")],
      { timeout: 300000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout) => { if (err && !stdout) return reject(err); resolve(String(stdout)); });
  });
}
let cached;
const probe = async () => { if (!cached) cached = runProbe(); return cached; };
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print RESULT ${prefix}; got: ${out}`);
  return l;
};

test("commerce: variant writes converge the product stock mirror", async () => {
  assert.equal(
    await line("setup-mirror"),
    "RESULT setup-mirror stock=8 reserved=0 mirror=ok hasVariants=true priceFrom=500"
  );
});

test("commerce: cart requires a valid, enabled variant for variant products", async () => {
  assert.equal(await line("cart-noreq"), "RESULT cart-noreq status=400 code=VARIANT_REQUIRED");
  assert.equal(await line("cart-bogus"), "RESULT cart-bogus status=400 code=VARIANT_NOT_FOUND");
  assert.equal(await line("cart-disabled"), "RESULT cart-disabled status=409 code=VARIANT_UNAVAILABLE");
  assert.equal(await line("cart-legacy-variantid"), "RESULT cart-legacy-variantid status=400 code=VARIANT_NOT_FOUND");
});

test("commerce: cart variant lines merge by variant and price from the variant", async () => {
  assert.equal(
    await line("cart-add"),
    "RESULT cart-add lines=1 qty=2 sku=P1-RED detailPrice=500 detailAvail=true subtotal=1000"
  );
  assert.equal(await line("cart-overstock"), "RESULT cart-overstock status=400");
  assert.equal(await line("cart-update-overstock"), "RESULT cart-update-overstock status=400");
});

test("commerce: authenticated COD prices variant lines from the variant and snapshots SKU/options", async () => {
  assert.equal(
    await line("cod-checkout"),
    "RESULT cod-checkout status=201 price=500 sku=P1-RED variantId=true optKey=color optLabel=Color optValue=#ff0000 tripleEmpty=true legacyPrice=100 legacySku=none"
  );
  assert.equal(await line("cod-counters"), "RESULT cod-counters redStock=0 mirror=ok legacyStock=9");
});

test("commerce: checkout rejects disabled variants and stock that vanished after carting", async () => {
  assert.equal(await line("co-disabled"), "RESULT co-disabled status=409 code=VARIANT_UNAVAILABLE disStock=5");
  assert.equal(await line("co-insufficient"), "RESULT co-insufficient status=400 code=VARIANT_OUT_OF_STOCK orders=0->0 mirror=ok");
});

test("commerce: legacy cart lines resolve only to a default variant", async () => {
  assert.equal(await line("legacy-resolve"), "RESULT legacy-resolve status=201 sku=P4-SKU price=250 varStock=3 mirror=ok");
  assert.equal(await line("legacy-noresolve"), "RESULT legacy-noresolve status=400 code=VARIANT_REQUIRED");
});

test("commerce: guest COD deducts the variant at placement-confirmation", async () => {
  assert.equal(await line("guest-cod"), "RESULT guest-cod status=201 sku=P3-GRN price=450 varStock=1 mirror=ok");
});

test("commerce: eSewa capture deducts the variant once; replay is a no-op; shortfall goes to review", async () => {
  assert.equal(
    await line("capture"),
    "RESULT capture status=201 stockAtPlacement=2 outcome=confirmed applied=true stockAfter=0 mirror=ok"
  );
  assert.equal(await line("capture-replay"), "RESULT capture-replay applied=false outcome=confirmed stock=0");
  assert.equal(
    await line("capture-shortfall"),
    "RESULT capture-shortfall outcome=review_required stock=0 paymentStatus=paid orderStatus=pending stockDeducted=false"
  );
});

test("commerce: legacy guest COD flow is unchanged", async () => {
  assert.equal(await line("legacy-guest-cod"), "RESULT legacy-guest-cod status=201 stock=3");
});

test("commerce: parallel guest reservations for the last variant unit — exactly one wins", async () => {
  assert.equal(
    await line("race-reserve"),
    "RESULT race-reserve successes=1 varReserved=1 mirrorReserved=1 holds=1 holdVariant=true holdSku=P7-WHT"
  );
});

test("commerce: double settle / double release / expiry are exact no-ops after the first", async () => {
  assert.equal(await line("settle-double"), "RESULT settle-double reservedMid=2 reservedAfter=0 stockAfter=5 mirror=ok");
  assert.equal(await line("release-double"), "RESULT release-double reservedAfter=0 stockAfter=5 mirror=ok");
  assert.equal(await line("expiry"), "RESULT expiry reservedAfter=0 holdStatus=expired mirror=ok");
});

test("commerce: a reservation blocks direct COD purchase of the held unit until released", async () => {
  assert.equal(
    await line("race-cod"),
    "RESULT race-cod blockedStatus=400 blockedCode=VARIANT_OUT_OF_STOCK reservedAfterRelease=0 afterStatus=201 varStock=0 mirror=ok"
  );
});

test("commerce: concurrent COD checkouts cannot oversell the last variant unit", async () => {
  assert.equal(
    await line("race-cod-concurrent"),
    "RESULT race-cod-concurrent successes=1 orders=1 varStock=0 mirror=ok"
  );
});

test("commerce: order snapshots survive variant price changes and deletion; cancel flags review", async () => {
  assert.equal(await line("snapshot"), "RESULT snapshot price=500 sku=P1-RED optValue=#ff0000 productRead=ok");
  assert.equal(
    await line("snapshot-cancel"),
    "RESULT snapshot-cancel status=cancelled review=true mirror=ok legacyStock=10"
  );
});

test("commerce: cancel restores variant stock exactly once", async () => {
  assert.equal(
    await line("cancel-restore"),
    "RESULT cancel-restore stockPlaced=1 stockCancelled=3 secondCancel=error stockFinal=3 mirror=ok"
  );
});

// ------- In-process pins (no DB) -------

test("commerce: schemas carry the variant identity fields", () => {
  const Cart = require("../../models/cart.model");
  const Order = require("../../models/order.model");
  const StockReservation = require("../../models/stockReservation.model");
  const cartItem = Cart.schema.path("items").schema;
  assert.ok(cartItem.path("variantId"), "cart line variantId");
  assert.ok(cartItem.path("sku"), "cart line sku");
  const orderItem = Order.schema.path("items").schema;
  assert.ok(orderItem.path("variantId"), "order line variantId");
  assert.ok(orderItem.path("sku"), "order line sku");
  assert.ok(orderItem.path("variantOptions"), "order line variantOptions");
  assert.ok(StockReservation.schema.path("variantId"), "reservation variantId");
  assert.ok(StockReservation.schema.path("sku"), "reservation sku");
});

test("commerce: guest checkout schema passes variantId/sku through (stripUnknown must not eat them)", () => {
  const { guestCheckoutSchema } = require("../../validators/order.validator");
  const { error, value } = guestCheckoutSchema.validate({
    email: "g@example.com", firstName: "G", lastName: "B", phone: "9800000000",
    items: [{ productId: "aaaaaaaaaaaaaaaaaaaaaaaa", quantity: 1, variantId: "bbbbbbbbbbbbbbbbbbbbbbbb", sku: "P1-RED" }],
    shippingAddress: { fullName: "G B", phone: "9800000000", addressLine1: "1 St", city: "KTM", postalCode: "44600" },
    paymentMethod: "cod",
  }, { stripUnknown: true });
  assert.ifError(error);
  assert.equal(value.items[0].variantId, "bbbbbbbbbbbbbbbbbbbbbbbb");
  assert.equal(value.items[0].sku, "P1-RED");
});

test("commerce: AppError carries a stable machine-readable code when given one", () => {
  const AppError = require("../../utils/AppError");
  const err = new AppError("boom", 400, "VARIANT_REQUIRED");
  assert.equal(err.code, "VARIANT_REQUIRED");
  assert.equal(err.statusCode, 400);
  assert.equal(new AppError("plain", 400).code, undefined);
});
