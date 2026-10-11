const Joi = require('joi');

exports.subscribeSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .trim()
        .lowercase()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
            'string.empty': 'Email cannot be empty'
        }),
    source: Joi.string()
        .valid('footer', 'blog')
        .default('footer')
        .messages({
            'any.only': 'Source must be either footer or blog'
        }),
});

exports.unsubscribeSchema = Joi.object({ token: Joi.string().max(2048).required() });
exports.confirmSubscriptionSchema = exports.unsubscribeSchema;

exports.sendTrendSchema = Joi.object({
    subject: Joi.string()
        .required()
        .trim()
        .min(5)
        .max(200)
        .messages({
            'string.empty': 'Subject is required',
            'string.min': 'Subject must be at least 5 characters',
            'string.max': 'Subject must not exceed 200 characters',
            'any.required': 'Subject is required'
        }),
    htmlContent: Joi.string()
        .required()
        .messages({
            'string.empty': 'HTML content is required',
            'any.required': 'HTML content is required'
        }),
    textContent: Joi.string()
        .required()
        .min(10)
        .messages({
            'string.empty': 'Text content is required',
            'string.min': 'Text content must be at least 10 characters',
            'any.required': 'Text content is required'
        }),
});
