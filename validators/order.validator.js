const Joi = require("joi");

const addressSchema = Joi.object({
  fullName: Joi.string().trim().required().max(100),
  phone: Joi.string()
    .trim()
    .required()
    .pattern(/^[0-9+\-\s]{7,15}$/),
  addressLine1: Joi.string().trim().required().max(200),
  addressLine2: Joi.string().trim().max(200).allow(""),
  city: Joi.string().trim().required().max(100),
  state: Joi.string().trim().max(100).allow(""),
  postalCode: Joi.string().trim().required().max(20),
  country: Joi.string().trim().default("Nepal").max(100),
});

exports.guestCheckoutSchema = Joi.object({
  idempotencyKey: Joi.string().pattern(/^[a-zA-Z0-9_-]{16,128}$/).optional(),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  firstName: Joi.string().trim().required().max(50).messages({
    "any.required": "First name is required",
  }),
  lastName: Joi.string().trim().required().max(50).messages({
    "any.required": "Last name is required",
  }),
  phone: Joi.string()
    .trim()
    .required()
    .pattern(/^[0-9+\-\s]{7,15}$/)
    .messages({
      "any.required": "Phone number is required",
      "string.pattern.base": "Please provide a valid phone number",
    }),

  items: Joi.array()
    .max(50)
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).max(99).required(),
        variant: Joi.object({
          color: Joi.string().allow(""),
          size: Joi.string().allow(""),
          material: Joi.string().allow(""),
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "Cart cannot be empty",
      "any.required": "Cart items are required",
    }),

  shippingAddress: addressSchema.required(),
  billingAddress: addressSchema,
  useSameAddress: Joi.boolean().default(true),

  paymentMethod: Joi.string().valid("cod", "esewa").required().messages({
    "any.only": "Payment method must be either cod or esewa",
    "any.required": "Payment method is required",
  }),

  discountCode: Joi.string().trim().uppercase().allow(""),

  customerNote: Joi.string().trim().max(500).allow(""),
});

exports.authenticatedCheckoutSchema = Joi.object({
  selectedItemIds: Joi.array().items(Joi.string().pattern(/^[a-f0-9]{24}$/i)).min(1).max(100).unique(),
  idempotencyKey: Joi.string().pattern(/^[a-zA-Z0-9_-]{16,128}$/).optional(),
  shippingAddressId: Joi.string(),
  shippingAddress: addressSchema,
  billingAddressId: Joi.string(),
  billingAddress: addressSchema,
  useSameAddress: Joi.boolean().default(true),
  paymentMethod: Joi.string().valid("cod", "esewa").required().messages({
    "any.only": "Payment method must be either cod or esewa",
    "any.required": "Payment method is required",
  }),
  discountCode: Joi.string().trim().uppercase().allow(""),
  customerNote: Joi.string().trim().max(500).allow(""),
}).or("shippingAddressId", "shippingAddress");

exports.orderTrackingSchema = Joi.object({
  orderId: Joi.string().trim().uppercase().required().messages({
    "any.required": "Order ID is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

exports.updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    )
    .required()
    .messages({
      "any.only": "Invalid order status",
      "any.required": "Status is required",
    }),
  note: Joi.string().trim().max(500).allow(""),
});

exports.getOrdersQuerySchema = Joi.object({
  status: Joi.string().valid(
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled"
  ),
  paymentStatus: Joi.string().valid("pending", "paid", "failed", "refunded"),
  search: Joi.string().trim().allow(""),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
