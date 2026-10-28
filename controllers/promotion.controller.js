const PromotionService = require("../services/promotionService");
const auditLog = require("../services/auditLog.service"); // VULN-004
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.getAllPromotions = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;

  const result = await PromotionService.getAllPromotions({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    status,
  });

  res.status(200).json({
    status: "success",
    data: {
      promotions: result.promotions,
      pagination: result.pagination,
    },
  });
});

exports.getPromotion = catchAsync(async (req, res, next) => {
  const promotion = await PromotionService.getPromotionById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { promotion },
  });
});

exports.createPromotion = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    shortDescription,
    targetAudience,
    scheduledAt,
    discount,
    actionUrl,
    imageUrl,
    priority,
    tags,
    expiresAt,
  } = req.body;

  const promotion = await PromotionService.createPromotion(
    {
      title,
      description,
      shortDescription,
      targetAudience,
      scheduledAt,
      discount,
      actionUrl,
      imageUrl,
      priority,
      tags,
      expiresAt,
    },
    req.user._id,
  );

  await auditLog.record({
    // VULN-004 (never throws)
    actor: req.user?._id,
    action: "promotion.create",
    targetType: "Promotion",
    targetId: promotion._id,
    after: { title: promotion.title, status: promotion.status },
    ip: req.ip,
  });

  res.status(201).json({
    status: "success",
    message: "Promotion campaign created successfully",
    data: { promotion },
  });
});

exports.updatePromotion = catchAsync(async (req, res, next) => {
  const promotion = await PromotionService.updatePromotion(
    req.params.id,
    req.body,
  );

  await auditLog.record({
    // VULN-004 (never throws; after-state only — this handler does not load the prior state)
    actor: req.user?._id,
    action: "promotion.update",
    targetType: "Promotion",
    targetId: promotion._id,
    after: { title: promotion.title, status: promotion.status },
    ip: req.ip,
  });

  res.status(200).json({
    status: "success",
    message: "Promotion updated successfully",
    data: { promotion },
  });
});

exports.sendPromotion = catchAsync(async (req, res, next) => {
  const result = await PromotionService.sendPromotion(req.params.id);

  // AR-04: queue mode answers 202 with the job id (poll
  // GET /api/v1/jobs/:id); inline keeps the existing 200 shape.
  if (result.queued) {
    return res.status(202).json({
      status: "success",
      message: result.message,
      data: { jobId: result.jobId, queued: true },
    });
  }

  res.status(200).json({
    status: "success",
    message: result.message,
    data: { metrics: result.metrics },
  });
});

exports.schedulePromotion = catchAsync(async (req, res, next) => {
  const { scheduledAt } = req.body;

  if (!scheduledAt) {
    return next(new AppError("scheduledAt is required", 400));
  }

  const promotion = await PromotionService.schedulePromotion(
    req.params.id,
    new Date(scheduledAt),
  );

  res.status(200).json({
    status: "success",
    message: `Promotion scheduled for ${new Date(scheduledAt).toISOString()}`,
    data: { promotion },
  });
});

exports.cancelPromotion = catchAsync(async (req, res, next) => {
  const promotion = await PromotionService.cancelPromotion(req.params.id);

  res.status(200).json({
    status: "success",
    message: "Promotion cancelled successfully",
    data: { promotion },
  });
});

exports.deletePromotion = catchAsync(async (req, res, next) => {
  await PromotionService.deletePromotion(req.params.id);

  await auditLog.record({
    // VULN-004 (never throws)
    actor: req.user?._id,
    action: "promotion.delete",
    targetType: "Promotion",
    targetId: req.params.id,
    ip: req.ip,
  });

  res.status(200).json({
    status: "success",
    message: "Promotion deleted successfully",
  });
});

exports.getPromotionAnalytics = catchAsync(async (req, res, next) => {
  const analytics = await PromotionService.getPromotionAnalytics(req.params.id);

  res.status(200).json({
    status: "success",
    data: { analytics },
  });
});

exports.trackEngagement = catchAsync(async (req, res, next) => {
  const { promotionId, action } = req.body;

  if (!promotionId || !action) {
    return next(new AppError("promotionId and action are required", 400));
  }

  const validActions = ["delivered", "read", "clicked"];
  if (!validActions.includes(action)) {
    return next(
      new AppError(
        `Invalid action. Must be one of: ${validActions.join(", ")}`,
        400,
      ),
    );
  }

  await PromotionService.trackEngagement(promotionId, action, req.user?._id);

  res.status(200).json({
    status: "success",
    message: "Engagement tracked",
  });
});

exports.previewPromotion = catchAsync(async (req, res, next) => {
  const { targetAudience } = req.body;

  if (!targetAudience) {
    return next(new AppError("targetAudience is required", 400));
  }

  const targetUserIds = await PromotionService.getTargetUsers(targetAudience);

  res.status(200).json({
    status: "success",
    data: {
      targetCount: targetUserIds.length,
      audienceType: targetAudience.type,
    },
  });
});

module.exports = exports;
