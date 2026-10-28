const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const variantKey = (variant) =>
  JSON.stringify(
    ["color", "size", "material"].map((key) => variant?.[key] || ""),
  );
const validVariant = (variant) =>
  variant &&
  typeof variant === "object" &&
  !Array.isArray(variant) &&
  Object.keys(variant).every(
    (key) =>
      ["color", "size", "material"].includes(key) &&
      typeof variant[key] === "string" &&
      variant[key].length <= 100,
  );
const visibleItems = (cart) => cart.items.filter((item) => item.product);

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const CART_PRODUCT_SELECT =
  "name slug price originalPrice images category stock catalogVariants hasVariants";
const findLineVariant = (product, variantId) =>
  ((product && product.catalogVariants) || []).find(
    (v) => String(v._id) === String(variantId),
  ) || null;
const variantDetailsFor = (item) => {
  if (
    !item ||
    !item.variantId ||
    !item.product ||
    typeof item.product !== "object"
  )
    return null;
  const variant = findLineVariant(item.product, item.variantId);
  if (!variant) return null;
  const options =
    variant.options instanceof Map
      ? Object.fromEntries(variant.options)
      : { ...(variant.options || {}) };
  return {
    sku: variant.sku,
    options,
    price: variant.price,
    ...(variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
      ? { compareAtPrice: variant.compareAtPrice }
      : {}),
    stock: variant.stock || 0,
    available:
      variant.enabled !== false &&
      (variant.stock || 0) - (variant.reservedStock || 0) > 0,
  };
};
const serializeCart = (cart) => {
  const visible = visibleItems(cart);
  const items = visible.map((item) => {
    const plain =
      typeof item.toObject === "function" ? item.toObject() : { ...item };
    const details = variantDetailsFor(item);
    if (details) plain.variantDetails = details;
    return plain;
  });
  let subtotal = 0;
  for (const item of visible) {
    const details = item.variantId ? variantDetailsFor(item) : null;
    subtotal += (details ? details.price : item.product.price) * item.quantity;
  }
  return {
    _id: cart._id,
    items,
    totalItems: visible.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
  };
};

const guardedCartWrite = async (cart, items) => {
  const write = await Cart.updateOne(
    { _id: cart._id, __v: cart.__v },
    { $set: { items }, $inc: { __v: 1 } },
  );
  if (write.matchedCount !== 1) return false;
  cart.__v += 1;
  return true;
};
const cartConflictError = () =>
  new AppError("Your cart was updated in another request. Please retry.", 409);

const cartGetReadOnly = () =>
  require("../config/appConfig").getString("CART_GET_READONLY") === "on";

// Get user's cart
exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    match: { deletedAt: null, status: { $in: ["active", "out_of_stock"] } },
    select: CART_PRODUCT_SELECT,
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  if (!cart) {
    if (cartGetReadOnly()) {
      return res.status(200).json({
        success: true,
        data: { cart: { _id: null, items: [], totalItems: 0, subtotal: 0 } },
      });
    }
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const validItems = cart.items.filter((item) => item.product);

  if (validItems.length !== cart.items.length && !cartGetReadOnly()) {
    cart.items = validItems;
    await cart.save();
  }

  res.status(200).json({
    success: true,
    data: { cart: serializeCart(cart) },
  });
});

// Add item to cart
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1, variant = {}, variantId } = req.body;

  if (!productId) {
    return next(new AppError("Product ID is required", 400));
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return next(new AppError("Quantity must be a positive integer", 400));
  }
  if (!validVariant(variant))
    return next(new AppError("Invalid product variant", 400));
  if (!/^[a-f0-9]{24}$/i.test(productId))
    return next(new AppError("Invalid product ID", 400));
  if (
    variantId !== undefined &&
    variantId !== null &&
    variantId !== "" &&
    !OBJECT_ID_RE.test(String(variantId))
  ) {
    return next(new AppError("Invalid variant ID", 400, "VARIANT_NOT_FOUND"));
  }

  // Check if product exists
  const product = await Product.findOne({
    _id: productId,
    deletedAt: null,
    status: "active",
  });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const productVariants = product.catalogVariants || [];
  let lineVariant = null;
  if (productVariants.length > 0) {
    if (!variantId) {
      return next(
        new AppError(
          "Please select a variant for this product",
          400,
          "VARIANT_REQUIRED",
        ),
      );
    }
    lineVariant = findLineVariant(product, variantId);
    if (!lineVariant) {
      return next(new AppError("Variant not found", 400, "VARIANT_NOT_FOUND"));
    }
    if (lineVariant.enabled === false) {
      return next(
        new AppError("This variant is unavailable", 409, "VARIANT_UNAVAILABLE"),
      );
    }
  } else if (variantId) {
    return next(
      new AppError("This product has no variants", 400, "VARIANT_NOT_FOUND"),
    );
  }
  const lineStock = lineVariant ? lineVariant.stock || 0 : product.stock;

  // Check stock
  if (lineStock < quantity) {
    return next(
      new AppError(
        "Insufficient stock",
        400,
        lineVariant ? "VARIANT_OUT_OF_STOCK" : undefined,
      ),
    );
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const sameUnit = (item) =>
    String(item.product) === String(product._id) &&
    (lineVariant
      ? String(item.variantId || "") === String(lineVariant._id)
      : !item.variantId);
  const existingQuantity = cart.items.reduce(
    (total, item) => total + (sameUnit(item) ? item.quantity : 0),
    0,
  );
  if (
    !Number.isSafeInteger(existingQuantity + quantity) ||
    existingQuantity + quantity > lineStock
  ) {
    return next(
      new AppError(
        "Insufficient combined product stock",
        400,
        lineVariant ? "VARIANT_OUT_OF_STOCK" : undefined,
      ),
    );
  }

  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === String(product._id) &&
      (lineVariant
        ? String(item.variantId || "") === String(lineVariant._id)
        : !item.variantId && variantKey(item.variant) === variantKey(variant)),
  );

  if (existingItemIndex > -1) {
    // Update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (newQuantity > lineStock) {
      return next(
        new AppError(
          "Insufficient stock",
          400,
          lineVariant ? "VARIANT_OUT_OF_STOCK" : undefined,
        ),
      );
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      quantity,
      variant: lineVariant ? {} : variant,
      ...(lineVariant
        ? { variantId: lineVariant._id, sku: lineVariant.sku }
        : {}),
      addedAt: new Date(),
    });
  }

  if (!(await guardedCartWrite(cart, cart.items))) {
    return next(cartConflictError());
  }

  // Populate and return updated cart
  await cart.populate({
    path: "items.product",
    match: { deletedAt: null, status: { $in: ["active", "out_of_stock"] } },
    select: CART_PRODUCT_SELECT,
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  res.status(200).json({
    success: true,
    message: "Item added to cart",
    data: { cart: serializeCart(cart) },
  });
});

// Update cart item quantity
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return next(new AppError("Quantity must be a positive integer", 400));
  }

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  const item = cart.items.id(itemId);

  if (!item) {
    return next(new AppError("Item not found in cart", 404));
  }

  // Check stock
  const product = await Product.findOne({
    _id: item.product,
    deletedAt: null,
    status: "active",
  });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Phase 4: a variant line's stock is its variant's; the other
  // lines it combines with are the ones buying the SAME unit.
  let lineStock = product.stock;
  if (item.variantId) {
    const variant = findLineVariant(product, item.variantId);
    if (!variant) {
      return next(
        new AppError(
          "This variant is no longer available",
          400,
          "VARIANT_NOT_FOUND",
        ),
      );
    }
    if (variant.enabled === false) {
      return next(
        new AppError("This variant is unavailable", 409, "VARIANT_UNAVAILABLE"),
      );
    }
    lineStock = variant.stock || 0;
  }
  const otherQuantity = cart.items.reduce(
    (total, cartItem) =>
      total +
      (String(cartItem._id) !== String(item._id) &&
      String(cartItem.product) === String(product._id) &&
      String(cartItem.variantId || "") === String(item.variantId || "")
        ? cartItem.quantity
        : 0),
    0,
  );
  if (
    !Number.isSafeInteger(otherQuantity + quantity) ||
    otherQuantity + quantity > lineStock
  ) {
    return next(
      new AppError(
        "Insufficient stock",
        400,
        item.variantId ? "VARIANT_OUT_OF_STOCK" : undefined,
      ),
    );
  }

  item.quantity = quantity;
  // FA-47 guarded write via the shared AR-26 helper (see top of file).
  if (!(await guardedCartWrite(cart, cart.items))) {
    return next(cartConflictError());
  }

  // Populate and return updated cart
  await cart.populate({
    path: "items.product",
    match: { deletedAt: null, status: { $in: ["active", "out_of_stock"] } },
    select: CART_PRODUCT_SELECT,
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  res.status(200).json({
    success: true,
    message: "Cart updated",
    data: { cart: serializeCart(cart) },
  });
});

// Remove item from cart
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId,
  );

  if (itemIndex === -1) {
    return next(new AppError("Item not found in cart", 404));
  }

  cart.items.splice(itemIndex, 1);
  if (!(await guardedCartWrite(cart, cart.items))) {
    return next(cartConflictError());
  }

  // Populate and return updated cart
  await cart.populate({
    path: "items.product",
    match: { deletedAt: null, status: { $in: ["active", "out_of_stock"] } },
    select: CART_PRODUCT_SELECT,
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data: { cart: serializeCart(cart) },
  });
});

// Clear cart
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  if (!(await guardedCartWrite(cart, []))) {
    return next(cartConflictError());
  }
  cart.items = [];

  res.status(200).json({
    success: true,
    message: "Cart cleared",
    data: {
      cart: {
        _id: cart._id,
        items: [],
        totalItems: 0,
        subtotal: 0,
      },
    },
  });
});
