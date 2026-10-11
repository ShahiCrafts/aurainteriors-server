const Product = require("../models/product.model");
const AppError = require("../utils/AppError");

// Helper function to validate and prepare cart items
const prepareOrderItems = async (items, session = null) => {
  const orderItems = [];

  // FIX: Batch fetch all products instead of one query per item (N+1 prevention)
  // Extract all product IDs first
  const productIds = items.map((item) => item.productId || item.product);
  if (productIds.some(id => !id)) throw new AppError("An item is no longer available", 400);

  // Single batch query for all products
  const products = await Product.find({
    _id: { $in: productIds }, deletedAt: null, status: "active",
  }).session(session);

  // Create a map for O(1) lookup
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // Validate and prepare items
  for (const item of items) {
    const productId = item.productId || item.product;
    const product = productMap.get(productId.toString());

    if (!product) {
      throw new AppError(`Product not found: ${productId}`, 404);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    // Get primary image
    const primaryImage =
      product.images?.find((img) => img.isPrimary)?.url ||
      product.images?.[0]?.url ||
      null;

    orderItems.push({
      product: product._id,
      ...(item.cartItemId ? { cartItemId: item.cartItemId } : {}),
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      variant: item.variant || {},
      image: primaryImage,
    });
  }

  const quantities = new Map();
  for (const item of orderItems) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new AppError("Invalid item quantity", 400);
    const id = String(item.product);
    quantities.set(id, (quantities.get(id) || 0) + item.quantity);
  }
  for (const [id, quantity] of quantities) {
    if (productMap.get(id).stock < quantity) throw new AppError("Insufficient combined product stock", 400);
  }
  return orderItems;
};

module.exports = { prepareOrderItems };
