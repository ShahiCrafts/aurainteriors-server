const { consumeDiscountUsage } = require("./discountUsage.service");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Cart = require("../models/cart.model");
const PaymentCapture = require("../models/paymentCapture.model");
const { recordGuestStockConfirmFailure } = require("./guestStockMetrics.service");
const stockReservation = require("./stockReservation.service");

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
      // Phase 4: quantities aggregate per purchasable unit —
      // (product, variantId) for variant lines, product for legacy
      // lines — and each unit deducts through its own guarded
      // update (the variant service's, with this path's sellable
      // conditions, for variants). Any shortfall is the existing
      // PAYMENT_OUT_OF_STOCK -> review_required outcome.
      const quantities = new Map();
      for (const item of order.items) {
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error("PAYMENT_ITEMS_INVALID");
        const key = item.variantId ? `variant:${item.product}:${item.variantId}` : `product:${item.product}`;
        const entry = quantities.get(key) || { product: item.product, variantId: item.variantId || null, quantity: 0 };
        entry.quantity += item.quantity;
        quantities.set(key, entry);
      }
      let variantService = null;
      const getVariantService = () => (variantService ??= require("./productVariant.service"));
      const mirrored = new Set();
      for (const entry of quantities.values()) {
        const changed = entry.variantId
          ? await getVariantService().deductVariantStock(entry.product, entry.variantId, entry.quantity, { session, sellableOnly: true })
          : await Product.updateOne({ _id: entry.product, deletedAt: null, status: "active", stock: { $gte: entry.quantity } },
            { $inc: { stock: -entry.quantity } }, { session });
        if (changed.modifiedCount !== 1) {
          // AR-25 (always-on): a GUEST capture failing on stock —
          // money moved, fulfillment impossible — is counted +
          // logged before the existing review_required fallback.
          if (order.isGuestOrder === true) {
            recordGuestStockConfirmFailure({
              orderId: order._id,
              source: "esewaCapture",
              reason: "PAYMENT_OUT_OF_STOCK",
            });
          }
          throw new Error("PAYMENT_OUT_OF_STOCK");
        }
        if (entry.variantId) mirrored.add(String(entry.product));
      }
      for (const productId of mirrored) {
        await getVariantService().refreshStockMirror(productId, { session });
      }
      // AR-25: stock is now committed for real, so any reservation
      // holds this order carried are consumed. (The review_required
      // path above/below deliberately leaves holds alone: they
      // expire by TTL, or a later reconcile consumes them.)
      await stockReservation.consumeForOrder(order._id, session);
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
