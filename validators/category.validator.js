const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, "valid ObjectId");

// Phase 1 (catalog): the category's catalog fields become writable.
// Shape is pinned here; the VALUES are validated against the
// ProductType / Room registries in the controller (a Joi schema
// cannot see the database). Registry keys allow hyphens and
// underscores (office_chair); room slugs are hyphen-only.
const productTypeKey = Joi.string()
  .trim()
  .lowercase()
  .pattern(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)
  .max(60)
  .allow("", null)
  .messages({
    "string.pattern.base":
      "Product type must be a registry key (lowercase letters, numbers, hyphens or underscores)",
    "string.max": "Product type cannot exceed 60 characters",
  });

const roomSlugsSchema = Joi.alternatives().try(
  Joi.array()
    .items(
      Joi.string()
        .trim()
        .lowercase()
        .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(60),
    )
    .max(20),
  Joi.string(), // Allow JSON string from form-data
);

exports.createCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Category name is required",
    "string.max": "Category name cannot exceed 100 characters",
    "any.required": "Category name is required",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  parent: objectId.allow(null, "").messages({
    "string.pattern.name": "Invalid parent category ID",
  }),
  status: Joi.string().valid("active", "inactive").default("active").messages({
    "any.only": "Status must be either 'active' or 'inactive'",
  }),
  sortOrder: Joi.number().integer().min(0).default(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
  productType: productTypeKey,
  roomSlugs: roomSlugsSchema,
});

exports.updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).messages({
    "string.empty": "Category name cannot be empty",
    "string.max": "Category name cannot exceed 100 characters",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  parent: objectId.allow(null, "").messages({
    "string.pattern.name": "Invalid parent category ID",
  }),
  status: Joi.string().valid("active", "inactive").messages({
    "any.only": "Status must be either 'active' or 'inactive'",
  }),
  sortOrder: Joi.number().integer().min(0).messages({
    "number.min": "Sort order cannot be negative",
  }),
  productType: productTypeKey,
  roomSlugs: roomSlugsSchema,
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// Phase 1: sibling reorder — one call sets sortOrder for a group of
// categories that share a parent (the controller enforces the
// same-parent rule; ids are position = new sortOrder).
exports.reorderCategoriesSchema = Joi.object({
  ids: Joi.array()
    .items(objectId)
    .min(1)
    .max(500)
    .unique()
    .required()
    .messages({
      "any.required": "A list of category ids is required",
      "array.min": "At least one category id is required",
      "array.max": "Cannot reorder more than 500 categories at once",
      "array.unique": "Category ids must be unique",
    }),
});

exports.getCategoriesQuerySchema = Joi.object({
  tree: Joi.string().valid("true", "false"),
  status: Joi.string().valid("active", "inactive"),
  parent: Joi.alternatives().try(objectId, Joi.string().valid("null")),
});

// Phase 2 (catalog): replace a category's OWN attribute assignment
// list atomically. Keys are camelCase attribute identifiers (same
// pattern as validators/catalog.validator.js); value checks
// (definition exists, is catalogAttributes-storage, defaultValue
// validates) happen in the controller against the registry.
const attributeKey = Joi.string()
  .trim()
  .pattern(/^[A-Za-z][A-Za-z0-9_]*$/)
  .max(60)
  .messages({
    "string.pattern.base":
      "Attribute key must be a camelCase identifier (letters, numbers, underscores)",
    "string.max": "Attribute key cannot exceed 60 characters",
  });

exports.setCategoryAttributeAssignmentsSchema = Joi.object({
  assignments: Joi.array()
    .items(
      Joi.object({
        attributeKey: attributeKey.required().messages({
          "any.required": "Each assignment requires an attributeKey",
        }),
        required: Joi.boolean(),
        defaultValue: Joi.any(),
        displayGroup: Joi.string().trim().max(60),
        sortOrder: Joi.number().integer(),
        active: Joi.boolean(),
      }),
    )
    .max(100)
    .required()
    .messages({
      "any.required": "An assignments array is required",
      "array.max": "A category cannot hold more than 100 attribute assignments",
    }),
});
