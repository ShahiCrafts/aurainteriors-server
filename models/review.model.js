const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Review must belong to a product"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulVotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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
      },
    ],
    isApproved: {
      type: Boolean,
      default: true, // Auto-approve reviews, can be changed to false for moderation
    },
    adminResponse: {
      comment: String,
      respondedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to ensure one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Index for efficient queries
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });

// Static method to calculate average rating for a product
reviewSchema.statics.calcAverageRating = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        numRatings: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      "rating.average": Math.round(stats[0].avgRating * 10) / 10,
      "rating.count": stats[0].numRatings,
    });
  } else {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      "rating.average": 0,
      "rating.count": 0,
    });
  }
};

// Static method to get rating breakdown for a product
reviewSchema.statics.getRatingBreakdown = async function (productId) {
  const breakdown = await this.aggregate([
    {
      $match: { 
        product: new mongoose.Types.ObjectId(productId), 
        isApproved: true 
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: -1 },
    },
  ]);

  // Format breakdown to include all 5 rating levels
  const formattedBreakdown = [5, 4, 3, 2, 1].map((stars) => {
    const found = breakdown.find((b) => b._id === stars);
    return {
      stars,
      count: found ? found.count : 0,
    };
  });

  return formattedBreakdown;
};

// Update product rating after saving a review
reviewSchema.post("save", async function () {
  await this.constructor.calcAverageRating(this.product);
});

// Update product rating after deleting a review
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRating(doc.product);
  }
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
