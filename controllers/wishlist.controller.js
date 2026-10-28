const mongoose = require("mongoose");
const { performance } = require("node:perf_hooks");
const Wishlist = require("../models/wishlist.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// The product fields every wishlist response carries. This list is
// the contract with the shared ProductCard the wishlist page
// renders: name/slug/price/originalPrice/images/category/rating/
// stock for the basics, shortDescription for the one-line
// description, isNewArrival/isFeatured for the badge,
// arAvailable for the AR pill, colors for the swatch dots, and
// hasVariants/priceFrom/catalogVariants for variant detection and
// "From" pricing. (discountPercentage needs no entry — it is a
// schema virtual computed from price/originalPrice and serializes
// automatically.) Trimming this list silently removes card
// features, as the missing shortDescription did — extend the card
// and this list together.
const WISHLIST_PRODUCT_FIELDS =
  "name slug price originalPrice images category rating stock " +
  "shortDescription arAvailable colors isFeatured isNewArrival " +
  "hasVariants priceFrom catalogVariants";

// Get user's wishlist
exports.getWishlist = catchAsync(async (req, res, next) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
    path: "products.product",
    match: { deletedAt: null, status: { $in: ["active", "out_of_stock"] } },
    select: WISHLIST_PRODUCT_FIELDS,
    populate: {
      path: "category",
      select: "name slug",
    },
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  // Transform products to include addedAt at the item level
  const items = wishlist.products
    .filter((item) => item.product)
    .map((item) => ({
      _id: item._id,
      product: item.product,
      addedAt: item.addedAt,
    }));

  res.status(200).json({
    status: "success",
    data: {
      wishlist: {
        _id: wishlist._id,
        items,
        itemCount: items.length,
      },
    },
  });
});

// Add product to wishlist
exports.addToWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  if (!productId) {
    return next(new AppError("Product ID is required", 400));
  }

  if (typeof productId !== "string" || !/^[a-f0-9]{24}$/i.test(productId)) {
    return next(new AppError("Invalid product ID", 400));
  }
  const lookupStart = performance.now();
  const product = await Product.findOne({
    _id: productId,
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  })
    .select(WISHLIST_PRODUCT_FIELDS)
    .lean();
  req.wishlistTimings?.push(
    `product;dur=${(performance.now() - lookupStart).toFixed(1)}`,
  );
  if (!product) return next(new AppError("Product not found", 404));

  const writeStart = performance.now();
  const productObjectId = new mongoose.Types.ObjectId(productId);
  const userObjectId = new mongoose.Types.ObjectId(String(req.user._id));
  const now = new Date();
  const pipeline = [
    {
      $set: {
        user: userObjectId,
        createdAt: { $ifNull: ["$createdAt", now] },
        products: {
          $cond: [
            { $in: [productObjectId, { $ifNull: ["$products.product", []] }] },
            { $ifNull: ["$products", []] },
            {
              $concatArrays: [
                { $ifNull: ["$products", []] },
                [
                  {
                    _id: new mongoose.Types.ObjectId(),
                    product: productObjectId,
                    addedAt: now,
                  },
                ],
              ],
            },
          ],
        },
        updatedAt: now,
      },
    },
  ];
  let wishlist;
  try {
    wishlist = await Wishlist.findOneAndUpdate(
      { user: userObjectId },
      pipeline,
      {
        upsert: true,
        updatePipeline: true,
        new: true,
        projection: { products: 1 },
      },
    ).lean();
  } catch (error) {
    // Concurrent first additions may race on the unique user index.
    if (error.code !== 11000) throw error;
    wishlist = await Wishlist.findOneAndUpdate(
      { user: userObjectId },
      pipeline,
      { updatePipeline: true, new: true, projection: { products: 1 } },
    ).lean();
  }
  req.wishlistTimings?.push(
    `write;dur=${(performance.now() - writeStart).toFixed(1)}`,
  );

  res.status(200).json({
    status: "success",
    message: "Product added to wishlist",
    data: {
      inWishlist: true,
      item: (() => {
        const item = wishlist.products.find(
          (entry) => String(entry.product) === productId.toLowerCase(),
        );
        return { _id: item._id, product, addedAt: item.addedAt };
      })(),
    },
  });
});

// Remove product from wishlist
exports.removeFromWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  if (typeof productId !== "string" || !/^[a-f0-9]{24}$/i.test(productId)) {
    return next(new AppError("Invalid product ID", 400));
  }
  const writeStart = performance.now();
  const result = await Wishlist.updateOne(
    { user: req.user._id },
    {
      $pull: { products: { product: new mongoose.Types.ObjectId(productId) } },
    },
  );
  req.wishlistTimings?.push(
    `write;dur=${(performance.now() - writeStart).toFixed(1)}`,
  );
  if (!result.matchedCount)
    return next(new AppError("Wishlist not found", 404));

  res.status(200).json({
    status: "success",
    message: "Product removed from wishlist",
    data: {
      inWishlist: false,
    },
  });
});

// Check if product is in wishlist
exports.checkWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  const inWishlist = wishlist ? wishlist.hasProduct(productId) : false;

  res.status(200).json({
    status: "success",
    data: {
      inWishlist,
    },
  });
});

// Clear entire wishlist
exports.clearWishlist = catchAsync(async (req, res, next) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (wishlist) {
    wishlist.products = [];
    await wishlist.save();
  }

  res.status(200).json({
    status: "success",
    message: "Wishlist cleared",
  });
});
