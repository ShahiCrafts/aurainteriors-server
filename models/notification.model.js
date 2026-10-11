const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    idempotencyKey: { type: String },
    expiresAt: { type: Date, default: null },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
