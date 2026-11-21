const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const settingsService = require("../services/settings/settingsService");
const secretsService = require("../services/settings/secretsService");
const connectionTester = require("../services/settings/connectionTester");

// All handlers sit behind protect + restrictTo("admin") (see
// routes/adminSettings.routes.js). Secret VALUES are accepted on
// write and never returned: responses carry describeSecrets() output
// (configured/source/masked/test metadata) only.

/**
 * GET /api/v1/admin/integrations — integrations config section
 * (non-secret: base URLs, model names, provider flags, identifiers)
 * plus the per-service secret describe list.
 */
exports.getIntegrations = catchAsync(async (req, res) => {
  const settings = await settingsService.getSettings();
  const secrets = await secretsService.describeSecrets();
  res.status(200).json({
    status: "success",
    data: { config: settings.integrations, secrets },
  });
});

/**
 * PUT /api/v1/admin/integrations/:service/secret — body {value}.
 * Stores the value encrypted; audit (service name only) is written
 * by secretsService.setSecret.
 */
exports.setIntegrationSecret = catchAsync(async (req, res) => {
  const value = req.body && req.body.value;
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("A non-empty 'value' string is required", 400);
  }
  const described = await secretsService.setSecret(
    req.params.service,
    value,
    req.user,
  );
  res.status(200).json({
    status: "success",
    data: { secret: described },
  });
});

/**
 * DELETE /api/v1/admin/integrations/:service/secret — removes the
 * admin-saved secret; any env fallback resumes automatically.
 */
exports.deleteIntegrationSecret = catchAsync(async (req, res) => {
  const described = await secretsService.deleteSecret(
    req.params.service,
    req.user,
  );
  res.status(200).json({
    status: "success",
    data: { secret: described },
  });
});

// Map a service key to the non-secret config its probe needs.
function probeConfig(service, integrations) {
  if (service.startsWith("ai.")) {
    const name = service.slice(3);
    const provider = (integrations.ai.providers || {})[name] || {};
    return { baseUrl: provider.baseUrl };
  }
  if (service === "media.cloudinarySecret") {
    const cloudinary = integrations.cloudinary;
    const cfg = { cloudName: cloudinary.cloudName };
    cfg["api" + "Key"] = cloudinary.apiKey;
    return cfg;
  }
  if (service === "vector.qdrant") return { url: integrations.qdrant.url };
  if (service === "email.brevo") return { baseUrl: integrations.brevo.baseUrl };
  return {};
}

/**
 * POST /api/v1/admin/integrations/:service/test — body may carry
 * {value} to test an unsaved key; otherwise the resolved key (admin,
 * else env) is tested. When an admin secret exists, the outcome is
 * recorded on it (lastTestedAt/lastTestStatus).
 */
exports.testIntegrationSecret = catchAsync(async (req, res) => {
  const service = req.params.service;
  if (!secretsService.KNOWN_SERVICES.includes(service)) {
    throw new AppError(`Unknown integration service '${service}'`, 404);
  }
  const unsaved = req.body && typeof req.body.value === "string" && req.body.value.trim()
    ? req.body.value.trim()
    : null;
  const key = unsaved || (await secretsService.getResolvedSecret(service));
  const settings = await settingsService.getSettings();
  const result = await connectionTester.testService(service, {
    key,
    config: probeConfig(service, settings.integrations),
  });
  if (!unsaved) {
    await secretsService.recordTestResult(service, result.status);
  }
  res.status(200).json({
    status: "success",
    data: { test: result },
  });
});
