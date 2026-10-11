const Announcement = require("../models/announcement.model");
const AppError = require("../utils/AppError");
const NotificationService = require("./notificationService");
const User = require("../models/user.model");

class AnnouncementService {
  /**
   * Get all announcements (Admin)
   */
  async getAllAnnouncements(options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      priority,
      isPinned,
    } = options;

    const skip = (page - 1) * limit;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (isPinned !== undefined) query.isPinned = isPinned;

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "firstName lastName email")
        .populate("updatedBy", "firstName lastName email")
        .lean(),
      Announcement.countDocuments(query),
    ]);

    return {
      announcements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(id) {
    const announcement = await Announcement.findById(id)
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

    if (!announcement) {
      throw new AppError("Announcement not found", 404);
    }

    return announcement;
  }

  /**
   * Create new announcement (Admin)
   */
  async createAnnouncement(data, userId) {
    const announcement = new Announcement({
      ...data,
      createdBy: userId,
      status: data.scheduledAt ? "scheduled" : "draft",
    });

    await announcement.save();

    return announcement.populate("createdBy", "firstName lastName email");
  }

  /**
   * Update announcement (Admin)
   */
  async updateAnnouncement(id, data, userId) {
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      throw new AppError("Announcement not found", 404);
    }

    // Prevent editing published announcements (unless archiving)
    if (
      announcement.status === "published" &&
      data.status !== "archived"
    ) {
      throw new AppError(
        "Published announcements can only be archived",
        400
      );
    }

    // Update fields
    Object.keys(data).forEach((key) => {
      announcement[key] = data[key];
    });

    announcement.updatedBy = userId;

    // If scheduling, update status
    if (data.scheduledAt && announcement.status === "draft") {
      announcement.status = "scheduled";
    }

    await announcement.save();

    return announcement.populate([
      { path: "createdBy", select: "firstName lastName email" },
      { path: "updatedBy", select: "firstName lastName email" },
    ]);
  }

  /**
   * Publish announcement immediately (Admin)
   */
  async publishAnnouncement(id, userId) {
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      throw new AppError("Announcement not found", 404);
    }

    if (announcement.status === "published") {
      throw new AppError("Announcement is already published", 400);
    }

    if (announcement.status === "archived") {
      throw new AppError("Cannot publish an archived announcement", 400);
    }

    announcement.status = "published";
    announcement.publishedAt = new Date();
    announcement.scheduledAt = null;
    announcement.updatedBy = userId;

    await announcement.save();

    // Optionally send notifications to users about the announcement
    await this.notifyUsersAboutAnnouncement(announcement);

    return announcement.populate([
      { path: "createdBy", select: "firstName lastName email" },
      { path: "updatedBy", select: "firstName lastName email" },
    ]);
  }

  /**
   * Schedule announcement (Admin)
   */
  async scheduleAnnouncement(id, scheduledAt, userId) {
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      throw new AppError("Announcement not found", 404);
    }

    if (announcement.status === "published") {
      throw new AppError("Cannot schedule a published announcement", 400);
    }

    if (announcement.status === "archived") {
      throw new AppError("Cannot schedule an archived announcement", 400);
    }

    announcement.status = "scheduled";
    announcement.scheduledAt = scheduledAt;
    announcement.updatedBy = userId;

    await announcement.save();

    return announcement.populate([
      { path: "createdBy", select: "firstName lastName email" },
      { path: "updatedBy", select: "firstName lastName email" },
    ]);
  }

  /**
   * Archive announcement (Admin)
   */
  async archiveAnnouncement(id, userId) {
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      throw new AppError("Announcement not found", 404);
    }

    if (announcement.status === "archived") {
      throw new AppError("Announcement is already archived", 400);
    }

    announcement.status = "archived";
    announcement.updatedBy = userId;

    await announcement.save();

    return announcement.populate([
      { path: "createdBy", select: "firstName lastName email" },
      { path: "updatedBy", select: "firstName lastName email" },
    ]);
  }

  /**
   * Delete announcement (Admin)
   */
  async deleteAnnouncement(id) {
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      throw new AppError("Announcement not found", 404);
    }

    // Prevent deleting published announcements
    if (announcement.status === "published") {
      throw new AppError(
        "Published announcements cannot be deleted. Archive them instead.",
        400
      );
    }

    await Announcement.findByIdAndDelete(id);

    return { message: "Announcement deleted successfully" };
  }

  /**
   * Get active announcements for users (Public)
   */
  async getPublicAnnouncements(options = {}) {
    const { page = 1, limit = 10, type, userRole = "customer" } = options;
    const skip = (page - 1) * limit;
    const now = new Date();

    // Determine target audience based on user role
    const targetTypes = ["all"];
    if (userRole === "admin") {
      targetTypes.push("admins");
    } else {
      targetTypes.push("customers");
    }

    const query = {
      status: "published",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      "targetAudience.type": { $in: targetTypes },
    };

    if (type) {
      query.type = type;
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ isPinned: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-viewCount -createdBy -updatedBy")
        .lean(),
      Announcement.countDocuments(query),
    ]);

    return {
      announcements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single announcement for users (Public)
   */
  async getPublicAnnouncementById(id, userRole = "customer") {
    const now = new Date();

    // Determine target audience based on user role
    const targetTypes = ["all"];
    if (userRole === "admin") {
      targetTypes.push("admins");
    } else {
      targetTypes.push("customers");
    }

    const announcement = await Announcement.findOne({
      _id: id,
      status: "published",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      "targetAudience.type": { $in: targetTypes },
    }).select("-createdBy -updatedBy");

    if (!announcement) {
      throw new AppError("Announcement not found", 404);
    }

    // Increment view count
    await Announcement.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    return announcement;
  }

  /**
   * Process scheduled announcements (Cron job)
   */
  async processScheduledAnnouncements() {
    const now = new Date();

    const scheduledAnnouncements = await Announcement.find({
      status: "scheduled",
      scheduledAt: { $lte: now },
    });

    const results = {
      processed: 0,
      failed: 0,
      errors: [],
    };

    for (const announcement of scheduledAnnouncements) {
      try {
        announcement.status = "published";
        announcement.publishedAt = now;
        announcement.scheduledAt = null;
        await announcement.save();

        // Notify users
        await this.notifyUsersAboutAnnouncement(announcement);

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: announcement._id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Notify users about a new announcement
   */
  async notifyUsersAboutAnnouncement(announcement) {
    try {
      // Get target users based on audience type
      const targetAudienceType = announcement.targetAudience?.type || "all";
      let userQuery = { isActive: true, deletedAt: null };

      if (targetAudienceType === "customers") {
        userQuery.role = "customer";
      } else if (targetAudienceType === "admins") {
        userQuery.role = "admin";
      }

      const users = await User.find(userQuery).select("_id").lean();
      const userIds = users.map((u) => u._id);

      if (userIds.length === 0) return;

      // NotificationService is exported as a singleton instance, use it directly
      // broadcastNotification requires userId in notificationData for the base notification record
      const delivery = await NotificationService.broadcastNotification(
        {
          title: `📢 ${announcement.title}`,
          type: "announcement",
          message: announcement.summary || announcement.content.substring(0, 200),
          expiresAt: announcement.expiresAt,
          idempotencyKey: `announcement:${announcement._id}`,
          category: "info",
          priority: announcement.priority,
          actionUrl: "/announcements",
          data: {
            announcementId: announcement._id,
            announcementType: announcement.type,
          },
        },
        userIds
      );
      if (delivery.failedCount) throw new AppError("Some announcement notifications could not be persisted", 503);
    } catch (error) {
      console.error("Failed to notify users about announcement:", error);
      // Don't throw - notification failure shouldn't block publishing
    }
  }

  /**
   * Get announcement statistics (Admin)
   */
  async getAnnouncementStats() {
    const stats = await Announcement.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalViews = await Announcement.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$viewCount" },
        },
      },
    ]);

    return {
      byStatus: stats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      totalViews: totalViews[0]?.totalViews || 0,
    };
  }
}

module.exports = new AnnouncementService();
