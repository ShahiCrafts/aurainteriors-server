const { standardReadLimiter, standardWriteLimiter } = require("../middleware/rateLimit.middleware");
const objectIdParam = require("../middleware/objectIdParam.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
router.param("id", objectIdParam);
router.param("productId", objectIdParam);
const productController = require("../controllers/product.controller");
const { protect, protectOptional, restrictTo } = require("../middleware/auth.middleware");
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
} = require("../validators/product.validator");

const reviewRoutes = require("./review.routes");

router.use("/:productId/reviews", reviewRoutes);

router.get(
  "/",
  protectOptional,
  validate(getProductsQuerySchema, "query"),
  productController.getAllProducts
);
router.get("/featured", productController.getFeaturedProducts);
router.get("/new-arrivals", productController.getNewArrivals);
router.get("/:id", protectOptional, productController.getProduct);
router.get("/:id/related", productController.getRelatedProducts);

router.use(protect, restrictTo("admin"));

// FA-23: body validation runs BEFORE any file is uploaded to
// Cloudinary, and if a later step rejects the request, every asset this
// request uploaded is deleted again - no orphaned storage.
const cleanupUploadedProductFiles = async (err, req, res, next) => {
  try {
    const uploaded = [
      ...(req.files?.images || []).map((f) => [f.cloudinaryPublicId, "image"]),
      ...(req.files?.modelFiles || []).map((f) => [f.cloudinaryPublicId, "raw"]),
    ].filter(([id]) => Boolean(id));
    await Promise.allSettled(uploaded.map(([id, type]) => deleteFromCloudinary(id, type)));
  } catch { /* cleanup is best-effort; the original error wins */ }
  next(err);
};

router.post(
  "/",
  uploadProductFiles,
  validate(createProductSchema),
  processProductFiles,
  productController.createProduct,
  cleanupUploadedProductFiles
);

router.patch(
  "/:id",
  uploadProductFiles,
  validate(updateProductSchema),
  processProductFiles,
  productController.updateProduct,
  cleanupUploadedProductFiles
);

router.delete("/:id", productController.deleteProduct);
router.delete("/:id/permanent", productController.hardDeleteProduct);
router.patch(
  "/:id/primary-image",
  validate(setPrimaryImageSchema),
  productController.setPrimaryImage
);
router.patch(
  "/:id/stock",
  validate(updateStockSchema),
  productController.updateStock
);

module.exports = router;
