const { buildPreferenceUpdates } = require("../utils/preferenceUpdates");
const NotificationService = require("../services/notificationService");
const PushTokenService = require("../services/pushTokenService");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const AppError = require("../utils/AppError");

exports.getUserNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead, category } = req.query;
    const userId = req.user._id;
    if (isRead !== undefined && !["true", "false"].includes(isRead)) throw new AppError("Invalid read filter", 400);
    if (category !== undefined && !["order", "promotion", "design", "system"].includes(category)) throw new AppError("Invalid category filter", 400);

    console.log(`Getting notifications for user: ${userId}`);

    const result = await NotificationService.getUserNotifications(
      userId,
      page,
      limit,
      { isRead: isRead === undefined ? undefined : isRead === "true", category }
    );

    console.log(`Found ${result.total} notifications`);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const count = await NotificationService.getUnreadCount(userId);

    res.status(200).json({
      status: "success",
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id);

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    if (notification.recipient.toString() !== userId.toString()) {
      throw new AppError("Notification not found", 404); // uniform with the missing case: no existence oracle (C-13)
    }

    res.status(200).json({
      status: "success",
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id);

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    if (notification.recipient.toString() !== userId.toString()) {
      throw new AppError("Notification not found", 404); // uniform with the missing case: no existence oracle (C-13)
    }

    const updated = await NotificationService.markAsRead(id, req.user._id);

    res.status(200).json({
      status: "success",
      data: { notification: updated },
    });
  } catch (error) {
    next(error);
  }
};

exports.markMultipleAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { notificationIds } = req.body;
    const result = await Notification.updateMany({ recipient: userId, _id: { $in: notificationIds }, isRead: false },
      { $set: { isRead: true } });

    res.status(200).json({
      status: "success",
      message: "Selected notifications marked as read",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

exports.registerPushToken = async (req, res, next) => {
  try {
    const { token, deviceId, deviceName, platform } = req.body;
    const userId = req.user._id;

    if (!token || !deviceId || !platform) {
      throw new AppError("token, deviceId, and platform are required", 400);
    }

    const deviceToken = await PushTokenService.registerPushToken({
      userId,
      token,
      deviceId,
      deviceName: deviceName || "Unknown Device",
      platform
    });

    res.status(201).json({
      status: "success",
      data: { device: deviceToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserDevices = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const devices = await PushTokenService.getUserDevices(userId);

    res.status(200).json({
      status: "success",
      data: { devices },
    });
  } catch (error) {
    next(error);
  }
};

exports.unregisterDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user._id;
    const result = await PushTokenService.unregisterDevice(userId, deviceId);

    res.status(200).json({
      status: "success",
      data: { device: result },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("preferences");
    if (!user) {
      throw new AppError("User not found", 404);
    }
    res.status(200).json({
      status: "success",
      data: { preferences: user.preferences },
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // AR-31(f): shared with profile.controller via utils/preferenceUpdates.
    const preferenceUpdates = buildPreferenceUpdates(req.body);
    const user = await User.findByIdAndUpdate(userId, { $set: preferenceUpdates }, {
      new: true,
      runValidators: true,
    }).select("preferences");

    res.status(200).json({
      status: "success",
      data: { preferences: user.preferences },
    });
  } catch (error) {
    next(error);
  }
};

exports.archiveNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await Notification.deleteOne({ _id: id, recipient: req.user._id });
    if (!result.deletedCount) return next(new AppError("Notification not found", 404));

    res.status(200).json({
      status: "success",
      message: "Notification deleted"
    });
  } catch (error) {
    next(error);
  }
};

exports.archiveMultiple = async (req, res, next) => {
  try {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds) || notificationIds.length > 100 ||
        notificationIds.some((id) => typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id))) {
      return next(new AppError("Provide up to 100 valid notification IDs", 400));
    }
    const result = await Notification.deleteMany({ _id: { $in: notificationIds }, recipient: req.user._id });

    res.status(200).json({
      status: "success",
      message: "Notifications deleted",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
