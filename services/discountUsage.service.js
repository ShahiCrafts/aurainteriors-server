const Discount = require("../models/discount.model");
exports.consumeDiscountUsage = async (order, session) => {
  if (!order.discountCode?.code || order.discountUsageConsumed) return;
  const consumed = await Discount.findOneAndUpdate({
    code: order.discountCode.code, isActive: true, expiryDate: { $gt: new Date() },
    minimumOrderAmount: { $lte: order.subtotal },
    discountPercentage: order.discountCode.percentage,
    $or: [{ maxUsageLimit: null }, { $expr: { $lt: ["$currentUsageCount", "$maxUsageLimit"] } }],
  }, { $inc: { currentUsageCount: 1 } }, { new: true, session });
  if (!consumed) throw new Error("DISCOUNT_UNAVAILABLE");
  order.discountUsageConsumed = true;
};
