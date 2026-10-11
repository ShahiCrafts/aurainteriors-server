const { consumeDiscountUsage } = require("./discountUsage.service");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Cart = require("../models/cart.model");
const PaymentCapture = require("../models/paymentCapture.model");

// Called only after callback verification. Provider verification is the caller's responsibility.
exports.captureEsewaPayment = async (orderId, merchantId, response) => {
  const key = `${merchantId}:${response.transaction_code}`;
  const session = await mongoose.startSession();
  let result;
  const details = {
    transactionId: response.transaction_code, esewaRefId: response.transaction_code,
    paidAt: new Date(), paymentGatewayResponse: response,
  };
  const process = async (reviewReason) => {
    result = undefined; // withTransaction may rerun this callback after a conflict.
    const previous = await PaymentCapture.findById(key).session(session);
    if (previous) {
      if (String(previous.order) !== String(orderId)) throw new Error("PAYMENT_TRANSACTION_CONFLICT");
      result = { outcome: previous.outcome, applied: false };
      return;
    }
    const order = await Order.findById(orderId).session(session);
    if (!order || order.paymentMethod !== "esewa") throw new Error("PAYMENT_ORDER_INVALID");
    if (order.paymentStatus === "paid") {
      if (order.paymentDetails?.transactionId !== response.transaction_code) throw new Error("PAYMENT_TRANSACTION_CONFLICT");
      result = { outcome: order.orderStatus === "pending" || order.orderStatus === "cancelled" ? "review_required" : "confirmed", applied: false };
      return;
    }
    // Never reactivate a cancelled/refunded/otherwise transitioned order.
    const eligible = order.paymentStatus === "pending" && order.orderStatus === "pending";
    if (!eligible && order.paymentStatus === "refunded") throw new Error("PAYMENT_ORDER_CLOSED");
    const reason = reviewReason || (!eligible ? "Payment received after order state changed; reconcile manually" : null);
    if (!reason) {
      await consumeDiscountUsage(order, session);
      const quantities = new Map();
      for (const item of order.items) {
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error("PAYMENT_ITEMS_INVALID");
        const id = String(item.product);
        quantities.set(id, (quantities.get(id) || 0) + item.quantity);
      }
      for (const [product, quantity] of quantities) {
        const changed = await Product.updateOne({ _id: product, deletedAt: null, status: "active", stock: { $gte: quantity } },
          { $inc: { stock: -quantity } }, { session });
        if (changed.modifiedCount !== 1) throw new Error("PAYMENT_OUT_OF_STOCK");
      }
    }
    const outcome = reason ? "review_required" : "confirmed";
    await PaymentCapture.create([{ _id: key, order: order._id, outcome, reason }], { session });
    const claim = await Order.updateOne({ _id: order._id, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus }, {
      $set: { paymentStatus: "paid", paymentDetails: details,
        ...(reason ? {} : { orderStatus: "confirmed", confirmedAt: new Date(), stockDeducted: true, discountUsageConsumed: order.discountUsageConsumed }) },
      $push: { statusHistory: { status: reason ? order.orderStatus : "confirmed",
        note: reason || "Payment confirmed via eSewa", timestamp: new Date() } },
    }, { session });
    if (claim.modifiedCount !== 1) throw new Error("PAYMENT_ORDER_CHANGED");
    if (!reason && order.user) {
      // Remove only the purchased cart lines, preserving other variants and later additions.
      if (order.items.every(item => item.cartItemId)) {
        const cart = await Cart.findOne({ user: order.user }).session(session);
        if (cart) {
          const purchased = new Map(order.items.map(item => [String(item.cartItemId), item.quantity]));
          cart.items = cart.items.filter(item => {
            const quantity = purchased.get(String(item._id));
            if (!quantity) return true;
            item.quantity -= quantity;
            return item.quantity > 0;
          });
          await cart.save({ session });
        }
      }
      // Legacy orders lack line IDs: preserve their cart rather than deleting unrelated variants.

    }
    result = { outcome, applied: true, order };
  };
  try {
    try {
      await session.withTransaction(() => process(null));
    } catch (error) {
      if (!["PAYMENT_OUT_OF_STOCK", "DISCOUNT_UNAVAILABLE"].includes(error.message)) throw error;
      // The failed fulfillment transaction rolls back ALL stock writes. Record
      // received payment separately without claiming a refund or fulfillment.
      await session.withTransaction(() => process(error.message === "DISCOUNT_UNAVAILABLE" ? "Paid but discount usage unavailable; reconcile manually" : "Paid but stock unavailable; reconcile fulfillment or refund manually"));
    }
    return result;
  } finally {
    await session.endSession();
  }
};
