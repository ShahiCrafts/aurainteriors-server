// Phase 3 (catalog) — admin variant CRUD for
// /products/:id/variants[/:variantId].
//
// Thin HTTP layer over services/productVariant.service.js, which
// owns every invariant (option key set, engine-validated values,
// SKU/combination uniqueness, SKU immutability, derived fields).
// These routes sit behind the product router's admin guard
// (protect + restrictTo("admin")); mutations additionally pass
// the router's strict ObjectId param guard (Phase 0.5), while the
// GET list — whose :id guard is method-aware — re-checks the id
// shape here so a slug can never reach a query as an ObjectId.
const Product = require("../models/product.model");
const variantService = require("../services/productVariant.service");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

async function loadProduct(req) {
  const { id } = req.params;
  if (!OBJECT_ID_PATTERN.test(String(id || ""))) {
    throw new AppError("Invalid product ID", 400);
  }
  const product = await Product.findOne({ _id: id, deletedAt: null });
  if (!product) throw new AppError("Product not found", 404);
  return product;
}

function productSummary(product, derived) {
  return {
    _id: product._id,
    hasVariants: derived ? derived.hasVariants : product.hasVariants,
    priceFrom: derived ? derived.priceFrom : (product.priceFrom ?? null),
  };
}

// GET /products/:id/variants (admin) — the product's variants plus
// its derived summary.
exports.listVariants = catchAsync(async (req, res, next) => {
  const product = await loadProduct(req);
  const variants = (product.catalogVariants || []).map((variant) =>
    typeof variant.toObject === "function" ? variant.toObject() : variant
  );
  res.status(200).json({
    status: "success",
    results: variants.length,
    data: {
      variants,
      product: productSummary(product),
    },
  });
});

// POST /products/:id/variants (admin)
exports.createVariant = catchAsync(async (req, res, next) => {
  const product = await loadProduct(req);
  const { variant, hasVariants, priceFrom } = await variantService.createVariant(
    product,
    req.body
  );
  res.status(201).json({
    status: "success",
    data: {
      variant,
      product: productSummary(product, { hasVariants, priceFrom }),
    },
  });
});

// PATCH /products/:id/variants/:variantId (admin)
exports.updateVariant = catchAsync(async (req, res, next) => {
  const product = await loadProduct(req);
  const { variant, hasVariants, priceFrom } = await variantService.updateVariant(
    product,
    req.params.variantId,
    req.body
  );
  res.status(200).json({
    status: "success",
    data: {
      variant,
      product: productSummary(product, { hasVariants, priceFrom }),
    },
  });
});

// DELETE /products/:id/variants/:variantId (admin)
exports.deleteVariant = catchAsync(async (req, res, next) => {
  const product = await loadProduct(req);
  const { hasVariants, priceFrom } = await variantService.deleteVariant(
    product,
    req.params.variantId
  );
  res.status(200).json({
    status: "success",
    data: {
      product: productSummary(product, { hasVariants, priceFrom }),
    },
  });
});
