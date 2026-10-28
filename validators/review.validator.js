const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, "valid ObjectId");

exports.createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.base": "Rating must be a number",
    "number.integer": "Rating must be a whole number",
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
    "any.required": "Rating is required",
  }),
  title: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Title cannot exceed 100 characters",
  }),
  comment: Joi.string().trim().min(10).max(1000).required().messages({
    "string.empty": "Review comment is required",
    "string.min": "Comment must be at least 10 characters",
    "string.max": "Comment cannot exceed 1000 characters",
    "any.required": "Review comment is required",
  }),
});

exports.updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).messages({
    "number.base": "Rating must be a number",
    "number.integer": "Rating must be a whole number",
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
  }),
  title: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Title cannot exceed 100 characters",
  }),
  comment: Joi.string().trim().min(10).max(1000).messages({
    "string.min": "Comment must be at least 10 characters",
    "string.max": "Comment cannot exceed 1000 characters",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

exports.getReviewsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be a whole number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be a whole number",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
  sort: Joi.string()
    .valid(
      "-createdAt",
      "createdAt",
      "-rating",
      "rating",
      "-helpfulCount",
      "helpfulCount",
    )
    .default("-createdAt")
    .messages({
      "any.only": "Invalid sort option",
    }),
  rating: Joi.number().integer().min(1).max(5).messages({
    "number.base": "Rating filter must be a number",
    "number.integer": "Rating filter must be a whole number",
    "number.min": "Rating filter must be at least 1",
    "number.max": "Rating filter cannot exceed 5",
  }),
  verified: Joi.boolean().messages({
    "boolean.base": "Verified filter must be a boolean",
  }),
});

exports.adminResponseSchema = Joi.object({
  comment: Joi.string().trim().min(1).max(500).required().messages({
    "string.empty": "Response comment is required",
    "string.max": "Response cannot exceed 500 characters",
    "any.required": "Response comment is required",
  }),
});

exports.productIdSchema = Joi.object({
  productId: objectId.required().messages({
    "any.required": "Product ID is required",
    "string.pattern.name": "Invalid product ID",
  }),
});

exports.reviewIdSchema = Joi.object({
  reviewId: objectId.required().messages({
    "any.required": "Review ID is required",
    "string.pattern.name": "Invalid review ID",
  }),
});
