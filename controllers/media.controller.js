const catchAsync = require("../utils/catchAsync");
const mediaLibrary = require("../services/mediaLibrary.service");
const auditLog = require("../services/auditLog.service");

// Batch 5: media library endpoints. GET is admin + manager, DELETE
// is Owner-only (see the role matrix in
// routes/adminHandover.routes.js).

/** GET /api/v1/admin/media?cursor&search */
exports.listMedia = catchAsync(async (req, res) => {
  const { media, nextCursor } = await mediaLibrary.listMedia({
    cursor: req.query.cursor,
    search: req.query.search,
  });
  res.status(200).json({
    status: "success",
    results: media.length,
    data: { media, nextCursor },
  });
});

/** DELETE /api/v1/admin/media — body { publicId } or ?publicId=. */
exports.deleteMedia = catchAsync(async (req, res) => {
  const publicId =
    (req.body && req.body.publicId) || req.query.publicId;
  const result = await mediaLibrary.deleteMedia(publicId);

  await auditLog.record({
    actor: req.user ? req.user._id || req.user.id : undefined,
    action: "media.delete",
    targetType: "Media",
    targetId: typeof publicId === "string" ? publicId.trim() : publicId,
    ip: req.ip,
  });

  res.status(200).json({
    status: "success",
    data: { result },
  });
});
