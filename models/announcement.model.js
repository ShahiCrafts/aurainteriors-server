const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      maxlength: 200,
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Announcement content is required"],
      maxlength: 5000,
      trim: true,
    },
    summary: {
      type: String,
      maxlength: 300,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "general",
        "maintenance",
        "update",
        "promotion",
        "policy",
        "event",
      ],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
    },
    targetAudience: {
      type: {
        type: String,
        enum: ["all", "customers", "admins"],
        default: "all",
      },
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    imageUrl: {
      type: String,
      maxlength: 500,
      default: null,
    },
    actionUrl: {
      type: String,
      maxlength: 500,
      default: null,
    },
    actionLabel: {
      type: String,
      maxlength: 50,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
announcementSchema.index({ status: 1, publishedAt: -1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ isPinned: -1, publishedAt: -1 });
announcementSchema.index({ expiresAt: 1 });
announcementSchema.index({ scheduledAt: 1 });

// Virtual for checking if announcement is active
announcementSchema.virtual("isActive").get(function () {
  const now = new Date();
  return (
    this.status === "published" && (!this.expiresAt || this.expiresAt > now)
  );
});

// Pre-save middleware to auto-set publishedAt when status changes to published
announcementSchema.pre("save", function () {
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }
});

// Static method to get active announcements for users
announcementSchema.statics.getActiveAnnouncements = async function (
  options = {},
) {
  const { limit = 10, page = 1, type, targetAudience = "all" } = options;
  const skip = (page - 1) * limit;
  const now = new Date();

  const query = {
    status: "published",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    "targetAudience.type": { $in: [targetAudience, "all"] },
  };

  if (type) {
    query.type = type;
  }

  const [announcements, total] = await Promise.all([
    this.find(query)
      .sort({ isPinned: -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "firstName lastName")
      .lean(),
    this.countDocuments(query),
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
};

module.exports = mongoose.model("Announcement", announcementSchema);
