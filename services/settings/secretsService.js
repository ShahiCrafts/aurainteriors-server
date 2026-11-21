"use strict";

// Batch 1 (Settings + Secrets backend): integration secrets service.
//
// Admin-saved secrets are stored AES-256-GCM-encrypted (see
// utils/secretCrypto.js + models/integrationSecret.model.js) and take
// precedence over the environment: getResolvedSecret() = admin value,
// else env value, else null. Batch 2 rewires consumers (chat gateway,
// email, Cloudinary, OAuth, eSewa) to getResolvedSecret(); this batch
// changes NO consumer behaviour.
//
// describeSecrets() is the ONLY list surface and it can never leak a
// value: it returns configured/source/masked-last-4/test metadata.
// Plaintext leaves this module only through getSecret() /
// getResolvedSecret(), which are internal server-side APIs with no
// route exposure.

const AppError = require("../../utils/AppError");
const secretCrypto = require("../../utils/secretCrypto");

// Single source of truth: service key -> env var used as fallback.
const SERVICE_ENV = {
  "ai.groq": "GROQ_API_KEY",
  "ai.mistral": "MISTRAL_API_KEY",
  "ai.openrouter": "OPENROUTER_API_KEY",
  "ai.gemini": "GEMINI_API_KEY",
  "ai.openai": "OPENAI_API_KEY",
  "ai.anthropic": "ANTHROPIC_API_KEY",
  "embeddings.nvidia": "NVIDIA_API_KEY",
  "vector.qdrant": "QDRANT_API_KEY",
  "email.brevo": "BREVO_API_KEY",
  "media.cloudinarySecret": "CLOUDINARY_API_SECRET",
  "auth.googleSecret": "GOOGLE_CLIENT_SECRET",
  "payments.esewaSecret": "ESEWA_SECRET_KEY",
  "payments.khalti": "KHALTI_SECRET_KEY",
  "sms.token": "SMS_API_TOKEN",
  "push.fcm": "FCM_SERVER_KEY",
};

const KNOWN_SERVICES = Object.keys(SERVICE_ENV);

function getModel() {
  return require("../../models/integrationSecret.model");
}

function assertKnownService(service) {
  if (!KNOWN_SERVICES.includes(service)) {
    throw new AppError(`Unknown integration service '${service}'`, 404);
  }
}

function envValue(service, env = process.env) {
  const raw = env[SERVICE_ENV[service]];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

function mask(value) {
  if (!value) return null;
  return `••••${String(value).slice(-4)}`;
}

function actorIdOf(user) {
  return user ? user._id || user.id : undefined;
}

async function setSecret(service, value, adminUser) {
  assertKnownService(service);
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("Secret value must be a non-empty string", 400);
  }
  const IntegrationSecret = getModel();
  const encrypted = secretCrypto.encrypt(value.trim());
  const existing = await IntegrationSecret.findOne({ service });
  if (existing) {
    existing.ciphertext = encrypted.ciphertext;
    existing.iv = encrypted.iv;
    existing.authTag = encrypted.authTag;
    existing.updatedBy = actorIdOf(adminUser);
    existing.lastTestedAt = undefined;
    existing.lastTestStatus = undefined;
    await existing.save();
  } else {
    await IntegrationSecret.create({
      service,
      ...encrypted,
      updatedBy: actorIdOf(adminUser),
    });
  }
  const auditLog = require("../auditLog.service");
  await auditLog.record({
    actor: actorIdOf(adminUser),
    action: "integrations.secret.set",
    targetType: "IntegrationSecret",
    targetId: service,
  });
  return describeService(service);
}

// INTERNAL ONLY — plaintext. Never wire this to a response.
async function getSecret(service) {
  assertKnownService(service);
  const IntegrationSecret = getModel();
  const doc = await IntegrationSecret.findOne({ service }).lean();
  if (!doc) return null;
  return secretCrypto.decrypt(doc);
}

async function getResolvedSecret(service, env = process.env) {
  const adminValue = await getSecret(service);
  if (adminValue) return adminValue;
  return envValue(service, env);
}

async function deleteSecret(service, adminUser) {
  assertKnownService(service);
  const IntegrationSecret = getModel();
  await IntegrationSecret.deleteOne({ service });
  const auditLog = require("../auditLog.service");
  await auditLog.record({
    actor: actorIdOf(adminUser),
    action: "integrations.secret.delete",
    targetType: "IntegrationSecret",
    targetId: service,
  });
  return describeService(service);
}

async function recordTestResult(service, status) {
  const IntegrationSecret = getModel();
  const doc = await IntegrationSecret.findOne({ service });
  if (!doc) return false;
  doc.lastTestedAt = new Date();
  doc.lastTestStatus = status;
  await doc.save();
  return true;
}

async function describeService(service, adminDoc, env = process.env) {
  assertKnownService(service);
  const IntegrationSecret = getModel();
  const doc =
    adminDoc !== undefined
      ? adminDoc
      : await IntegrationSecret.findOne({ service }).lean();
  if (doc) {
    let masked = null;
    try {
      masked = mask(secretCrypto.decrypt(doc));
    } catch {
      // Undecryptable (rotated key): still report it as configured —
      // the admin needs to know a value exists and must be re-saved.
      masked = "••••????";
    }
    return {
      service,
      configured: true,
      source: "admin",
      masked,
      lastTestedAt: doc.lastTestedAt || null,
      lastTestStatus: doc.lastTestStatus || null,
    };
  }
  const fromEnv = envValue(service, env);
  if (fromEnv) {
    return {
      service,
      configured: true,
      source: "env",
      masked: mask(fromEnv),
      lastTestedAt: null,
      lastTestStatus: null,
    };
  }
  return {
    service,
    configured: false,
    source: "none",
    masked: null,
    lastTestedAt: null,
    lastTestStatus: null,
  };
}

async function describeSecrets(env = process.env) {
  const IntegrationSecret = getModel();
  const docs = await IntegrationSecret.find({}).lean();
  const byService = new Map(docs.map((d) => [d.service, d]));
  const out = [];
  for (const service of KNOWN_SERVICES) {
    out.push(await describeService(service, byService.get(service) || null, env));
  }
  return out;
}

module.exports = {
  SERVICE_ENV,
  KNOWN_SERVICES,
  setSecret,
  getSecret,
  getResolvedSecret,
  deleteSecret,
  describeService,
  describeSecrets,
  recordTestResult,
};
