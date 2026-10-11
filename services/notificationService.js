const { boundedPage, boundedLimit } = require("../utils/listQuery");
const crypto = require("crypto");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");

class NotificationService {
  async createNotification(data) {
    const payload = { ...data };
    if (payload.idempotencyKey) {
      // Stable primary key deduplicates campaign retries across processes,
      // without depending on deployment-time creation of a new unique index.
      payload._id = crypto.createHash("sha256").update(`${payload.recipient}:${payload.idempotencyKey}`).digest("hex").slice(0, 24);
    }
    try { return await Notification.create(payload); }
    catch (error) {
      if (error.code !== 11000 || !payload.idempotencyKey) throw error;
      const existing = await Notification.findOne({ _id: payload._id, recipient: payload.recipient, idempotencyKey: payload.idempotencyKey });
      if (!existing) throw error;
      return existing;
    }
  }

  async broadcastNotification(data, userIds) {
    let sentCount = 0, failedCount = 0, notificationId = null;
    for (const recipient of userIds) {
      try {
        const notification = await this.createNotification({
          recipient, type: data.type, title: data.title,
          message: data.message || data.description, actionUrl: data.actionUrl,
          data: data.data || {}, expiresAt: data.expiresAt || null,
          ...(data.idempotencyKey ? { idempotencyKey: `${data.idempotencyKey}:${recipient}` } : {}),
        });
        notificationId ||= notification._id;
        sentCount++;
        // Offline delivery is persisted; socket availability cannot mark it failed.
        try { global.io?.to(String(recipient)).emit("notification:new", notification); }
        catch (_error) { console.error("Notification realtime delivery unavailable"); }
      } catch (_error) { failedCount++; }
    }
    return { sentCount, failedCount, notificationId };
  }

  async cleanupExpiredNotifications(now = new Date()) {
    return Notification.deleteMany({ expiresAt: { $ne: null, $lte: now } });
  }

  async notifyAdmins(type, title, message, data = {}, actionUrl = null) {
    const admins = await User.find({ role: "admin" }).select("_id");

    if (admins.length === 0) return [];

    const notifications = admins.map(admin => ({
      recipient: admin._id,
      type,
      title,
      message,
      data,
      actionUrl
    }));

    return await Notification.insertMany(notifications);
  }

  async getUserNotifications(userId, page = 1, limit = 20, filters = {}) {
    page = boundedPage(page);
    limit = boundedLimit(limit);
    const query = { recipient: userId };
    if (typeof filters.isRead === "boolean") query.isRead = filters.isRead;
    const categories = {
      order: /^order/, promotion: /^promo/, design: /^design/,
      system: /^(?:system|announcement)(?:_|$)/,
    };
    if (categories[filters.category]) query.type = categories[filters.category];
    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
  }

  async markAsRead(notificationId) {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
  }
}

module.exports = new NotificationService();
