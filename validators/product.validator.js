const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, "valid ObjectId");

const modelUrlsSchema = Joi.array().items(Joi.object({
  url: Joi.string().uri({ scheme: ["http", "https"] }).max(2048).required(),
  format: Joi.string().valid("glb", "gltf", "usdz").required(),
  platform: Joi.string().valid("android", "ios", "universal"),
})).max(20);
const removeModelsSchema = Joi.array().items(Joi.string().uri({ scheme: ["http", "https"] }).max(2048)).max(100).unique();
const jsonArray = schema => Joi.any().custom((value, helpers) => {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return helpers.error("any.invalid"); }
  }
  const result = schema.validate(parsed, { abortEarly: false });
  if (result.error) return helpers.error("any.invalid");
  return result.value;
});

// Phase 1 (catalog): room assignment. Slugs are validated against
// the Room registry in the controller (a Joi schema cannot see the
// database); here we pin the shape — slug strings, max 20 rooms, as
// an array or a JSON-string array from multipart form-data.
const roomSlugsSchema = Joi.alternatives().try(
  Joi.array()
    .items(
      Joi.string()
        .trim()
        .lowercase()
        .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(60)
    )
    .max(20),
  Joi.string()
);

// Phase 2 (catalog): catalogAttributes pass through as an object
// (JSON requests) or a JSON string (multipart form-data). Shape
// pinning stops here by design — keys and values are validated
// against the DB attribute definitions by the engine in the
// controller (services/productAttributes.service.js), which names
// the offending key; a Joi schema cannot see the registry.
const catalogAttributesSchema = Joi.alternatives().try(
  Joi.object().unknown(true),
  Joi.string()
);

// Phase 3 (catalog): Product.productType — a key in the ProductType
// registry. Shape pinned here (lowercased like the model's field);
// registry membership is validated in the controller (a Joi schema
// cannot see the database). ""/null clears the assignment.
const productTypeSchema = Joi.string().trim().lowercase().max(60).allow("", null);

// Phase 3 (catalog): variantOptionKeys — the attribute keys that
// define a product's variants. Keys are CASE-SENSITIVE (Phase 2
// lesson: frameMaterial must not be lowercased), so items are
// trimmed only. Registry/type suitability is validated by
// services/productVariant.service.js; an array or a JSON-string
// array (multipart form-data) is accepted here.
const variantOptionKeysSchema = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim().min(1).max(60)).max(20),
  Joi.string()
);

const dimensionsSchema = Joi.object({
  width: Joi.number().min(0).messages({
    "number.min": "Width cannot be negative",
  }),
  height: Joi.number().min(0).messages({
    "number.min": "Height cannot be negative",
  }),
  depth: Joi.number().min(0).messages({
    "number.min": "Depth cannot be negative",
  }),
  unit: Joi.string().valid("cm", "m", "in").default("cm"),
});

const weightSchema = Joi.object({
  value: Joi.number().min(0).messages({
    "number.min": "Weight cannot be negative",
  }),
  unit: Joi.string().valid("kg", "lb", "g").default("kg"),
});

exports.createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Product name is required",
    "string.max": "Product name cannot exceed 200 characters",
    "any.required": "Product name is required",
  }),
  description: Joi.string().trim().min(1).max(5000).required().messages({
    "string.empty": "Product description is required",
    "string.max": "Description cannot exceed 5000 characters",
    "any.required": "Product description is required",
  }),
  shortDescription: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Short description cannot exceed 500 characters",
  }),
  category: objectId.required().messages({
    "any.required": "Product category is required",
    "string.pattern.name": "Invalid category ID",
  }),
  price: Joi.number().positive().required().messages({
    "number.positive": "Price must be a positive number",
    "any.required": "Product price is required",
  }),
  originalPrice: Joi.number().positive().allow(null).messages({
    "number.positive": "Original price must be a positive number",
  }),
  stock: Joi.number().integer().min(0).default(0).messages({
    "number.min": "Stock cannot be negative",
  }),
  sku: Joi.string().trim().uppercase().max(50).allow("").messages({
    "string.max": "SKU cannot exceed 50 characters",
  }),
  status: Joi.string()
    .valid("active", "inactive", "out_of_stock", "discontinued")
    .default("active")
    .messages({
      "any.only": "Invalid product status",
    }),
  modelUrl: Joi.string().uri().allow("").messages({
    "string.uri": "Model URL must be a valid URL",
  }),
  modelUrls: jsonArray(modelUrlsSchema),
  productType: productTypeSchema,
  roomSlugs: roomSlugsSchema,
  catalogAttributes: catalogAttributesSchema,
  dimensions: Joi.alternatives().try(dimensionsSchema, Joi.string()),
  weight: Joi.alternatives().try(weightSchema, Joi.string()),
  colors: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string()
  ),
  materials: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string()
  ),
  style: Joi.string()
    .valid(
      "modern",
      "contemporary",
      "classic",
      "minimal",
      "cozy",
      "industrial",
      "scandinavian",
      "bohemian"
    )
    .allow("")
    .messages({
      "any.only": "Invalid style value",
    }),
  isFeatured: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .default(false),
  isNewArrival: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .default(false),
  metaTitle: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Meta title cannot exceed 100 characters",
  }),
  metaDescription: Joi.string().trim().max(300).allow("").messages({
    "string.max": "Meta description cannot exceed 300 characters",
  }),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().lowercase()),
    Joi.string() // Allow JSON string from form-data
  ),
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).messages({
    "string.empty": "Product name cannot be empty",
    "string.max": "Product name cannot exceed 200 characters",
  }),
  description: Joi.string().trim().min(1).max(5000).messages({
    "string.empty": "Product description cannot be empty",
    "string.max": "Description cannot exceed 5000 characters",
  }),
  shortDescription: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Short description cannot exceed 500 characters",
  }),
  category: objectId.messages({
    "string.pattern.name": "Invalid category ID",
  }),
  price: Joi.number().positive().messages({
    "number.positive": "Price must be a positive number",
  }),
  originalPrice: Joi.number().positive().allow(null).messages({
    "number.positive": "Original price must be a positive number",
  }),
  stock: Joi.number().integer().min(0).messages({
    "number.min": "Stock cannot be negative",
  }),
  sku: Joi.string().trim().uppercase().max(50).allow("").messages({
    "string.max": "SKU cannot exceed 50 characters",
  }),
  status: Joi.string()
    .valid("active", "inactive", "out_of_stock", "discontinued")
    .messages({
      "any.only": "Invalid product status",
    }),
  modelUrl: Joi.string().uri().allow("", null).messages({
    "string.uri": "Model URL must be a valid URL",
  }),
  modelUrls: jsonArray(modelUrlsSchema),
  productType: productTypeSchema,
  variantOptionKeys: variantOptionKeysSchema,
  roomSlugs: roomSlugsSchema,
  catalogAttributes: catalogAttributesSchema,
  dimensions: Joi.alternatives().try(dimensionsSchema, Joi.string()),
  weight: Joi.alternatives().try(weightSchema, Joi.string()),
  colors: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string()
  ),
  materials: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string()
  ),
  style: Joi.string()
    .valid(
      "modern",
      "contemporary",
      "classic",
      "minimal",
      "cozy",
      "industrial",
      "scandinavian",
      "bohemian"
    )
    .allow("", null)
    .messages({
      "any.only": "Invalid style value",
    }),
  isFeatured: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid("true", "false")
  ),
  isNewArrival: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid("true", "false")
  ),
  metaTitle: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Meta title cannot exceed 100 characters",
  }),
  metaDescription: Joi.string().trim().max(300).allow("").messages({
    "string.max": "Meta description cannot exceed 300 characters",
  }),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().lowercase()),
    Joi.string()
  ),
  removeModelFiles: jsonArray(removeModelsSchema),
  removeImages: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
});

exports.getProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default("-createdAt"),
  category: Joi.string(),
  categories: Joi.string().max(500),
  room: Joi.string().max(500),
  colors: Joi.string().max(500),
  materials: Joi.string().max(500),
  minRating: Joi.number().min(0).max(5),
  status: Joi.string(),
  style: Joi.string(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  search: Joi.string().trim().max(200).allow(""),
  featured: Joi.string().valid("true", "false"),
  newArrivals: Joi.string().valid("true", "false"),
  inStock: Joi.string().valid("true", "false"),
  // Phase 5 (catalog): faceted filtering surface. `collection`
  // resolves a Phase 1 collection slug as a list dimension;
  // `facets=1` asks for the disjunctive facet counts.
  collection: Joi.string().trim().max(120),
  facets: Joi.string().valid("1", "true", "0", "false"),
}).pattern(/^attr\./, Joi.string().max(2000));
// Phase 5: `attr.*` keys (attr.<key>, attr.<key>.min/.max) ride
// the pattern above as plain strings — Joi pins only the shape
// (string values only, so ?attr.color[$ne]=x fails validation as
// a container instead of reaching Mongo). The strict grammar,
// registry membership and per-type value parsing live in
// services/catalogFilter.service.js, which 400s anything outside
// the grammar; keys that do not start with `attr.` keep the
// standing stripUnknown posture.

exports.updateStockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required().messages({
    "number.min": "Stock cannot be negative",
    "any.required": "Stock quantity is required",
  }),
});

exports.setPrimaryImageSchema = Joi.object({
  imageId: objectId.required().messages({
    "any.required": "Image ID is required",
    "string.pattern.name": "Invalid image ID",
  }),
});

// Phase 3 (catalog): variant payloads for
// POST/PATCH /products/:id/variants. Joi pins the SHAPE; the
// invariants that need the database or the product (option key
// set, engine value validation, SKU/combination uniqueness, SKU
// immutability) live in services/productVariant.service.js. The
// options object passes through with unknown keys so the service
// can name extra/missing keys precisely. Price may be 0 (a free
// variant is legitimate) — unlike product price, which the
// product schemas require to be positive.
const variantSkuSchema = Joi.string()
  .trim()
  .max(64)
  .pattern(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
  .messages({
    "string.pattern.base":
      "Variant SKU must start with a letter or digit and contain only letters, digits, '.', '_' or '-'",
    "string.max": "Variant SKU cannot exceed 64 characters",
  });

const variantOptionsSchema = Joi.alternatives().try(
  Joi.object().unknown(true),
  Joi.string()
);

const variantWeightSchema = Joi.object({
  value: Joi.number().min(0).required(),
  unit: Joi.string().valid("kg", "lb", "g").default("kg"),
});

const variantFields = {
  options: variantOptionsSchema,
  compareAtPrice: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0),
  enabled: Joi.boolean(),
  images: Joi.array().items(Joi.string().trim().min(1).max(2048)).max(20),
  weight: variantWeightSchema,
  dimensions: dimensionsSchema,
  modelUrl: Joi.string().uri().allow("", null),
};

exports.createVariantSchema = Joi.object({
  sku: variantSkuSchema.required().messages({
    "any.required": "Variant SKU is required",
  }),
  price: Joi.number().min(0).required().messages({
    "number.min": "Variant price cannot be negative",
    "any.required": "Variant price is required",
  }),
  ...variantFields,
  stock: Joi.number().integer().min(0).default(0),
  enabled: Joi.boolean().default(true),
});

// sku is listed on update ON PURPOSE: validate() strips unknown
// keys, so an unlisted sku would vanish silently — the service
// must see it to enforce immutability with a precise 400.
exports.updateVariantSchema = Joi.object({
  sku: variantSkuSchema,
  price: Joi.number().min(0).messages({
    "number.min": "Variant price cannot be negative",
  }),
  ...variantFields,
}).min(1);
