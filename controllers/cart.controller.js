const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const variantKey = variant => JSON.stringify(["color", "size", "material"].map(key => variant?.[key] || ""));
const validVariant = variant => variant && typeof variant === "object" && !Array.isArray(variant) &&
  Object.keys(variant).every(key => ["color", "size", "material"].includes(key) &&
    typeof variant[key] === "string" && variant[key].length <= 100);
const visibleItems = cart => cart.items.filter(item => item.product);

// FA-47 / AR-26: ONE guarded-write helper for every cart mutation. The
// update only lands if the cart has not changed since it was read
// (optimistic concurrency on __v): two racing mutations can no longer
// both pass their checks against a stale snapshot - the loser gets a
// 409 instead of silently overwriting. Returns true when the write
// landed (and bumps the local version to match the stored one).
const guardedCartWrite = async (cart, items) => {
  const write = await Cart.updateOne(
    { _id: cart._id, __v: cart.__v },
    { $set: { items }, $inc: { __v: 1 } }
  );
  if (write.matchedCount !== 1) return false;
  cart.__v += 1;
  return true;
};
const cartConflictError = () => new AppError("Your cart was updated in another request. Please retry.", 409);

// AR-26: with CART_GET_READONLY=on, GET /cart performs no writes at all
// (no create-on-GET, no persisted prune). Default (unset) preserves the
// historical create-and-prune behavior exactly. See FLAGS.md.
const cartGetReadOnly = () => require("../config/appConfig").getString("CART_GET_READONLY") === "on";


// Get user's cart
exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    match: { deletedAt: null, status: { $in: ["active", "out_of_stock"] } },
    select: "name slug price originalPrice images category stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  if (!cart) {
    if (cartGetReadOnly()) {
      // AR-26: no cart document exists and GET must not create one.
      return res.status(200).json({
        success: true,
        data: { cart: { _id: null, items: [], totalItems: 0, subtotal: 0 } },
      });
    }
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Calculate totals
  let subtotal = 0;
  const validItems = [];

  for (const item of cart.items) {
    if (item.product) {
      subtotal += item.product.price * item.quantity;
      validItems.push(item);
    }
  }

  // Remove invalid items if any were found. AR-26: with
  // CART_GET_READONLY=on the prune is response-only (visibleItems below
  // already excludes them); the stored cart is left untouched.
  if (validItems.length !== cart.items.length && !cartGetReadOnly()) {
    cart.items = validItems;
    await cart.save();
  }

  res.status(200).json({
    success: true,
    data: {
      cart: {
        _id: cart._id,
        items: visibleItems(cart),
        totalItems: visibleItems(cart).reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
      },
    },
  });
});

// Add item to cart
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1, variant = {} } = req.body;

  if (!productId) {
    return next(new AppError("Product ID is required", 400));
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return next(new AppError("Quantity must be a positive integer", 400));
  }
  if (!validVariant(variant)) return next(new AppError("Invalid product variant", 400));
  if (!/^[a-f0-9]{24}$/i.test(productId)) return next(new AppError("Invalid product ID", 400));

  // Check if product exists
  const product = await Product.findOne({ _id: productId, deletedAt: null, status: "active" });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Check stock
  if (product.stock < quantity) {
    return next(new AppError("Insufficient stock", 400));
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const existingQuantity = cart.items.reduce((total, item) =>
    total + (String(item.product) === String(product._id) ? item.quantity : 0), 0);
  if (!Number.isSafeInteger(existingQuantity + quantity) || existingQuantity + quantity > product.stock) {
    return next(new AppError("Insufficient combined product stock", 400));
  }

  // Check if item already exists with same variant
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === String(product._id) &&
      variantKey(item.variant) === variantKey(variant)
  );

  if (existingItemIndex > -1) {
    // Update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (newQuantity > product.stock) {
      return next(new AppError("Insufficient stock", 400));
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      quantity,
      variant,
      addedAt: new Date(),
    });
  }

  // FA-47 guarded write via the shared AR-26 helper (see top of file).
  if (!(await guardedCartWrite(cart, cart.items))) {
    return next(cartConflictError());
  }

  // Populate and return updated cart
  await cart.populate({
    path: "items.product",
    match: { deletedAt: null, status: { $in: ["active", "out_of_stock"] } },
    select: "name slug price originalPrice images category stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  let subtotal = 0;
  for (const item of cart.items) {
    if (item.product) {
      subtotal += item.product.price * item.quantity;
    }
  }

  res.status(200).json({
    success: true,
    message: "Item added to cart",
    data: {
      cart: {
        _id: cart._id,
        items: visibleItems(cart),
        totalItems: visibleItems(cart).reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
      },
    },
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
  const product = await Product.findOne({ _id: item.product, deletedAt: null, status: "active" });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const otherQuantity = cart.items.reduce((total, cartItem) => total +
    (String(cartItem._id) !== String(item._id) && String(cartItem.product) === String(product._id)
      ? cartItem.quantity : 0), 0);
  if (!Number.isSafeInteger(otherQuantity + quantity) || otherQuantity + quantity > product.stock) {
    return next(new AppError("Insufficient stock", 400));
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
    select: "name slug price originalPrice images category stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  let subtotal = 0;
  for (const cartItem of cart.items) {
    if (cartItem.product) {
      subtotal += cartItem.product.price * cartItem.quantity;
    }
  }

  res.status(200).json({
    success: true,
    message: "Cart updated",
    data: {
      cart: {
        _id: cart._id,
        items: visibleItems(cart),
        totalItems: visibleItems(cart).reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
      },
    },
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
    (item) => item._id.toString() === itemId
  );

  if (itemIndex === -1) {
    return next(new AppError("Item not found in cart", 404));
  }

  cart.items.splice(itemIndex, 1);
  // AR-26: guarded write, same as add/update - was a plain save()
  // (whole-array last-writer-wins) before.
  if (!(await guardedCartWrite(cart, cart.items))) {
    return next(cartConflictError());
  }

  // Populate and return updated cart
  await cart.populate({
    path: "items.product",
    match: { deletedAt: null, status: { $in: ["active", "out_of_stock"] } },
    select: "name slug price originalPrice images category stock",
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  let subtotal = 0;
  for (const item of cart.items) {
    if (item.product) {
      subtotal += item.product.price * item.quantity;
    }
  }

  res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data: {
      cart: {
        _id: cart._id,
        items: visibleItems(cart),
        totalItems: visibleItems(cart).reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
      },
    },
  });
});

// Clear cart
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  // AR-26: guarded write, same as add/update - was a plain save().
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
