"use strict";

// Batch 1 (Settings + Secrets backend): site-settings service.
//
// Reads merge the stored singleton document over DEFAULT_SETTINGS
// (services/settings/defaults.js) so the site always sees a complete
// settings object even when nothing was ever saved — and reading
// never creates a document. Writes are per-section, validated against
// the defaults shape (unknown sections rejected, unknown keys
// stripped, types must match), and audit-logged with METADATA ONLY
// (section name + changed key paths — never values, so a settings
// snapshot can never leak into the audit trail).

const AppError = require("../../utils/AppError");
const { DEFAULT_SETTINGS, SECTIONS } = require("./defaults");

const SINGLETON_KEY = "site";
const MAX_STRING = 2000;
// Batch 3a: the `pages` section holds long-form copy (About, legal
// pages) — 2000 chars is too small for a privacy policy.
const MAX_PAGE_STRING = 20000;
const MAX_ARRAY_ITEMS = 50;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lazy model require (the codebase's auditLog.service.js pattern):
// controllers load services at module scope and several test harnesses
// stub models — an eager require would crash those loads.
function getModel() {
  return require("../../models/siteSettings.model");
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(base, over) {
  if (!isPlainObject(base) || !isPlainObject(over)) {
    return over === undefined ? base : over;
  }
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = k in base ? deepMerge(base[k], v) : v;
  }
  return out;
}

// Strip anything the defaults don't know about, at any depth, so a
// stored document (possibly written by an older/newer build) can
// never smuggle unexpected fields into API responses.
function pruneToShape(shape, value) {
  if (!isPlainObject(shape) || !isPlainObject(value)) return value;
  const out = {};
  for (const k of Object.keys(shape)) {
    if (k in value) out[k] = pruneToShape(shape[k], value[k]);
  }
  return out;
}

async function getSettings() {
  const SiteSettings = getModel();
  const doc = await SiteSettings.findOne({ key: SINGLETON_KEY }).lean();
  const stored = doc && isPlainObject(doc.data) ? doc.data : {};
  const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), stored);
  return pruneToShape(DEFAULT_SETTINGS, merged);
}

// ONLY public-safe fields: what the anonymous storefront may see.
// Never add notifications (internal email identity), integrations
// (service config), or anything secret-adjacent here — secrets live
// in a different model entirely and are not part of settings data.
async function getPublicSettings() {
  const s = await getSettings();
  return {
    identity: s.identity,
    theme: s.theme,
    contact: s.contact,
    seo: {
      siteUrl: s.seo.siteUrl,
      defaultTitle: s.seo.defaultTitle,
      metaDescription: s.seo.metaDescription,
      ogImage: s.seo.ogImage,
      twitterCard: s.seo.twitterCard,
      googleAnalyticsId: s.seo.googleAnalyticsId,
      metaPixelId: s.seo.metaPixelId,
      tiktokPixelId: s.seo.tiktokPixelId,
      // Batch 3a: a Google Maps browser key is exposed to the
      // storefront BY DESIGN (it ships in page HTML wherever Maps is
      // embedded and is protected by referrer restrictions in Google
      // Cloud Console, not by secrecy) — unlike the other seo fields
      // above the line (searchConsoleVerification stays admin-only).
      googleMapsKey: s.seo.googleMapsKey,
    },
    homepage: s.homepage,
    // Batch 3a: public content pages (About/Privacy/Terms/Shipping
    // copy + FAQ) — public content by definition.
    pages: s.pages,
    commerce: {
      currency: s.commerce.currency,
      locale: s.commerce.locale,
      freeShippingThreshold: s.commerce.freeShippingThreshold,
    },
    chat: {
      enabled: s.chat.enabled,
      aiAssistantEnabled: s.chat.aiAssistantEnabled,
      welcomeMessage: s.chat.welcomeMessage,
    },
    maintenance: {
      enabled: s.maintenance.enabled,
      message: s.maintenance.message,
    },
  };
}

function fail(message) {
  throw new AppError(message, 400);
}

function looksLikeUrlKey(path) {
  return /(^|\.)(siteUrl|ogImage|mapUrl|logoUrl|logoDarkUrl|faviconUrl|baseUrl|url)$/.test(
    path,
  );
}

function validateValue(path, defaultValue, value, changedKeys) {
  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(value)) fail(`Settings field '${path}' must be an array`);
    if (value.length > MAX_ARRAY_ITEMS) {
      fail(`Settings field '${path}' may contain at most ${MAX_ARRAY_ITEMS} items`);
    }
    // Batch 3a: arrays of objects (homepage.heroSlides, pages.faq) —
    // each item is validated against the first default item's shape
    // (unknown keys stripped, types checked, per-field rules apply).
    if (defaultValue.length > 0 && isPlainObject(defaultValue[0])) {
      const itemShape = defaultValue[0];
      const items = value.map((item) => {
        if (!isPlainObject(item)) {
          fail(`Settings field '${path}' must contain only objects`);
        }
        return validatePatch(path, itemShape, item, changedKeys);
      });
      changedKeys.push(path);
      return items;
    }
    for (const item of value) {
      if (typeof item !== "string" || !item) {
        fail(`Settings field '${path}' must contain only non-empty strings`);
      }
    }
    changedKeys.push(path);
    return [...value];
  }
  if (isPlainObject(defaultValue)) {
    if (!isPlainObject(value)) fail(`Settings field '${path}' must be an object`);
    return validatePatch(path, defaultValue, value, changedKeys);
  }
  if (typeof defaultValue === "string") {
    if (typeof value !== "string") fail(`Settings field '${path}' must be a string`);
    const maxString = path.startsWith("pages.") ? MAX_PAGE_STRING : MAX_STRING;
    if (value.length > maxString) {
      fail(`Settings field '${path}' exceeds ${maxString} characters`);
    }
    if (path.startsWith("theme.") && path.endsWith("Color") && value !== "") {
      if (!HEX_COLOR.test(value)) {
        fail(`Settings field '${path}' must be a hex colour like #F27318`);
      }
    }
    if (looksLikeUrlKey(path) && value !== "") {
      const ok =
        value.startsWith("/") ||
        (() => {
          try {
            const u = new URL(value);
            return u.protocol === "http:" || u.protocol === "https:";
          } catch {
            return false;
          }
        })();
      if (!ok) fail(`Settings field '${path}' must be a URL or site-relative path`);
    }
    if (
      (path === "contact.email" ||
        path === "notifications.supportEmail" ||
        path === "notifications.emailFrom") &&
      value !== "" &&
      !EMAIL.test(value)
    ) {
      fail(`Settings field '${path}' must be an email address`);
    }
    changedKeys.push(path);
    return value;
  }
  if (typeof defaultValue === "number") {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      fail(`Settings field '${path}' must be a non-negative number`);
    }
    changedKeys.push(path);
    return value;
  }
  if (typeof defaultValue === "boolean") {
    if (typeof value !== "boolean") {
      fail(`Settings field '${path}' must be true or false`);
    }
    changedKeys.push(path);
    return value;
  }
  return value;
}

// Validate a patch against the defaults shape for one object level:
// unknown keys are STRIPPED (not rejected) so admin clients can send
// a whole section object without breaking on fields from other
// versions; type/format violations are rejected with AppError 400.
function validatePatch(prefix, shape, patch, changedKeys) {
  const out = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in shape)) continue;
    out[k] = validateValue(prefix ? `${prefix}.${k}` : k, shape[k], v, changedKeys);
  }
  return out;
}

function validateThemeSection(validatedSection) {
  // Batch 3a: buttonRadius is a token, not free text — the shape
  // check above can't express the enum.
  if (
    validatedSection.buttonRadius !== undefined &&
    !["rounded", "square", "pill"].includes(validatedSection.buttonRadius)
  ) {
    fail(
      "Settings field 'theme.buttonRadius' must be one of: rounded, square, pill",
    );
  }
}

function validateIntegrationsSection(validatedSection) {
  // fallbackOrder may only name known providers (the defaults shape
  // check above can't express membership).
  const order = validatedSection.ai && validatedSection.ai.fallbackOrder;
  if (order) {
    const known = Object.keys(DEFAULT_SETTINGS.integrations.ai.providers);
    for (const name of order) {
      if (!known.includes(name)) {
        fail(`Settings field 'integrations.ai.fallbackOrder' contains unknown provider '${name}'`);
      }
    }
    validatedSection.ai.fallbackOrder = [...new Set(order)];
  }
}

async function updateSection(section, patch, adminUser, ip) {
  if (!SECTIONS.includes(section)) {
    throw new AppError(`Unknown settings section '${section}'`, 404);
  }
  if (!isPlainObject(patch)) {
    throw new AppError("Settings update must be a JSON object", 400);
  }
  const changedKeys = [];
  const validated = validatePatch(section, DEFAULT_SETTINGS[section], patch, changedKeys);
  if (section === "integrations") validateIntegrationsSection(validated);
  if (section === "theme") validateThemeSection(validated);
  if (changedKeys.length === 0) {
    throw new AppError("No recognised settings fields in the update", 400);
  }

  const SiteSettings = getModel();
  const existing = await SiteSettings.findOne({ key: SINGLETON_KEY });
  const storedData = existing && isPlainObject(existing.data) ? existing.data : {};
  const nextData = {
    ...storedData,
    [section]: deepMerge(
      isPlainObject(storedData[section]) ? storedData[section] : {},
      validated,
    ),
  };
  const actorId = adminUser ? adminUser._id || adminUser.id : undefined;
  if (existing) {
    existing.data = nextData;
    existing.updatedBy = actorId;
    await existing.save();
  } else {
    await SiteSettings.create({
      key: SINGLETON_KEY,
      data: nextData,
      updatedBy: actorId,
    });
  }

  // Metadata only — section + key paths, never values.
  const auditLog = require("../auditLog.service");
  await auditLog.record({
    actor: actorId,
    action: "settings.update",
    targetType: "SiteSettings",
    targetId: section,
    after: { section, changedKeys },
    ip,
  });

  const all = await getSettings();
  return all[section];
}

// Batch 2 helpers (additive): consumers that rewire env-based config
// to Settings must distinguish "an admin actually saved this" from
// Batch-1 defaults — getSettings() merges defaults, so it cannot.
// getRawStoredData() returns the stored document's data object (or
// null when nothing was ever saved); isDbReady() lets consumers skip
// DB reads entirely when mongoose is not connected (tests, boot), so
// a settings lookup can never hang on mongoose command buffering.
async function getRawStoredData() {
  const SiteSettings = getModel();
  const doc = await SiteSettings.findOne({ key: SINGLETON_KEY }).lean();
  return doc && isPlainObject(doc.data) ? doc.data : null;
}

function isDbReady() {
  try {
    return require("mongoose").connection.readyState === 1;
  } catch {
    return false;
  }
}

module.exports = {
  getSettings,
  getPublicSettings,
  updateSection,
  getRawStoredData,
  isDbReady,
  // Exported for tests / Batch 2 reuse.
  _internal: { deepMerge, pruneToShape, validatePatch, SINGLETON_KEY },
};
