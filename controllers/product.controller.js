const { boundedLimit, encodeCursor, decodeCursor, cursorAfterFilter } = require("../utils/listQuery");
const { applyCatalogListFilters, catalogPagination, catalogSort } = require("../utils/catalogListQuery");
const { asString, asNumber, asStringList, asObjectId } = require("../utils/params");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { deleteFile, deleteFiles } = require("../middleware/upload.middleware");

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

const parseBoolean = (value) => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
};

// Get all products with filtering, sorting, and pagination
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const query = req.query || {};
  const page = query.page;
  const limit = query.limit;
  const sort = query.sort;
  // CQ-A (#3): every value below is forced through utils/params
  // before use. Arrays/objects (?style[$ne]=x, ?style=a&style=b)
  // previously reached .split()/parseFloat() raw - a type-confusion
  // crash/500 and NaN filters. They are now treated as absent.
  const categoryList = asStringList(query.category);
  const categoriesList = asStringList(query.categories);
  const statusList = asStringList(query.status);
  const styleList = asStringList(query.style);
  const minPrice = asNumber(query.minPrice);
  const maxPrice = asNumber(query.maxPrice);
  const colorList = asStringList(query.colors);
  const materialList = asStringList(query.materials);
  const minRating = asNumber(query.minRating);
  const search = asString(query.search, 200);
  const featured = asString(query.featured, 10);
  const newArrivals = asString(query.newArrivals, 10);
  const inStock = asString(query.inStock, 10);

  // Build filter
  const filter = { deletedAt: null };

  // Handle category filter by ID (legacy)
  if (categoryList.length > 0) {
    filter.category = { $in: categoryList };
  }

  // Handle categories filter by slug (new)
  if (categoriesList.length > 0) {
    const categoryDocs = await Category.find({ slug: { $in: categoriesList } }).select("_id");
    const categoryIds = categoryDocs.map((cat) => cat._id);
    if (categoryIds.length > 0) {
      filter.category = { $in: categoryIds };
    }
  }

  const statusIsAll = statusList.length === 1 && statusList[0] === "all";
  if (req.user?.role !== "admin") {
    const visible = ["active", "out_of_stock"];
    const requested = statusList.length > 0 && !statusIsAll ? statusList : visible;
    filter.status = { $in: requested.filter((value) => visible.includes(value)) };
  } else if (statusList.length > 0 && !statusIsAll) {
    filter.status = { $in: statusList };
  } else if (statusList.length === 0) {
    filter.status = { $in: ["active", "out_of_stock"] };
  }

  if (styleList.length > 0) {
    filter.style = { $in: styleList };
  }

  if (featured === "true") {
    filter.isFeatured = true;
  }

  if (newArrivals === "true") {
    filter.isNewArrival = true;
  }

  if (inStock === "true") {
    filter.stock = { $gt: 0 };
    filter.status = "active";
  }

  // AR-31(b): price/colors/materials/rating/search via the shared
  // catalog list builder (utils/catalogListQuery.js), also used by
  // category.controller.getCategoryProducts.
  applyCatalogListFilters(filter, {
    search,
    minPrice,
    maxPrice,
    colorValues: colorList,
    materialValues: materialList,
    minRating,
  });

  const { pageNum, limitNum, skip } = catalogPagination(page, limit);

  // AR-19: additive cursor mode — only when ?cursor= is present
  // (empty string = start of the walk). Keyset on the list's default
  // sort (createdAt desc, _id desc tiebreak); the response gains a
  // nextCursor field ONLY in this mode. Absent param = byte-identical.
  // AR-47: .lean() on the list read (body-identical; no projection —
  // the list response ships the full product document today and which
  // fields the client renders cannot be proven from this repo).
  const cursorMode = query.cursor !== undefined;
  const cursor = cursorMode && query.cursor ? decodeCursor(query.cursor) : null;
  const pageFilter = cursor
    ? { ...filter, $and: [...(filter.$and || []), cursorAfterFilter(cursor)] }
    : filter;

  const [productsPage, total] = await Promise.all([
    cursorMode
      ? Product.find(pageFilter).populate("category", "name slug").sort({ createdAt: -1, _id: -1 }).limit(limitNum + 1).lean()
      : Product.find(filter).populate("category", "name slug").sort(catalogSort(sort)).skip(skip).limit(limitNum).lean(),
    Product.countDocuments(filter),
  ]);

  let products = productsPage;
  let nextCursor;
  if (cursorMode) {
    const hasMore = productsPage.length > limitNum;
    products = hasMore ? productsPage.slice(0, limitNum) : productsPage;
    nextCursor = hasMore && products.length > 0 ? encodeCursor(products[products.length - 1]) : null;
  }

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      ...(cursorMode ? { nextCursor } : {}),
    },
  });
});

// Get single product by ID or slug
exports.getProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id, deletedAt: null } : { slug: id, deletedAt: null };

  if (req.user?.role !== "admin") query.status = { $in: ["active", "out_of_stock"] };
  const product = await Product.findOne(query).populate("category", "name slug");

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Create new product (Admin only)
exports.createProduct = catchAsync(async (req, res, next) => {
  const {
    name,
    description,
    shortDescription,
    category,
    price,
    originalPrice,
    stock,
    sku,
    status,
    modelUrl,
    modelUrls, // Array of external model URLs
    dimensions,
    weight,
    colors,
    materials,
    style,
    isFeatured,
    isNewArrival,
    metaTitle,
    metaDescription,
    tags,
  } = req.body;

  // Verify category exists (CQ-B: the id is forced to an ObjectId
  // string at the point of use; a container value is a clean 400,
  // never a query operator)
  const categoryId = asObjectId(category);
  if (!categoryId) {
    return next(new AppError("Category not found", 400));
  }
  const categoryExists = await Category.findById(categoryId);
  if (!categoryExists) {
    return next(new AppError("Category not found", 400));
  }

  const productData = {
    name,
    description,
    shortDescription,
    category,
    price: parseFloat(price),
    originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
    stock: parseInt(stock, 10) || 0,
    sku,
    status: status || "active",
    modelUrl,
    style,
    isFeatured: parseBoolean(isFeatured) || false,
    isNewArrival: parseBoolean(isNewArrival) || false,
    metaTitle,
    metaDescription,
    dimensions: parseJsonField(dimensions),
    weight: parseJsonField(weight),
    colors: parseJsonField(colors),
    materials: parseJsonField(materials),
    tags: parseJsonField(tags),
  };

  const imageFiles = req.files?.images || (Array.isArray(req.files) ? req.files : []);
  if (imageFiles.length > 0) {
    productData.images = imageFiles.map((file, index) => ({
      url: file.cloudinaryUrl,
      publicId: file.cloudinaryPublicId,
      alt: name,
      isPrimary: index === 0,
    }));
  }

  // Initialize modelFiles array
  productData.modelFiles = [];

  if (req.files?.modelFiles && req.files.modelFiles.length > 0) {
    const uploadedModels = req.files.modelFiles.map((file) => ({
      url: file.cloudinaryUrl,
      publicId: file.cloudinaryPublicId,
      format: file.format,
      platform: file.platform,
      fileSize: file.fileSize,
      isExternal: false,
    }));
    productData.modelFiles.push(...uploadedModels);
  }

  // Handle external model URLs
  if (modelUrls) {
    const parsedUrls = parseJsonField(modelUrls) || [];
    const externalModels = parsedUrls.map((model) => ({
      url: model.url,
      format: model.format,
      platform: model.platform || (model.format === 'usdz' ? 'ios' : 'android'),
      isExternal: true,
    }));
    productData.modelFiles.push(...externalModels);
  }

  // Clean up empty modelFiles array
  if (productData.modelFiles.length === 0) {
    delete productData.modelFiles;
  }

  const product = await Product.create(productData);
  await product.populate("category", "name slug");

  res.status(201).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Update product (Admin only)
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const {
    name,
    description,
    shortDescription,
    category,
    price,
    originalPrice,
    stock,
    sku,
    status,
    modelUrl,
    modelUrls, // Array of external model URLs to add
    dimensions,
    weight,
    colors,
    materials,
    style,
    isFeatured,
    isNewArrival,
    metaTitle,
    metaDescription,
    tags,
    removeImages,
    removeModelFiles,
  } = req.body;

  // Verify category if being updated
  if (category) {
    const categoryId = asObjectId(category);
    if (!categoryId) {
      return next(new AppError("Category not found", 400));
    }
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return next(new AppError("Category not found", 400));
    }
    product.category = categoryId;
  }

  // Update basic fields
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (shortDescription !== undefined) product.shortDescription = shortDescription;
  if (price !== undefined) product.price = parseFloat(price);
  if (originalPrice !== undefined) product.originalPrice = parseFloat(originalPrice);
  if (stock !== undefined) product.stock = parseInt(stock, 10);
  if (sku !== undefined) product.sku = sku;
  if (status !== undefined) product.status = status;
  if (modelUrl !== undefined) product.modelUrl = modelUrl;
  if (style !== undefined) product.style = style;

  const featuredValue = parseBoolean(isFeatured);
  const newArrivalValue = parseBoolean(isNewArrival);
  if (featuredValue !== undefined) product.isFeatured = featuredValue;
  if (newArrivalValue !== undefined) product.isNewArrival = newArrivalValue;

  if (metaTitle !== undefined) product.metaTitle = metaTitle;
  if (metaDescription !== undefined) product.metaDescription = metaDescription;

  // Parse and update JSON fields
  if (dimensions !== undefined) product.dimensions = parseJsonField(dimensions);
  if (weight !== undefined) product.weight = parseJsonField(weight);
  if (colors !== undefined) product.colors = parseJsonField(colors);
  if (materials !== undefined) product.materials = parseJsonField(materials);
  if (tags !== undefined) product.tags = parseJsonField(tags);

  // AR-21: assets are destroyed only AFTER the save below commits.
  // The old order (delete first, save later) left the product pointing
  // at destroyed assets whenever the save failed. Collect the doomed
  // publicIds now, filter the arrays in memory, delete post-commit.
  const pendingAssetDeletes = [];
  if (removeImages) {
    const imagesToRemove = parseJsonField(removeImages) || [];
    const imagesToDelete = product.images.filter((img) => imagesToRemove.includes(img.url) && img.publicId);
    pendingAssetDeletes.push(...imagesToDelete.map((img) => [img.publicId, "image"]));
    product.images = product.images.filter((img) => !imagesToRemove.includes(img.url));
  }

  if (removeModelFiles) {
    const modelsToRemove = parseJsonField(removeModelFiles) || [];
    const modelsToDelete = product.modelFiles.filter(
      (model) => modelsToRemove.includes(model.url) && !model.isExternal && model.publicId
    );
    pendingAssetDeletes.push(...modelsToDelete.map((model) => [model.publicId, "raw"]));
    product.modelFiles = product.modelFiles.filter((model) => !modelsToRemove.includes(model.url));
  }

  const imageFiles = req.files?.images || (Array.isArray(req.files) ? req.files : []);
  if (imageFiles.length > 0) {
    const newImages = imageFiles.map((file) => ({
      url: file.cloudinaryUrl,
      publicId: file.cloudinaryPublicId,
      alt: product.name,
      isPrimary: false,
    }));

    if (product.images.length === 0 && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    product.images.push(...newImages);
  }

  if (req.files?.modelFiles && req.files.modelFiles.length > 0) {
    const newModelFiles = req.files.modelFiles.map((file) => ({
      url: file.cloudinaryUrl,
      publicId: file.cloudinaryPublicId,
      format: file.format,
      platform: file.platform,
      fileSize: file.fileSize,
      isExternal: false,
    }));

    if (!product.modelFiles) {
      product.modelFiles = [];
    }
    product.modelFiles.push(...newModelFiles);
  }

  // Handle new external model URLs
  if (modelUrls) {
    const parsedUrls = parseJsonField(modelUrls) || [];
    if (parsedUrls.length > 0) {
      const externalModels = parsedUrls.map((model) => ({
        url: model.url,
        format: model.format,
        platform: model.platform || (model.format === 'usdz' ? 'ios' : 'android'),
        isExternal: true,
      }));

      if (!product.modelFiles) {
        product.modelFiles = [];
      }
      product.modelFiles.push(...externalModels);
    }
  }

  await product.save();

  // AR-21: post-commit asset cleanup. A failure here orphans the asset
  // (nothing references it anymore) - logged as a structured,
  // alertable asset_cleanup_pending record for later reaping;
  // deleteFromCloudinary additionally logs cloudinary_delete_failed.
  for (const [publicId, resourceType] of pendingAssetDeletes) {
    const result = await deleteFile(publicId, resourceType);
    if (result === null) {
      console.error(JSON.stringify({ level: "error", event: "asset_cleanup_pending", publicId, resourceType, context: "product.update" }));
    }
  }

  await product.populate("category", "name slug");

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Delete product - soft delete (Admin only)
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  await product.softDelete();

  res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
});

// Hard delete product (Admin only)
exports.hardDeleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // AR-21: the record is deleted FIRST; its assets are destroyed only
  // after the delete commits (previously a failed DB delete left the
  // live product pointing at destroyed assets).
  const imagePublicIds = (product.images || []).filter((img) => img.publicId).map((img) => img.publicId);
  const modelPublicIds = (product.modelFiles || []).filter((m) => m.publicId && !m.isExternal).map((m) => m.publicId);

  await Product.findByIdAndDelete(req.params.id);

  if (imagePublicIds.length > 0) {
    const results = await deleteFiles(imagePublicIds);
    (Array.isArray(results) ? results : []).forEach((result, i) => {
      if (result === null) {
        console.error(JSON.stringify({ level: "error", event: "asset_cleanup_pending", publicId: imagePublicIds[i], resourceType: "image", context: "product.hardDelete" }));
      }
    });
  }
  await Promise.all(modelPublicIds.map(async (id) => {
    const result = await deleteFile(id, "raw");
    if (result === null) {
      console.error(JSON.stringify({ level: "error", event: "asset_cleanup_pending", publicId: id, resourceType: "raw", context: "product.hardDelete" }));
    }
  }));

  res.status(200).json({
    status: "success",
    message: "Product permanently deleted",
  });
});

// Set primary image (Admin only)
exports.setPrimaryImage = catchAsync(async (req, res, next) => {
  const { imageId } = req.body;
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const imageExists = product.images.some((img) => img._id.toString() === imageId);
  if (!imageExists) {
    return next(new AppError("Image not found", 404));
  }

  product.images.forEach((img) => {
    img.isPrimary = img._id.toString() === imageId;
  });

  await product.save();

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

// Get related products (Enhanced Multi-Tiered Rule Engine)
exports.getRelatedProducts = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { limit = 4 } = req.query;
  const limitNum = boundedLimit(limit);

  const product = await Product.findOne({ _id: id, deletedAt: null, status: { $in: ["active", "out_of_stock"] } });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Tier 1: Same Category + Same Style
  let query = {
    category: product.category,
    style: product.style,
    _id: { $ne: product._id },
    deletedAt: null,
    status: "active",
  };

  let relatedProducts = await Product.find(query)
    .limit(limitNum)
    .select("name slug price originalPrice images rating category style tags")
    .populate("category", "name slug")
    .lean();

  // Tier 2: Same Category (if Tier 1 didn't fill limit)
  if (relatedProducts.length < limitNum) {
    const existingIds = relatedProducts.map(p => p._id);
    const tier2Query = {
      category: product.category,
      _id: { $ne: product._id, $nin: existingIds },
      deletedAt: null,
      status: "active",
    };

    const tier2Products = await Product.find(tier2Query)
      .limit(limitNum - relatedProducts.length)
      .select("name slug price originalPrice images rating category style tags")
      .populate("category", "name slug")
      .lean();

    relatedProducts = [...relatedProducts, ...tier2Products];
  }

  // Tier 3: Shared Tags (if still below limit)
  if (relatedProducts.length < limitNum && product.tags?.length > 0) {
    const existingIds = relatedProducts.map(p => p._id);
    const tier3Query = {
      tags: { $in: product.tags },
      _id: { $ne: product._id, $nin: existingIds },
      deletedAt: null,
      status: "active",
    };

    const tier3Products = await Product.find(tier3Query)
      .limit(limitNum - relatedProducts.length)
      .select("name slug price originalPrice images rating category style tags")
      .populate("category", "name slug")
      .lean();

    relatedProducts = [...relatedProducts, ...tier3Products];
  }

  res.status(200).json({
    status: "success",
    results: relatedProducts.length,
    data: {
      products: relatedProducts,
    },
  });
});

// Get featured products
exports.getFeaturedProducts = catchAsync(async (req, res, next) => {
  const { limit = 8 } = req.query;

  const products = await Product.find({
    isFeatured: true,
    deletedAt: null,
    status: "active",
  })
    .limit(boundedLimit(limit))
    .select("name slug price originalPrice images rating category")
    .populate("category", "name slug")
    .lean();

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

// Get new arrivals
exports.getNewArrivals = catchAsync(async (req, res, next) => {
  const { limit = 8 } = req.query;

  const products = await Product.find({
    isNewArrival: true,
    deletedAt: null,
    status: "active",
  })
    .limit(boundedLimit(limit))
    .select("name slug price originalPrice images rating category")
    .populate("category", "name slug")
    .lean();

  res.status(200).json({
    status: "success",
    results: products.length,
    data: {
      products,
    },
  });
});

// Update product stock (Admin only)
exports.updateStock = catchAsync(async (req, res, next) => {
  const { stock } = req.body;
  const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  product.stock = parseInt(stock, 10);

  // Auto-update status based on stock
  if (product.stock === 0 && product.status === "active") {
    product.status = "out_of_stock";
  } else if (product.stock > 0 && product.status === "out_of_stock") {
    product.status = "active";
  }

  await product.save();

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});
