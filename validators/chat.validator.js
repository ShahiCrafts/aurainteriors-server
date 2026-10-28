const Joi = require("joi");

const validStatuses = [
  "ai_handling",
  "escalated",
  "agent_handling",
  "resolved",
  "closed",
];
const validPriorities = ["low", "normal", "high", "urgent"];

exports.startChatSchema = Joi.object({
  subject: Joi.string().max(200).trim().required().messages({
    "string.empty": "Chat subject is required",
    "string.max": "Subject cannot exceed 200 characters",
  }),
  guestEmail: Joi.string().email().max(254).lowercase().trim().optional(),
  // FA-39: userAgent / ipAddress / referrer are NOT accepted from the
  // client - the server derives them from the request (see startChat).
  // stripUnknown drops them if a client sends them anyway.
  metadata: Joi.object({}).optional(),
  guestSessionId: Joi.string()
    .pattern(/^guest_[a-f0-9]{64}$/)
    .optional(), // Allow guest session ID to pass through
});

exports.sendMessageSchema = Joi.object({
  clientMessageId: Joi.string().max(100).trim().optional(),
  content: Joi.string().max(5000).allow("", null).optional().messages({
    "string.max": "Message content cannot exceed 5000 characters",
  }),
  attachments: Joi.array()
    .items(
      Joi.object({
        fileName: Joi.string().max(255).required(),
        fileUrl: Joi.string()
          .uri({ scheme: ["https"] })
          .max(2048)
          .required(),
        fileType: Joi.string().valid("image", "document").required(),
        fileSize: Joi.number()
          .integer()
          .positive()
          .max(10 * 1024 * 1024)
          .required(),
      }),
    )
    .max(3)
    .optional()
    .messages({
      "array.max": "Maximum of 3 attachments allowed per message",
    }),
  isInternalNote: Joi.boolean().optional().default(false),
  guestSessionId: Joi.string()
    .pattern(/^guest_[a-f0-9]{64}$/)
    .optional(), // Allow guest session ID to pass through
});

exports.updateTypingSchema = Joi.object({
  isTyping: Joi.boolean().required().messages({
    "any.required": "isTyping field is required",
  }),
});

exports.closeChatSchema = Joi.object({}).optional();

exports.resolveChatSchema = Joi.object({}).optional();

exports.getChatsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid(...validStatuses)
    .optional(),
  priority: Joi.string()
    .valid(...validPriorities)
    .optional(),
  sortBy: Joi.string()
    .valid("lastMessageAt", "createdAt", "priority")
    .default("lastMessageAt"),
  guestSessionId: Joi.string()
    .pattern(/^guest_[a-f0-9]{64}$/)
    .optional(), // Allow guest session ID to pass through
});

exports.getMessagesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  guestSessionId: Joi.string()
    .pattern(/^guest_[a-f0-9]{64}$/)
    .optional(), // Allow guest session ID to pass through
});
