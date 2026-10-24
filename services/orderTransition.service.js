const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const AppError = require("../utils/AppError");
const { recordGuestStockConfirmFailure } = require("./guestStockMetrics.service");
const stockReservation = require("./stockReservation.service");
// FA-09: the guarded per-item stock commitment for a guest COD order
// whose deferral ends. The per-item guard (stock >= quantity) makes the
// deduction atomic per product; if any item can no longer be fulfilled
// the caller aborts and the order is not confirmed. Shared by the
// transition hook below and by guest checkout's in-place COD
// confirmation (commit-audit C-2: checkout IS the confirmation point
// for guest COD, so without this call the stock was never deducted).
exports.commitGuestCodStock = async (order, session) => {
  for (const item of order.items) {
    const deducted = await Product.updateOne({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { session });
    if (deducted.matchedCount !== 1) {
      // AR-25 (always-on, both flag states): a guest confirmation
      // that fails on stock is counted + logged BEFORE the existing
      // 409 aborts the transition — the failure must be visible.
      recordGuestStockConfirmFailure({
        orderId: order._id,
        source: "commitGuestCodStock",
        reason: "Insufficient stock to confirm this order",
      });
      throw new AppError("Insufficient stock to confirm this order", 409);
    }
  }
};
exports.transitionOrder = async (filter, status, note, customer = false) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne(filter).session(session).populate("user", "firstName lastName email");
      if (!order) throw new AppError("Order not found", 404);
      const previousStatus = order.orderStatus;
      const transitions = { pending: ["confirmed", "cancelled"], confirmed: ["processing", "shipped", "cancelled"], processing: ["shipped", "cancelled"], shipped: ["delivered"], delivered: [], cancelled: [] };
      if (!transitions[previousStatus]?.includes(status) || (customer && status !== "cancelled")) throw new AppError("Invalid order status transition", 400);
      if (status !== "cancelled" && order.paymentMethod === "esewa" && (order.paymentStatus !== "paid" || order.stockDeducted !== true)) throw new AppError("Payment and inventory must be confirmed before fulfillment", 400);
      // FA-09 (owner-approved 2026-10-23): a deferred guest COD order
      // commits its stock HERE, at confirmation - the first point
      // where a human/system has accepted the order. The per-item
      // guard (stock >= quantity) makes the deduction atomic per
      // product; if any item can no longer be fulfilled the whole
      // transition aborts and the order stays pending for the admin
      // to resolve (confirm later or cancel).
      if (status === "confirmed" && order.isGuestOrder === true && order.paymentMethod === "cod" && order.stockDeducted === false) {
        await exports.commitGuestCodStock(order, session);
        order.stockDeducted = true;
        // AR-25: the order's stock is now committed for real, so any
        // reservation holds it carried are consumed (unconditional
        // call — a no-op when the order holds nothing, e.g. it was
        // placed while the flag was off).
        await stockReservation.consumeForOrder(order._id, session);
      }
      if (status === "cancelled") {
        const hadDeductedStock = order.stockDeducted;
        if (order.stockDeducted === true) {
          for (const item of order.items) {
            const restored = await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
            if (restored.matchedCount !== 1) throw new AppError("Inventory reconciliation required", 409);
          }
          order.stockDeducted = false;
        } else if (order.stockDeducted === undefined) {
          order.inventoryReviewRequired = true; // Legacy inventory must be reconciled, not guessed.
        }
        // AR-25: an order that never deducted stock releases any
        // reservation holds instead (nothing was committed, so there
        // is nothing to restore — the holds simply stop counting).
        if (hadDeductedStock === false || hadDeductedStock === undefined) {
          await stockReservation.releaseForOrder(order._id, session);
        }
        order.cancelledAt = new Date();
        if (order.paymentStatus === "paid") {
          order.refundRequest = { status: "pending", requestedAt: new Date(), reason: "Cancelled paid order; refund reconciliation required" };
        } else if (order.paymentStatus === "pending") {
          order.paymentStatus = "failed"; // unpaid cancellation, never a refund
        }
      }
      const timestamps = { confirmed: "confirmedAt", shipped: "shippedAt", delivered: "deliveredAt" };
      if (timestamps[status]) order[timestamps[status]] = new Date();
      if (status === "delivered" && order.paymentMethod === "cod") {
        order.paymentStatus = "paid";
        order.paymentDetails = { ...order.paymentDetails, paidAt: new Date() };
      }
      order.addStatusHistory(status, note);
      await order.save({ session });
      result = { order, previousStatus };
    });
    return result;
  } finally { await session.endSession(); }
};
