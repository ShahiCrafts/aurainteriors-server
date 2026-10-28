const Product = require("../models/product.model");
const AppError = require("../utils/AppError");
const stockReservation = require("./stockReservation.service");
// attributeResolution.service is required LAZILY (inside the
// definitions loader below): it pulls in the catalog model
// files, and — the stockReservation.service precedent — modules
// on the checkout path must not grow load-time model requires,
// because stub-based test harnesses load this chain with a
// stubbed "mongoose" module whose Schema is not a constructor.

// Phase 4 (catalog): the stable, machine-readable codes a client
// can branch on for variant-line failures. Messages stay
// human-readable; codes never change once shipped.
//   VARIANT_REQUIRED     400 — the product has variants but the
//                        line names none, and no default variant
//                        exists to resolve to.
//   VARIANT_NOT_FOUND    400 — the named variant does not exist
//                        on the product (or the product has none).
//   SKU_MISMATCH         400 — the line's denormalized SKU no
//                        longer matches the variant's (SKUs are
//                        immutable: the line is stale or forged).
//   VARIANT_UNAVAILABLE  409 — the variant exists but is disabled.
//   VARIANT_OUT_OF_STOCK 400 — the variant's effective stock
//                        (stock − reservedStock while guest
//                        reservations are on) is below the line
//                        quantity, singly or combined.
const variantOptionsObject = (variant) =>
  variant.options instanceof Map
    ? Object.fromEntries(variant.options)
    : { ...(variant.options || {}) };

// Helper function to validate and prepare cart items
const prepareOrderItems = async (items, session = null) => {
  const orderItems = [];
  // Aligned with orderItems: the resolved { product, variant }
  // behind each prepared line, for the combined-stock pass.
  const resolved = [];

  // FIX: Batch fetch all products instead of one query per item (N+1 prevention)
  // Extract all product IDs first
  const productIds = items.map((item) => item.productId || item.product);
  if (productIds.some((id) => !id))
    throw new AppError("An item is no longer available", 400);

  // Single batch query for all products
  // AR-47: project only the fields read below — status/deletedAt
  // are filter-only. Phase 4: catalogVariants is now read on every
  // call (variant resolution + default-variant fallback), so it
  // joins the projection unconditionally.
  // AR-25: with GUEST_STOCK_RESERVATION=on, reservedStock is ALSO
  // requested by name (an explicit select returns a select:false
  // field — verified by the AR-25 probe) and both stock checks use
  // effective stock = stock - reservedStock. Flag off: the select
  // string and the comparisons are byte-identical to before — no
  // extra fields, no extra queries. Phase 4 applies the same
  // effective-stock rule per variant.
  const reservationsOn = stockReservation.isEnabled();
  const products = await Product.find({
    _id: { $in: productIds },
    deletedAt: null,
    status: "active",
  })
    .select(
      reservationsOn
        ? "_id name price stock images reservedStock catalogVariants"
        : "_id name price stock images catalogVariants",
    )
    .session(session);

  // Create a map for O(1) lookup
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const effectiveStock = (product) =>
    reservationsOn
      ? product.stock - (product.reservedStock || 0)
      : product.stock;
  const effectiveVariantStock = (variant) =>
    (variant.stock || 0) - (reservationsOn ? variant.reservedStock || 0 : 0);

  // Attribute definitions are loaded lazily, once, and only when
  // a variant line actually needs its option labels snapshotted.
  let definitionsByKey = null;
  const definitions = async () => {
    if (!definitionsByKey) {
      const {
        loadActiveDefinitions,
      } = require("./attributeResolution.service");
      definitionsByKey = await loadActiveDefinitions();
    }
    return definitionsByKey;
  };

  // Validate and prepare items
  for (const item of items) {
    const productId = item.productId || item.product;
    const product = productMap.get(productId.toString());

    if (!product) {
      throw new AppError(`Product not found: ${productId}`, 404);
    }

    // Phase 4: resolve the line's purchasable unit. A variantId
    // names the exact variant; a variant-less line on a variant
    // product resolves ONLY to the default variant (the empty
    // combination) — the legacy-cart rule — and is otherwise a
    // per-line rejection, never a silent parent-product sale.
    const variants = Array.isArray(product.catalogVariants)
      ? product.catalogVariants
      : [];
    let variant = null;
    if (item.variantId) {
      variant =
        variants.find((v) => String(v._id) === String(item.variantId)) || null;
      if (!variant) {
        throw new AppError(
          `Variant not found for ${product.name}`,
          400,
          "VARIANT_NOT_FOUND",
        );
      }
      if (
        item.sku &&
        String(item.sku).toUpperCase() !==
          String(variant.sku || "").toUpperCase()
      ) {
        throw new AppError(
          `Variant SKU mismatch for ${product.name}`,
          400,
          "SKU_MISMATCH",
        );
      }
    } else if (variants.length > 0) {
      variant = variants.find((v) => (v.combinationKey || "") === "") || null;
      if (!variant) {
        throw new AppError(
          `${product.name} requires a variant selection`,
          400,
          "VARIANT_REQUIRED",
        );
      }
    }
    if (variant) {
      if (variant.enabled === false) {
        throw new AppError(
          `The selected variant of ${product.name} is unavailable`,
          409,
          "VARIANT_UNAVAILABLE",
        );
      }
      if (effectiveVariantStock(variant) < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${product.name}`,
          400,
          "VARIANT_OUT_OF_STOCK",
        );
      }
    } else if (effectiveStock(product) < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    // Get primary image
    const primaryImage =
      product.images?.find((img) => img.isPrimary)?.url ||
      product.images?.[0]?.url ||
      null;

    // Price authority: the VARIANT's price for a variant line,
    // the product's for a legacy line (server-side, never the
    // client's). The snapshot freezes sku + options (labels
    // resolved from the definitions at placement time).
    let variantSnapshot = {};
    if (variant) {
      const defs = await definitions();
      variantSnapshot = {
        variantId: variant._id,
        sku: variant.sku,
        variantOptions: Object.entries(variantOptionsObject(variant)).map(
          ([key, value]) => ({
            key,
            label: (defs.get(key) && defs.get(key).label) || key,
            value: String(value),
          }),
        ),
      };
    }

    orderItems.push({
      product: product._id,
      ...(item.cartItemId ? { cartItemId: item.cartItemId } : {}),
      name: product.name,
      price: variant ? variant.price : product.price,
      quantity: item.quantity,
      // The free-form triple belongs to legacy lines only: for a
      // variant line the combination lives in variantOptions, and
      // duplicating it into the triple would fork the identity.
      variant: variant ? {} : item.variant || {},
      image: (variant && variant.images && variant.images[0]) || primaryImage,
      ...variantSnapshot,
    });
    resolved.push({ product, variant });
  }

  const quantities = new Map();
  for (let i = 0; i < orderItems.length; i++) {
    const item = orderItems[i];
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0)
      throw new AppError("Invalid item quantity", 400);
    // Variant lines combine per VARIANT (two lines of one product
    // may buy different variants); legacy lines per product, as
    // before.
    const key = resolved[i].variant
      ? `variant:${resolved[i].variant._id}`
      : `product:${item.product}`;
    const entry = quantities.get(key) || { ...resolved[i], quantity: 0 };
    entry.quantity += item.quantity;
    quantities.set(key, entry);
  }
  for (const entry of quantities.values()) {
    if (entry.variant) {
      if (effectiveVariantStock(entry.variant) < entry.quantity) {
        throw new AppError(
          "Insufficient combined variant stock",
          400,
          "VARIANT_OUT_OF_STOCK",
        );
      }
    } else if (effectiveStock(entry.product) < entry.quantity) {
      throw new AppError("Insufficient combined product stock", 400);
    }
  }
  return orderItems;
};

module.exports = { prepareOrderItems };
