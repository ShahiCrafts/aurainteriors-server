"use strict";

// Batch 5 (Handover): demo-data identification/wipe + the handover
// readiness checklist aggregation.
//
// Demo identification: seed products (scripts/seed.js) carry a
// product-level sku "AUR-DEMO-*" and their variant SKUs in
// catalogVariants.sku also start "AUR-DEMO-". A product is demo if
// EITHER matches. Already soft-deleted products are excluded
// (deletedAt: null), combined via $and so the $or stays intact.

const Product = require("../models/product.model");
const Cart = require("../models/cart.model");
const Wishlist = require("../models/wishlist.model");
const User = require("../models/user.model");
const catalogCache = require("../utils/catalogCache");
const auditLog = require("./auditLog.service");
const settingsService = require("./settings/settingsService");
const secretsService = require("./settings/secretsService");
const { DEFAULT_SETTINGS } = require("./settings/defaults");

const DEMO_OR = [
  { sku: /^AUR-DEMO-/ },
  { "catalogVariants.sku": /^AUR-DEMO-/ },
];

// Live (not soft-deleted) demo products.
const DEMO_FILTER = { $and: [{ deletedAt: null }, { $or: DEMO_OR }] };

async function countDemoAndTotal() {
  const [demoProducts, totalProducts] = await Promise.all([
    Product.countDocuments(DEMO_FILTER),
    Product.countDocuments({ deletedAt: null }),
  ]);
  return { demoProducts, totalProducts };
}

async function getDemoStatus() {
  return countDemoAndTotal();
}

// Hard-delete every live demo product and pull its references out
// of carts and wishlists. Orders/customers are deliberately
// untouched: order history keeps its product snapshots.
async function wipeDemoProducts(reqUser, ip) {
  const demoDocs = await Product.find(DEMO_FILTER).select("_id").lean();
  const ids = demoDocs.map((doc) => doc._id);

  const result = await Product.deleteMany(DEMO_FILTER);
  const deleted =
    result && typeof result.deletedCount === "number"
      ? result.deletedCount
      : ids.length;

  if (ids.length > 0) {
    await Cart.updateMany(
      {},
      { $pull: { items: { product: { $in: ids } } } },
    );
    await Wishlist.updateMany(
      {},
      { $pull: { products: { product: { $in: ids } } } },
    );
  }

  catalogCache.invalidateCatalogCache();

  await auditLog.record({
    actor: reqUser ? reqUser._id || reqUser.id : undefined,
    action: "handover.demoWipe",
    targetType: "Product",
    targetId: "demo",
    after: { deleted },
    ip,
  });

  return { deleted };
}

// Handover readiness checklist: aggregates REAL state (secret
// sources, demo vs real products, identity/contact completeness,
// payments, shipping, maintenance, team presence). The response
// shape is fixed — see controllers/handover.controller.js.
async function getHandoverStatus() {
  const described = await secretsService.describeSecrets();
  const keys = { adminSet: 0, envOnly: 0, missing: 0 };
  for (const entry of described) {
    if (entry.source === "admin") keys.adminSet += 1;
    else if (entry.source === "env") keys.envOnly += 1;
    else keys.missing += 1;
  }

  const { demoProducts, totalProducts } = await countDemoAndTotal();
  const settings = await settingsService.getSettings();

  const identity = settings.identity || {};
  const contactSettings = settings.contact || {};

  let esewaSecret = null;
  try {
    esewaSecret = await secretsService.getResolvedSecret(
      "payments.esewaSecret",
    );
  } catch {
    esewaSecret = null;
  }
  const esewaMerchantId =
    settings.integrations &&
    settings.integrations.esewa &&
    settings.integrations.esewa.merchantId;

  const zones =
    (settings.commerce &&
      settings.commerce.shipping &&
      settings.commerce.shipping.zones) ||
    [];

  const adminUserCount = await User.countDocuments({
    role: { $in: ["admin", "manager", "staff"] },
    deletedAt: null,
  });

  return {
    keys,
    demoProducts,
    totalProducts,
    realProducts: totalProducts - demoProducts,
    identity: {
      storeNameSet:
        !!identity.storeName &&
        identity.storeName !== DEFAULT_SETTINGS.identity.storeName,
      logoSet:
        !!identity.logoUrl &&
        identity.logoUrl !== DEFAULT_SETTINGS.identity.logoUrl,
    },
    contact: {
      phone: !!contactSettings.phone,
      email: !!contactSettings.email,
      address: !!contactSettings.address,
    },
    payments: {
      esewaConfigured: !!esewaMerchantId || !!esewaSecret,
    },
    shippingZonesEnabled: zones.filter((z) => z && z.enabled).length,
    maintenanceEnabled: !!(
      settings.maintenance && settings.maintenance.enabled
    ),
    hasAdminUsers: adminUserCount > 0,
  };
}

module.exports = {
  DEMO_FILTER,
  getDemoStatus,
  wipeDemoProducts,
  getHandoverStatus,
};
