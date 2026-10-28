const Announcement = require("../models/announcement.model");
const AppError = require("../utils/AppError");
const NotificationService = require("./notificationService");
const { asEnum, asBoolean } = require("../utils/params");
const { boundedPage, boundedLimit } = require("../utils/listQuery");
const User = require("../models/user.model");

// Fields a client may set on an announcement. Everything else on the
// document (createdBy, updatedBy, viewCount, publishedAt, _id, ...) is
// server-managed; updateAnnouncement previously copied every key in
// the request body onto the document (mass assignment, C-03).
// FA-04: "status" is deliberately NOT client-settable here - lifecycle
// transitions go only through publishAnnouncement / scheduleAnnouncement /
// archiveAnnouncement, which enforce the state machine's guards.
const ANNOUNCEMENT_CLIENT_FIELDS = [
  "title",
  "content",
  "summary",
  "type",
  "priority",
  "targetAudience",
  "scheduledAt",
  "expiresAt",
  "isPinned",
  "imageUrl",
  "actionUrl",
  "actionLabel",
  "tags",
];
const pickAnnouncementFields = (data = {}) => {
  const picked = {};
  for (const field of ANNOUNCEMENT_CLIENT_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

class AnnouncementService {
  /**
   * Get all announcements (Admin)
   */
  async getAllAnnouncements(options = {}) {
    const { status, type, priority, isPinned } = options;

    // AR-19: bound pagination to the house contract (page <= 10000,
    // limit <= 100, NaN -> defaults). Previously raw parseInt values
    // reached skip/limit uncapped — limit=100000 returned up to
    // 100000 rows and NaN produced NaN skip. See CLIENT_IMPACT.md.
    const page = boundedPage(options.page);
    const limit = boundedLimit(options.limit, 20);
    const skip = (page - 1) * limit;
    const query = {};

    // FA-56: coerce at the sink - raw option values never reach the filter.
    const statusC = asEnum(status, [
      "draft",
      "scheduled",
      "published",
      "archived",
    ]);
    const typeC = asEnum(type, [
      "general",
      "maintenance",
      "update",
      "promotion",
      "policy",
      "event",
    ]);
    const priorityC = asEnum(priority, ["low", "normal", "high", "critical"]);
    const pinnedC = asBoolean(isPinned);
    if (statusC !== undefined) query.status = statusC;
    if (typeC !== undefined) query.type = typeC;
    if (priorityC !== undefined) query.priority = priorityC;
    if (pinnedC !== undefined) query.isPinned = pinnedC;

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
      ...pickAnnouncementFields(data),
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

    // Published announcements are immutable here; archiving has its own
    // endpoint (FA-04 - status can no longer ride the generic update).
    if (announcement.status === "published") {
      throw new AppError("Published announcements can only be archived", 400);
    }

    // Update fields (whitelist only - see ANNOUNCEMENT_CLIENT_FIELDS)
    Object.assign(announcement, pickAnnouncementFields(data));

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

    // Optionally send notifications to users about the announcement.
    // AR-04: in queue mode notifyUsersAboutAnnouncement enqueues
    // instead of fanning out inline; the queued result is surfaced
    // so the controller can answer 202 (see CLIENT_IMPACT.md).
    const notifyResult = await this.notifyUsersAboutAnnouncement(announcement);

    const populated = await announcement.populate([
      { path: "createdBy", select: "firstName lastName email" },
      { path: "updatedBy", select: "firstName lastName email" },
    ]);
    if (notifyResult && notifyResult.queued) {
      return {
        announcement: populated,
        queued: true,
        jobId: notifyResult.jobId,
      };
    }
    return populated;
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
        400,
      );
    }

    await Announcement.findByIdAndDelete(id);

    return { message: "Announcement deleted successfully" };
  }

  /**
   * Get active announcements for users (Public)
   */
  async getPublicAnnouncements(options = {}) {
    const { type, userRole = "customer" } = options;
    // AR-19: bounded pagination, same house contract as above.
    const page = boundedPage(options.page);
    const limit = boundedLimit(options.limit, 10);
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
        // AR-08: atomic claim, the FA-70 pattern promotions already
        // use. The find-then-save version let two concurrent ticks
        // (two instances, or instance + manual trigger) both read
        // status "scheduled" and both publish + fan out. The
        // conditional update transitions the document exactly once;
        // the losing tick gets null and skips.
        const claimed = await Announcement.findOneAndUpdate(
          { _id: announcement._id, status: "scheduled" },
          {
            $set: { status: "published", publishedAt: now, scheduledAt: null },
          },
          { new: true },
        );
        if (!claimed) continue;

        // Notify users
        await this.notifyUsersAboutAnnouncement(claimed);

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
   * Notify users about a new announcement.
   * AR-04: BROADCAST_MODE=queue enqueues the fan-out (the publish
   * itself stays synchronous); inline mode runs it immediately.
   * Scheduled announcements reach the same branch via
   * processScheduledAnnouncements -> notifyUsersAboutAnnouncement.
   */
  async notifyUsersAboutAnnouncement(announcement) {
    const broadcastJobs = require("./broadcastJobs.service");
    if (broadcastJobs.isQueueMode()) {
      const job = await broadcastJobs.enqueueAnnouncement(announcement._id);
      return { queued: true, jobId: job._id };
    }
    return this.performAnnouncementBroadcast(announcement);
  }

  /**
   * The fan-out body itself (used directly by the AR-04 job handler).
   */
  async performAnnouncementBroadcast(announcement) {
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
          message:
            announcement.summary || announcement.content.substring(0, 200),
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
        userIds,
      );
      if (delivery.failedCount)
        throw new AppError(
          "Some announcement notifications could not be persisted",
          503,
        );
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
