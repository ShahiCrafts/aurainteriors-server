const {
  standardReadLimiter,
  standardWriteLimiter,
} = require("../middleware/rateLimit.middleware");
const objectIdParam = require("../middleware/objectIdParam.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
// SR-8: public GET /:id resolves slug-or-id in getProduct, so the id
// guard is method-aware here (GET passes through; mutations stay
// strict). :productId (reviews nesting) keeps the strict guard.
router.param("id", objectIdParam.slugOrObjectIdParam);
router.param("productId", objectIdParam);
const productController = require("../controllers/product.controller");
const productVariantController = require("../controllers/productVariant.controller");
const {
  protect,
  protectOptional,
  restrictTo,
} = require("../middleware/auth.middleware");
const {
  uploadProductFiles,
  processProductFiles,
} = require("../middleware/upload.middleware");
const validate = require("../middleware/validate.middleware");
const { deleteFromCloudinary } = require("../config/cloudinary");
const {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  updateStockSchema,
  setPrimaryImageSchema,
  createVariantSchema,
  updateVariantSchema,
} = require("../validators/product.validator");

const publicCache = require("../middleware/publicCache.middleware");

const reviewRoutes = require("./review.routes");

router.use("/:productId/reviews", reviewRoutes);

router.get(
  "/",
  publicCache,
  protectOptional,
  validate(getProductsQuerySchema, "query"),
  productController.getAllProducts,
);
router.get("/featured", publicCache, productController.getFeaturedProducts);
router.get("/new-arrivals", publicCache, productController.getNewArrivals);
router.get("/:id", publicCache, protectOptional, productController.getProduct);
// Related stays on the strict :productId guard: getRelatedProducts
// has no slug branch and genuinely requires an ObjectId (SR-8 scope).
router.get(
  "/:productId/related",
  publicCache,
  productController.getRelatedProducts,
);

router.use(protect, restrictTo("admin"));

// FA-23: body validation runs BEFORE any file is uploaded to
// Cloudinary, and if a later step rejects the request, every asset this
// request uploaded is deleted again - no orphaned storage.
const cleanupUploadedProductFiles = async (err, req, res, next) => {
  try {
    const uploaded = [
      ...(req.files?.images || []).map((f) => [f.cloudinaryPublicId, "image"]),
      ...(req.files?.modelFiles || []).map((f) => [
        f.cloudinaryPublicId,
        "raw",
      ]),
    ].filter(([id]) => Boolean(id));
    await Promise.allSettled(
      uploaded.map(([id, type]) => deleteFromCloudinary(id, type)),
    );
  } catch {
    /* cleanup is best-effort; the original error wins */
  }
  next(err);
};

router.post(
  "/",
  uploadProductFiles,
  validate(createProductSchema),
  processProductFiles,
  productController.createProduct,
  cleanupUploadedProductFiles,
);

router.patch(
  "/:id",
  uploadProductFiles,
  validate(updateProductSchema),
  processProductFiles,
  productController.updateProduct,
  cleanupUploadedProductFiles,
);

router.delete("/:id", productController.deleteProduct);
router.delete("/:id/permanent", productController.hardDeleteProduct);
router.patch(
  "/:id/primary-image",
  validate(setPrimaryImageSchema),
  productController.setPrimaryImage,
);
router.patch(
  "/:id/stock",
  validate(updateStockSchema),
  productController.updateStock,
);

// Phase 3 (catalog): variant CRUD (admin — this whole section sits
// behind protect + restrictTo("admin") above). All variant writes
// funnel into services/productVariant.service.js. The :id param
// guard is method-aware (Phase 0.5): mutations keep the strict
// ObjectId 400; the GET list re-checks the id shape in the
// controller. Variant payloads are JSON (images are URL strings),
// so no upload middleware runs here.
router.get("/:id/variants", productVariantController.listVariants);
router.post(
  "/:id/variants",
  validate(createVariantSchema),
  productVariantController.createVariant,
);
router.patch(
  "/:id/variants/:variantId",
  validate(updateVariantSchema),
  productVariantController.updateVariant,
);
router.delete(
  "/:id/variants/:variantId",
  productVariantController.deleteVariant,
);

module.exports = router;
