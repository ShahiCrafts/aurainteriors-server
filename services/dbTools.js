const mongoose = require("mongoose");
const { escapeRegExp } = require("../utils/escapeRegex");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Order = require("../models/order.model");
const Address = require("../models/address.model");
const User = require("../models/user.model");

// FA-13 / FA-32 (FRESH): guest order lookups disclose as little as possible
// and fail indistinguishably. One shared error string; a per-key failure
// throttle (5 failures per 15 minutes) blunts order-id/email grinding.
const GUEST_LOOKUP_ERROR =
  "Order not found, or the email does not match this order.";
const guestLookupFailures = new Map();
function guestLookupThrottled(key) {
  const entry = guestLookupFailures.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    guestLookupFailures.delete(key);
    return false;
  }
  return entry.count >= 5;
}
function noteGuestLookupFailure(key) {
  const now = Date.now();
  const entry = guestLookupFailures.get(key);
  if (!entry || now > entry.resetAt)
    guestLookupFailures.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
  else entry.count += 1;
  if (guestLookupFailures.size > 10000) guestLookupFailures.clear();
}

// AR-36: getOrderHistory returns at most this many (most recent) orders.
const ORDER_HISTORY_LIMIT = 20;

// AR-37: apply a caller-supplied time budget to a Mongoose query as
// maxTimeMS, so a query abandoned by the chatV2 tool timeout is also
// CANCELLED server-side instead of running to completion. Callers
// without a budget (the legacy orchestrator) pass no opts and keep the
// previous unbounded-by-default behavior. The typeof guard keeps
// lightweight query stubs (tests) working unchanged.
function applyMaxTime(query, opts) {
  const ms = opts && Number(opts.maxTimeMS);
  if (
    Number.isFinite(ms) &&
    ms > 0 &&
    query &&
    typeof query.maxTimeMS === "function"
  ) {
    return query.maxTimeMS(Math.floor(ms));
  }
  return query;
}

class DbTools {
  /**
   * Search product catalog
   */
  async searchProducts({ query, categoryName, limit = 5 }, opts = {}) {
    try {
      const dbQuery = { status: "active", deletedAt: null };

      if (categoryName) {
        const escapedCategory = escapeRegExp(categoryName);
        const category = await applyMaxTime(
          Category.findOne({
            name: { $regex: new RegExp(`^${escapedCategory}$`, "i") },
          }),
          opts,
        )
          .select("_id")
          .lean();
        if (category) {
          dbQuery.category = category._id;
        }
      }

      if (query) {
        // Product has a text index on name/description/tags. Use it instead of
        // unanchored regex scans so deterministic commerce replies stay fast as the catalog grows.
        dbQuery.$text = { $search: String(query).slice(0, 80) };
      }

      const products = await applyMaxTime(Product.find(dbQuery), opts)
        .limit(Math.min(Math.max(Number(limit) || 5, 1), 10))
        .select("name price originalPrice stock sku status description slug")
        .populate("category", "name")
        .lean();

      return products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        stock: p.stock,
        sku: p.sku,
        status: p.status,
        category: p.category?.name,
        shortDescription: p.description?.substring(0, 150) + "...",
        // FIX 1: Use canonical singular /product/ and the real slug instead of raw ID
        url: `/product/${p.slug || p._id}`,
      }));
    } catch (error) {
      console.error("DbTools searchProducts error:", error.message);
      return [];
    }
  }

  /**
   * Get detailed product specifications
   */
  async getProductDetails({ sku, productId }, opts = {}) {
    try {
      const dbQuery = {
        deletedAt: null,
        status: { $in: ["active", "out_of_stock"] },
      };
      if (productId) dbQuery._id = productId;
      else if (sku) dbQuery.sku = sku.toUpperCase();
      else return { error: "Either sku or productId must be provided" };

      const product = await applyMaxTime(Product.findOne(dbQuery), opts)
        .populate("category", "name")
        .lean();

      if (!product) return { error: "Product not found" };

      return {
        id: product._id.toString(),
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
        status: product.status,
        category: product.category?.name,
        description: product.description,
        dimensions: product.dimensions,
        // FIX 1: Use canonical singular /product/ and the real slug instead of raw ID
        url: `/product/${product.slug || product._id}`,
      };
    } catch (error) {
      console.error("DbTools getProductDetails error:", error.message);
      return { error: "Failed to retrieve product details" };
    }
  }

  /**
   * Retrieve order status securely.
   */
  async getOrderStatus({ orderId, email, userId, lookupKey }, opts = {}) {
    try {
      // --- Logged-in customer path ---
      if (userId) {
        const query = { user: userId };
        if (orderId) {
          // Specific order requested
          const order = await applyMaxTime(
            Order.findOne({
              $or: [
                { orderId, user: userId },
                ...(mongoose.isValidObjectId(orderId)
                  ? [{ _id: orderId, user: userId }]
                  : []),
              ],
            }),
            opts,
          ).lean();

          if (!order) return { error: "Order not found for your account" };
          return this._formatOrder(order);
        }

        // No orderId — return the 3 most recent orders for the customer to choose from
        const orders = await applyMaxTime(Order.find(query), opts)
          .sort({ createdAt: -1 })
          .limit(3)
          .lean();

        if (orders.length === 0)
          return { error: "No orders found for your account" };
        if (orders.length === 1) return this._formatOrder(orders[0]);

        return {
          message:
            "Here are your most recent orders. Please specify an order ID for more details.",
          orders: orders.map((o) => ({
            orderId: o.orderId,
            status: o.orderStatus,
            total: o.total,
            itemCount: o.items.length,
            createdAt: o.createdAt,
          })),
        };
      }

      // --- Guest path: require both orderId and email ---
      if (!orderId || !email) {
        return {
          error:
            "Please provide your order ID and the email address used when placing the order to look up your order status.",
        };
      }

      // FA-13: failed guest lookups are throttled per caller key so the
      // orderId+email pair cannot be ground against the catalogue.
      if (lookupKey && guestLookupThrottled(lookupKey)) {
        return { error: "Too many lookup attempts. Please try again later." };
      }

      const order = await applyMaxTime(
        Order.findOne({
          $or: [
            { orderId },
            ...(mongoose.isValidObjectId(orderId) ? [{ _id: orderId }] : []),
          ],
        }),
        opts,
      )
        .populate("user", "email")
        .lean();

      const orderEmail = order
        ? order.isGuestOrder
          ? order.guestInfo?.email
          : order.user?.email
        : null;
      // FA-32: ONE uniform error for "no such order" and "email mismatch" -
      // the two cases must be indistinguishable to the caller.
      if (
        !order ||
        !orderEmail ||
        orderEmail.toLowerCase() !== String(email).toLowerCase()
      ) {
        if (lookupKey) noteGuestLookupFailure(lookupKey);
        return { error: GUEST_LOOKUP_ERROR };
      }

      // FA-13: guests receive a minimal status view - never the shipping
      // address, phone, or stored payment-gateway payload.
      return this._formatGuestOrder(order);
    } catch (error) {
      console.error("DbTools getOrderStatus error:", error.message);
      return { error: "Failed to retrieve order status" };
    }
  }

  /**
   * Retrieve order history for logged-in user (read-only).
   * AR-36: bounded to the most recent ORDER_HISTORY_LIMIT orders — the
   * previous implementation loaded the user's ENTIRE history into
   * memory and the tool pipeline. Projection matches _formatOrder's
   * field set (the same discipline as getOrderStatus' formatted view);
   * formatted output for users with <= the limit is unchanged.
   */
  async getOrderHistory({ userId }, opts = {}) {
    try {
      if (!userId) return { error: "User context not available." };
      const orders = await applyMaxTime(Order.find({ user: userId }), opts)
        .sort({ createdAt: -1 })
        .limit(ORDER_HISTORY_LIMIT)
        .select(
          "orderId orderStatus paymentMethod paymentStatus total shippingAddress items createdAt",
        )
        .lean();
      return orders.map((o) => this._formatOrder(o));
    } catch (error) {
      console.error("DbTools getOrderHistory error:", error.message);
      return [];
    }
  }

  /**
   * Retrieve default address for logged-in user (read-only).
   */
  async getDefaultAddress({ userId }, opts = {}) {
    try {
      if (!userId) return { error: "User context not available." };
      const address = await applyMaxTime(
        Address.findOne({ user: userId, isDefault: true }),
        opts,
      ).lean();
      if (address) return address;

      const fallback = await applyMaxTime(
        Address.findOne({ user: userId }),
        opts,
      ).lean();
      return fallback || null;
    } catch (error) {
      console.error("DbTools getDefaultAddress error:", error.message);
      return null;
    }
  }

  /**
   * Retrieve all saved addresses for logged-in user (read-only).
   */
  async getSavedAddresses({ userId }, opts = {}) {
    try {
      if (!userId) return { error: "User context not available." };
      const addresses = await applyMaxTime(
        Address.find({ user: userId }),
        opts,
      ).lean();
      return addresses;
    } catch (error) {
      console.error("DbTools getSavedAddresses error:", error.message);
      return [];
    }
  }

  /**
   * Retrieve customer profile information (read-only).
   */
  async getProfileInfo({ userId }, opts = {}) {
    try {
      if (!userId) return { error: "User context not available." };
      const user = await applyMaxTime(User.findById(userId), opts)
        .select("firstName lastName email role phone createdAt")
        .lean();
      if (!user) return { error: "User profile not found" };
      return {
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone || "Not provided",
        memberSince: user.createdAt,
      };
    } catch (error) {
      console.error("DbTools getProfileInfo error:", error.message);
      return { error: "Failed to retrieve profile information" };
    }
  }

  // FA-13: the guest view of an order - status-level fields only.
  _formatGuestOrder(order) {
    return {
      orderId: order.orderId,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      total: order.total,
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
      createdAt: order.createdAt,
    };
  }

  _formatOrder(order) {
    return {
      orderId: order.orderId,
      status: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      shippingAddress: {
        fullName: order.shippingAddress?.fullName,
        phone: order.shippingAddress?.phone,
        addressLine1: order.shippingAddress?.addressLine1,
        addressLine2: order.shippingAddress?.addressLine2,
        city: order.shippingAddress?.city,
        country: order.shippingAddress?.country,
      },
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      createdAt: order.createdAt,
    };
  }
}

module.exports = new DbTools();
module.exports.ORDER_HISTORY_LIMIT = ORDER_HISTORY_LIMIT;
