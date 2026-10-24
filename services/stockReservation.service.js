// AR-25 (D-D): TTL stock reservations for guest checkout, behind
// GUEST_STOCK_RESERVATION=on (default OFF — placement then behaves
// exactly as before: stock validates at placement and commits at
// confirmation/capture, the FA-09 model).
//
// Design:
//   reserveForOrder(order, session) — per product (quantities
//   aggregated across repeated lines), FIRST the atomic gate: an
//   updateOne whose $expr requires stock >= reservedStock + qty
//   (a missing reservedStock counts as 0 via $ifNull), incrementing
//   reservedStock; only then is the StockReservation ledger doc
//   inserted. Gate-first means a crash between the two (impossible
//   inside the checkout transaction — both roll back together) can
//   only over-reserve, never oversell.
//   consumeForOrder / releaseForOrder(orderId, session) — settle the
//   order's active holds: a conditional flip (status still "active")
//   wins exactly once, then reservedStock is decremented behind a
//   $gte floor guard; a guard miss logs a structured
//   stock_reservation_drift line (conservative direction only — the
//   counter stays high, never negative, never oversells). NOT
//   flag-gated: holds created while the flag was on must settle even
//   after it is turned off. No-op when no holds exist.
//   expireStaleHolds() — the same conditional-flip settlement for
//   active holds past expiresAt, in bounded batches; idempotent and
//   crash-safe. NOTE: availability is gated by the reservedStock
//   COUNTER, so an expired hold frees its stock only once this
//   sweep runs (TTL + up to one 10-minute sweep interval of lag).
//
// The models are required LAZILY (same pattern as
// emailOutbox.service): controllers that older stub-based test
// harnesses load with a stubbed "mongoose" module must not crash at
// load time evaluating a model file. The settle paths additionally
// no-op when mongoose is not connected — holds cannot exist without
// the database, and bookkeeping must never break a confirmation or
// cancellation that the pre-AR-25 code would have completed.
const AppError = require("../utils/AppError");

const loadProduct = () => require("../models/product.model");
const loadStockReservation = () => require("../models/stockReservation.model");

const isEnabled = () => require("../config/appConfig").getString("GUEST_STOCK_RESERVATION") === "on";

const ttlMs = () => {
  const minutes = Number(require("../config/appConfig").getInt("GUEST_STOCK_RESERVATION_TTL_MINUTES"));
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 30) * 60 * 1000;
};

const isConnected = () => {
  try {
    const mongoose = require("mongoose");
    return !!mongoose.connection && mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
};

const logDrift = (hold, toStatus) => {
  console.error(JSON.stringify({
    event: "stock_reservation_drift",
    orderId: hold.order ? String(hold.order) : null,
    product: hold.product ? String(hold.product) : null,
    quantity: hold.quantity,
    holdId: hold._id ? String(hold._id) : null,
    toStatus,
  }));
};

async function reserveForOrder(order, session) {
  const Product = loadProduct();
  const StockReservation = loadStockReservation();
  // Aggregate repeated lines of the same product (the capture
  // service's aggregation pattern) — one gate + one hold per product.
  const quantities = new Map();
  for (const item of order.items || []) {
    const id = String(item.product);
    quantities.set(id, (quantities.get(id) || 0) + item.quantity);
  }
  const expiresAt = new Date(Date.now() + ttlMs());
  const opts = session ? { session } : {};
  for (const [productId, quantity] of quantities) {
    const gate = await Product.updateOne(
      {
        _id: productId,
        deletedAt: null,
        status: "active",
        $expr: { $lte: [{ $add: [{ $ifNull: ["$reservedStock", 0] }, quantity] }, "$stock"] },
      },
      { $inc: { reservedStock: quantity } },
      opts
    );
    if (gate.matchedCount !== 1) {
      throw new AppError("Insufficient stock to reserve this order", 400);
    }
    await StockReservation.create(
      [{ order: order._id, product: productId, quantity, status: "active", expiresAt }],
      opts
    );
  }
}

// Shared conditional-flip settlement behind consume/release. The
// flip is the exactly-once point: only the caller that flips a hold
// out of "active" decrements the counter for it.
async function settleHolds(holds, toStatus, session, Product, StockReservation) {
  const opts = session ? { session } : {};
  let settled = 0;
  for (const hold of holds) {
    const flip = await StockReservation.updateOne(
      { _id: hold._id, status: "active" },
      { $set: { status: toStatus } },
      opts
    );
    if (flip.matchedCount !== 1) continue;
    settled += 1;
    const decremented = await Product.updateOne(
      { _id: hold.product, reservedStock: { $gte: hold.quantity } },
      { $inc: { reservedStock: -hold.quantity } },
      opts
    );
    if (decremented.matchedCount !== 1) logDrift(hold, toStatus);
  }
  return settled;
}

async function settleForOrder(orderId, session, toStatus) {
  if (!isConnected()) return 0;
  let Product; let StockReservation;
  try {
    Product = loadProduct();
    StockReservation = loadStockReservation();
  } catch {
    return 0;
  }
  const query = StockReservation.find({ order: orderId, status: "active" });
  const holds = session ? await query.session(session) : await query;
  if (!holds.length) return 0;
  return settleHolds(holds, toStatus, session, Product, StockReservation);
}

const consumeForOrder = (orderId, session) => settleForOrder(orderId, session, "consumed");
const releaseForOrder = (orderId, session) => settleForOrder(orderId, session, "released");

async function expireStaleHolds(now = new Date()) {
  if (!isConnected()) return 0;
  let Product; let StockReservation;
  try {
    Product = loadProduct();
    StockReservation = loadStockReservation();
  } catch {
    return 0;
  }
  const stale = await StockReservation.find({ status: "active", expiresAt: { $lte: now } }).limit(500);
  if (!stale.length) return 0;
  return settleHolds(stale, "expired", null, Product, StockReservation);
}

// Reporting/tests helper: summed active, unexpired hold quantities
// per product. Availability decisions do NOT use this — they use
// the Product.reservedStock counter (see prepareOrderItems).
async function activeHoldTotals(productIds, session) {
  const StockReservation = loadStockReservation();
  const match = { status: "active", expiresAt: { $gt: new Date() } };
  if (productIds && productIds.length) match.product = { $in: productIds };
  const aggregate = StockReservation.aggregate([
    { $match: match },
    { $group: { _id: "$product", total: { $sum: "$quantity" } } },
  ]);
  const rows = session ? await aggregate.session(session) : await aggregate;
  const totals = new Map();
  for (const row of rows) totals.set(String(row._id), row.total);
  return totals;
}

module.exports = {
  isEnabled,
  ttlMs,
  reserveForOrder,
  consumeForOrder,
  releaseForOrder,
  expireStaleHolds,
  activeHoldTotals,
};
