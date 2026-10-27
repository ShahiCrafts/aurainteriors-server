const mongoose = require("mongoose");

// Phase 2 (catalog) — attribute definition engine: the DB-backed
// definition of ONE catalog attribute.
//
// Promotes the owner's static `definitions` map in
// config/catalogTaxonomy.js (18 keys, types number/enum/boolean)
// into a registry admins can extend without a code change — the
// same promotion Phase 1 gave product types. Seed data lives in
// config/catalogAttributeData.js and is inserted by
// services/catalogBootstrap.service.js with $setOnInsert semantics.
//
// A definition is the SINGLE source of truth for an attribute's
// identity and integrity rules: `key` (stable machine id, unique,
// immutable — products and assignments reference the string), the
// value `type` and its constraints (unit/allowedValues/min/max/
// step). Assignment-level concerns (required, displayGroup,
// sortOrder overrides per product type or category) live on the
// ASSIGNMENTS (ProductType.attributeAssignments,
// Category.attributeAssignments) and are merged by
// services/attributeResolution.service.js — a definition's
// type/unit/allowedValues are NEVER overridable there.
//
// `storage` says where a value lives:
//   "catalogAttributes" — in Product.catalogAttributes (the Map).
//   "field"             — a first-class Product field (dimensions,
//                         weight, style, ...); the definition
//                         exists so admin forms, spec comparison
//                         and filters see ONE unified attribute
//                         list. The field's data is NOT duplicated
//                         into catalogAttributes, and the field's
//                         own Mongoose/Joi validation still governs
//                         writes to it. `fieldPath` names the field.
// `appliesTo`:
//   "all"      — global: applicable to every product/category.
//   "assigned" — applicable only where a product type or a
//                category (or its ancestors) assigns it.
const ATTRIBUTE_TYPES = [
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
];

const attributeDefinitionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Attribute key is required"],
      unique: true,
      // Deliberately NOT lowercase: attribute keys are camelCase
      // identifiers (frameMaterial, seatingCapacity — the owner's
      // config convention), case-sensitive like the product
      // attributes they name.
      trim: true,
      maxlength: [60, "Attribute key cannot exceed 60 characters"],
    },
    label: {
      type: String,
      required: [true, "Attribute label is required"],
      trim: true,
      maxlength: [100, "Attribute label cannot exceed 100 characters"],
    },
    type: {
      type: String,
      required: [true, "Attribute type is required"],
      enum: ATTRIBUTE_TYPES,
    },
    // Unit metadata: the canonical unit for measurement/money/
    // decimal values (e.g. "kg", "cm"). For measurement values the
    // submitted unit must equal this unless listed in acceptedUnits.
    unit: {
      type: String,
      trim: true,
      maxlength: [20, "Unit cannot exceed 20 characters"],
    },
    acceptedUnits: [
      {
        type: String,
        trim: true,
        maxlength: 20,
      },
    ],
    // Closed vocabularies for enum / multi-enum / named color.
    // An EMPTY list means an open vocabulary (any string value).
    allowedValues: [
      {
        type: String,
        trim: true,
        maxlength: 100,
      },
    ],
    min: { type: Number },
    max: { type: Number },
    step: { type: Number, min: 0 },
    // String length cap override (validation default is 500).
    maxLength: { type: Number, min: 1 },
    // Definition-level default; assignments may override.
    required: {
      type: Boolean,
      default: false,
    },
    filterable: {
      type: Boolean,
      default: false,
    },
    sortable: {
      type: Boolean,
      default: false,
    },
    // Eligible for side-by-side specification comparison.
    comparable: {
      type: Boolean,
      default: false,
    },
    displayGroup: {
      type: String,
      trim: true,
      maxlength: [60, "Display group cannot exceed 60 characters"],
      default: "Specifications",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    appliesTo: {
      type: String,
      enum: ["all", "assigned"],
      default: "assigned",
    },
    storage: {
      type: String,
      enum: ["catalogAttributes", "field"],
      default: "catalogAttributes",
    },
    fieldPath: {
      type: String,
      trim: true,
      maxlength: [100, "Field path cannot exceed 100 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

attributeDefinitionSchema.index({ active: 1, sortOrder: 1 });
attributeDefinitionSchema.index({ storage: 1 });

const AttributeDefinition = mongoose.model("AttributeDefinition", attributeDefinitionSchema);

module.exports = AttributeDefinition;
module.exports.ATTRIBUTE_TYPES = ATTRIBUTE_TYPES;
