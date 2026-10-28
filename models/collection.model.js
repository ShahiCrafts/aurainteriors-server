const mongoose = require("mongoose");

// Phase 1 (catalog) — collections.
//
// A collection is a named, storefront-facing grouping of products
// that NEVER duplicates product records: a manual collection holds
// product references (productIds, in curated order); a rule
// collection holds a structured rule that
// services/collection.service.js evaluates at read time against
// published products. Rule types are deliberately limited to
// signals that exist in the data today (createdAt recency, real
// Order quantities, the isFeatured flag, originalPrice > price,
// catalogAttributes equality) — see the service for the exact
// semantics of each.
const collectionSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "Collection slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [60, "Collection slug cannot exceed 60 characters"],
    },
    label: {
      type: String,
      required: [true, "Collection label is required"],
      trim: true,
      maxlength: [100, "Collection label cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String,
    },
    kind: {
      type: String,
      enum: ["manual", "rule"],
      default: "manual",
    },
    // Manual membership, in curated order (manual kind only).
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // Rule definition (rule kind only). `params` is intentionally
    // Mixed: each rule type reads its own documented keys, coerced
    // defensively in the service (windowDays, limit, key/value).
    rule: {
      type: {
        type: String,
        enum: [
          "new-arrivals",
          "best-sellers",
          "featured",
          "on-sale",
          "attribute-match",
        ],
      },
      params: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
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
  },
);

collectionSchema.index({ active: 1, sortOrder: 1 });

const Collection = mongoose.model("Collection", collectionSchema);

module.exports = Collection;
