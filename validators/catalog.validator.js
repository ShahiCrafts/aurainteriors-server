const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, "valid ObjectId");

// Phase 1 (catalog) — validators for the /api/v1/catalog registry
// resources (product types here; rooms and collections follow).
// Machine keys are slug-like: the owner's taxonomy keys use both
// hyphens and underscores (office_chair, dining_set), so both are
// allowed as separators.
const machineKey = Joi.string()
  .trim()
  .lowercase()
  .pattern(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)
  .max(60)
  .messages({
    "string.pattern.base":
      "Key must be lowercase letters, numbers, hyphens or underscores",
    "string.max": "Key cannot exceed 60 characters",
  });

// Attribute keys are camelCase identifiers (they become keys of
// Product.catalogAttributes and paths in queries), NOT slugs:
// frameMaterial, seatingCapacity, __proto__-shaped keys never match.
const attributeKey = Joi.string()
  .trim()
  .pattern(/^[A-Za-z][A-Za-z0-9_]*$/)
  .max(60)
  .messages({
    "string.pattern.base":
      "Attribute key must be a camelCase identifier (letters, numbers, underscores)",
    "string.max": "Attribute key cannot exceed 60 characters",
  });

const slug = Joi.string()
  .trim()
  .lowercase()
  .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(60)
  .messages({
    "string.pattern.base": "Slug must be lowercase letters, numbers or hyphens",
    "string.max": "Slug cannot exceed 60 characters",
  });

// ------------------------------------------------------------------
// Product types
// ------------------------------------------------------------------

// Phase 2: per-type attribute assignment overrides (merged by the
// resolution service at the type level, below category assignments).
const typeAttributeAssignment = Joi.object({
  attributeKey: attributeKey.required().messages({
    "any.required": "Assignment attributeKey is required",
  }),
  required: Joi.boolean(),
  displayGroup: Joi.string().trim().max(60),
  sortOrder: Joi.number().integer(),
});

exports.createProductTypeSchema = Joi.object({
  key: machineKey.required().messages({
    "any.required": "Product type key is required",
  }),
  label: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Product type label is required",
    "string.max": "Product type label cannot exceed 100 characters",
    "any.required": "Product type label is required",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  categoryKey: machineKey.allow("").messages({}),
  // SR-P6-2: attributeKeys are AttributeDefinition keys — camelCase
  // and case-sensitive — NOT machine keys; machineKey lowercased
  // them (frameMaterial -> framematerial) and resolution then
  // silently dropped the attribute.
  attributeKeys: Joi.array().items(attributeKey).max(50).default([]),
  attributeAssignments: Joi.array()
    .items(typeAttributeAssignment)
    .max(50)
    .default([]),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
});

exports.updateProductTypeSchema = Joi.object({
  key: machineKey,
  label: Joi.string().trim().min(1).max(100).messages({
    "string.empty": "Product type label cannot be empty",
    "string.max": "Product type label cannot exceed 100 characters",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  categoryKey: machineKey.allow(""),
  attributeKeys: Joi.array().items(attributeKey).max(50),
  attributeAssignments: Joi.array().items(typeAttributeAssignment).max(50),
  active: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// ------------------------------------------------------------------
// Attribute definitions (Phase 2)
// ------------------------------------------------------------------

// Keep in sync with models/attributeDefinition.model.js
// ATTRIBUTE_TYPES (the model enforces the same enum).
const attributeType = Joi.string()
  .valid(
    "string",
    "enum",
    "multi-enum",
    "boolean",
    "integer",
    "decimal",
    "measurement",
    "money",
    "color",
    "dimensions",
  )
  .messages({
    "any.only":
      "Attribute type must be one of string, enum, multi-enum, boolean, integer, decimal, measurement, money, color, dimensions",
  });

const attributeDefinitionFields = {
  label: Joi.string().trim().min(1).max(100).messages({
    "string.empty": "Attribute label cannot be empty",
    "string.max": "Attribute label cannot exceed 100 characters",
  }),
  type: attributeType,
  unit: Joi.string().trim().max(20).allow(""),
  acceptedUnits: Joi.array().items(Joi.string().trim().max(20)).max(10),
  allowedValues: Joi.array()
    .items(Joi.string().trim().min(1).max(100))
    .max(100),
  min: Joi.number(),
  max: Joi.number(),
  step: Joi.number().min(0),
  maxLength: Joi.number().integer().min(1),
  required: Joi.boolean(),
  filterable: Joi.boolean(),
  sortable: Joi.boolean(),
  comparable: Joi.boolean(),
  displayGroup: Joi.string().trim().max(60),
  sortOrder: Joi.number().integer(),
  active: Joi.boolean(),
  appliesTo: Joi.string().valid("all", "assigned"),
  storage: Joi.string().valid("catalogAttributes", "field"),
  fieldPath: Joi.string().trim().max(100),
};

exports.createAttributeDefinitionSchema = Joi.object({
  key: attributeKey.required().messages({
    "any.required": "Attribute key is required",
  }),
  ...attributeDefinitionFields,
  label: attributeDefinitionFields.label.required().messages({
    "any.required": "Attribute label is required",
  }),
  type: attributeType.required().messages({
    "any.required": "Attribute type is required",
  }),
  // A field-storage definition is meaningless without the field it
  // describes.
  fieldPath: Joi.when("storage", {
    is: "field",
    then: Joi.string().trim().max(100).required().messages({
      "any.required": "fieldPath is required when storage is 'field'",
    }),
    otherwise: Joi.string().trim().max(100),
  }),
});

exports.updateAttributeDefinitionSchema = Joi.object({
  key: attributeKey,
  ...attributeDefinitionFields,
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// ------------------------------------------------------------------
// Rooms
// ------------------------------------------------------------------

exports.createRoomSchema = Joi.object({
  slug: slug.required().messages({
    "any.required": "Room slug is required",
  }),
  label: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Room label is required",
    "string.max": "Room label cannot exceed 100 characters",
    "any.required": "Room label is required",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  image: Joi.string().trim().max(2048).allow(""),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
});

exports.updateRoomSchema = Joi.object({
  slug,
  label: Joi.string().trim().min(1).max(100).messages({
    "string.empty": "Room label cannot be empty",
    "string.max": "Room label cannot exceed 100 characters",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  image: Joi.string().trim().max(2048).allow(""),
  active: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// ------------------------------------------------------------------
// Collections
// ------------------------------------------------------------------

const collectionRuleSchema = Joi.object({
  type: Joi.string()
    .valid(
      "new-arrivals",
      "best-sellers",
      "featured",
      "on-sale",
      "attribute-match",
    )
    .required()
    .messages({
      "any.only":
        "Rule type must be one of new-arrivals, best-sellers, featured, on-sale, attribute-match",
      "any.required": "Rule type is required",
    }),
  // Rule params are rule-specific (windowDays / limit / key+value);
  // keys are preserved verbatim and coerced defensively when the
  // rule is evaluated (services/collection.service.js).
  params: Joi.object().unknown(true).default({}),
});

const collectionProductIds = Joi.array().items(objectId).max(500).messages({
  "array.max": "A collection cannot hold more than 500 products",
  "string.pattern.name": "Invalid product ID",
});

exports.createCollectionSchema = Joi.object({
  slug: slug.required().messages({
    "any.required": "Collection slug is required",
  }),
  label: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Collection label is required",
    "string.max": "Collection label cannot exceed 100 characters",
    "any.required": "Collection label is required",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  image: Joi.string().trim().max(2048).allow(""),
  kind: Joi.string().valid("manual", "rule").default("manual").messages({
    "any.only": "Kind must be either 'manual' or 'rule'",
  }),
  productIds: collectionProductIds.default([]),
  rule: Joi.when("kind", {
    is: "rule",
    then: collectionRuleSchema.required(),
    otherwise: collectionRuleSchema,
  }),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
});

exports.updateCollectionSchema = Joi.object({
  slug,
  label: Joi.string().trim().min(1).max(100).messages({
    "string.empty": "Collection label cannot be empty",
    "string.max": "Collection label cannot exceed 100 characters",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  image: Joi.string().trim().max(2048).allow(""),
  kind: Joi.string().valid("manual", "rule").messages({
    "any.only": "Kind must be either 'manual' or 'rule'",
  }),
  productIds: collectionProductIds,
  rule: collectionRuleSchema,
  active: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });
