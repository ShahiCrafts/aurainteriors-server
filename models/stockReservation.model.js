const mongoose = require("mongoose");

// AR-25 (D-D): a TTL stock hold created at guest checkout placement
// when GUEST_STOCK_RESERVATION=on. One document per (order, product)
// — quantities are aggregated per product before reserving. The
// authoritative availability counter is Product.reservedStock; this
// collection is the per-order ledger the confirmation / capture /
// cancellation / expiry paths settle against. New collection
// (created empty by definition), so schema-declared indexes are safe
// here — the no-boot-index precedent guards pre-existing production
// collections, not new ones (same reasoning as models/job.model.js).
const stockReservationSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    // Phase 4 (catalog): a hold may target one variant of the
    // product (the catalogVariants subdocument id) — quantities in
    // the service aggregate per (product, variantId). variantId is
    // unset for legacy product-level holds; sku is the purchased
    // unit's SKU snapshot for the ledger record.
    variantId: { type: mongoose.Schema.Types.ObjectId },
    sku: String,
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["active", "consumed", "released", "expired"],
      default: "active",
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

stockReservationSchema.index({ order: 1, status: 1 });
stockReservationSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model("StockReservation", stockReservationSchema);
