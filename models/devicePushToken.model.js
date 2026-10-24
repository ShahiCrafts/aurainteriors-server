const mongoose = require("mongoose");

const devicePushTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    token: {
      type: String,
      required: [true, "Push token is required"],
      unique: true,
      maxlength: 500,
    },
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      maxlength: 256,
    },
    _userDeviceIndex: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    deviceName: {
      type: String,
      maxlength: 200,
      default: "Unknown Device",
    },
    platform: {
      type: String,
      enum: ["web", "android", "ios"],
      required: [true, "Platform is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      userAgent: String,
      osVersion: String,
      appVersion: String,
      pushPermission: {
        type: String,
        enum: ["granted", "denied", "default"],
        default: "default",
      },
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastFailureAt: Date,
    lastFailureReason: String,
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// FA-69: uniqueness of (user, deviceId) is enforced by a REAL compound
// unique index - previously it depended on a pre-save hook maintaining
// the _userDeviceIndex shadow field, so any write path that skipped the
// hook (bulk updates, upserts) could create duplicates. Creating this
// index on an existing collection with duplicate pairs will fail the
// index build; see OWNER_DECISIONS.md (FA-69) for the dedupe-first
// rollout.
devicePushTokenSchema.index({ user: 1, deviceId: 1 }, { unique: true });
devicePushTokenSchema.index({ user: 1, isActive: 1 });
devicePushTokenSchema.index({ lastUsedAt: 1 });
devicePushTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

devicePushTokenSchema.pre("save", function () {
  if (this.user && this.deviceId) {
    this._userDeviceIndex = `${this.user}_${this.deviceId}`;
  }
});

module.exports = mongoose.model("DevicePushToken", devicePushTokenSchema);
