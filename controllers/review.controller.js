const {
  boundedLimit,
  boundedPage,
  literalRegex,
  escapeRegex,
  safeSort,
} = require("../utils/listQuery");
const Review = require("../models/review.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const reviewFilter = (req) => ({
  _id: req.params.reviewId,
  ...(req.params.productId ? { product: req.params.productId } : {}),
});
const notificationEventEmitter = require("../services/notificationEventEmitter");

// Get all reviews for a product
exports.getProductReviews = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const {
    page = 1,
    limit = 10,
    sort = "-createdAt",
    rating,
    verified,
  } = req.query;

  // Verify product exists
  const product = await Product.findOne({
    _id: productId,
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Build filter
  const filter = { product: productId, isApproved: true };

  if (rating) {
    filter.rating = parseInt(rating, 10);
  }

  if (verified === true || verified === "true") {
    filter.isVerifiedPurchase = true;
  }

  const pageNum = boundedPage(page);
  const limitNum = boundedLimit(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get reviews and total count
  const [reviews, total, breakdown] = await Promise.all([
    Review.find(filter)
      .populate("user", "firstName lastName avatar")
      .sort(safeSort(sort, ["createdAt", "rating", "helpfulCount"]))
      .skip(skip)
      .limit(limitNum),
    Review.countDocuments(filter),
    Review.getRatingBreakdown(productId),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      reviews,
      breakdown,
      stats: {
        average: product.rating?.average || 0,
        total: product.rating?.count || 0,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// Get a single review
exports.getReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;

  const review = await Review.findOne(reviewFilter(req)).populate(
    "user",
    "firstName lastName avatar",
  );

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { review },
  });
});

// Create a review
exports.createReview = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user._id;

  // Verify product exists
  const product = await Product.findOne({
    _id: productId,
    deletedAt: null,
    status: { $in: ["active", "out_of_stock"] },
  });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({
    product: productId,
    user: userId,
  });

  if (existingReview) {
    return next(new AppError("You have already reviewed this product", 400));
  }

  // Check if user has purchased this product (verified purchase)
  const hasPurchased = await Order.findOne({
    user: userId,
    "items.product": productId,
    orderStatus: "delivered",
  });

  // Create review
  const review = await Review.create({
    product: productId,
    user: userId,
    rating: req.body.rating,
    title: req.body.title,
    comment: req.body.comment,
    isVerifiedPurchase: !!hasPurchased,
  });

  // Populate user info for response
  await review.populate("user", "firstName lastName avatar");

  // Emit admin notification for new review
  try {
    notificationEventEmitter.emit("admin:review:new", {
      reviewId: review._id,
      productId: productId,
      productName: product.name,
      customerName: `${req.user.firstName} ${req.user.lastName}`,
      rating: review.rating,
      comment: review.comment,
    });
  } catch (error) {
    console.error("Failed to emit admin:review:new event:", error.message);
  }

  res.status(201).json({
    status: "success",
    message: "Review submitted successfully",
    data: { review },
  });
});

// Update a review
exports.updateReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const userId = req.user._id;

  const review = await Review.findOne(reviewFilter(req));

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // Check ownership (unless admin)
  if (
    review.user.toString() !== userId.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("You can only edit your own reviews", 403));
  }

  // Update allowed fields
  const allowedFields = ["rating", "title", "comment"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      review[field] = req.body[field];
    }
  });

  await review.save();
  await review.populate("user", "firstName lastName avatar");

  res.status(200).json({
    status: "success",
    message: "Review updated successfully",
    data: { review },
  });
});

// Delete a review
exports.deleteReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const userId = req.user._id;

  const review = await Review.findOne(reviewFilter(req));

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // Check ownership (unless admin)
  if (
    review.user.toString() !== userId.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("You can only delete your own reviews", 403));
  }

  await Review.findOneAndDelete(reviewFilter(req));

  res.status(200).json({
    status: "success",
    message: "Review deleted successfully",
  });
});

// Mark review as helpful
exports.markHelpful = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const userId = req.user._id;

  const review = await Review.findOne(reviewFilter(req));

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // FA-48: authors cannot vote on their own review.
  if (String(review.user) === String(userId)) {
    return next(new AppError("You cannot vote on your own review", 400));
  }

  // FA-48: the toggle is ONE atomic pipeline update - the votes array is
  // the source of truth and the count is derived from its size in the
  // same operation, so concurrent votes cannot desynchronize them (the
  // previous read-modify-write could).
  const updated = await Review.findOneAndUpdate(
    { _id: review._id },
    [
      {
        $set: {
          helpfulVotes: {
            $cond: [
              { $in: [userId, "$helpfulVotes"] },
              { $setDifference: ["$helpfulVotes", [userId]] },
              { $setUnion: ["$helpfulVotes", [userId]] },
            ],
          },
        },
      },
      { $set: { helpfulCount: { $size: "$helpfulVotes" } } },
    ],
    { new: true },
  );
  const voted = updated.helpfulVotes.some(
    (id) => String(id) === String(userId),
  );

  res.status(200).json({
    status: "success",
    message: voted ? "Marked as helpful" : "Vote removed",
    data: {
      helpfulCount: updated.helpfulCount,
      voted,
    },
  });
});

// Get user's review for a product
exports.getUserReview = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user._id;

  const review = await Review.findOne({
    product: productId,
    user: userId,
  }).populate("user", "firstName lastName avatar");

  res.status(200).json({
    status: "success",
    data: { review },
  });
});

// Check if user can review a product
exports.canReview = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user._id;

  // Check if user already reviewed
  const existingReview = await Review.findOne({
    product: productId,
    user: userId,
  });

  // Check if user has purchased this product
  const hasPurchased = await Order.findOne({
    user: userId,
    "items.product": productId,
    orderStatus: "delivered",
  });

  res.status(200).json({
    status: "success",
    data: {
      canReview: !existingReview,
      hasReviewed: !!existingReview,
      hasPurchased: !!hasPurchased,
      reviewId: existingReview?._id,
    },
  });
});

// Admin: Add response to a review
exports.addAdminResponse = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const { comment } = req.body;

  const review = await Review.findOneAndUpdate(
    reviewFilter(req),
    {
      adminResponse: {
        comment,
        respondedAt: new Date(),
      },
    },
    { new: true },
  ).populate("user", "firstName lastName avatar");

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Response added successfully",
    data: { review },
  });
});

// Admin: Get all reviews (with filtering)
exports.getAllReviews = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sort = "-createdAt",
    rating,
    approved,
    product,
  } = req.query;

  const filter = {};

  if (rating) {
    filter.rating = parseInt(rating, 10);
  }

  if (approved !== undefined) {
    filter.isApproved = approved === "true";
  }

  if (product) {
    filter.product = product;
  }

  const pageNum = boundedPage(page);
  const limitNum = boundedLimit(limit);
  const skip = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "firstName lastName avatar email")
      .populate("product", "name slug images")
      .sort(safeSort(sort, ["createdAt", "rating", "helpfulCount"]))
      .skip(skip)
      .limit(limitNum),
    Review.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// Admin: Approve/Disapprove a review
exports.toggleApproval = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;

  const review = await Review.findOne(reviewFilter(req));

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  review.isApproved = !review.isApproved;
  await review.save();

  res.status(200).json({
    status: "success",
    message: review.isApproved ? "Review approved" : "Review disapproved",
    data: { review },
  });
});
