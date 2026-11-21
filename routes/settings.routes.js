const {
  standardReadLimiter,
} = require("../middleware/rateLimit.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
const settingsController = require("../controllers/settings.controller");

// ==================== PUBLIC ROUTES ====================
// Anonymous, public-safe settings projection only (identity, theme,
// contact/socials, SEO defaults, homepage flags, commerce display
// fields, chat flags, analytics public IDs, maintenance state).
// Cache-Control for anonymous GETs is applied in app.js, matching
// the anonymous catalog caching pattern.

router.get("/public", settingsController.getPublicSettings);

module.exports = router;
