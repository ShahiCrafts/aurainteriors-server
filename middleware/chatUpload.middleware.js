const multer = require("multer");
const nosqlSanitize = require("./nosqlSanitize.middleware");
const ChatService = require("../services/chatService");
const { actorKey } = require("../services/chatUpload.service");
const { MAX_ATTACHMENT_BYTES, MIME_TYPES } = require("../utils/chatAttachmentPolicy");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
exports.authorizeUpload = catchAsync(async (req, res, next) => {
  const guest = req.query.guestSessionId;
  if (!/^[a-f0-9]{24}$/i.test(req.params.id) ||
      !await ChatService.authorizeChat(req.params.id, req.user?._id, req.user?.role || "customer", guest)) {
    return next(new AppError("Chat not found or access denied", 403));
  }
  req.attachmentActor = actorKey(req.user?._id, guest);
  next();
});
const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1, fields: 0 },
  fileFilter: (_req, file, cb) => {
    // One decision, stated once (B-07): pass either an error or an
    // accept flag, not a redundant pair computed twice.
    if (MIME_TYPES.includes(file.mimetype)) return cb(null, true);
    return cb(new AppError("Unsupported attachment type", 400), false);
  },
}).single("file");
exports.receiveAttachment = (req, res, next) => receive(req, res, error => {
  if (error) return next(new AppError(error.code === "LIMIT_FILE_SIZE" ? "Attachments must be at most 10 MB" : "Invalid attachment upload", 400));
  // FA-61: multipart body exists only now - re-run the operator-key check.
  return nosqlSanitize(req, res, next);
});
