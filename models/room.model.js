const mongoose = require("mongoose");

// Phase 1 (catalog) — room registry.
//
// Rooms are an independent navigation axis: a product appears in
// every room it suits (Product.roomSlugs holds the slugs) without
// being duplicated, and categories group rooms merchandising-side
// via Category.roomSlugs. `slug` is the stable machine id both
// fields reference; `label` is the customer-facing name.
const roomSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "Room slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [60, "Room slug cannot exceed 60 characters"],
    },
    label: {
      type: String,
      required: [true, "Room label is required"],
      trim: true,
      maxlength: [100, "Room label cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

roomSchema.index({ active: 1, sortOrder: 1 });

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
