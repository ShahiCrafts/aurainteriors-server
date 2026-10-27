const { boundedLimit, encodeCursor, decodeCursor, cursorAfterFilter } = require("../utils/listQuery");
const { applyCatalogListFilters, catalogPagination, catalogSort } = require("../utils/catalogListQuery");
const { asString, asNumber, asStringList, asObjectId } = require("../utils/params");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Room = require("../models/room.model");
const ProductType = require("../models/productType.model");
const { applyVariantOptionKeys } = require("../services/productVariant.service");
const {
  prepareCatalogAttributes,
  assertRequiredForStoredAttributes,
} = require("../services/productAttributes.service");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { deleteFile, deleteFiles } = require("../middleware/upload.middleware");
const catalogCache = require("../utils/catalogCache");
const { applyMaxTime } = require("../utils/queryTimeout");
const {
  getAttributeDefinitionsCached,
} = require("../services/attributeRegistryCache");

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

// Phase 1 (catalog): normalize a roomSlugs payload (array, or a
// JSON-string array from multipart form-data) and validate every
// slug against the Room registry — an unregistered room is a 400,
// never a silently stored dangling reference. Returns the normalized
// slug list (possibly empty, which clears the assignment).
const resolveRoomSlugs = async (raw) => {
  const parsed = parseJsonField(raw);
  if (!Array.isArray(parsed)) {
    throw new AppError("roomSlugs must be an array of room slugs", 400);
  }
  const slugs = [...new Set(parsed.map((s) => String(s).trim().toLowerCase()).filter(Boolean))];
  if (slugs.length > 0) {
    const known = await Room.find({ slug: { $in: slugs }, active: true }).select("slug").lean();
    const knownSlugs = new Set(known.map((room) => room.slug));
    const unknown = slugs.filter((slug) => !knownSlugs.has(slug));
    if (unknown.length > 0) {
      throw new AppError(`Unknown room slug(s): ${unknown.join(", ")}`, 400);
    }
  }
  return slugs;
};

// Phase 3 (catalog): the product's own productType must be a key
// in the ProductType registry (active) — same contract as the
// category write path (Phase 1). ""/null clears the assignment
// (returns null); absent leaves it untouched (returns undefined).
const resolveProductType = async (raw) => {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  const key = String(raw).trim().toLowerCase();
  const type = await ProductType.findOne({ key, active: true }).select("key").lean();
  if (!type) {
    throw new AppError(`Unknown product type: ${key}`, 400);
  }
  return key;
};

// Get all products with filtering, sorting, and pagination
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const query = req.query || {};
  // PERF-B-01: anonymous list responses are served from the
  // in-process catalog TTL cache (utils/catalogCache.js) when an
  // identical canonical query was computed within the TTL. Any
  // credential (req.user, Authorization header, jwt cookie) bypasses
  // the cache in both directions — the handler personalises
  // visibility by user, so an authed response must never be stored
  // for, or served to, anyone else.
  const listCacheKey = catalogCache.isAnonymousRequest(req)
    ? catalogCache.keyFor(query)
    : null;
  if (listCacheKey) {
    const cachedHit = catalogCache.get(listCacheKey);
    if (cachedHit) return res.status(200).json(cachedHit);
  }
  const page = query.page;
  const limit = query.limit;
  const sort = query.sort;
  // CQ-A (#3): every value below is forced through utils/params
  // before use. Arrays/objects (?style[$ne]=x, ?style=a&style=b)
  // previously reached .split()/parseFloat() raw - a type-confusion
  // crash/500 and NaN filters. They are now treated as absent.
  const categoryList = asStringList(query.category);
  const categoriesList = asStringList(query.categories);
  const roomList = asStringList(query.room);
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

  // Phase 0.5 (catalog Q1): category filters include DESCENDANT
  // categories, converging this endpoint on getCategoryProducts'
  // subtree semantics — a parent category lists the products of its
  // whole subtree, not only products assigned directly to it (with
  // the seed's leaf-only product placement, parent listings were
  // empty). Expansion reuses the model's getDescendantIds BFS, the
  // same helper the category-products endpoint uses; the response
  // shape is unchanged.
  // PERF-B-06: one parent-map scan for ALL roots instead of one
  // full scan per root (the model's getDescendantIds loads every
  // category on each call). Semantics are identical to
  // getDescendantIds: the BFS walks the same parent links (never
  // the stored `ancestors` materialization, which legacy documents
  // may lack), seeds every requested id, and is cycle-safe.
  const expandToSubtree = async (ids) => {
    if (ids.length === 0) return [];
    const all = await Category.find({}, "_id parent").lean();
    const children = new Map();
    for (const category of all) {
      const key = String(category.parent || "");
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(String(category._id));
    }
    const seen = new Set();
    const queue = ids.map(String);
    while (queue.length) {
      const current = queue.shift();
      if (seen.has(current)) continue;
      seen.add(current);
      queue.push(...(children.get(current) || []));
    }
    return [...seen];
  };

  // Handle category filter by ID (legacy)
  // Phase 5: the pre-expansion roots are remembered — they define
  // the category facet's scope (subtree counts under the selected
  // categories) when facets are requested.
  let selectedCategoryRoots = [];
  if (categoryList.length > 0) {
    filter.category = { $in: await expandToSubtree(categoryList) };
    selectedCategoryRoots = categoryList;
  }

  // Handle categories filter by slug (new)
  if (categoriesList.length > 0) {
    const categoryDocs = await Category.find({ slug: { $in: categoriesList } }).select("_id");
    const categoryIds = categoryDocs.map((cat) => cat._id);
    if (categoryIds.length > 0) {
      filter.category = { $in: await expandToSubtree(categoryIds) };
      selectedCategoryRoots = categoryIds.map((id) => String(id));
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

  // Phase 1 (catalog): room as a list dimension — ?room=<slug>
  // (comma-separated for several). Products carry roomSlugs; a
  // product assigned to multiple rooms matches each of them.
  if (roomList.length > 0) {
    filter.roomSlugs = { $in: roomList.map((slug) => slug.toLowerCase()) };
  }

  if (featured === "true") {
    filter.isFeatured = true;
  }

  if (newArrivals === "true") {
    filter.isNewArrival = true;
  }

  // Phase 5: the visibility status as resolved above, BEFORE the
  // inStock block below replaces it — the facet pools need the
  // availability-free variant of the scope (disjunctive counting).
  const statusSnapshot = filter.status;

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

  // ----------------------------------------------------------------
  // Phase 5 (catalog): faceted filter engine.
  //
  // - Attribute conditions (attr.* params) are parsed against the
  //   Phase 2 registry by services/catalogFilter.service.js and
  //   become variant-aware clauses (same-variant rule, hybrid
  //   legacy matching) — see that module for the semantics.
  // - minPrice/maxPrice gain EFFECTIVE-price semantics: the shared
  //   builder above set the legacy Product.price fragment; it is
  //   replaced here by the engine's branches (non-variant products
  //   keep Product.price; variant products match through any
  //   enabled variant). Recorded divergence D6: getCategoryProducts
  //   keeps the legacy price fragment — the shared builder is
  //   deliberately untouched.
  // - inStock=true additionally requires, for variant products, an
  //   enabled variant with stock - reservedStock > 0 (the legacy
  //   product-level stock/status conditions above stay in force).
  // - collection=<slug> resolves a Phase 1 collection through the
  //   collection service (the same evaluation as the collection
  //   page) and constrains the list to its published members; an
  //   unknown/inactive slug is a 404, mirroring
  //   GET /catalog/collections/:slug.
  // Model-touching modules are LAZY-required inside the branches
  // that need them (the Phase 4 stub-harness lesson): a plain
  // legacy request never loads them.
  const wantsFacets = query.facets === "1" || query.facets === "true";
  const hasAttrParams = Object.keys(query).some((key) => key.startsWith("attr."));
  const collectionSlug = asString(query.collection, 120);
  const priceRange =
    minPrice !== undefined || maxPrice !== undefined ? { min: minPrice, max: maxPrice } : null;
  const inStockRequested = inStock === "true";
  let attrConditions = [];
  let collectionFragment = null;

  if (hasAttrParams) {
    const AttributeDefinition = require("../models/attributeDefinition.model");
    const { parseAttributeFilters } = require("../services/catalogFilter.service");
    // PERF-B-05 (U-3): the registry is cached in-process (60s);
    // attribute writes in catalog.controller invalidate it.
    const definitionDocs = await getAttributeDefinitionsCached("all", () =>
      AttributeDefinition.find({}).lean()
    );
    const definitionsByKey = new Map(definitionDocs.map((doc) => [doc.key, doc]));
    attrConditions = parseAttributeFilters(query, definitionsByKey);
  }

  if (collectionSlug !== undefined) {
    const Collection = require("../models/collection.model");
    const { resolveCollectionProductIds } = require("../services/collection.service");
    const slug = collectionSlug.trim().toLowerCase();
    const collection = slug
      ? await Collection.findOne({ slug, active: true }).select("kind productIds rule").lean()
      : null;
    if (!collection) {
      throw new AppError("Collection not found", 404);
    }
    const productIds = await resolveCollectionProductIds(collection);
    filter._id = { $in: productIds };
    collectionFragment = { _id: filter._id };
  }

  if (priceRange) {
    delete filter.price;
  }
  {
    const { buildVariantAwareClause } = require("../services/catalogFilter.service");
    const engineClauses = buildVariantAwareClause({
      conditions: attrConditions,
      priceRange,
      inStock: inStockRequested,
    });
    if (engineClauses.length > 0) {
      filter.$and = [...(filter.$and || []), ...engineClauses];
    }
  }

  // The legacy fragments as they landed on the filter, captured
  // for the disjunctive facet pools (Pass C computes facets from
  // these same fragments, so facet pools can never drift from the
  // list filter's meaning).
  const facetFragments = {
    category: filter.category ? { category: filter.category } : null,
    room: filter.roomSlugs ? { roomSlugs: filter.roomSlugs } : null,
    rating: filter["rating.average"] ? { "rating.average": filter["rating.average"] } : null,
    style: filter.style ? { style: filter.style } : null,
    colors: filter.colors ? { colors: filter.colors } : null,
    materials: filter.materials ? { materials: filter.materials } : null,
    availability: inStockRequested ? [{ stock: { $gt: 0 } }, { status: "active" }] : [],
    scope: [
      { deletedAt: null },
      ...(statusSnapshot !== undefined ? [{ status: statusSnapshot }] : []),
      ...(filter.$text ? [{ $text: filter.$text }] : []),
      ...(filter.isFeatured ? [{ isFeatured: true }] : []),
      ...(filter.isNewArrival ? [{ isNewArrival: true }] : []),
      ...(collectionFragment ? [collectionFragment] : []),
    ],
  };

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

  // Phase 5: effective-price sorting (sort=effectivePriceAsc /
  // effectivePriceDesc) needs a computed key, so the page is read
  // through an aggregation — $addFields effectivePrice
  // (priceFrom ?? price), $sort, then the category populate
  // re-expressed as a $lookup so the body matches the find() path
  // field for field. Aggregation ignores select:false, so the two
  // internal fields (reservedStock, rating.sum) and the computed
  // key are projected out. Cursor mode keeps its keyset sort and
  // ignores the token, exactly as it ignores every other sort.
  const { parseEffectiveSort, EFFECTIVE_PRICE_EXPR } = require("../services/catalogFilter.service");
  const effectiveSort = cursorMode ? null : parseEffectiveSort(sort);

  const [productsPage, total] = await Promise.all([
    // PERF-B-11: bound the list/aggregation queries with maxTimeMS.
    applyMaxTime(
      effectiveSort
      ? Product.aggregate([
          { $match: filter },
          { $addFields: { effectivePrice: EFFECTIVE_PRICE_EXPR } },
          { $sort: effectiveSort },
          { $skip: skip },
          { $limit: limitNum },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 1, name: 1, slug: 1 } }],
              as: "_categoryDocs",
            },
          },
          {
            $addFields: {
              category: {
                $cond: [
                  { $gt: [{ $size: "$_categoryDocs" }, 0] },
                  { $arrayElemAt: ["$_categoryDocs", 0] },
                  null,
                ],
              },
            },
          },
          {
            $project: {
              effectivePrice: 0,
              _categoryDocs: 0,
              reservedStock: 0,
              "rating.sum": 0,
            },
          },
        ])
      : cursorMode
        ? Product.find(pageFilter).populate("category", "name slug").sort({ createdAt: -1, _id: -1 }).limit(limitNum + 1).lean()
        : Product.find(filter).populate("category", "name slug").sort(catalogSort(sort)).skip(skip).limit(limitNum).lean(),
      effectiveSort ? "agg" : "list"
    ),
    applyMaxTime(Product.countDocuments(filter), "list"),
  ]);

  let products = productsPage;
  let nextCursor;
  if (cursorMode) {
    const hasMore = productsPage.length > limitNum;
    products = hasMore ? productsPage.slice(0, limitNum) : productsPage;
    nextCursor = hasMore && products.length > 0 ? encodeCursor(products[products.length - 1]) : null;
  }

  // Phase 5: disjunctive facets, only when requested (facets=1) —
  // computed by the ONE faceting implementation from the same
  // fragments this filter was built from.
  let facets;
  if (wantsFacets) {
    const { computeFacets } = require("../services/catalogFacets.service");
    ({ facets } = await computeFacets({
      scopeFragments: facetFragments.scope,
      conditions: attrConditions,
      priceRange,
      inStock: inStockRequested,
      categoryFragment: facetFragments.category,
      categoryRoots: selectedCategoryRoots,
      roomFragment: facetFragments.room,
      ratingFragment: facetFragments.rating,
      minRating,
      fieldFragments: {
        style: facetFragments.style,
        colors: facetFragments.colors,
        materials: facetFragments.materials,
      },
      availabilityFragments: facetFragments.availability,
    }));
  }

  const listPayload = {
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
      ...(wantsFacets ? { facets } : {}),
    },
  };
  // PERF-B-01: store the anonymous response for the TTL window.
  if (listCacheKey) catalogCache.set(listCacheKey, listPayload);
  res.status(200).json(listPayload);
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
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a product write makes cached lists stale
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
    productType,
    roomSlugs,
    catalogAttributes,
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

  // Phase 1: room assignment validated against the Room registry.
  const resolvedRoomSlugs = roomSlugs !== undefined ? await resolveRoomSlugs(roomSlugs) : undefined;

  // Phase 3: the product's own type, validated against the
  // ProductType registry. It supplies the type level for
  // attribute resolution (below and in
  // services/attributeResolution.service.js resolveForProduct).
  const resolvedProductType = await resolveProductType(productType);

  // Phase 2: catalogAttributes validated + normalized through the
  // attribute engine, with the category's required set enforced —
  // including when the payload omits catalogAttributes entirely (a
  // product in a category with required attributes cannot be
  // created without them). Runs before Product.create, so a
  // rejection persists nothing.
  const preparedCatalogAttributes = await prepareCatalogAttributes({
    category: categoryExists,
    raw: catalogAttributes === undefined ? {} : catalogAttributes,
    productType: resolvedProductType || undefined,
  });

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
    productType: resolvedProductType || undefined,
    roomSlugs: resolvedRoomSlugs,
    catalogAttributes: preparedCatalogAttributes,
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
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a product write makes cached lists stale
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
    productType,
    variantOptionKeys,
    roomSlugs,
    catalogAttributes,
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
  let changedCategory = null;
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
    changedCategory = categoryExists;
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

  // Phase 1: room assignment validated against the Room registry
  // (an empty list clears the assignment).
  if (roomSlugs !== undefined) product.roomSlugs = await resolveRoomSlugs(roomSlugs);

  // Phase 3: the product's own type (registry-validated; ""/null
  // clears). Assigned BEFORE attribute preparation below so a
  // payload that changes the type and the attributes together is
  // enforced against the NEW type's required set.
  if (productType !== undefined) {
    product.productType = await resolveProductType(productType);
  }

  // Phase 3: variantOptionKeys — registry/type validated and
  // LOCKED while variants exist (services/productVariant.service).
  if (variantOptionKeys !== undefined) {
    await applyVariantOptionKeys(product, variantOptionKeys);
  }

  // Phase 2: catalogAttributes through the attribute engine. A
  // provided payload is fully validated + normalized and replaces
  // the stored map, with the EFFECTIVE category's required set
  // enforced; a category-only change checks the stored values
  // against the new category's required set without re-validating
  // them. An update touching neither skips attribute enforcement
  // entirely. All of this runs before product.save(), so a
  // rejection persists nothing.
  if (catalogAttributes !== undefined) {
    const categoryDoc = changedCategory || (await Category.findById(product.category));
    product.catalogAttributes = await prepareCatalogAttributes({
      category: categoryDoc,
      raw: catalogAttributes,
      productType: product.productType || undefined,
    });
  } else if (changedCategory) {
    await assertRequiredForStoredAttributes({
      category: changedCategory,
      storedAttrs: product.catalogAttributes,
    });
  }

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
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a product write makes cached lists stale
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
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a product write makes cached lists stale
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
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a product write makes cached lists stale
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
  // Route param is :productId (strict ObjectId guard) — this handler
  // has no slug branch, unlike getProduct (SR-8).
  const { productId } = req.params;
  const { limit = 4 } = req.query;
  const limitNum = boundedLimit(limit);

  const product = await Product.findOne({ _id: productId, deletedAt: null, status: { $in: ["active", "out_of_stock"] } });

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
    // SR-P7-2 (Phase 9+10): hasVariants/priceFrom/catalogVariants
    // ride every card feed so ProductCard can render "From" pricing
    // and judge variant availability (the main list ships full docs;
    // these curated selects were the only card feeds missing them).
    .select("name slug price originalPrice images rating category style tags hasVariants priceFrom catalogVariants")
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
      .select("name slug price originalPrice images rating category style tags hasVariants priceFrom catalogVariants")
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
      .select("name slug price originalPrice images rating category style tags hasVariants priceFrom catalogVariants")
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
    .select("name slug price originalPrice images rating category hasVariants priceFrom catalogVariants")
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
    .select("name slug price originalPrice images rating category hasVariants priceFrom catalogVariants")
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
  catalogCache.invalidateCatalogCache(); // PERF-B-01: a product write makes cached lists stale
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
