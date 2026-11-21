const mongoose = require("mongoose");

// Batch 1 (Settings + Secrets backend): one encrypted secret per
// integration service (e.g. "ai.groq", "email.brevo" — the full list
// is services/settings/secretsService.js SERVICE_ENV). The plaintext
// is NEVER stored: only AES-256-GCM output (see utils/secretCrypto.js)
// — ciphertext/iv/authTag, all base64. lastTestedAt/lastTestStatus
// record the most recent connectionTester result for the admin UI;
// they describe the test, never the value.
const integrationSecretSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ciphertext: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastTestedAt: {
      type: Date,
    },
    lastTestStatus: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("IntegrationSecret", integrationSecretSchema);
