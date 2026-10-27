const { prepareOrderItems } = require("../services/checkoutItems.service");
const {
  resolveDiscount,
  evaluateDiscount,
  sumCartSubtotal,
} = require("../services/discountResolution.service");
const { selectCartItems } = require("../utils/selectCartItems");
const Discount = require("../models/discount.model");
const Cart = require("../models/cart.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { boundedLimit, boundedPage } = require("../utils/listQuery");
const auditLog = require("../services/auditLog.service"); // VULN-004

exports.getAllDiscounts = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status === "active") {
    filter.isActive = true;
    filter.expiryDate = { $gt: new Date() };
  } else if (status === "expired") {
    filter.expiryDate = { $lte: new Date() };
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  const pageNum = boundedPage(page);
  const limitNum = boundedLimit(limit, 20);
  const skip = (pageNum - 1) * limitNum;

  const [discounts, total] = await Promise.all([
    Discount.find(filter)
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Discount.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: discounts.length,
    data: {
      discounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

exports.getDiscount = catchAsync(async (req, res, next) => {
  const discount = await Discount.findById(req.params.id).populate(
    "createdBy",
    "firstName lastName email"
  );

  if (!discount) {
    return next(new AppError("Discount code not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      discount,
    },
  });
});

exports.createDiscount = catchAsync(async (req, res, next) => {
  const {
    code,
    description,
    discountPercentage,
    minimumOrderAmount,
    maxUsageLimit,
    expiryDate,
    isActive,
  } = req.body;

  const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });
  if (existingDiscount) {
    return next(new AppError("A discount with this code already exists", 400));
  }

  const discount = await Discount.create({
    code: code.toUpperCase(),
    description,
    discountPercentage,
    minimumOrderAmount: minimumOrderAmount || 0,
    maxUsageLimit: maxUsageLimit || null,
    expiryDate,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user._id,
  });

  await auditLog.record({ // VULN-004 (never throws)
    actor: req.user?._id,
    action: "discount.create",
    targetType: "Discount",
    targetId: discount._id,
    after: { code: discount.code, discountPercentage: discount.discountPercentage, isActive: discount.isActive },
    ip: req.ip,
  });

  res.status(201).json({
    status: "success",
    data: {
      discount,
    },
  });
});

exports.updateDiscount = catchAsync(async (req, res, next) => {
  const {
    code,
    description,
    discountPercentage,
    minimumOrderAmount,
    maxUsageLimit,
    expiryDate,
    isActive,
  } = req.body;

  const discount = await Discount.findById(req.params.id);

  if (!discount) {
    return next(new AppError("Discount code not found", 404));
  }

  // VULN-004: before-snapshot of the fields this handler can change.
  const beforeDiscount = {
    code: discount.code,
    discountPercentage: discount.discountPercentage,
    minimumOrderAmount: discount.minimumOrderAmount,
    maxUsageLimit: discount.maxUsageLimit,
    isActive: discount.isActive,
  };

  if (code && code.toUpperCase() !== discount.code) {
    const existingDiscount = await Discount.findOne({
      code: code.toUpperCase(),
    });
    if (existingDiscount) {
      return next(
        new AppError("A discount with this code already exists", 400)
      );
    }
    discount.code = code.toUpperCase();
  }

  if (description !== undefined) discount.description = description;
  if (discountPercentage !== undefined)
    discount.discountPercentage = discountPercentage;
  if (minimumOrderAmount !== undefined)
    discount.minimumOrderAmount = minimumOrderAmount;
  if (maxUsageLimit !== undefined)
    discount.maxUsageLimit = maxUsageLimit || null;
  if (expiryDate !== undefined) discount.expiryDate = expiryDate;
  if (isActive !== undefined) discount.isActive = isActive;

  await discount.save();

  await auditLog.record({ // VULN-004 (never throws)
    actor: req.user?._id,
    action: "discount.update",
    targetType: "Discount",
    targetId: discount._id,
    before: beforeDiscount,
    after: {
      code: discount.code,
      discountPercentage: discount.discountPercentage,
      minimumOrderAmount: discount.minimumOrderAmount,
      maxUsageLimit: discount.maxUsageLimit,
      isActive: discount.isActive,
    },
    ip: req.ip,
  });

  res.status(200).json({
    status: "success",
    data: {
      discount,
    },
  });
});

exports.deleteDiscount = catchAsync(async (req, res, next) => {
  const discount = await Discount.findByIdAndDelete(req.params.id);

  if (!discount) {
    return next(new AppError("Discount code not found", 404));
  }

  await auditLog.record({ // VULN-004 (never throws)
    actor: req.user?._id,
    action: "discount.delete",
    targetType: "Discount",
    targetId: discount._id,
    before: { code: discount.code, discountPercentage: discount.discountPercentage, isActive: discount.isActive },
    ip: req.ip,
  });

  res.status(200).json({
    status: "success",
    message: "Discount code deleted successfully",
  });
});

exports.applyDiscount = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return next(new AppError("Please provide a discount code", 400));
  }

  // AR-31(a): resolution + evaluation via the shared core
  // (services/discountResolution.service.js).
  const discount = await resolveDiscount(code);

  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select: "name price",
  });

  if (!cart || cart.items.length === 0) {
    return next(new AppError("Your cart is empty", 400));
  }

  const subtotal = sumCartSubtotal(cart);

  const { validation, discountAmount } = evaluateDiscount(discount, subtotal);
  if (!validation.valid) {
    return next(new AppError(validation.message, 400));
  }

  const finalTotal = subtotal - discountAmount;

  res.status(200).json({
    status: "success",
    data: {
      discount: {
        code: discount.code,
        description: discount.description,
        discountPercentage: discount.discountPercentage,
        discountAmount,
      },
      cart: {
        subtotal,
        discountAmount,
        total: finalTotal,
      },
    },
  });
});

exports.validateDiscount = catchAsync(async (req, res, next) => {
  const { code } = req.params;

  // AR-31(a): resolution + evaluation via the shared core.
  const discount = await resolveDiscount(code);

  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select: "price",
  });

  const subtotal = sumCartSubtotal(cart);

  const { validation, discountAmount } = evaluateDiscount(discount, subtotal);

  res.status(200).json({
    status: "success",
    data: {
      valid: validation.valid,
      message: validation.message,
      discount: validation.valid
        ? {
            code: discount.code,
            discountPercentage: discount.discountPercentage,
            minimumOrderAmount: discount.minimumOrderAmount,
            discountAmount,
          }
        : null,
    },
  });
});

exports.previewDiscount = catchAsync(async (req, res) => {
  let items;
  if (req.user) {
    if (!req.body.selectedItemIds) throw new AppError("Select your cart items", 400);
    const cart = await Cart.findOne({ user: req.user._id });
    const selected = selectCartItems(cart?.items || [], req.body.selectedItemIds);
    items = selected.map(item => ({ productId: item.product, quantity: item.quantity, variant: item.variant }));
  } else {
    if (!req.body.items) throw new AppError("Provide guest cart items", 400);
    items = req.body.items;
  }
  if (!items?.length) throw new AppError("Select items before applying a promo", 400);
  const prepared = await prepareOrderItems(items);
  const subtotal = prepared.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // AR-31(a): was `Discount.findOne({ code: req.body.code })` VERBATIM —
  // the one lookup site that did not normalize, so a stored (uppercase)
  // code failed preview unless typed in exact uppercase. Now resolved
  // through the shared core, identical verdicts to apply/validate.
  const discount = await resolveDiscount(req.body.code);
  const { validation, discountAmount } = evaluateDiscount(discount, subtotal);
  if (!validation.valid) throw new AppError(validation.message, 400);
  res.status(200).json({ status: "success", data: {
    discount: { code: discount.code, discountPercentage: discount.discountPercentage, discountAmount },
    cart: { subtotal, discountAmount, total: subtotal - discountAmount },
  } });
});
