const {
  standardReadLimiter,
  standardWriteLimiter,
} = require("../middleware/rateLimit.middleware");
const objectIdParam = require("../middleware/objectIdParam.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
// SR-8: public GET /:id and /:id/products resolve slug-or-id in the
// controller, so the id guard is method-aware here (GET passes
// through; mutations stay strict).
router.param("id", objectIdParam.slugOrObjectIdParam);
const categoryController = require("../controllers/category.controller");
const publicCache = require("../middleware/publicCache.middleware");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const {
  uploadCategoryImage,
  resizeCategoryImage,
} = require("../middleware/upload.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesQuerySchema,
  reorderCategoriesSchema,
  setCategoryAttributeAssignmentsSchema,
} = require("../validators/category.validator");

router.get(
  "/",
  publicCache,
  validate(getCategoriesQuerySchema, "query"),
  categoryController.getAllCategories,
);
router.get("/:id", publicCache, categoryController.getCategory);
router.get(
  "/:id/products",
  publicCache,
  categoryController.getCategoryProducts,
);

router.use(protect, restrictTo("admin"));

router.post(
  "/",
  uploadCategoryImage,
  resizeCategoryImage,
  validate(createCategorySchema),
  categoryController.createCategory,
);

// Phase 1: sibling reorder (same-parent ids, position = sortOrder).
router.post(
  "/reorder",
  validate(reorderCategoriesSchema),
  categoryController.reorderCategories,
);

router.patch(
  "/:id",
  uploadCategoryImage,
  resizeCategoryImage,
  validate(updateCategorySchema),
  categoryController.updateCategory,
);

router.delete("/:id", categoryController.deleteCategory);

// Phase 2: attribute assignment management for this category
// (own list; the resolved/inherited view is the public
// GET /catalog/categories/:ref/attributes).
router.get(
  "/:id/attributes",
  categoryController.getCategoryAttributeAssignments,
);
router.put(
  "/:id/attributes",
  validate(setCategoryAttributeAssignmentsSchema),
  categoryController.setCategoryAttributeAssignments,
);

module.exports = router;
