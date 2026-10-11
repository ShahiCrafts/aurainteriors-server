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
