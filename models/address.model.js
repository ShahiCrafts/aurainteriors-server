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

addressSchema.pre("save", async function () {
  if (this.isDefault && (this.isNew || this.isModified("isDefault") || this.isModified("user"))) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
});

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
