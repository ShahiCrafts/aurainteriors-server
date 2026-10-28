const DevicePushToken = require("../models/devicePushToken.model");
const AppError = require("../utils/AppError");

class PushTokenService {
  async registerPushToken(tokenData) {
    const {
      userId,
      token,
      deviceId,
      deviceName = "Unknown Device",
      platform,
      metadata = {},
    } = tokenData;

    if (!userId || !token || !deviceId || !platform) {
      throw new AppError(
        "userId, token, deviceId, and platform are required",
        400,
      );
    }

    if (!["web", "android", "ios"].includes(platform)) {
      throw new AppError("Invalid platform", 400);
    }

    try {
      // FA-69: one atomic upsert keyed on the (user, deviceId) compound
      // unique index - the previous find-then-insert raced under
      // concurrent registration and depended on the pre-save hook
      // maintaining a shadow field. Metadata keys are $set individually
      // so keys from earlier registrations are preserved (the old
      // merge behavior).
      const now = new Date();
      const $set = {
        token,
        deviceName,
        platform,
        isActive: true,
        lastUsedAt: now,
        registeredAt: now,
        failureCount: 0,
        _userDeviceIndex: `${userId}_${deviceId}`,
      };
      for (const [k, v] of Object.entries(metadata || {})) {
        $set[`metadata.${k}`] = v;
      }
      return await DevicePushToken.findOneAndUpdate(
        { user: userId, deviceId },
        { $set, $setOnInsert: { user: userId, deviceId } },
        { upsert: true, new: true, runValidators: true },
      );
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError("Token already registered to another device", 409);
      }
      throw error;
    }
  }

  async getUserActiveTokens(userId) {
    try {
      const tokens = await DevicePushToken.find(
        {
          user: userId,
          isActive: true,
        },
        { token: 1, deviceName: 1, platform: 1, _id: 1 },
      ).lean();

      return tokens;
    } catch (error) {
      throw new AppError("Failed to fetch active tokens", 500);
    }
  }

  async invalidateToken(token, reason = "unknown") {
    try {
      const updated = await DevicePushToken.findOneAndUpdate(
        { token },
        {
          isActive: false,
          failureCount: 999,
          lastFailureAt: new Date(),
          lastFailureReason: reason,
        },
        { new: true },
      );

      if (!updated) {
        throw new AppError("Token not found", 404);
      }

      return updated;
    } catch (error) {
      if (error.message === "Token not found") throw error;
      throw new AppError("Failed to invalidate token", 500);
    }
  }

  async recordDeliverySuccess(token) {
    try {
      const updated = await DevicePushToken.findOneAndUpdate(
        { token },
        {
          lastUsedAt: new Date(),
          failureCount: 0,
          lastFailureAt: null,
          lastFailureReason: null,
        },
        { new: true },
      );

      if (!updated) {
        return null;
      }

      return updated;
    } catch (error) {
      throw new AppError("Failed to record delivery success", 500);
    }
  }

  async recordDeliveryFailure(token, reason = "unknown") {
    try {
      const tokenDoc = await DevicePushToken.findOne({ token });

      if (!tokenDoc) {
        return null;
      }

      tokenDoc.failureCount = (tokenDoc.failureCount || 0) + 1;
      tokenDoc.lastFailureAt = new Date();
      tokenDoc.lastFailureReason = reason;

      if (tokenDoc.failureCount >= 3) {
        tokenDoc.isActive = false;
      }

      await tokenDoc.save();
      return tokenDoc;
    } catch (error) {
      throw new AppError("Failed to record delivery failure", 500);
    }
  }

  async unregisterDevice(userId, deviceId) {
    try {
      const updated = await DevicePushToken.findOneAndUpdate(
        {
          user: userId,
          deviceId,
        },
        {
          isActive: false,
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!updated) {
        throw new AppError("Device not found", 404);
      }

      return updated;
    } catch (error) {
      if (error.message === "Device not found") throw error;
      throw new AppError("Failed to unregister device", 500);
    }
  }

  async getUserDevices(userId) {
    try {
      const devices = await DevicePushToken.find(
        { user: userId },
        {
          token: 0,
          deviceId: 1,
          deviceName: 1,
          platform: 1,
          isActive: 1,
          lastUsedAt: 1,
          registeredAt: 1,
          metadata: 1,
        },
      )
        .sort({ lastUsedAt: -1 })
        .lean();

      return devices;
    } catch (error) {
      throw new AppError("Failed to fetch user devices", 500);
    }
  }

  async cleanupStaleTokens() {
    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      const deactivateResult = await DevicePushToken.updateMany(
        {
          lastUsedAt: { $lt: sixtyDaysAgo },
          isActive: true,
        },
        {
          isActive: false,
          updatedAt: new Date(),
        },
      );

      const deleteResult = await DevicePushToken.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      return {
        deactivated: deactivateResult.modifiedCount,
        deleted: deleteResult.deletedCount,
      };
    } catch (error) {
      throw new AppError("Failed to cleanup stale tokens", 500);
    }
  }

  async validateTokenOwnership(userId, token) {
    try {
      const exists = await DevicePushToken.findOne({
        user: userId,
        token,
      });

      return !!exists;
    } catch (error) {
      throw new AppError("Failed to validate token", 500);
    }
  }
}

module.exports = new PushTokenService();
