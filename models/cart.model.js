const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isSafeInteger, message: "Quantity must be a safe integer" },
      default: 1,
    },
    variant: {
      color: String,
      size: String,
      material: String,
    },
    // Phase 4 (catalog): a line for a variant product names the
    // EXACT purchasable unit — the catalogVariants subdocument id —
    // plus its SKU denormalized at add time (revalidated against
    // the variant at checkout; SKUs are immutable, so a mismatch
    // means the line is stale or forged). Legacy lines leave both
    // unset and keep the {color,size,material} triple above.
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    sku: String,
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

cartSchema.methods.addItem = async function (
  productId,
  quantity = 1,
  variant = {},
  variantId = null,
  sku = undefined
) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Quantity must be a positive integer");
  const existingItem = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() &&
      String(item.variantId || "") === String(variantId || "") &&
      ["color", "size", "material"].every(key => (item.variant?.[key] || "") === (variant?.[key] || ""))
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product: productId, quantity, variant, ...(variantId ? { variantId, sku } : {}) });
  }

  return this.save();
};

cartSchema.methods.removeItem = async function (itemId) {
  this.items = this.items.filter(
    (item) => item._id.toString() !== itemId.toString()
  );
  return this.save();
};

cartSchema.methods.clearCart = async function (options = {}) {
  this.items = [];
  return this.save(options);
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
