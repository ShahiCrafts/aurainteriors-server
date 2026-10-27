const multer = require("multer");
const nosqlSanitize = require("./nosqlSanitize.middleware");
// FA-61: multipart bodies only exist AFTER multer parses them, so each
// upload middleware re-runs the operator-key check on the parsed body.
const withSanitize = (mw) => (req, res, next) => mw(req, res, (err) => (err ? next(err) : nosqlSanitize(req, res, next)));
const sharp = require("sharp");
const path = require("path");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");
const { detectImageType, detectDocumentType, matchesModelFile, isDocxBuffer } = require("../utils/fileSniff");
const { mapWithConcurrency } = require("../utils/promisePool");

// AR-12: per-file sharp + Cloudinary pipelines fan out per request.
// At most this many file pipelines run concurrently for one handler
// invocation (code constant, default-on, behavior-preserving: the
// same files are processed to the same results, just bounded).
const UPLOAD_PIPELINE_CONCURRENCY = 3;

// AR-12: aggregate per-request byte budget. When the request's files
// total more than the budget, the request is rejected with a 400
// BEFORE any processing runs. VULN-006: the registry default is now
// 50 MB (52428800), so a budget applies even when the env var is
// unset; only a non-positive resolved value disables enforcement.
const getUploadMaxTotalBytes = (env = process.env) => {
  const n = Number(require("../config/appConfig").getInt("UPLOAD_MAX_TOTAL_BYTES", env));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const totalUploadBytes = (files) =>
  (files || []).reduce((sum, file) => sum + (file?.buffer?.length ?? file?.size ?? 0), 0);
const uploadTotalBytesError = (files) => {
  const max = getUploadMaxTotalBytes();
  if (max === null) return null;
  const total = totalUploadBytes(files);
  return total > max
    ? new AppError(`Uploaded files total ${total} bytes, which exceeds the per-request limit of ${max} bytes`, 400)
    : null;
};

// Content check (B-01): the MIME type a client claims proves nothing.
// Returns an AppError when the bytes are not any recognised image type,
// or null when they are. Which image formats a path accepts stays a
// policy question (ND-3); this only stops non-images wearing an
// image/* label from being processed or stored.
const imageContentError = (file) =>
  file && file.buffer && !detectImageType(file.buffer)
    ? new AppError("Uploaded file is not a valid image", 400)
    : null;

const generatePublicId = (prefix) => {
  const uniqueId = crypto.randomBytes(8).toString("hex");
  return `${prefix}-${Date.now()}-${uniqueId}`;
};

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Please upload only images", 400), false);
  }
};

const modelFileFilter = (req, file, cb) => {
  if (file.fieldname === "images") {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new AppError("Please upload only images for the images field", 400), false);
    }
  } else if (file.fieldname === "modelFiles") {
    const allowedExtensions = [".glb", ".gltf", ".usdz"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError("Please upload only .glb, .gltf, or .usdz files for 3D models", 400), false);
    }
  } else {
    // Fail closed: a field this upload does not declare gets no file.
    cb(new AppError(`Unexpected upload field: ${file.fieldname}`, 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  // fileSize plus count limits (B-05): memory storage buffers whole
  // requests, so unbounded field/part counts are a memory DoS vector.
  // `upload` serves single-image routes and the 10-image product array.
  // FA-50: per-file 10MB and tighter part/field counts - the aggregate
  // a single request can buffer is now ~100MB worst case, not ~200MB.
  limits: { fileSize: 10 * 1024 * 1024, files: 10, fields: 20, parts: 25 },
});

const productUpload = multer({
  storage: multerStorage,
  fileFilter: modelFileFilter,
  // FA-50: 25MB per file (3D models included), 15 files max, tight
  // part/field counts - worst-case buffered aggregate ~375MB -> ~150MB
  // for the counts the client actually sends (10 images + 5 models).
  limits: { fileSize: 25 * 1024 * 1024, files: 15, fields: 30, parts: 40 },
});

exports.uploadAvatar = withSanitize( upload.single("avatar"));

exports.resizeAvatar = async (req, res, next) => {
  const badImage = imageContentError(req.file);
  if (badImage) return next(badImage);
  try {
    if (!req.file) return next();

    const resizedBuffer = await sharp(req.file.buffer)
      .resize(400, 400, { fit: "cover" })
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await uploadToCloudinary(resizedBuffer, {
      folder: "aura/avatars",
      public_id: generatePublicId(`user-${req.user.id}`),
      resource_type: "image",
    });

    req.file.cloudinaryUrl = result.secure_url;
    req.file.cloudinaryPublicId = result.public_id;

    next();
  } catch (error) {
    console.error("Avatar upload error:", error);
    next(new AppError("Error processing image. Please try again.", 500));
  }
};

exports.uploadCategoryImage = withSanitize( upload.single("image"));

exports.uploadBlogImage = withSanitize( upload.single("featuredImage"));

exports.resizeBlogImage = async (req, res, next) => {
  const badImage = imageContentError(req.file);
  if (badImage) return next(badImage);
  try {
    if (!req.file) return next();

    const resizedBuffer = await sharp(req.file.buffer)
      .resize(1200, 630, { fit: "cover" })
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await uploadToCloudinary(resizedBuffer, {
      folder: "aura/blogs",
      public_id: generatePublicId("blog"),
      resource_type: "image",
    });

    req.file.cloudinaryUrl = result.secure_url;
    req.file.cloudinaryPublicId = result.public_id;

    next();
  } catch (error) {
    console.error("Blog image upload error:", error);
    next(new AppError("Error processing image. Please try again.", 500));
  }
};

exports.resizeCategoryImage = async (req, res, next) => {
  const badImage = imageContentError(req.file);
  if (badImage) return next(badImage);
  try {
    if (!req.file) return next();

    // FA-21: script-bearing SVG must not be stored and CDN-served as
    // active content. CATEGORY_SVG_POLICY (owner-approved 2026-10-23):
    //   reencode (default) - rasterize to PNG via sharp before upload
    //   reject             - refuse SVG uploads on this path
    // VULN-002: there is no third branch. The registry now validates
    // the value as an enum at boot, and ANY value that is not
    // "reencode" is rejected here — the policy fails CLOSED, so a
    // raw script-capable SVG can never fall through to Cloudinary
    // (the legacy "allow: store as-is" behaviour is removed).
    let uploadBuffer = req.file.buffer;
    if (detectImageType(req.file.buffer) === "svg") {
      const policy = String(require("../config/appConfig").getString("CATEGORY_SVG_POLICY") || "reencode").toLowerCase();
      if (policy === "reencode") {
        uploadBuffer = await sharp(req.file.buffer).png().toBuffer();
      } else {
        return next(new AppError("SVG images are not accepted for categories", 400));
      }
    }

    const result = await uploadToCloudinary(uploadBuffer, {
      folder: "aura/categories",
      public_id: generatePublicId("category"),
      resource_type: "image",
    });

    req.file.cloudinaryUrl = result.secure_url;
    req.file.cloudinaryPublicId = result.public_id;

    next();
  } catch (error) {
    console.error("Category image upload error:", error);
    next(new AppError("Error processing image. Please try again.", 500));
  }
};

exports.uploadProductImages = withSanitize( upload.array("images", 10));

exports.uploadProductFiles = withSanitize(productUpload.fields([
  { name: "images", maxCount: 10 },
  { name: "modelFiles", maxCount: 5 },
]));

// AR-31(d): the ONE shared per-file product-image pipeline.
// resizeProductImages and processProductFiles previously carried
// byte-identical copies of this block (resize -> jpeg -> upload ->
// attach results). Output sizes/format, the Cloudinary folder and
// public-id shape, the compression log line and the file mutations
// are exactly as before; the handlers keep their own budget/content
// checks, AR-12 concurrency wiring and error wrapping.
const processProductImageFile = async (file) => {
  const originalSize = file.buffer.length;

  // OPTIMIZATION: Product image compression (Phase 2)
  // Resize to max 1200x1200 and compress to 80% quality
  // - Imperceptible quality loss for product images
  // - 60-85% size reduction vs original
  const resizedBuffer = await sharp(file.buffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .toFormat("jpeg")
    .jpeg({ quality: 80, progressive: true }) // Changed from 90 to 80, added progressive
    .toBuffer();

  const compressedSize = resizedBuffer.length;
  const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  console.log(
    `[Product Image Compression] ${file.originalname}: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${reduction}% reduction)`
  );

  const result = await uploadToCloudinary(resizedBuffer, {
    folder: "aura/products",
    public_id: generatePublicId("product"),
    resource_type: "image",
  });

  file.cloudinaryUrl = result.secure_url;
  file.cloudinaryPublicId = result.public_id;
};

exports.resizeProductImages = async (req, res, next) => {
  const overBudget = uploadTotalBytesError(Array.isArray(req.files) ? req.files : []);
  if (overBudget) return next(overBudget);
  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      const badImage = imageContentError(file);
      if (badImage) return next(badImage);
    }
  }
  try {
    if (!req.files || req.files.length === 0) return next();

    await mapWithConcurrency(req.files, UPLOAD_PIPELINE_CONCURRENCY, processProductImageFile);

    next();
  } catch (error) {
    console.error("Product images upload error:", error);
    next(new AppError("Error processing images. Please try again.", 500));
  }
};

exports.processProductFiles = async (req, res, next) => {
  // AR-12: the aggregate budget spans BOTH file groups of this request.
  const overBudget = uploadTotalBytesError([...(req.files?.images || []), ...(req.files?.modelFiles || [])]);
  if (overBudget) return next(overBudget);
  if (req.files?.images) {
    for (const file of req.files.images) {
      const badImage = imageContentError(file);
      if (badImage) return next(badImage);
    }
  }
  if (req.files?.modelFiles) {
    // 3D models: the extension is a claim too - verify the content
    // matches it (glTF magic for .glb, zip magic for .usdz, JSON with
    // an asset header for .gltf) before anything is stored (B-03).
    for (const file of req.files.modelFiles) {
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      if (!matchesModelFile(file.buffer, ext)) {
        return next(new AppError(`File ${file.originalname} is not a valid .${ext} model`, 400));
      }
    }
  }
  try {
    if (req.files?.images && req.files.images.length > 0) {
      // AR-31(d): shared per-file pipeline (see processProductImageFile).
      await mapWithConcurrency(req.files.images, UPLOAD_PIPELINE_CONCURRENCY, processProductImageFile);
    }

    if (req.files?.modelFiles && req.files.modelFiles.length > 0) {
      await mapWithConcurrency(
        req.files.modelFiles, UPLOAD_PIPELINE_CONCURRENCY, async (file) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const cleanExt = ext.replace(".", "");
          const publicId = `${generatePublicId("model")}.${cleanExt}`;

          const result = await uploadToCloudinary(file.buffer, {
            folder: "aura/models",
            public_id: publicId,
            resource_type: "raw",
          });

          file.cloudinaryUrl = result.secure_url;
          file.cloudinaryPublicId = result.public_id;
          file.fileSize = file.size;
          file.format = cleanExt;

          if (cleanExt === "usdz") {
            file.platform = "ios";
          } else if (cleanExt === "glb" || cleanExt === "gltf") {
            file.platform = "android";
          } else {
            file.platform = "universal";
          }
        }
      );
    }

    next();
  } catch (error) {
    console.error("Error processing product files:", error);
    next(new AppError("Error processing files. Please try again.", 500));
  }
};

exports.deleteFile = async (publicId, resourceType = "image") => {
  return deleteFromCloudinary(publicId, resourceType);
};

exports.deleteFiles = async (publicIds, resourceType = "image") => {
  // AR-12: deletes fan out to Cloudinary too — bound them with the
  // same pool so a long id list cannot burst unbounded calls.
  await mapWithConcurrency(publicIds, UPLOAD_PIPELINE_CONCURRENCY, (id) => deleteFromCloudinary(id, resourceType));
};

exports.UPLOAD_PIPELINE_CONCURRENCY = UPLOAD_PIPELINE_CONCURRENCY;
exports.getUploadMaxTotalBytes = getUploadMaxTotalBytes;

const chatAttachmentFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  const allowedDocTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/json",
  ];

  if (allowedImageTypes.includes(file.mimetype) || allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Only images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JSON) are allowed",
        400
      ),
      false
    );
  }
};

// FA-24: the legacy chat attachment pipeline that used to live here
// (uploadChatAttachment / processChatAttachment) performed NO content
// verification - declared MIME only - and was not wired to any route.
// It has been deleted so it cannot be re-enabled by accident; the live
// pipeline is middleware/chatUpload.middleware.js + chatUpload.service,
// which verifies content with fileSniff/chatAttachmentPolicy.

const documentFilter = (req, file, cb) => {
  const allowedDocTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
  ];

  // The MIME type decides. Previously a `.csv`/`.txt` filename let ANY
  // MIME type through, and content was never checked against the claim
  // (that check now happens in processDocumentFile).
  if (allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Only PDF, DOCX, TXT, and CSV documents are allowed",
        400
      ),
      false
    );
  }
};

const documentUpload = multer({
  storage: multerStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 20, parts: 25 },
});

exports.uploadDocumentFile = withSanitize( documentUpload.single("file"));

exports.processDocumentFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError("Please upload a file", 400));
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const cleanExt = ext.replace(".", "");
    // FA-22: the extension is allowlisted BEFORE the content check -
    // previously any text-bytes file (e.g. .html) was stored under its
    // original extension in the Cloudinary public_id.
    if (!["pdf", "docx", "txt", "csv"].includes(cleanExt)) {
      return next(new AppError("Only .pdf, .docx, .txt and .csv documents are accepted", 400));
    }
    // The stored fileType is derived from the DETECTED content, so first
    // prove the bytes match it: PDF bytes named .docx (or a binary named
    // .txt) are rejected instead of reaching the wrong ingestion parser.
    const detected = detectDocumentType(req.file.buffer);
    const expected = cleanExt === "pdf" ? "pdf" : cleanExt === "docx" ? "docx" : "text";
    if (detected !== expected) {
      return next(new AppError(`File content does not match the .${cleanExt} document type`, 400));
    }
    // FA-79: "docx" detection is only ZIP magic - verify the container
    // really is a Word document before accepting the classification.
    if (detected === "docx" && !(await isDocxBuffer(req.file.buffer))) {
      return next(new AppError("The uploaded .docx is not a valid Word document", 400));
    }
    const storedExt = detected === "pdf" ? "pdf" : detected === "docx" ? "docx" : cleanExt === "csv" ? "csv" : "txt";
    const publicId = `${generatePublicId("doc")}.${storedExt}`;

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "aura/knowledge_base",
      public_id: publicId,
      resource_type: "raw",
      type: "authenticated",
    });

    req.processedDocument = {
      fileName: req.file.originalname,
      fileUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      fileType: storedExt,
    };

    next();
  } catch (error) {
    console.error("Error processing document:", error);
    next(new AppError("Error uploading document to Cloudinary", 500));
  }
};

