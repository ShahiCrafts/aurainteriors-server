const Category = require("../models/category.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { deleteFile } = require("../middleware/upload.middleware");
const { applyCatalogListFilters, catalogPagination, catalogSort } = require("../utils/catalogListQuery");
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

  const categories = await Category.find(filter)
    .populate("subcategories", "name slug status")
    .populate("productCount")
    .sort({ sortOrder: 1, name: 1 });

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
  const { name, description, parent, status, sortOrder } = req.body;

  // Check if parent category exists
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(new AppError("Parent category not found", 400));
    }
  }

  const categoryData = {
    name,
    description,
    parent: parent || null,
    status: status || "active",
    sortOrder: sortOrder || 0,
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
  const { name, description, parent, status, sortOrder } = req.body;

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

  // Update fields
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (parent !== undefined) category.parent = parent || null;
  if (status !== undefined) category.status = status;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;

  // AR-21: the replaced image is destroyed only AFTER the save
  // commits (previously a failed save left the category pointing at a
  // destroyed image).
  let replacedImagePublicId = null;
  if (req.file) {
    replacedImagePublicId = category.imagePublicId || null;
    category.image = req.file.cloudinaryUrl;
    category.imagePublicId = req.file.cloudinaryPublicId;
  }

  await category.save();

  if (replacedImagePublicId) {
    const result = await deleteFile(replacedImagePublicId);
    if (result === null) {
      console.error(JSON.stringify({ level: "error", event: "asset_cleanup_pending", publicId: replacedImagePublicId, resourceType: "image", context: "category.update" }));
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
        400
      )
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
        400
      )
    );
  }

  // AR-21: record first, asset after (see updateCategory).
  const imagePublicId = category.imagePublicId || null;

  await Category.findByIdAndDelete(req.params.id);

  if (imagePublicId) {
    const result = await deleteFile(imagePublicId);
    if (result === null) {
      console.error(JSON.stringify({ level: "error", event: "asset_cleanup_pending", publicId: imagePublicId, resourceType: "image", context: "category.delete" }));
    }
  }

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
  });
});

// Get category products
exports.getCategoryProducts = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 20, sort = "-createdAt" } = req.query;
  // FA-49: coerce every filter value to a scalar before use - repeated
  // params arrive as arrays and crashed .split()/parseFloat paths, and
  // operator objects must never reach the filter. (Mirrors the coercion
  // getAllProducts already applies.)
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
    category: category._id,
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  };

  // AR-31(b): search/price/colors/materials/rating via the shared
  // catalog list builder (utils/catalogListQuery.js), also used by
  // product.controller.getAllProducts. This handler's own coercions
  // are preserved exactly (pinned divergences D1-D3): the list split
  // below does NOT trim and caps at 20 items, and a 0 price/rating
  // bound is treated as absent — hence `value || undefined` for the
  // numeric bounds, which reproduces the old truthiness checks
  // (including dropping a lone $gte when minPrice is 0) bit for bit.
  const colorList = colors ? colors.split(",").filter(Boolean).slice(0, 20) : [];
  const materialList = materials ? materials.split(",").filter(Boolean).slice(0, 20) : [];
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
