const {
  adminReadLimiter,
  adminWriteLimiter,
} = require("../middleware/rateLimit.middleware");
const express = require("express");
const router = express.Router();
router.use(adminReadLimiter);
router.use(adminWriteLimiter);
const handoverController = require("../controllers/handover.controller");
const auditLogController = require("../controllers/auditLog.controller");
const exportController = require("../controllers/export.controller");
const mediaController = require("../controllers/media.controller");
const {
  protect,
  restrictTo,
  requireRole: requireRoleMw,
} = require("../middleware/auth.middleware");
// requireRole is the Batch 5 alias of restrictTo; fall back to
// restrictTo so older test harnesses that stub only restrictTo keep
// loading this router.
const requireRole = requireRoleMw || restrictTo;

// ==================== HANDOVER ROUTES (Batch 5) ====================
// Mounted at /api/v1/admin AFTER routes/adminSettings.routes.js.
// Every route requires authentication (protect); authorization is
// per-route via requireRole.
//
// ROLE MATRIX (Batch 5 — enforced here and in
// routes/adminSettings.routes.js):
//   Owner = role "admin". Team roles "manager"/"staff" are NEW
//   (models/user.model.js). "staff" currently has no admin-surface
//   access; it exists so Owners can grant it route-by-route later.
//   - secrets (GET describe, PUT/DELETE secret, POST test under
//     /admin/integrations): admin ONLY (adminSettings routes).
//   - settings GET + PUT /admin/settings/:section: admin + manager
//     (adminSettings routes).
//   - settings reset: admin ONLY (adminSettings routes).
//   - settings backup/restore: admin ONLY (this file).
//   - handover demo-status + wipe-demo: admin ONLY;
//     handover/status GET: admin + manager (this file).
//   - audit-logs GET: admin + manager (this file).
//   - test-email POST: admin + manager (adminSettings routes).
//   - media GET: admin + manager; media DELETE: admin ONLY
//     (this file).
//   - settings image upload + knowledge reindex: admin + manager
//     (adminSettings routes).

router.use(protect);

// Handover: demo data + readiness checklist.
router.get(
  "/handover/demo-status",
  requireRole("admin"),
  handoverController.getDemoStatus,
);
router.post(
  "/handover/wipe-demo",
  requireRole("admin"),
  handoverController.wipeDemo,
);
router.get(
  "/handover/status",
  requireRole("admin", "manager"),
  handoverController.getHandoverStatus,
);

// Audit-log viewer.
router.get(
  "/audit-logs",
  requireRole("admin", "manager"),
  auditLogController.getAuditLogs,
);

// CSV exports (Owner only).
router.get(
  "/export/products.csv",
  requireRole("admin"),
  exportController.exportProductsCsv,
);
router.get(
  "/export/orders.csv",
  requireRole("admin"),
  exportController.exportOrdersCsv,
);
router.get(
  "/export/customers.csv",
  requireRole("admin"),
  exportController.exportCustomersCsv,
);

// Settings backup / restore (Owner only). Secrets are never part of
// a backup and never accepted from one (see export.controller.js).
router.get(
  "/settings/backup",
  requireRole("admin"),
  exportController.getSettingsBackup,
);
router.post(
  "/settings/restore",
  requireRole("admin"),
  exportController.restoreSettings,
);

// Media library.
router.get(
  "/media",
  requireRole("admin", "manager"),
  mediaController.listMedia,
);
router.delete("/media", requireRole("admin"), mediaController.deleteMedia);

module.exports = router;
