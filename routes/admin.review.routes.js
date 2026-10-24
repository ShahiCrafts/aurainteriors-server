const { adminReadLimiter, adminWriteLimiter } = require("../middleware/rateLimit.middleware");
const objectIdParam = require("../middleware/objectIdParam.middleware");
const express = require("express");
const router = express.Router();
router.use(adminReadLimiter);
router.use(adminWriteLimiter);
router.param("reviewId", objectIdParam); // FA-77: was "id" - never matched the :reviewId routes
const reviewController = require("../controllers/review.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  getReviewsQuerySchema,
  adminResponseSchema,
} = require("../validators/review.validator");

router.use(protect, restrictTo("admin"));

router.get(
  "/",
  validate(getReviewsQuerySchema, "query"),
  reviewController.getAllReviews
);
router.get("/:reviewId", reviewController.getReview);
router.post(
  "/:reviewId/response",
  validate(adminResponseSchema),
  reviewController.addAdminResponse
);
router.patch("/:reviewId/toggle-approval", reviewController.toggleApproval);
router.delete("/:reviewId", reviewController.deleteReview);

module.exports = router;
