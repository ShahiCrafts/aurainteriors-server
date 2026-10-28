const validator = require("validator");
const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Please provide a valid email address"],
      // CQ-D (#1/#2): the previous match regex backtracked
      // catastrophically (a 28-char adversarial input ran >6s -
      // ReDoS). validator.isEmail is linear-time. Accept/reject is
      // unchanged for normal addresses; plus-tags and TLDs longer
      // than 3 chars, which the old pattern wrongly rejected, are
      // now accepted (logged in FINDINGS.md).
      validate: {
        validator: (value) => validator.isEmail(value),
        message: "Please provide a valid email address",
      },
    },
    source: {
      type: String,
      enum: ["footer", "blog"],
      default: "footer",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    confirmationTokenHash: { type: String, select: false },
    confirmationExpiresAt: { type: Date, select: false },
    confirmationSentAt: { type: Date, select: false },
    unsubscribeNonce: { type: String },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries (email index already created by unique: true)
newsletterSchema.index({ isActive: 1 });

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

module.exports = Newsletter;
