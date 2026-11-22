const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const settingsService = require("../services/settings/settingsService");
const auditLog = require("../services/auditLog.service");
const { SECTIONS } = require("../services/settings/defaults");

// Batch 5: CSV exports + settings backup/restore. All routes are
// Owner-only (see the role matrix in
// routes/adminHandover.routes.js). Exports read lean rows only —
// the models' select:false fields (password, tokens, OTP) never
// leave the database on these paths.

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(header, rows) {
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`,
  );
  res.status(200).send(csv);
}

/** GET /api/v1/admin/export/products.csv */
exports.exportProductsCsv = catchAsync(async (req, res) => {
  const products = await Product.find({ deletedAt: null })
    .populate("category", "name")
    .sort({ name: 1 })
    .lean();
  const rows = products.map((product) => {
    const category =
      product.category && typeof product.category === "object"
        ? product.category.name || ""
        : product.category || "";
    return [
      product.sku || "",
      product.name || "",
      category,
      product.price,
      product.stock,
      product.status || "",
    ];
  });
  sendCsv(
    res,
    "products.csv",
    toCsv(["sku", "name", "category", "price", "stock", "status"], rows),
  );
});

/** GET /api/v1/admin/export/orders.csv */
exports.exportOrdersCsv = catchAsync(async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "email")
    .sort({ createdAt: -1 })
    .lean();
  const rows = orders.map((order) => {
    const customerEmail =
      (order.guestInfo && order.guestInfo.email) ||
      (order.user && typeof order.user === "object"
        ? order.user.email
        : "") ||
      "";
    return [
      order.orderId || "",
      order.createdAt ? new Date(order.createdAt).toISOString() : "",
      customerEmail,
      Array.isArray(order.items) ? order.items.length : 0,
      order.total,
      order.orderStatus || "",
      order.paymentStatus || "",
    ];
  });
  sendCsv(
    res,
    "orders.csv",
    toCsv(
      [
        "orderId",
        "date",
        "customerEmail",
        "itemsCount",
        "total",
        "status",
        "paymentStatus",
      ],
      rows,
    ),
  );
});

/** GET /api/v1/admin/export/customers.csv */
exports.exportCustomersCsv = catchAsync(async (req, res) => {
  const customers = await User.find({ role: "customer", deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();
  const rows = customers.map((customer) => [
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
    customer.email || "",
    customer.phone || "",
    customer.createdAt ? new Date(customer.createdAt).toISOString() : "",
  ]);
  sendCsv(
    res,
    "customers.csv",
    toCsv(["name", "email", "phone", "joined"], rows),
  );
});

/**
 * GET /api/v1/admin/settings/backup — the full settings object plus
 * the integrations config section. Secrets are NEVER part of a
 * backup: the payload carries the literal marker "excluded" and no
 * secret value (admin-stored or env) is read on this path.
 */
exports.getSettingsBackup = catchAsync(async (req, res) => {
  const settings = await settingsService.getSettings();
  res.status(200).json({
    status: "success",
    data: {
      backup: {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        integrationsConfig: settings.integrations,
        secrets: "excluded",
      },
    },
  });
});

/**
 * POST /api/v1/admin/settings/restore — body { backup }.
 * Applies each known settings section from backup.settings through
 * settingsService.updateSection (so validation + per-section audit
 * apply unchanged); sections that fail validation are reported in
 * skippedSections with the reason. backup.secrets is explicitly
 * IGNORED — a backup is never a secret source. When
 * backup.settings.integrations is absent but the duplicated
 * backup.integrationsConfig is present, it is applied as the
 * integrations section.
 */
exports.restoreSettings = catchAsync(async (req, res) => {
  const backup = req.body ? req.body.backup : undefined;
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new AppError("A 'backup' object is required", 400);
  }

  const settingsPayload =
    backup.settings &&
    typeof backup.settings === "object" &&
    !Array.isArray(backup.settings)
      ? backup.settings
      : {};

  const appliedSections = [];
  const skippedSections = [];

  const applySection = async (section, value) => {
    try {
      await settingsService.updateSection(section, value, req.user, req.ip);
      appliedSections.push(section);
    } catch (err) {
      skippedSections.push({
        section,
        reason: err && err.message ? err.message : "Validation failed",
      });
    }
  };

  for (const section of Object.keys(settingsPayload)) {
    if (!SECTIONS.includes(section)) {
      skippedSections.push({ section, reason: "Unknown settings section" });
      continue;
    }
    await applySection(section, settingsPayload[section]);
  }

  if (
    !("integrations" in settingsPayload) &&
    backup.integrationsConfig &&
    typeof backup.integrationsConfig === "object" &&
    !Array.isArray(backup.integrationsConfig)
  ) {
    await applySection("integrations", backup.integrationsConfig);
  }

  await auditLog.record({
    actor: req.user ? req.user._id || req.user.id : undefined,
    action: "settings.restore",
    targetType: "SiteSettings",
    targetId: "backup",
    after: { appliedSections },
    ip: req.ip,
  });

  res.status(200).json({
    status: "success",
    data: { appliedSections, skippedSections },
  });
});
