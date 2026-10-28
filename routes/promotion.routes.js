const {
  standardReadLimiter,
  standardWriteLimiter,
} = require("../middleware/rateLimit.middleware");
const objectIdParam = require("../middleware/objectIdParam.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
router.param("id", objectIdParam);
const promotionController = require("../controllers/promotion.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { userRateLimit } = require("../middleware/rateLimit.middleware");
const {
  createPromotionSchema,
  updatePromotionSchema,
  schedulePromotionSchema,
  trackEngagementSchema,
  previewPromotionSchema,
  getPromotionsQuerySchema,
} = require("../validators/promotion.validator");

router.use(protect);

router.post(
  "/track",
  userRateLimit(60, "Too many tracking requests. Please try again later."),
  validate(trackEngagementSchema),
  promotionController.trackEngagement,
);
router.use(restrictTo("admin"));
router.get(
  "/",
  validate(getPromotionsQuerySchema, "query"),
  promotionController.getAllPromotions,
);
router.post(
  "/preview",
  validate(previewPromotionSchema),
  promotionController.previewPromotion,
);
router.post(
  "/",
  validate(createPromotionSchema),
  promotionController.createPromotion,
);
router.get("/:id", promotionController.getPromotion);
router.patch(
  "/:id",
  validate(updatePromotionSchema),
  promotionController.updatePromotion,
);
router.delete("/:id", promotionController.deletePromotion);
router.post("/:id/send", promotionController.sendPromotion);
router.post(
  "/:id/schedule",
  validate(schedulePromotionSchema),
  promotionController.schedulePromotion,
);
router.post("/:id/cancel", promotionController.cancelPromotion);
router.get("/:id/analytics", promotionController.getPromotionAnalytics);

module.exports = router;
