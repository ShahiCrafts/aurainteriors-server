const crypto = require("crypto");
const mongoose = require("mongoose");

const orderAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: String,
    postalCode: { type: String, required: true },
    country: { type: String, default: "Nepal" },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    cartItemId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    variant: {
      color: String,
      size: String,
      material: String,
    },
    // Phase 4 (catalog): immutable snapshot of the purchased
    // variant — its id, its SKU and its option combination with
    // labels resolved from the attribute definitions AT PLACEMENT
    // TIME. `price` above is the variant's price actually charged
    // for variant lines. Later variant edits/deletes never mutate
    // these fields; cancel/restock reads variantId to find the
    // unit to restore. Legacy lines leave all three unset.
    variantId: { type: mongoose.Schema.Types.ObjectId },
    sku: String,
    variantOptions: [
      {
        _id: false,
        key: { type: String, required: true },
        label: String,
        value: String,
      },
    ],
    image: String,
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    guestInfo: {
      email: { type: String, required: true },
      firstName: String,
      lastName: String,
      phone: String,
    },
    isGuestOrder: {
      type: Boolean,
      default: false,
    },
    items: [orderItemSchema],
    shippingAddress: {
      type: orderAddressSchema,
      required: true,
    },
    billingAddress: orderAddressSchema,
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    discountCode: {
      code: String,
      percentage: Number,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "esewa"],
      required: true,
    },
    stockDeducted: Boolean,
    inventoryReviewRequired: { type: Boolean, default: false },
    discountUsageConsumed: { type: Boolean, default: false },
    refundRequest: {
      status: { type: String, enum: ["none", "pending", "completed"], default: "none" },
      requestedAt: Date,
      reason: String,
      providerReference: String,
      completedAt: Date,
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      transactionId: String,
      esewaRefId: String,
      paidAt: Date,
      paymentGatewayResponse: mongoose.Schema.Types.Mixed,
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    returnRequest: {
      status: {
        type: String,
        enum: ["none", "requested", "approved", "rejected", "completed"],
        default: "none",
      },
      reason: String,
      description: String,
      requestedAt: Date,
      processedAt: Date,
      adminNote: String,
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    orderedAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    customerNote: String,
    adminNote: String,
    requestHash: String,
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "guestInfo.email": 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
// AR-03: idempotencyKey is indexed ONCE, by its field declaration above
// (unique + sparse). A duplicate schema.index({ idempotencyKey: 1 }) here
// made index creation throw IndexKeySpecsConflict and left which
// definition survived to chance (measured: unique+sparse in 2 of 3 runs,
// plain in 1). Do not re-add a second declaration.

// CQ-F (#194 class): the order id is a lookup key (guest order
// tracking, eSewa transaction_uuid), so its random suffix must come
// from a CSPRNG - Math.random is predictable and its base36 output
// is not uniform. Format and length are unchanged: AU + base36
// timestamp + 4 chars from [0-9A-Z].
const ORDER_SUFFIX_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
orderSchema.statics.generateOrderSuffix = function () {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += ORDER_SUFFIX_ALPHABET[crypto.randomInt(ORDER_SUFFIX_ALPHABET.length)];
  }
  return suffix;
};

orderSchema.pre("save", function () {
  if (this.isNew && !this.orderId) {
    const prefix = "AU";
    const timestamp = Date.now().toString(36).toUpperCase();
    this.orderId = `${prefix}${timestamp}${this.constructor.generateOrderSuffix()}`;
  }
});

orderSchema.methods.addStatusHistory = function (status, note = "") {
  this.statusHistory.push({ status, note, timestamp: new Date() });
  this.orderStatus = status;
  return this;
};

orderSchema.statics.findByOrderIdAndEmail = async function (orderId, email) {
  return this.findOne({
    orderId: orderId.toUpperCase(),
    "guestInfo.email": email.toLowerCase(),
  });
};

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
