const mongoose = require("mongoose");
const validator = require("validator");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      validate: {
        validator: (value) => validator.isEmail(String(value || "")),
        message: "Please provide a valid email",
      },
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    category: {
      type: String,
      enum: ["general", "support", "sales", "partnership", "feedback", "other"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["new", "in-progress", "resolved", "closed"],
      default: "new",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
    response: {
      deliveryStatus: {
        type: String,
        enum: ["pending", "accepted", "failed"],
        default: "pending",
      },
      acceptedAt: Date,
      providerMessageId: String,
      message: {
        type: String,
        trim: true,
      },
      respondedAt: {
        type: Date,
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ isRead: 1 });
contactSchema.index({ category: 1 });
contactSchema.index({ priority: 1 });

// Virtual for formatted status
contactSchema.virtual("statusLabel").get(function () {
  const labels = {
    new: "New",
    "in-progress": "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };
  return labels[this.status] || this.status;
});

// Virtual for formatted category
contactSchema.virtual("categoryLabel").get(function () {
  const labels = {
    general: "General Inquiry",
    support: "Customer Support",
    sales: "Sales",
    partnership: "Partnership",
    feedback: "Feedback",
    other: "Other",
  };
  return labels[this.category] || this.category;
});

// Static method to get unread count
contactSchema.statics.getUnreadCount = async function () {
  return this.countDocuments({ isRead: false });
};

// Static method to get stats
contactSchema.statics.getStats = async function () {
  const [total, unread, statusCounts, categoryCounts] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isRead: false }),
    this.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    this.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
  ]);

  return {
    total,
    unread,
    statusCounts: statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    categoryCounts: categoryCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  };
};

const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
