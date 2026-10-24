const Joi = require("joi");
const objectId = Joi.string().pattern(/^[a-f0-9]{24}$/i);
exports.updateContactSchema = Joi.object({
  status: Joi.string().valid("new", "in-progress", "resolved", "closed"),
  priority: Joi.string().valid("low", "medium", "high"),
  adminNotes: Joi.string().trim().max(2000).allow(""),
  assignedTo: objectId.allow(null, ""),
}).min(1);
exports.readContactSchema = Joi.object({
  isRead: Joi.boolean().strict().required(),
});
exports.respondContactSchema = Joi.object({
  message: Joi.string().trim().min(1).max(5000).required(),
});

exports.submitContactSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().trim().email().max(254).required(),
  phone: Joi.string().trim().max(20).allow(""),
  subject: Joi.string().trim().min(1).max(200).required(),
  message: Joi.string().trim().min(1).max(5000).required(),
  category: Joi.string().valid("general", "support", "sales", "partnership", "feedback", "other").default("general"),
});

// FA-26: bulk update - bounded id list, restricted update fields only.
exports.bulkUpdateContactSchema = Joi.object({
  ids: Joi.array().items(Joi.string().hex().length(24)).min(1).max(100).required(),
  status: Joi.string().valid("new", "in-progress", "resolved", "closed").optional(),
  priority: Joi.string().valid("low", "medium", "high").optional(),
  isRead: Joi.boolean().optional(),
  assignedTo: Joi.string().hex().length(24).allow(null).optional(),
}).or("status", "priority", "isRead", "assignedTo");
