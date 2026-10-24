const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    label: {
      type: String,
      enum: ["home", "office", "work", "family", "other"],
      default: "home",
    },
    customLabel: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["delivery", "billing"],
      default: "delivery",
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: false,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      default: "Nepal",
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

addressSchema.index({ user: 1 });

// AR-42: switching the default is ONE atomic pipeline update - every
// address of the user is rewritten in a single operation, so exactly
// one default exists when it lands, however many switches race. This
// replaces the pre-save hook, whose check-then-updateMany was two
// separate operations: two concurrent saves with isDefault=true could
// both pass before either unset landed, leaving two defaults (and the
// hook also fired a write as a side effect of unrelated saves). All
// controller paths that choose a default go through this static. The
// database-level guarantee (a partial unique index) is MIGRATIONS.md
// M-3, owner-run, never automatic.
addressSchema.statics.switchDefault = function (userId, addressId) {
  const target = new mongoose.Types.ObjectId(addressId);
  return this.updateMany(
    { user: userId },
    [{ $set: { isDefault: { $eq: ["$_id", target] } } }],
    { updatePipeline: true }
  );
};

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
