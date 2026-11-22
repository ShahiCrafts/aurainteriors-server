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
const {
  protect,
  restrictTo,
  requireRole: requireRoleMw,
} = require("../middleware/auth.middleware");
// requireRole is the Batch 5 alias of restrictTo; fall back to
// restrictTo so older test harnesses that stub only restrictTo keep
// loading this router.
const requireRole = requireRoleMw || restrictTo;

// ==================== ADMIN ROUTES ====================
// Mounted at /api/v1/admin. Every route requires authentication
// (protect); authorization is per-route via requireRole.
//
// ROLE MATRIX (Batch 5 — enforced here and in
// routes/adminHandover.routes.js):
//   Owner = role "admin". Team roles "manager"/"staff" are NEW
//   (models/user.model.js). "staff" currently has no admin-surface
//   access; it exists so Owners can grant it route-by-route later.
//   - secrets (GET describe, PUT/DELETE secret, POST test under
//     /admin/integrations): admin ONLY.
//   - settings GET + PUT /admin/settings/:section: admin + manager.
//   - settings reset: admin ONLY.
//   - settings backup/restore: admin ONLY (adminHandover routes).
//   - handover demo-status + wipe-demo: admin ONLY;
//     handover/status GET: admin + manager (adminHandover routes).
//   - audit-logs GET: admin + manager (adminHandover routes).
//   - test-email POST: admin + manager.
//   - media GET: admin + manager; media DELETE: admin ONLY
//     (adminHandover routes).
//   - settings image upload + knowledge reindex: admin + manager.

router.use(protect);

// Site settings (Batch 1)
router.get(
  "/settings",
  requireRole("admin", "manager"),
  settingsController.getAdminSettings,
);
router.put(
  "/settings/:section",
  requireRole("admin", "manager"),
  settingsController.updateSettingsSection,
);

// Settings reset (Batch 3d) — restore DEFAULT_SETTINGS per section
// or for all sections. Owner only (role matrix).
router.post(
  "/settings/reset",
  requireRole("admin"),
  settingsController.resetSettings,
);

// Test email (Batch 4) — render a notifications template with sample
// data and send it through the existing Brevo path.
router.post(
  "/settings/test-email",
  requireRole("admin", "manager"),
  settingsController.sendTestEmail,
);

// Settings image upload (Batch 3a) — reuses the existing category
// image pipeline (multer -> SVG policy -> Cloudinary); no new
// upload backend.
router.post(
  "/settings/image",
  requireRole("admin", "manager"),
  uploadCategoryImage,
  resizeCategoryImage,
  settingsController.uploadSettingsImage,
);

// Knowledge base (Batch 3a): re-index every document.
router.post(
  "/knowledge/reindex",
  requireRole("admin", "manager"),
  knowledgeController.reindexAllDocuments,
);

// Integrations & secrets (Batch 1). Secret values are write-only:
// no route ever returns a stored or resolved secret value.
// Owner only (role matrix).
router.get(
  "/integrations",
  requireRole("admin"),
  integrationsController.getIntegrations,
);
router.put(
  "/integrations/:service/secret",
  requireRole("admin"),
  integrationsController.setIntegrationSecret,
);
router.delete(
  "/integrations/:service/secret",
  requireRole("admin"),
  integrationsController.deleteIntegrationSecret,
);
router.post(
  "/integrations/:service/test",
  requireRole("admin"),
  integrationsController.testIntegrationSecret,
);

module.exports = router;
