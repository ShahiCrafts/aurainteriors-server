const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const {
  validateNotificationCreation,
  validateMarkAsRead,
  validateArchive,
} = require("../validators/notification.validator");
const notificationController = require("../controllers/notification.controller");

const router = express.Router();

router.use(protect);

router.get("/", notificationController.getUserNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.get("/preferences", notificationController.getPreferences);
router.get("/:id", notificationController.getNotificationDetail);
router.put("/:id/read", notificationController.markAsRead);
router.post(
  "/mark-multiple-read",
  validateMarkAsRead,
  notificationController.markMultipleAsRead
);
router.put("/:id/archive", notificationController.archiveNotification);
router.post(
  "/archive-multiple",
  validateArchive,
  notificationController.archiveMultiple
);
router.post("/push-tokens/register", notificationController.registerPushToken);
router.get("/push-tokens/devices", notificationController.getUserDevices);
router.delete(
  "/push-tokens/:deviceId",
  notificationController.unregisterDevice
);
router.put("/preferences", notificationController.updatePreferences);

module.exports = router;
