const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, required: true },
  actor: { type: String, required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  state: { type: String, enum: ["available", "deleting"], default: "available" },
  cleanupClaimedAt: Date,
}, { timestamps: true });
schema.index({ expiresAt: 1 });
schema.index({ url: 1 });
module.exports = mongoose.model("ChatUpload", schema);
