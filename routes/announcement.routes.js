const { standardReadLimiter, standardWriteLimiter } = require("../middleware/rateLimit.middleware");
const objectIdParam = require("../middleware/objectIdParam.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
router.param("id", objectIdParam);
const announcementController = require("../controllers/announcement.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  scheduleAnnouncementSchema,
  getAnnouncementsQuerySchema,
  getPublicAnnouncementsQuerySchema,
} = require("../validators/announcement.validator");

// ==================== PUBLIC ROUTES ====================
// These routes are accessible by authenticated users

router.get(
  "/public",
  protect,
  validate(getPublicAnnouncementsQuerySchema, "query"),
  announcementController.getPublicAnnouncements
);

router.get(
  "/public/:id",
  protect,
  announcementController.getPublicAnnouncement
);

// ==================== ADMIN ROUTES ====================
// All routes below require admin role

router.use(protect);
router.use(restrictTo("admin"));

// Get announcement statistics
router.get("/stats", announcementController.getAnnouncementStats);

// Get all announcements (Admin)
router.get(
  "/",
  validate(getAnnouncementsQuerySchema, "query"),
  announcementController.getAllAnnouncements
);

// Create announcement (Admin)
router.post(
  "/",
  validate(createAnnouncementSchema),
  announcementController.createAnnouncement
);

// Get single announcement (Admin)
router.get("/:id", announcementController.getAnnouncement);

// Update announcement (Admin)
router.patch(
  "/:id",
  validate(updateAnnouncementSchema),
  announcementController.updateAnnouncement
);

// Delete announcement (Admin)
router.delete("/:id", announcementController.deleteAnnouncement);

// Publish announcement immediately (Admin)
router.post("/:id/publish", announcementController.publishAnnouncement);

// Schedule announcement (Admin)
router.post(
  "/:id/schedule",
  validate(scheduleAnnouncementSchema),
  announcementController.scheduleAnnouncement
);

// Archive announcement (Admin)
router.post("/:id/archive", announcementController.archiveAnnouncement);

module.exports = router;
