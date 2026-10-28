const Joi = require("joi");
const { joiSafeUrl } = require("../utils/safeUrl");

// Valid announcement types
const validTypes = [
  "general",
  "maintenance",
  "update",
  "promotion",
  "policy",
  "event",
];
const validPriorities = ["low", "normal", "high", "critical"];
const validStatuses = ["draft", "scheduled", "published", "archived"];
const validTargetTypes = ["all", "customers", "admins"];

// Target audience schema
const targetAudienceSchema = Joi.object({
  type: Joi.string()
    .valid(...validTargetTypes)
    .default("all"),
});

// Create announcement validation schema
exports.createAnnouncementSchema = Joi.object({
  title: Joi.string().required().max(200).trim().messages({
    "string.empty": "Announcement title is required",
    "string.max": "Title cannot exceed 200 characters",
  }),
  content: Joi.string().required().max(5000).trim().messages({
    "string.empty": "Announcement content is required",
    "string.max": "Content cannot exceed 5000 characters",
  }),
  summary: Joi.string().max(300).trim().optional().messages({
    "string.max": "Summary cannot exceed 300 characters",
  }),
  type: Joi.string()
    .valid(...validTypes)
    .default("general")
    .messages({
      "any.only": `Type must be one of: ${validTypes.join(", ")}`,
    }),
  priority: Joi.string()
    .valid(...validPriorities)
    .default("normal")
    .messages({
      "any.only": `Priority must be one of: ${validPriorities.join(", ")}`,
    }),
  targetAudience: targetAudienceSchema.optional(),
  scheduledAt: Joi.date().iso().min("now").optional().messages({
    "date.min": "Scheduled time must be in the future",
  }),
  expiresAt: Joi.date().iso().min("now").optional().messages({
    "date.min": "Expiration time must be in the future",
  }),
  isPinned: Joi.boolean().default(false),
  imageUrl: joiSafeUrl(Joi, 500).optional().allow("", null),
  actionUrl: joiSafeUrl(Joi, 500).optional().allow("", null),
  actionLabel: Joi.string().max(50).optional().allow("", null),
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .optional()
    .messages({
      "array.max": "Maximum of 10 tags allowed",
    }),
});

// Update announcement validation schema
exports.updateAnnouncementSchema = Joi.object({
  title: Joi.string().max(200).trim().optional().messages({
    "string.max": "Title cannot exceed 200 characters",
  }),
  content: Joi.string().max(5000).trim().optional().messages({
    "string.max": "Content cannot exceed 5000 characters",
  }),
  summary: Joi.string().max(300).trim().optional().allow("", null),
  type: Joi.string()
    .valid(...validTypes)
    .optional()
    .messages({
      "any.only": `Type must be one of: ${validTypes.join(", ")}`,
    }),
  priority: Joi.string()
    .valid(...validPriorities)
    .optional()
    .messages({
      "any.only": `Priority must be one of: ${validPriorities.join(", ")}`,
    }),
  status: Joi.string()
    .valid(...validStatuses)
    .optional()
    .messages({
      "any.only": `Status must be one of: ${validStatuses.join(", ")}`,
    }),
  targetAudience: targetAudienceSchema.optional(),
  scheduledAt: Joi.date().iso().optional().allow(null),
  expiresAt: Joi.date().iso().optional().allow(null),
  isPinned: Joi.boolean().optional(),
  imageUrl: joiSafeUrl(Joi, 500).optional().allow("", null),
  actionUrl: joiSafeUrl(Joi, 500).optional().allow("", null),
  actionLabel: Joi.string().max(50).optional().allow("", null),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
});

// Schedule announcement validation schema
exports.scheduleAnnouncementSchema = Joi.object({
  scheduledAt: Joi.date().iso().min("now").required().messages({
    "date.min": "Scheduled time must be in the future",
    "any.required": "Scheduled time is required",
  }),
});

// Query validation for getting announcements
exports.getAnnouncementsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid(...validStatuses)
    .optional(),
  type: Joi.string()
    .valid(...validTypes)
    .optional(),
  priority: Joi.string()
    .valid(...validPriorities)
    .optional(),
  isPinned: Joi.boolean().optional(),
});

// Public query validation for users
exports.getPublicAnnouncementsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  type: Joi.string()
    .valid(...validTypes)
    .optional(),
});
