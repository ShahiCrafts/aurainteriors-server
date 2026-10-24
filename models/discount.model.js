const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Discount code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, "Discount code cannot exceed 20 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    discountPercentage: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: [1, "Discount must be at least 1%"],
      max: [100, "Discount cannot exceed 100%"],
    },
    minimumOrderAmount: {
      type: Number,
      required: [true, "Minimum order amount is required"],
      min: [0, "Minimum order amount cannot be negative"],
      default: 0,
    },
    maxUsageLimit: {
      type: Number,
      min: [1, "Usage limit must be at least 1"],
      default: null,
    },
    currentUsageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

discountSchema.index({ expiryDate: 1 });
discountSchema.index({ isActive: 1 });

discountSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiryDate;
});

discountSchema.virtual("isUsageLimitReached").get(function () {
  if (!this.maxUsageLimit) return false;
  return this.currentUsageCount >= this.maxUsageLimit;
});

discountSchema.virtual("isValid").get(function () {
  return this.isActive && !this.isExpired && !this.isUsageLimitReached;
});

discountSchema.methods.validateForCart = function (subtotal) {
  if (!this.isActive) {
    return { valid: false, message: "This discount code is no longer active" };
  }
  if (this.isExpired) {
    return { valid: false, message: "This discount code has expired" };
  }
  if (this.isUsageLimitReached) {
    return {
      valid: false,
      message: "This discount code has reached its usage limit",
    };
  }
  if (subtotal < this.minimumOrderAmount) {
    return {
      valid: false,
      message: `Minimum order amount of NRs. ${this.minimumOrderAmount} required`,
    };
  }
  return { valid: true, message: "Discount code is valid" };
};

discountSchema.methods.calculateDiscount = function (subtotal) {
  return Math.round((subtotal * this.discountPercentage) / 100);
};

discountSchema.methods.incrementUsage = async function () {
  // AR-23: a single atomic findOneAndUpdate with the limit predicate
  // INSIDE the filter (the same $expr guard as findValidByCode below
  // and services/discountUsage.service.js, which is what checkout
  // actually uses) - the old read-modify-write save() let parallel
  // calls all "succeed" past maxUsageLimit. Caller audit: NO live
  // callers anywhere in the repo; checkout consumes usage through
  // discountUsage.service. Return contract (for any future caller):
  // resolves to the UPDATED discount document, or null when the
  // usage limit has been reached (or the document no longer exists).
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      $or: [
        { maxUsageLimit: null },
        { $expr: { $lt: ["$currentUsageCount", "$maxUsageLimit"] } },
      ],
    },
    { $inc: { currentUsageCount: 1 } },
    { new: true }
  );
  if (updated) {
    // Mirror without dirtying this copy.
    this._doc.currentUsageCount = updated.currentUsageCount;
  }
  return updated;
};

discountSchema.statics.findValidByCode = async function (code) {
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    expiryDate: { $gt: new Date() },
    $or: [
      { maxUsageLimit: null },
      { $expr: { $lt: ["$currentUsageCount", "$maxUsageLimit"] } },
    ],
  });
};

const Discount = mongoose.model("Discount", discountSchema);

module.exports = Discount;
