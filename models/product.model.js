const mongoose = require("mongoose");

const dimensionsSchema = new mongoose.Schema(
  {
    width: {
      type: Number,
      min: 0,
    },
    height: {
      type: Number,
      min: 0,
    },
    depth: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["cm", "m", "in"],
      default: "cm",
    },
  },
  { _id: false },
);

// Phase 3 (catalog) — purchasable variant subdocument. Promoted
// from the dormant inline shape (sku/options/price/stock/images/
// modelUrl/enabled) into the real variant system: every variant
// write goes through services/productVariant.service.js, which
// enforces the invariants (globally unique SKU, unique option
// combination per product, engine-validated option values).
// `options` stays the precursor's Map of String — normalized
// option values are stored stringified. `combinationKey` is the
// server-computed canonical encoding of the options (sorted
// key=value pairs) that combination uniqueness is checked
// against. `reservedStock` is Phase 4's bookkeeping (the field
// lands now; checkout/reservation code drives it). sku carries
// no schema-level `required`: the service enforces it on every
// write path, and a schema requirement would break document
// saves for any legacy row carrying a sku-less dormant subdoc.
const catalogVariantSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true, uppercase: true },
    options: { type: Map, of: String, default: {} },
    combinationKey: { type: String, trim: true },
    price: { type: Number, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    reservedStock: { type: Number, min: 0, default: 0 },
    images: [{ type: String }],
    weight: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ["kg", "lb", "g"], default: "kg" },
    },
    dimensions: dimensionsSchema,
    modelUrl: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    // AR-25 (D-D): units currently held by active guest stock
    // reservations (services/stockReservation.service.js). Internal
    // bookkeeping only — select:false so it never rides product
    // payloads; every mutation is an atomic updateOne ($inc behind
    // an $expr/$gte guard), which select:false does not affect.
    // Legacy documents lack the field; all guards treat a missing
    // value as 0 ($ifNull in the reservation gate).
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, "Reserved stock cannot be negative"],
      select: false,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock", "discontinued"],
      default: "active",
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
          trim: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // 3D Model support for AR viewing (legacy single URL field)
    modelUrl: {
      type: String,
      trim: true,
    },
    // Multiple 3D models for cross-platform AR support (files or URLs)
    modelFiles: [
      {
        url: {
          type: String,
          required: true,
        },
        format: {
          type: String,
          enum: ["glb", "gltf", "usdz"],
          required: true,
        },
        platform: {
          type: String,
          enum: ["android", "ios", "universal"],
          default: "universal",
        },
        fileSize: {
          type: Number,
        },
        isExternal: {
          type: Boolean,
          default: false, // false = uploaded file, true = external URL
        },
      },
    ],
    arAvailable: {
      type: Boolean,
      default: false,
    },
    productType: { type: String, lowercase: true, trim: true, index: true },
    roomSlugs: [{ type: String, lowercase: true, trim: true }],
    collectionSlugs: [{ type: String, lowercase: true, trim: true }],
    catalogAttributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    catalogVariants: [catalogVariantSchema],
    // Phase 3 (catalog): the attribute keys that define this
    // product's variant combinations (each variant's option key
    // set must equal this list exactly). Case-sensitive attribute
    // keys — no lowercase normalization here (Phase 2 lesson).
    // Written only via the product update path, which locks the
    // list while variants exist (services/productVariant.service).
    variantOptionKeys: [{ type: String, trim: true }],
    // Phase 3 (catalog): derived variant summary, maintained by
    // services/productVariant.service.js on every variant write so
    // list queries stay cheap. hasVariants = at least one variant
    // exists; priceFrom = the minimum price across ENABLED
    // variants (null when none) — a DISPLAY floor only; checkout
    // price authority is Phase 4's decision. Product.price and
    // Product.stock keep their legacy meaning and are NOT
    // rewritten by variant writes.
    hasVariants: { type: Boolean, default: false, index: true },
    priceFrom: { type: Number, min: 0, default: null },
    // Physical specifications
    dimensions: dimensionsSchema,
    weight: {
      value: {
        type: Number,
        min: 0,
      },
      unit: {
        type: String,
        enum: ["kg", "lb", "g"],
        default: "kg",
      },
    },
    // Product variants
    colors: [
      {
        type: String,
        trim: true,
      },
    ],
    materials: [
      {
        type: String,
        trim: true,
      },
    ],
    // Style classification
    style: {
      type: String,
      enum: [
        "modern",
        "contemporary",
        "classic",
        "minimal",
        "cozy",
        "industrial",
        "scandinavian",
        "bohemian",
      ],
      trim: true,
    },
    // Ratings and reviews
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
      // AR-24: internal bookkeeping for exact incremental rating
      // maintenance - the sum of all APPROVED review ratings, kept
      // in lockstep with count so average = round1(sum / count) is
      // derivable atomically at write time (the rounded average
      // alone cannot be inverted into a sum). select:false (coordinator
      // correction during Phase 2 verification): the field is internal
      // and must never ride product payloads - average/count values
      // and the response shape are unchanged. Maintenance reads/writes
      // it via update filters/pipelines, which select:false does not
      // affect. Legacy products have no sum until their first tracked
      // review write initializes it from a from-scratch aggregation
      // (see review.model.js) - no migration.
      sum: {
        type: Number,
        default: 0,
        min: 0,
        select: false,
      },
    },
    // For featured/promotional products
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    // SEO fields
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Meta title cannot exceed 100 characters"],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Meta description cannot exceed 300 characters"],
    },
    // Tags for search
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Soft delete
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for efficient queries (slug index created by unique: true)
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ deletedAt: 1 });

// OPTIMIZATION: Add compound indexes for common filter combinations (Phase 2a fix)
// These speed up queries on home page and filter operations
productSchema.index({ status: 1, category: 1 }); // Home page products filtered by status + category
productSchema.index({ isFeatured: 1, createdAt: -1 }); // Featured products sort
productSchema.index({ isNewArrival: 1, createdAt: -1 }); // New arrivals sort
productSchema.index({ deletedAt: 1, status: 1 }); // Soft delete + status filters

// Phase 3 (catalog): variant SKU uniqueness is enforced by the
// service AND this sparse unique multikey index (the service
// check alone races; the index alone cannot see duplicates
// within one product's array — together they close both holes).
// Sparse: products without variants contribute no entries.
// combinationKey gets a plain index (per-product uniqueness is
// the service's guarded write — a global unique index would
// wrongly collide identical combinations across products).
productSchema.index(
  { "catalogVariants.sku": 1 },
  { unique: true, sparse: true },
);
productSchema.index({ "catalogVariants.combinationKey": 1 });
// Phase 5 (catalog): the facet engine and the list filters run
// their pools over the visible-status set. Room filtering and the
// room facet read roomSlugs within that set; the rating filter
// (minRating) and rating sorts read rating.average the same way.
// Deliberately NOT declared (see docs/catalog/PHASE5_NOTES.md):
// { status, hasVariants } and { status, priceFrom } — variant
// matching runs through $expr/$filter, which cannot exploit them
// for the branch that matters, and the effective-price sort key
// is a computed coalesce (priceFrom ?? price), not an indexable
// field path. Per the no-surprise-index-build rule these are
// schema-declared only; production builds them explicitly
// (commands in PHASE5_NOTES.md).
productSchema.index({ status: 1, roomSlugs: 1 });
productSchema.index({ status: 1, "rating.average": -1 });

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100,
    );
  }
  return 0;
});

// Virtual for in stock status
productSchema.virtual("inStock").get(function () {
  return (
    this.stock > 0 &&
    this.status !== "out_of_stock" &&
    this.status !== "discontinued"
  );
});

// Virtual for primary image
productSchema.virtual("primaryImage").get(function () {
  if (!this.images || this.images.length === 0) return null;
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : this.images[0].url;
});

// Generate slug from name before saving
productSchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  // Auto-set arAvailable based on modelUrl or modelFiles
  if (this.isModified("modelUrl") || this.isModified("modelFiles")) {
    this.arAvailable =
      !!this.modelUrl || (this.modelFiles && this.modelFiles.length > 0);
  }

  // Auto-update status based on stock
  if (
    this.isModified("stock") &&
    this.stock === 0 &&
    this.status === "active"
  ) {
    this.status = "out_of_stock";
  }
});

// Static method to find active products (not deleted)
productSchema.statics.findActive = function (filter = {}) {
  return this.find({
    ...filter,
    deletedAt: null,
    status: { $ne: "discontinued" },
  });
};

// Static method for soft delete
productSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  this.status = "discontinued";
  return this.save();
};

// Static method to get products by category
productSchema.statics.getByCategory = function (categoryId, options = {}) {
  // NOTE: no callers in the current codebase (dead code) - kept safe anyway.
  const { page = 1, limit = 20, sort = "-createdAt" } = options;
  const { safeSort } = require("../utils/listQuery");
  return this.find({
    category: categoryId,
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  })
    .sort(
      safeSort(sort, [
        "createdAt",
        "price",
        "originalPrice",
        "name",
        "stock",
        "rating.average",
      ]),
    )
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("category", "name slug");
};

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
