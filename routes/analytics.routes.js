const {
  adminReadLimiter,
  adminWriteLimiter,
} = require("../middleware/rateLimit.middleware");
const express = require("express");
const router = express.Router();
router.use(adminReadLimiter);
router.use(adminWriteLimiter);
const analyticsController = require("../controllers/analytics.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// All routes are protected and restricted to admin
router.use(protect, restrictTo("admin"));

router.get("/stats", analyticsController.getDashboardStats);
router.get("/revenue", analyticsController.getRevenueAnalytics);
router.get("/categories", analyticsController.getCategorySales);
router.get("/top-products", analyticsController.getTopProducts);

module.exports = router;
