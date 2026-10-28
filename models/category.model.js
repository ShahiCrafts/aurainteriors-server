const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String,
    },
    imagePublicId: {
      type: String,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    // Phase 1 (catalog): materialized ancestry. `parent` remains the
    // source of truth; `ancestors` (root-first, excludes self) and
    // `depth` (= ancestors.length, root = 0) are a DERIVED index
    // maintained by the category write paths via
    // services/categoryHierarchy.service.js, so descendant queries can
    // use the indexed array instead of a full-collection BFS.
    // Documents written before Phase 1 (or by seed scripts that do
    // not call the service) carry the defaults until
    // rebuildAllAncestors() runs (Phase 8 migration).
    ancestors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    depth: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // Phase 2 (catalog): attribute assignments owned by THIS
    // category. Applicability inherits down the tree and is merged
    // by services/attributeResolution.service.js (nearest category
    // wins for required/defaultValue/displayGroup/sortOrder;
    // active:false deactivates an inherited assignment for this
    // subtree). Embedded on the category — rather than a separate
    // collection — so the list replaces atomically with the
    // category document and rides the ancestors chain the
    // resolution already walks. `required`/`sortOrder` carry NO
    // default: undefined means "not overridden at this level".
    attributeAssignments: [
      {
        _id: false,
        attributeKey: { type: String, required: true, trim: true },
        required: { type: Boolean },
        defaultValue: { type: mongoose.Schema.Types.Mixed },
        displayGroup: { type: String, trim: true, maxlength: 60 },
        sortOrder: { type: Number },
        active: { type: Boolean, default: true },
      },
    ],
    productType: { type: String, trim: true, lowercase: true, index: true },
    roomSlugs: [{ type: String, trim: true, lowercase: true }],
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

categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  // SR-P6-3: exclude soft-deleted products, converging with the
  // tree rollup's semantics (getCategoryTree aggregates
  // deletedAt: null). Before this match, the flat list counted
  // deleted products and disagreed with the tree wherever a
  // soft-deleted product existed. Scope still differs by design:
  // this virtual is the DIRECT count; the tree reports the
  // subtree rollup.
  match: { deletedAt: null },
  count: true,
});

categorySchema.index({ parent: 1 });
categorySchema.index({ ancestors: 1 }); // Phase 1: descendant lookups by ancestry
categorySchema.index({ status: 1 });
// OPTIMIZATION: Add compound index for tree queries (Phase 2a fix)
categorySchema.index({ parent: 1, status: 1 }); // For getCategoryTree queries

categorySchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

categorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find({ status: "active" })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const nodes = new Map(
    categories.map((category) => [
      String(category._id),
      { ...category, subcategories: [] },
    ]),
  );
  const roots = [];
  for (const category of categories) {
    const node = nodes.get(String(category._id));
    const parent = category.parent && nodes.get(String(category.parent));
    if (parent) parent.subcategories.push(node);
    else if (!category.parent) roots.push(node);
  }
  // Phase 1 (Q9): productCount restored to tree nodes. The owner's
  // in-memory rewrite dropped it (the delivered tree populated the
  // virtual), while the web client still reads it (ShopByCategory,
  // FilterSidebar, CategorySidebar) and rendered 0 everywhere.
  // Semantics here: each node reports the number of NON-DELETED
  // products in its whole SUBTREE (direct counts rolled up), which
  // is what a storefront "N items" label on a parent means; the
  // flat-list virtual of the same name shares the non-deleted
  // semantics (SR-P6-3) but reports the DIRECT count only.
  // Resolved lazily to keep model load order
  // acyclic (product.model does not depend on this model).
  const Product = mongoose.model("Product");
  const grouped = await Product.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const directCounts = new Map(
    grouped.map((row) => [String(row._id), row.count]),
  );
  const rollup = (node) => {
    let total = directCounts.get(String(node._id)) || 0;
    for (const child of node.subcategories) total += rollup(child);
    node.productCount = total;
    return total;
  };
  roots.forEach(rollup);
  return roots;
};

categorySchema.statics.getDescendantIds = async function (id) {
  const categories = await this.find({}, "_id parent").lean();
  const children = new Map();
  for (const category of categories) {
    const key = String(category.parent || "");
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(String(category._id));
  }
  const seen = new Set();
  const queue = [String(id)];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    queue.push(...(children.get(current) || []));
  }
  return [...seen];
};

categorySchema.statics.findActive = function () {
  return this.find({ status: "active" });
};

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
