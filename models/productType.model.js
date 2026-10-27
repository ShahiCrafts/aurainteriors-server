const mongoose = require("mongoose");

// Phase 1 (catalog) — canonical product-type registry.
//
// Promotes the static `productTypes` map of config/catalogTaxonomy.js
// (13 keys) plus the master brief's remaining leaf kinds (seed data:
// config/catalogRegistryData.js) into a DB-backed registry, so new
// purchasable kinds can be created from the admin without a code
// change. `key` is the stable machine id referenced by
// Category.productType (and, from Phase 3, Product.productType);
// `label` is the customer/admin-facing name. Keys are immutable once
// created (the update endpoint rejects key changes) because
// categories reference the key string.
const productTypeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Product type key is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [60, "Product type key cannot exceed 60 characters"],
    },
    label: {
      type: String,
      required: [true, "Product type label is required"],
      trim: true,
      maxlength: [100, "Product type label cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    // Home department (merchandising grouping from
    // config/catalogRegistryData.js `departments`), e.g.
    // "sofas-seating". A grouping hint, not an exclusive class.
    categoryKey: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [60, "Department key cannot exceed 60 characters"],
    },
    // Attribute definition keys applicable to this type (Phase 2's
    // attribute engine owns their definitions; seeded from
    // config/catalogTaxonomy.js associations).
    attributeKeys: [
      {
        type: String,
        trim: true,
      },
    ],
    // Phase 2 (catalog): per-type assignment OVERRIDES for the keys
    // above (or additional keys — an override entry also makes its
    // key applicable). Merged by
    // services/attributeResolution.service.js at the type level,
    // BELOW any category assignment. Fields carry no defaults:
    // undefined means "not overridden at this level".
    attributeAssignments: [
      {
        _id: false,
        attributeKey: { type: String, required: true, trim: true },
        required: { type: Boolean },
        displayGroup: { type: String, trim: true, maxlength: 60 },
        sortOrder: { type: Number },
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productTypeSchema.index({ active: 1, sortOrder: 1 });

const ProductType = mongoose.model("ProductType", productTypeSchema);

module.exports = ProductType;
