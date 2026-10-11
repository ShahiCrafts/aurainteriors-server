const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const AppError = require("../utils/AppError");
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
      if (status === "cancelled") {
        if (order.stockDeducted === true) {
          for (const item of order.items) {
            const restored = await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
            if (restored.matchedCount !== 1) throw new AppError("Inventory reconciliation required", 409);
          }
          order.stockDeducted = false;
        } else if (order.stockDeducted === undefined) {
          order.inventoryReviewRequired = true; // Legacy inventory must be reconciled, not guessed.
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
