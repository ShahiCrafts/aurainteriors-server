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

// A review's contribution to its product's stored rating: only
// APPROVED reviews count, each contributing 1 to the count and its
// rating to the sum.
const ratingContribution = (doc) =>
  doc && doc.isApproved
    ? { count: 1, sum: doc.rating }
    : { count: 0, sum: 0 };

// Static method to calculate average rating for a product FROM
// SCRATCH (full aggregation over all its approved reviews). AR-24:
// this is no longer on the per-write path - it remains as (a) the
// lazy initializer for legacy products whose rating.sum predates
// the field and (b) the reconciliation reference.
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
        sumRatings: { $sum: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      "rating.average": Math.round(stats[0].avgRating * 10) / 10,
      "rating.count": stats[0].numRatings,
      "rating.sum": stats[0].sumRatings,
    });
  } else {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      "rating.average": 0,
      "rating.count": 0,
      "rating.sum": 0,
    });
  }
};

// AR-24: apply one review write's known delta to a product's rating
// in ONE atomic pipeline update - count and sum move together and
// the average is rederived from the NEW pair inside the same
// operation, so concurrent writes cannot interleave into a state
// that matches neither (the old recompute could), and the cost is
// O(1) instead of O(reviews of the product). The average formula
// mirrors calcAverageRating's Math.round(avg * 10) / 10 (for
// non-negative values Math.round(x) == floor(x + 0.5)).
// Products whose rating.sum is absent (created before AR-24) do not
// match the filter: their sum cannot be derived from the rounded
// average, so the first tracked write initializes it exactly via
// the from-scratch recompute instead. No migration is needed.
reviewSchema.statics.applyRatingDelta = async function (productId, dCount, dSum) {
  if (!productId || (dCount === 0 && dSum === 0)) return;
  const Product = mongoose.model("Product");
  const updated = await Product.findOneAndUpdate(
    { _id: productId, "rating.sum": { $exists: true } },
    [
      {
        $set: {
          "rating.count": { $max: [0, { $add: [{ $ifNull: ["$rating.count", 0] }, dCount] }] },
          "rating.sum": { $max: [0, { $add: [{ $ifNull: ["$rating.sum", 0] }, dSum] }] },
        },
      },
      {
        $set: {
          "rating.average": {
            $cond: [
              { $eq: ["$rating.count", 0] },
              0,
              {
                $divide: [
                  {
                    $floor: {
                      $add: [
                        { $multiply: [{ $divide: ["$rating.sum", "$rating.count"] }, 10] },
                        0.5,
                      ],
                    },
                  },
                  10,
                ],
              },
            ],
          },
        },
      },
    ],
    { updatePipeline: true }
  );
  if (!updated) {
    // Either the product is gone (nothing to maintain) or it is a
    // legacy product meeting its first tracked write.
    if (await Product.exists({ _id: productId })) {
      await this.calcAverageRating(productId);
    }
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

// AR-24 incremental rating maintenance. Write-path audit (every
// path that can change a review's rating contribution):
//   createReview / updateReview / admin toggleApproval all reach the
//   save hooks (Review.create, or findOne + doc.save());
//   deleteReview reaches the findOneAndDelete hook;
//   addAdminResponse and markHelpful use findOneAndUpdate but touch
//   only rating-neutral fields (adminResponse / helpful*), so they
//   correctly need no delta. No other Review writes exist in the
//   codebase (grep-verified across controllers/services/scripts).
//
// Before an edit lands, snapshot the stored rating/isApproved so
// the post-save hook can compute the exact delta (rating change,
// approval flip, or both). The snapshot is one O(1) _id lookup -
// not an aggregation. If the snapshot cannot be taken, fall back to
// the from-scratch recompute for that write (correct, just slower).
reviewSchema.pre("save", async function () {
  if (this.isNew) {
    this.$locals.ratingBefore = null;
    return;
  }
  try {
    const before = await this.constructor
      .findById(this._id)
      .select("rating isApproved product")
      .lean();
    this.$locals.ratingBefore = before || undefined;
  } catch {
    this.$locals.ratingBefore = undefined;
  }
});

reviewSchema.post("save", async function () {
  const before = this.$locals.ratingBefore;
  if (before === undefined) {
    await this.constructor.calcAverageRating(this.product);
    return;
  }
  const afterContribution = ratingContribution(this);
  if (before === null) {
    await this.constructor.applyRatingDelta(
      this.product,
      afterContribution.count,
      afterContribution.sum
    );
    return;
  }
  const beforeContribution = ratingContribution(before);
  if (String(before.product) !== String(this.product)) {
    // A review moved products (no app path does this, but the delta
    // math stays exact if one ever appears).
    await this.constructor.applyRatingDelta(
      before.product,
      -beforeContribution.count,
      -beforeContribution.sum
    );
    await this.constructor.applyRatingDelta(
      this.product,
      afterContribution.count,
      afterContribution.sum
    );
    return;
  }
  await this.constructor.applyRatingDelta(
    this.product,
    afterContribution.count - beforeContribution.count,
    afterContribution.sum - beforeContribution.sum
  );
});

// Deleting a review removes exactly its contribution.
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const contribution = ratingContribution(doc);
    await doc.constructor.applyRatingDelta(
      doc.product,
      -contribution.count,
      -contribution.sum
    );
  }
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
