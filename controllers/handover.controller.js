const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const handoverService = require("../services/handover.service");

// Batch 5 (Handover). Authorization lives in
// routes/adminHandover.routes.js (see the role matrix there):
// demo-status + wipe-demo are Owner-only; status is admin+manager.

/** GET /api/v1/admin/handover/demo-status — demo vs total counts. */
exports.getDemoStatus = catchAsync(async (req, res) => {
  const { demoProducts, totalProducts } =
    await handoverService.getDemoStatus();
  res.status(200).json({
    status: "success",
    data: { demoProducts, totalProducts },
  });
});

/**
 * POST /api/v1/admin/handover/wipe-demo — body { confirm: "WIPE" }.
 * Hard-deletes the seed/demo products and pulls them from carts and
 * wishlists. Orders and customers are untouched.
 */
exports.wipeDemo = catchAsync(async (req, res) => {
  const confirm = req.body ? req.body.confirm : undefined;
  if (confirm !== "WIPE") {
    throw new AppError(
      'Confirmation required: send { "confirm": "WIPE" } to delete all demo products',
      400,
    );
  }
  const { deleted } = await handoverService.wipeDemoProducts(
    req.user,
    req.ip,
  );
  res.status(200).json({
    status: "success",
    data: { deleted },
  });
});

/** GET /api/v1/admin/handover/status — readiness checklist. */
exports.getHandoverStatus = catchAsync(async (req, res) => {
  const status = await handoverService.getHandoverStatus();
  res.status(200).json({
    status: "success",
    data: status,
  });
});
