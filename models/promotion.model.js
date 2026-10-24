const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Promotion title is required"],
      maxlength: 200,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Promotion description is required"],
      maxlength: 1000,
      trim: true,
    },
    shortDescription: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    targetAudience: {
      type: {
        type: String,
        enum: ["all", "subscribers", "category", "custom"],
        default: "subscribers",
      },
      categories: [
        {
          type: String,
          enum: [
            "living_room",
            "bedroom",
            "dining",
            "office",
            "outdoor",
            "storage",
            "decor",
          ],
        },
      ],
      userIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "cancelled"],
      default: "draft",
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    discount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discount",
      default: null,
    },
    actionUrl: {
      type: String,
      maxlength: 500,
      default: null,
    },
    imageUrl: {
      type: String,
      maxlength: 500,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    metrics: {
      targetCount: { type: Number, default: 0 },
      sentCount: { type: Number, default: 0 },
      deliveredCount: { type: Number, default: 0 },
      readCount: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    notification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

promotionSchema.index({ status: 1 });
promotionSchema.index({ scheduledAt: 1 });
promotionSchema.index({ createdBy: 1 });
promotionSchema.index({ createdAt: -1 });
promotionSchema.index({ "targetAudience.type": 1 });

promotionSchema.virtual("isActive").get(function () {
  return this.status === "sending" || this.status === "sent";
});

promotionSchema.virtual("canEdit").get(function () {
  return this.status === "draft" || this.status === "scheduled";
});

promotionSchema.virtual("deliveryRate").get(function () {
  if (this.metrics.sentCount === 0) return 0;
  return Math.round(
    (this.metrics.deliveredCount / this.metrics.sentCount) * 100
  );
});

promotionSchema.virtual("engagementRate").get(function () {
  if (this.metrics.deliveredCount === 0) return 0;
  return Math.round(
    (this.metrics.readCount / this.metrics.deliveredCount) * 100
  );
});

promotionSchema.methods.updateMetrics = async function (field, increment = 1) {
  const validFields = [
    "targetCount",
    "sentCount",
    "deliveredCount",
    "readCount",
    "clickCount",
    "failedCount",
  ];
  if (!validFields.includes(field)) {
    throw new Error(`Invalid metric field: ${field}`);
  }

  // AR-23: atomic $inc instead of read-modify-write save() of the
  // whole document (which lost concurrent increments - 100 parallel
  // events landed +1 - and rewrote the embedded userIds array on
  // every event). Caller audit: no live callers (promotionService
  // .trackEngagement already does its own atomic $inc, C-09); the
  // method is kept safe for future callers. The in-memory copy is
  // mirrored via _doc so it reflects this call's increment without
  // dirtying the document.
  await this.constructor.updateOne(
    { _id: this._id },
    { $inc: { [`metrics.${field}`]: increment } }
  );
  if (this._doc.metrics) {
    this._doc.metrics[field] = (this._doc.metrics[field] || 0) + increment;
  }
};

promotionSchema.statics.getScheduledCampaignsToSend = function () {
  return this.find({
    status: "scheduled",
    scheduledAt: { $lte: new Date() },
  });
};

promotionSchema.statics.getActivePromotionsForUser = function (
  userId,
  categoryPreferences = []
) {
  const query = {
    status: "sent",
    expiresAt: { $gt: new Date() },
    $or: [
      { "targetAudience.type": "all" },
      { "targetAudience.type": "subscribers" },
      { "targetAudience.userIds": userId },
    ],
  };

  if (categoryPreferences.length > 0) {
    query.$or.push({
      "targetAudience.type": "category",
      "targetAudience.categories": { $in: categoryPreferences },
    });
  }

  return this.find(query).sort({ sentAt: -1 }).limit(10);
};

module.exports = mongoose.model("Promotion", promotionSchema);
