const { boundedPage, boundedLimit } = require("../utils/listQuery");
const crypto = require("crypto");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const { sanitizeActionUrl } = require("../utils/safeUrl");
const runtimeContext = require("./runtimeContext"); // AR-33: explicit registry, not globals

class NotificationService {
  async createNotification(data) {
    const payload = { ...data };
    // FA-73: stored actionUrl is rendered as a link by clients - only
    // http(s) or site-relative URLs may be stored.
    if ("actionUrl" in payload)
      payload.actionUrl = sanitizeActionUrl(payload.actionUrl);
    if (payload.idempotencyKey) {
      // Stable primary key deduplicates campaign retries across processes,
      // without depending on deployment-time creation of a new unique index.
      payload._id = crypto
        .createHash("sha256")
        .update(`${payload.recipient}:${payload.idempotencyKey}`)
        .digest("hex")
        .slice(0, 24);
    }
    try {
      return await Notification.create(payload);
    } catch (error) {
      if (error.code !== 11000 || !payload.idempotencyKey) throw error;
      const existing = await Notification.findOne({
        _id: payload._id,
        recipient: payload.recipient,
        idempotencyKey: payload.idempotencyKey,
      });
      if (!existing) throw error;
      return existing;
    }
  }

  async broadcastNotification(data, userIds) {
    // PERF-B-04: chunked insertMany (500/batch, ordered:false)
    // instead of one serial create per recipient. The contract is
    // unchanged — same { sentCount, failedCount, notificationId }
    // result, same per-recipient payload (sanitized actionUrl,
    // per-recipient idempotency key and its deterministic _id,
    // see createNotification) and the same realtime emit per
    // persisted notification. Any document a bulk insert rejects
    // (e.g. an idempotency duplicate) falls back to the original
    // per-document createNotification path, which resolves
    // duplicates to the existing record and counts it as sent —
    // so bulk failure semantics match the old loop exactly.
    let sentCount = 0,
      failedCount = 0,
      notificationId = null;
    const emitNew = (notification) => {
      // Offline delivery is persisted; socket availability cannot mark it failed.
      try {
        runtimeContext
          .getIo()
          ?.to(String(notification.recipient))
          .emit("notification:new", notification);
      } catch (_error) {
        // AR-33: registry, not global.io
        console.error("Notification realtime delivery unavailable");
      }
    };
    const inputFor = (recipient) => ({
      recipient,
      type: data.type,
      title: data.title,
      message: data.message || data.description,
      actionUrl: data.actionUrl,
      data: data.data || {},
      expiresAt: data.expiresAt || null,
      ...(data.idempotencyKey
        ? { idempotencyKey: `${data.idempotencyKey}:${recipient}` }
        : {}),
    });
    const docFor = (input) => {
      const payload = { ...input };
      if ("actionUrl" in payload)
        payload.actionUrl = sanitizeActionUrl(payload.actionUrl);
      if (payload.idempotencyKey) {
        payload._id = crypto
          .createHash("sha256")
          .update(`${payload.recipient}:${payload.idempotencyKey}`)
          .digest("hex")
          .slice(0, 24);
      }
      return payload;
    };
    const BATCH_SIZE = 500;
    const recipients = Array.isArray(userIds) ? userIds : [];
    for (let start = 0; start < recipients.length; start += BATCH_SIZE) {
      const batch = recipients.slice(start, start + BATCH_SIZE);
      const inputs = batch.map(inputFor);
      const docs = inputs.map(docFor);
      let inserted = [];
      const failedIndexes = new Set();
      try {
        inserted = await Notification.insertMany(docs, { ordered: false });
      } catch (error) {
        inserted = Array.isArray(error.insertedDocs) ? error.insertedDocs : [];
        const writeErrors =
          error.writeErrors || (error.result && error.result.writeErrors) || [];
        if (writeErrors.length > 0) {
          for (const we of writeErrors) {
            if (Number.isInteger(we.index)) failedIndexes.add(we.index);
          }
        } else {
          // Not a bulk-write result (e.g. connection error): nothing
          // is known to be inserted — every doc takes the fallback.
          inserted = [];
          docs.forEach((_, i) => failedIndexes.add(i));
        }
      }
      for (const notification of inserted) {
        notificationId ||= notification._id;
        sentCount++;
        emitNew(notification);
      }
      for (const i of failedIndexes) {
        try {
          const notification = await this.createNotification(inputs[i]);
          notificationId ||= notification._id;
          sentCount++;
          emitNew(notification);
        } catch (_error) {
          failedCount++;
        }
      }
    }
    return { sentCount, failedCount, notificationId };
  }

  async cleanupExpiredNotifications(now = new Date()) {
    return Notification.deleteMany({ expiresAt: { $ne: null, $lte: now } });
  }

  async notifyAdmins(type, title, message, data = {}, actionUrl = null) {
    const admins = await User.find({ role: "admin" }).select("_id");

    if (admins.length === 0) return [];

    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      type,
      title,
      message,
      data,
      actionUrl: sanitizeActionUrl(actionUrl), // FA-73
    }));

    return await Notification.insertMany(notifications);
  }

  async getUserNotifications(userId, page = 1, limit = 20, filters = {}) {
    page = boundedPage(page);
    limit = boundedLimit(limit);
    const query = { recipient: userId };
    if (typeof filters.isRead === "boolean") query.isRead = filters.isRead;
    const categories = {
      order: /^order/,
      promotion: /^promo/,
      design: /^design/,
      system: /^(?:system|announcement)(?:_|$)/,
    };
    if (categories[filters.category]) query.type = categories[filters.category];
    const skip = (page - 1) * limit;

    // PERF-B-09: page + count in parallel (the pattern every other
    // list handler in this codebase uses) and lean — callers render
    // these, they never mutate them.
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return {
      notifications,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });
  }

  // FA-36: scoped by recipient at the sink - a caller bug can no longer
  // mark (or probe) another user's notification.
  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true },
    );
  }

  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true },
    );
  }
}

module.exports = new NotificationService();
