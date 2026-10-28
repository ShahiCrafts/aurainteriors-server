const { boundedLimit, boundedPage } = require("../utils/listQuery");
const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: [true, "Message must belong to a chat"],
      index: true,
    },
    clientMessageId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        function () {
          return ["customer", "admin"].includes(this.senderRole);
        },
        "Message must have a sender unless it is a system message",
      ],
    },
    senderGuestSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuestSession",
      default: null,
    },
    senderRole: {
      type: String,
      enum: ["customer", "admin", "bot", "system"],
      required: [true, "Sender role is required"],
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    // FIX 8: Distinguish AI-generated messages from human admin messages
    isAiGenerated: {
      type: Boolean,
      default: false,
    },
    isInternalNote: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      maxlength: 5000,
    },
    attachments: [
      {
        fileName: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

chatMessageSchema.index({ chat: 1, createdAt: -1 });
// AR-16: getChatStats' response-time aggregation is supported by a
// { senderRole: 1, chat: 1, createdAt: 1 } index — deliberately NOT
// declared here (per the AR-42 precedent: new indexes ship as owner-run
// migrations, never auto-built at boot). The pipeline is correct
// without it (the {chat, createdAt} index serves the sort; the planner
// examines more keys) and fast with it — see MIGRATIONS.md M-5.
chatMessageSchema.index(
  { chat: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: "string" } },
  },
);
chatMessageSchema.index({ sender: 1 });
chatMessageSchema.index({ isRead: 1 });
chatMessageSchema.index({ chat: 1, senderRole: 1, isRead: 1 });

chatMessageSchema.pre("validate", function () {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    throw new Error("Message must have content or attachments");
  }
  if (!this.deliveredAt) {
    this.deliveredAt = new Date();
  }
});

chatMessageSchema.statics.getChatMessages = async function (
  chatId,
  options = {},
) {
  const limit = boundedLimit(options.limit, 50);
  const page = boundedPage(options.page);
  const skip = (page - 1) * limit;

  const query = {
    chat: chatId,
    deletedAt: null,
  };

  if (options.includeInternalNotes !== true)
    query.isInternalNote = { $ne: true };

  const [messages, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      // FA-58: sender email is staff-only; history for customers/guests
      // must not disclose participants' email addresses.
      .populate(
        "sender",
        options.includeSenderEmail === true
          ? "firstName lastName email role avatar"
          : "firstName lastName role avatar",
      )
      .lean(),
    this.countDocuments(query),
  ]);

  messages.reverse();

  return {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + messages.length < total,
    },
  };
};

chatMessageSchema.statics.markAsRead = async function (chatId, senderRole) {
  // FIX 8: When a customer reads, mark both 'admin' and 'bot' messages as read
  const oppositeRole =
    senderRole === "customer" ? { $in: ["admin", "bot"] } : "customer";

  const result = await this.updateMany(
    {
      chat: chatId,
      senderRole: oppositeRole,
      ...(senderRole === "customer" ? { isInternalNote: { $ne: true } } : {}),
      isRead: false,
      deletedAt: null,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
  );

  return result.modifiedCount;
};

chatMessageSchema.statics.getUnreadCount = async function (chatId, senderRole) {
  // FIX 8: Count unread 'bot' messages the same as 'admin' from customer's perspective
  const oppositeRole =
    senderRole === "customer" ? { $in: ["admin", "bot"] } : "customer";

  return this.countDocuments({
    chat: chatId,
    senderRole: oppositeRole,
    isRead: false,
    deletedAt: null,
  });
};

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
