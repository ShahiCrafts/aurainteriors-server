const catchAsync = require("../utils/catchAsync");
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
