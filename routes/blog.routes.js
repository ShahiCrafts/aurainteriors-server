const { standardReadLimiter, standardWriteLimiter } = require("../middleware/rateLimit.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
const blogController = require("../controllers/blog.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { publicEndpointRateLimit } = require("../middleware/rateLimit.middleware");

// Public routes - anyone can access
router.get("/", blogController.getAllBlogs);
router.get("/categories", blogController.getBlogCategories);
router.get("/sources", blogController.getFeedSources);
router.get("/popular", blogController.getPopularBlogs);
router.get("/featured", blogController.getFeaturedBlogs);
router.get("/stats", blogController.getBlogStats);
router.get("/:id", blogController.getBlog);
router.get("/:id/related", blogController.getRelatedBlogs);

// Like a blog (public - simple counter)
router.post("/:id/like", publicEndpointRateLimit(60), blogController.likeBlog);

// Admin route - refresh RSS feeds manually
router.post("/refresh", protect, restrictTo("admin"), blogController.refreshFeeds);

module.exports = router;
