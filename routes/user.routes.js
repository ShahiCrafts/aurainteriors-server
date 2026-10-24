const { standardReadLimiter, standardWriteLimiter } = require("../middleware/rateLimit.middleware");
const objectIdParam = require("../middleware/objectIdParam.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
router.param("id", objectIdParam);
const userController = require("../controllers/user.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// All routes here are admin only
router.use(protect, restrictTo("admin"));

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUser);
router.patch("/:id/status", userController.updateUserStatus);
router.delete("/:id", userController.deleteUser);

module.exports = router;
