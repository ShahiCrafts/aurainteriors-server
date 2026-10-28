const AnnouncementService = require("../services/announcementService");
const { asEnum, asBoolean } = require("../utils/params");
const catchAsync = require("../utils/catchAsync");

// ADMIN OPERATIONS

/**
 * Get all announcements (Admin)
 */
exports.getAllAnnouncements = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await AnnouncementService.getAllAnnouncements({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    status: asEnum(req.query.status, [
      "draft",
      "scheduled",
      "published",
      "archived",
    ]),
    type: asEnum(req.query.type, [
      "general",
      "maintenance",
      "update",
      "promotion",
      "policy",
      "event",
    ]),
    priority: asEnum(req.query.priority, ["low", "normal", "high", "critical"]),
    isPinned: asBoolean(req.query.isPinned),
  });

  res.status(200).json({
    status: "success",
    data: {
      announcements: result.announcements,
      pagination: result.pagination,
    },
  });
});

/**
 * Get single announcement (Admin)
 */
exports.getAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await AnnouncementService.getAnnouncementById(
    req.params.id,
  );

  res.status(200).json({
    status: "success",
    data: { announcement },
  });
});

/**
 * Create announcement (Admin)
 */
exports.createAnnouncement = catchAsync(async (req, res, next) => {
  const {
    title,
    content,
    summary,
    type,
    priority,
    targetAudience,
    scheduledAt,
    expiresAt,
    isPinned,
    imageUrl,
    actionUrl,
    actionLabel,
    tags,
  } = req.body;

  const announcement = await AnnouncementService.createAnnouncement(
    {
      title,
      content,
      summary,
      type,
      priority,
      targetAudience,
      scheduledAt,
      expiresAt,
      isPinned,
      imageUrl,
      actionUrl,
      actionLabel,
      tags,
    },
    req.user._id,
  );

  res.status(201).json({
    status: "success",
    message: "Announcement created successfully",
    data: { announcement },
  });
});

/**
 * Update announcement (Admin)
 */
exports.updateAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await AnnouncementService.updateAnnouncement(
    req.params.id,
    req.body,
    req.user._id,
  );

  res.status(200).json({
    status: "success",
    message: "Announcement updated successfully",
    data: { announcement },
  });
});

/**
 * Publish announcement immediately (Admin)
 */
exports.publishAnnouncement = catchAsync(async (req, res, next) => {
  const result = await AnnouncementService.publishAnnouncement(
    req.params.id,
    req.user._id,
  );

  if (result && result.queued) {
    return res.status(202).json({
      status: "success",
      message: "Announcement published; notifications queued",
      data: {
        announcement: result.announcement,
        jobId: result.jobId,
        queued: true,
      },
    });
  }

  res.status(200).json({
    status: "success",
    message: "Announcement published successfully",
    data: { announcement: result },
  });
});

/**
 * Schedule announcement (Admin)
 */
exports.scheduleAnnouncement = catchAsync(async (req, res, next) => {
  const { scheduledAt } = req.body;

  const announcement = await AnnouncementService.scheduleAnnouncement(
    req.params.id,
    new Date(scheduledAt),
    req.user._id,
  );

  res.status(200).json({
    status: "success",
    message: `Announcement scheduled for ${new Date(scheduledAt).toISOString()}`,
    data: { announcement },
  });
});

/**
 * Archive announcement (Admin)
 */
exports.archiveAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await AnnouncementService.archiveAnnouncement(
    req.params.id,
    req.user._id,
  );

  res.status(200).json({
    status: "success",
    message: "Announcement archived successfully",
    data: { announcement },
  });
});

/**
 * Delete announcement (Admin)
 */
exports.deleteAnnouncement = catchAsync(async (req, res, next) => {
  await AnnouncementService.deleteAnnouncement(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Announcement deleted successfully",
  });
});

/**
 * Get announcement statistics (Admin)
 */
exports.getAnnouncementStats = catchAsync(async (req, res, next) => {
  const stats = await AnnouncementService.getAnnouncementStats();

  res.status(200).json({
    status: "success",
    data: { stats },
  });
});

/**
 * Get active announcements for users (Public)
 */
exports.getPublicAnnouncements = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, type } = req.query;

  const result = await AnnouncementService.getPublicAnnouncements({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    type,
    userRole: req.user?.role || "customer",
  });

  res.status(200).json({
    status: "success",
    data: {
      announcements: result.announcements,
      pagination: result.pagination,
    },
  });
});

/**
 * Get single public announcement (Public)
 */
exports.getPublicAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await AnnouncementService.getPublicAnnouncementById(
    req.params.id,
    req.user?.role || "customer",
  );

  res.status(200).json({
    status: "success",
    data: { announcement },
  });
});

module.exports = exports;
