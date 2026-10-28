const mongoose = require("mongoose");
// MongoDB's primary-key uniqueness claims each provider transaction once.
const schema = new mongoose.Schema(
  {
    _id: String,
    order: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Order",
    },
    outcome: {
      type: String,
      enum: ["confirmed", "review_required"],
      required: true,
    },
    reason: String,
  },
  { timestamps: true },
);
module.exports = mongoose.model("PaymentCapture", schema);
