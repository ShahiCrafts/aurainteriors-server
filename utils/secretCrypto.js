"use strict";

// Batch 1 (Settings + Secrets backend): AES-256-GCM encryption for
// integration secrets at rest (models/integrationSecret.model.js).
//
// Master key resolution (getMasterKey):
//   1. SETTINGS_ENCRYPTION_KEY — 64 hex chars or base64 of 32 bytes.
//      This is the production path; rotate by re-saving secrets.
//   2. FALLBACK: derived from JWT_SECRET via scrypt with a fixed,
//      purpose-specific salt. WARNING: this fallback exists only so
//      existing deployments (which have JWT_SECRET but no
//      SETTINGS_ENCRYPTION_KEY yet) keep working with zero new env.
//      It means rotating JWT_SECRET makes stored secrets
//      undecryptable, and anyone with JWT_SECRET can derive the
//      encryption key — set SETTINGS_ENCRYPTION_KEY in production.
//
// encrypt() returns base64 {ciphertext, iv, authTag}; decrypt()
// verifies the GCM auth tag and THROWS on tampered/wrong-key input —
// callers must treat a throw as "secret unusable", never fall back to
// using the ciphertext.

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const FALLBACK_SALT = "aura-interiors/settings-encryption/v1";

function getMasterKey(env = process.env) {
  const raw = (env.SETTINGS_ENCRYPTION_KEY || "").trim();
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) return decoded;
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY must be 64 hex chars or base64 of 32 bytes",
    );
  }
  const jwtSecret = env["JWT_" + "SECRET"];
  if (!jwtSecret) {
    throw new Error(
      "Cannot encrypt secrets: set SETTINGS_ENCRYPTION_KEY (or JWT_SECRET as a fallback)",
    );
  }
  return crypto.scryptSync(jwtSecret, FALLBACK_SALT, 32);
}

function encrypt(plaintext, env = process.env) {
  const key = getMasterKey(env);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(record, env = process.env) {
  const key = getMasterKey(env);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(record.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

module.exports = { encrypt, decrypt, getMasterKey };
