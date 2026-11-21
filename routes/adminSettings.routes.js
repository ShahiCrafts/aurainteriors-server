const {
  adminReadLimiter,
  adminWriteLimiter,
} = require("../middleware/rateLimit.middleware");
const express = require("express");
const router = express.Router();
router.use(adminReadLimiter);
router.use(adminWriteLimiter);
const settingsController = require("../controllers/settings.controller");
const integrationsController = require("../controllers/integrations.controller");
const knowledgeController = require("../controllers/knowledge.controller");
const {
  uploadCategoryImage,
  resizeCategoryImage,
} = require("../middleware/upload.middleware");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// ==================== ADMIN ROUTES ====================
// All routes below require an authenticated admin (same guard shape
// as routes/admin.review.routes.js). Mounted at /api/v1/admin.

router.use(protect, restrictTo("admin"));

// Site settings (Batch 1)
router.get("/settings", settingsController.getAdminSettings);
router.put("/settings/:section", settingsController.updateSettingsSection);

// Settings image upload (Batch 3a) — reuses the existing category
// image pipeline (multer -> SVG policy -> Cloudinary); no new
// upload backend.
router.post(
  "/settings/image",
  uploadCategoryImage,
  resizeCategoryImage,
  settingsController.uploadSettingsImage,
);

// Knowledge base (Batch 3a): re-index every document.
router.post("/knowledge/reindex", knowledgeController.reindexAllDocuments);

// Integrations & secrets (Batch 1). Secret values are write-only:
// no route ever returns a stored or resolved secret value.
router.get("/integrations", integrationsController.getIntegrations);
router.put(
  "/integrations/:service/secret",
  integrationsController.setIntegrationSecret,
);
router.delete(
  "/integrations/:service/secret",
  integrationsController.deleteIntegrationSecret,
);
router.post(
  "/integrations/:service/test",
  integrationsController.testIntegrationSecret,
);

module.exports = router;
