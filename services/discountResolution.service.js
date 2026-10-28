// AR-31(a): the ONE shared discount-resolution core.
//
// Before AR-31, every discount-code lookup site hand-rolled its own
// normalization: createDiscount/updateDiscount stored `code.toUpperCase()`,
// applyDiscount/validateDiscount looked up `code.toUpperCase()`, but
// previewDiscount looked up `req.body.code` VERBATIM — so a stored code
// failed preview unless the client typed it in exact uppercase, while
// apply/validate accepted any casing. All resolution now goes through
// this module so the verdicts cannot drift apart again.
//
// Preserved per-endpoint contracts (characterized in
// tests/platform/discount-resolution.test.js):
//   - unknown code            -> AppError("Invalid discount code", 400)
//   - checkout-time lookup    -> active + unexpired filter, session-bound,
//                                AppError("Invalid or expired discount code", 400)
//   - evaluateDiscount        -> wraps validateForCart/calculateDiscount;
//                                calculateDiscount is only invoked for a
//                                valid verdict, exactly as the old inline
//                                code did at every call site.
const Discount = require("../models/discount.model");
const AppError = require("../utils/AppError");

// Codes are stored uppercase (schema `uppercase: true` + create/update
// normalization), so lookups normalize the same way. Non-string input
// passes through untouched: route validators already require strings,
// and a non-string simply matches nothing (-> the standard 400).
const normalizeDiscountCode = (code) =>
  typeof code === "string" ? code.toUpperCase() : code;

// Find a discount by code (any casing) or throw the shared 400.
const resolveDiscount = async (code) => {
  const discount = await Discount.findOne({
    code: normalizeDiscountCode(code),
  });
  if (!discount) throw new AppError("Invalid discount code", 400);
  return discount;
};

// Checkout-time variant (controllers/order.controller calculateOrderTotals):
// same normalization, plus the active/unexpired gate and the caller's
// transaction session, with checkout's own error message.
const resolveDiscountForCheckout = async (code, session = null) => {
  const discount = await Discount.findOne({
    code: normalizeDiscountCode(code),
    isActive: true,
    expiryDate: { $gt: new Date() },
  }).session(session);
  if (!discount) throw new AppError("Invalid or expired discount code", 400);
  return discount;
};

// Validate a resolved discount against a cart subtotal. Returns the
// validateForCart verdict verbatim and, only when valid, the computed
// discount amount (call sites never calculated an amount for an
// invalid verdict).
const evaluateDiscount = (discount, subtotal) => {
  const validation = discount.validateForCart(subtotal);
  return {
    validation,
    discountAmount: validation.valid ? discount.calculateDiscount(subtotal) : 0,
  };
};

// Sum a populated cart's line totals (price * quantity over items whose
// product survived population). Shared by applyDiscount/validateDiscount,
// whose summation loops were byte-identical.
const sumCartSubtotal = (cart) => {
  let subtotal = 0;
  if (cart && cart.items.length > 0) {
    for (const item of cart.items) {
      if (item.product) {
        subtotal += item.product.price * item.quantity;
      }
    }
  }
  return subtotal;
};

module.exports = {
  normalizeDiscountCode,
  resolveDiscount,
  resolveDiscountForCheckout,
  evaluateDiscount,
  sumCartSubtotal,
};
