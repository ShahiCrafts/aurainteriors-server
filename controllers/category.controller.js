const Category = require("../models/category.model");
const Product = require("../models/product.model");
const ProductType = require("../models/productType.model");
const Room = require("../models/room.model");
const AttributeDefinition = require("../models/attributeDefinition.model");
const { validateValue } = require("../services/attributeValidation.service");
const {
  resolveForCategory,
} = require("../services/attributeResolution.service");
const {
  ancestorsForParent,
  rewriteSubtreeAncestors,
} = require("../services/categoryHierarchy.service");

const parseJsonField = (field) => {
  if (!field) return undefined;
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
};

const resolveCategoryProductType = async (raw) => {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  const key = String(raw).trim().toLowerCase();
  const type = await ProductType.findOne({ key, active: true })
    .select("key")
    .lean();
  if (!type) {
    throw new AppError(`Unknown product type: ${key}`, 400);
  }
  return key;
};

const resolveCategoryRoomSlugs = async (raw) => {
  const parsed = parseJsonField(raw);
  if (!Array.isArray(parsed)) {
    throw new AppError("roomSlugs must be an array of room slugs", 400);
  }
  const slugs = [
    ...new Set(
      parsed.map((s) => String(s).trim().toLowerCase()).filter(Boolean),
    ),
  ];
  if (slugs.length > 0) {
    const known = await Room.find({ slug: { $in: slugs }, active: true })
      .select("slug")
      .lean();
    const knownSlugs = new Set(known.map((room) => room.slug));
    const unknown = slugs.filter((slug) => !knownSlugs.has(slug));
    if (unknown.length > 0) {
      throw new AppError(`Unknown room slug(s): ${unknown.join(", ")}`, 400);
    }
  }
  return slugs;
};
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { deleteFile } = require("../middleware/upload.middleware");
const {
  applyCatalogListFilters,
  catalogPagination,
  catalogSort,
} = require("../utils/catalogListQuery");
const catalogCache = require("../utils/catalogCache");
const { applyMaxTime } = require("../utils/queryTimeout");
const { asString, asNumber } = require("../utils/params");

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const { tree, status, parent } = req.query;

  if (tree === "true") {
    const categories = await Category.getCategoryTree();
    return res.status(200).json({
      status: "success",
      results: categories.length,
      data: {
        categories,
      },
    });
  }

  const filter = {};
  if (status) filter.status = status;
  if (parent === "null") {
    filter.parent = null;
  } else if (parent) {
    filter.parent = parent;
  }

  const categories = await applyMaxTime(
    Category.find(filter)
      .populate("subcategories", "name slug status")
      .populate("productCount")
      .sort({ sortOrder: 1, name: 1 })
      .limit(500)
      .select("-__v")
      .lean(),
    "list",
  );

  res.status(200).json({
    status: "success",
    results: categories.length,
    data: {
      categories,
    },
  });
});

exports.getCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id } : { slug: id };

  const category = await Category.findOne(query)
    .populate("subcategories", "name slug image status")
    .populate("productCount")
    .populate("parent", "name slug");

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      category,
    },
  });
});

// Create new category (Admin only)
exports.createCategory = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a category write makes cached lists stale
  const {
    name,
    description,
    parent,
    status,
    sortOrder,
    productType,
    roomSlugs,
  } = req.body;

  // Check if parent category exists
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError("Parent category not found", 400));
    }
  }

  const resolvedProductType = await resolveCategoryProductType(productType);
  const resolvedRoomSlugs =
    roomSlugs !== undefined
      ? await resolveCategoryRoomSlugs(roomSlugs)
      : undefined;

  const ancestors = await ancestorsForParent(parent || null);

  const categoryData = {
    name,
    description,
    parent: parent || null,
    ancestors,
    depth: ancestors.length,
    status: status || "active",
    sortOrder: sortOrder || 0,
    productType: resolvedProductType || undefined,
    roomSlugs: resolvedRoomSlugs,
  };

  if (req.file) {
    categoryData.image = req.file.cloudinaryUrl;
    categoryData.imagePublicId = req.file.cloudinaryPublicId;
  }

  const category = await Category.create(categoryData);

  res.status(201).json({
    status: "success",
    data: {
      category,
    },
  });
});

// Update category (Admin only)
exports.updateCategory = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache();
  const {
    name,
    description,
    parent,
    status,
    sortOrder,
    productType,
    roomSlugs,
  } = req.body;

  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Prevent setting self as parent
  if (parent && parent === req.params.id) {
    return next(new AppError("Category cannot be its own parent", 400));
  }

  // Check if new parent exists
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError("Parent category not found", 400));
    }
  }

  if (parent) {
    const descendants = await Category.getDescendantIds(category._id);
    if (descendants.includes(String(parent))) {
      return next(
        new AppError("Category hierarchy cannot contain a cycle", 400),
      );
    }
  }

  const previousParent = category.parent ? String(category.parent) : null;

  const resolvedProductType = await resolveCategoryProductType(productType);
  const resolvedRoomSlugs =
    roomSlugs !== undefined
      ? await resolveCategoryRoomSlugs(roomSlugs)
      : undefined;

  // Update fields
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (parent !== undefined) category.parent = parent || null;
  if (status !== undefined) category.status = status;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (resolvedProductType !== undefined)
    category.productType = resolvedProductType;
  if (resolvedRoomSlugs !== undefined) category.roomSlugs = resolvedRoomSlugs;

  let replacedImagePublicId = null;
  if (req.file) {
    replacedImagePublicId = category.imagePublicId || null;
    category.image = req.file.cloudinaryUrl;
    category.imagePublicId = req.file.cloudinaryPublicId;
  }

  await category.save();

  const newParent = category.parent ? String(category.parent) : null;
  if (newParent !== previousParent) {
    await rewriteSubtreeAncestors(category._id);
    // Reflect the rewrite on the returned document.
    const refreshed = await Category.findById(category._id)
      .select("ancestors depth")
      .lean();
    if (refreshed) {
      category.ancestors = refreshed.ancestors;
      category.depth = refreshed.depth;
    }
  }

  if (replacedImagePublicId) {
    const result = await deleteFile(replacedImagePublicId);
    if (result === null) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "asset_cleanup_pending",
          publicId: replacedImagePublicId,
          resourceType: "image",
          context: "category.update",
        }),
      );
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      category,
    },
  });
});

// Delete category (Admin only)
exports.deleteCategory = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache();
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Check if category has subcategories
  const subcategoriesCount = await Category.countDocuments({
    parent: req.params.id,
  });
  if (subcategoriesCount > 0) {
    return next(
      new AppError(
        "Cannot delete category with subcategories. Delete subcategories first.",
        400,
      ),
    );
  }

  // Check if category has products
  const productsCount = await Product.countDocuments({
    category: req.params.id,
    deletedAt: null,
  });
  if (productsCount > 0) {
    return next(
      new AppError(
        `Cannot delete category with ${productsCount} active products. Move or delete products first.`,
        400,
      ),
    );
  }

  const imagePublicId = category.imagePublicId || null;

  await Category.findByIdAndDelete(req.params.id);

  if (imagePublicId) {
    const result = await deleteFile(imagePublicId);
    if (result === null) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "asset_cleanup_pending",
          publicId: imagePublicId,
          resourceType: "image",
          context: "category.delete",
        }),
      );
    }
  }

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
  });
});

exports.reorderCategories = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache();
  const { ids } = req.body;

  const found = await Category.find({ _id: { $in: ids } })
    .select("_id parent")
    .lean();
  if (found.length !== ids.length) {
    return next(new AppError("Every category in a reorder must exist", 400));
  }

  const parents = new Set(
    found.map((category) => String(category.parent || "")),
  );
  if (parents.size !== 1) {
    return next(
      new AppError("Categories in a reorder must share the same parent", 400),
    );
  }

  const ops = ids.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { sortOrder: index } },
    },
  }));
  await Category.bulkWrite(ops);

  const categories = await Category.find({ _id: { $in: ids } }).sort({
    sortOrder: 1,
    name: 1,
  });

  res.status(200).json({
    status: "success",
    results: categories.length,
    data: {
      categories,
    },
  });
});

// Get category products
exports.getCategoryProducts = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 20, sort = "-createdAt" } = req.query;
  const search = asString(req.query.search, 100);
  const minPrice = asNumber(req.query.minPrice);
  const maxPrice = asNumber(req.query.maxPrice);
  const colors = asString(req.query.colors, 500);
  const materials = asString(req.query.materials, 500);
  const minRating = asNumber(req.query.minRating);

  // Check if it's an ObjectId or slug
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id } : { slug: id };

  const category = await Category.findOne(query);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  const { pageNum, limitNum, skip } = catalogPagination(page, limit, 20);

  // Build filter for products
  const filter = {
    category: { $in: await Category.getDescendantIds(category._id) },
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  };

  const colorList = colors
    ? colors.split(",").filter(Boolean).slice(0, 20)
    : [];
  const materialList = materials
    ? materials.split(",").filter(Boolean).slice(0, 20)
    : [];
  applyCatalogListFilters(filter, {
    search,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    colorValues: colorList,
    materialValues: materialList,
    minRating: minRating || undefined,
  });

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(catalogSort(sort))
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
      },
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// ------------------------------------------------------------------
// Attribute assignments (Phase 2, admin)
// ------------------------------------------------------------------

// Slug-or-id category lookup, mirroring getCategory's resolution.
async function findCategoryByRef(ref) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(ref));
  return Category.findOne(isObjectId ? { _id: ref } : { slug: ref });
}

// The category's OWN assignment list (not the inherited/resolved
// set — that is GET /catalog/categories/:ref/attributes).
exports.getCategoryAttributeAssignments = catchAsync(async (req, res, next) => {
  const category = await findCategoryByRef(req.params.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      category: { id: category._id, name: category.name, slug: category.slug },
      assignments: category.attributeAssignments || [],
    },
  });
});

exports.setCategoryAttributeAssignments = catchAsync(async (req, res, next) => {
  catalogCache.invalidateCatalogCache();
  const category = await findCategoryByRef(req.params.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  const { assignments } = req.body;
  const keys = assignments.map((assignment) => assignment.attributeKey);
  if (new Set(keys).size !== keys.length) {
    return next(new AppError("Duplicate attribute keys in assignments", 400));
  }

  const definitions = await AttributeDefinition.find({
    key: { $in: keys },
    active: true,
  }).lean();
  const byKey = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );

  const normalized = [];
  for (const assignment of assignments) {
    const definition = byKey.get(assignment.attributeKey);
    if (!definition) {
      return next(
        new AppError(
          `Unknown attribute definition: "${assignment.attributeKey}"`,
          400,
        ),
      );
    }
    if ((definition.storage || "catalogAttributes") !== "catalogAttributes") {
      return next(
        new AppError(
          `Attribute "${assignment.attributeKey}" is a product field and cannot be assigned to a category`,
          400,
        ),
      );
    }
    const entry = {
      attributeKey: assignment.attributeKey,
      active: assignment.active !== undefined ? assignment.active : true,
    };
    if (assignment.required !== undefined) entry.required = assignment.required;
    if (assignment.displayGroup !== undefined)
      entry.displayGroup = assignment.displayGroup;
    if (assignment.sortOrder !== undefined)
      entry.sortOrder = assignment.sortOrder;
    if (assignment.defaultValue !== undefined) {
      const result = validateValue(definition, assignment.defaultValue);
      if (!result.ok) {
        return next(
          new AppError(
            `Invalid defaultValue for attribute "${assignment.attributeKey}": ${result.error}`,
            400,
          ),
        );
      }
      entry.defaultValue = result.value;
    }
    normalized.push(entry);
  }

  category.attributeAssignments = normalized;
  await category.save();

  const resolved = await resolveForCategory(category);

  res.status(200).json({
    status: "success",
    data: {
      category: { id: category._id, name: category.name, slug: category.slug },
      assignments: category.attributeAssignments,
      attributes: resolved,
    },
  });
});
