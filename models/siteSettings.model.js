const mongoose = require("mongoose");

// Batch 1 (Settings + Secrets backend): the singleton site-settings
// document. Exactly one row exists per deployment, addressed by the
// fixed `key: "site"` (unique). `data` holds the settings sections
// (identity, theme, contact, seo, homepage, commerce, chat,
// notifications, maintenance, integrations) — see
// services/settings/defaults.js for the shape and the current-value
// defaults that are merged over it on read. Secret VALUES never live
// here; they live encrypted in models/integrationSecret.model.js.
const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "site",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
