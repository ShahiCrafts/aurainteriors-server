const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const settingsService = require("../services/settings/settingsService");

// PUBLIC

/**
 * GET /api/v1/settings/public — anonymous, public-safe projection
 * (see settingsService.getPublicSettings for the allowlist). Cache
 * headers are set by the app-level public-cache middleware in app.js
 * (same pattern as the anonymous catalog GETs).
 */
exports.getPublicSettings = catchAsync(async (req, res) => {
  const settings = await settingsService.getPublicSettings();
  res.status(200).json({
    status: "success",
    data: { settings },
  });
});

// ADMIN

/**
 * GET /api/v1/admin/settings — full settings, all sections
 * (integrations carries non-secret config only; secret values are
 * never part of settings data).
 */
exports.getAdminSettings = catchAsync(async (req, res) => {
  const settings = await settingsService.getSettings();
  res.status(200).json({
    status: "success",
    data: { settings },
  });
});

/**
 * PUT /api/v1/admin/settings/:section — validated per-section update;
 * validation + audit live in settingsService.updateSection.
 */
exports.updateSettingsSection = catchAsync(async (req, res) => {
  const section = await settingsService.updateSection(
    req.params.section,
    req.body || {},
    req.user,
    req.ip,
  );
  res.status(200).json({
    status: "success",
    data: { section: req.params.section, settings: section },
  });
});

/**
 * POST /api/v1/admin/settings/reset — Batch 3d. Body { section? }:
 * resets one section, or every section when omitted, back to
 * DEFAULT_SETTINGS (the stored overrides are deleted; reads merge
 * over defaults). Returns the full settings after the reset.
 */
exports.resetSettings = catchAsync(async (req, res) => {
  const section = req.body ? req.body.section : undefined;
  const settings = await settingsService.resetSections(
    section,
    req.user,
    req.ip,
  );
  res.status(200).json({
    status: "success",
    data: { settings },
  });
});

/**
 * POST /api/v1/admin/settings/test-email — Batch 4. Body
 * { template, to? }: renders the chosen notifications template with
 * sample data and sends it via the existing Brevo path (recipient
 * defaults to the logged-in admin's own email). Template/recipient
 * validation lives in email.service.sendTemplateTestEmail (400s);
 * a delivery failure is surfaced honestly as a 502.
 */
exports.sendTestEmail = catchAsync(async (req, res) => {
  const emailService = require("../services/email.service");
  const template = req.body ? req.body.template : undefined;
  const to =
    req.body && typeof req.body.to === "string" && req.body.to.trim()
      ? req.body.to.trim()
      : req.user && req.user.email;
  try {
    await emailService.sendTemplateTestEmail(template, to);
  } catch (err) {
    if (err && err.statusCode) throw err;
    throw new AppError(
      `Test email could not be sent: ${err.message || "delivery failed"}`,
      502,
    );
  }
  res.status(200).json({
    status: "success",
    data: { sent: true, template, to },
  });
});

/**
 * POST /api/v1/admin/settings/image — Batch 3a. Single-image upload
 * for settings fields (logo, favicon, OG image, hero slides). This
 * does NOT add an upload backend: the route reuses the existing
 * category-image pipeline from middleware/upload.middleware.js
 * (multer memory storage -> SVG policy/re-encode -> Cloudinary),
 * which leaves the hosted URL on req.file.cloudinaryUrl.
 */
exports.uploadSettingsImage = catchAsync(async (req, res) => {
  if (!req.file || !req.file.cloudinaryUrl) {
    throw new AppError("Please upload an image file", 400);
  }
  res.status(201).json({
    status: "success",
    data: { url: req.file.cloudinaryUrl },
  });
});
