const Joi = require("joi");
const { joiSafeUrl } = require("../utils/safeUrl");

const validCategories = [
  "living_room",
  "bedroom",
  "dining",
  "office",
  "outdoor",
  "storage",
  "decor",
];

const targetAudienceSchema = Joi.object({
  type: Joi.string()
    .valid("all", "subscribers", "category", "custom")
    .default("subscribers"),
  categories: Joi.array()
    .max(50)
    .items(Joi.string().valid(...validCategories))
    .when("type", {
      is: "category",
      then: Joi.array().min(1).required(),
      otherwise: Joi.array().optional(),
    }),
  userIds: Joi.array()
    .max(1000)
    .items(Joi.string().hex().length(24))
    .when("type", {
      is: "custom",
      then: Joi.array().min(1).required(),
      otherwise: Joi.array().optional(),
    }),
});

exports.createPromotionSchema = Joi.object({
  title: Joi.string().required().max(200).trim().messages({
    "string.empty": "Promotion title is required",
    "string.max": "Title cannot exceed 200 characters",
  }),
  description: Joi.string().required().max(1000).trim().messages({
    "string.empty": "Promotion description is required",
    "string.max": "Description cannot exceed 1000 characters",
  }),
  shortDescription: Joi.string().max(200).trim().optional(),
  targetAudience: targetAudienceSchema.optional(),
  scheduledAt: Joi.date().iso().min("now").optional().messages({
    "date.min": "Scheduled time must be in the future",
  }),
  discount: Joi.string().hex().length(24).optional().messages({
    "string.length": "Invalid discount ID format",
  }),
  actionUrl: joiSafeUrl(Joi, 500).optional(),
  imageUrl: joiSafeUrl(Joi, 500).optional(),
  priority: Joi.string().valid("low", "normal", "high").default("normal"),
  tags: Joi.array().items(Joi.string().max(50).trim()).max(10).optional(),
  expiresAt: Joi.date().iso().min("now").optional(),
});

exports.updatePromotionSchema = Joi.object({
  title: Joi.string().max(200).trim().optional(),
  description: Joi.string().max(1000).trim().optional(),
  shortDescription: Joi.string().max(200).trim().optional(),
  targetAudience: targetAudienceSchema.optional(),
  scheduledAt: Joi.date().iso().min("now").allow(null).optional(),
  discount: Joi.string().hex().length(24).allow(null).optional(),
  actionUrl: joiSafeUrl(Joi, 500).allow(null).optional(),
  imageUrl: joiSafeUrl(Joi, 500).allow(null).optional(),
  priority: Joi.string().valid("low", "normal", "high").optional(),
  tags: Joi.array().items(Joi.string().max(50).trim()).max(10).optional(),
  expiresAt: Joi.date().iso().min("now").optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

exports.schedulePromotionSchema = Joi.object({
  scheduledAt: Joi.date().iso().min("now").required().messages({
    "any.required": "Scheduled time is required",
    "date.min": "Scheduled time must be in the future",
  }),
});

exports.trackEngagementSchema = Joi.object({
  promotionId: Joi.string().hex().length(24).required().messages({
    "any.required": "Promotion ID is required",
    "string.length": "Invalid promotion ID format",
  }),
  action: Joi.string()
    .valid("delivered", "read", "clicked")
    .required()
    .messages({
      "any.required": "Action is required",
      "any.only": "Action must be one of: delivered, read, clicked",
    }),
});

exports.previewPromotionSchema = Joi.object({
  targetAudience: targetAudienceSchema.required().messages({
    "any.required": "Target audience configuration is required",
  }),
});

exports.getPromotionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid("draft", "scheduled", "sending", "sent", "cancelled")
    .optional(),
});
