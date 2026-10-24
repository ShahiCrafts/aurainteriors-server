const { standardReadLimiter, standardWriteLimiter } = require("../middleware/rateLimit.middleware");
const objectIdParam = require("../middleware/objectIdParam.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
router.param("id", objectIdParam);
const documentController = require("../controllers/document.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { uploadDocumentFile, processDocumentFile } = require("../middleware/upload.middleware");

// Require authentication and admin role for all document routes
router.use(protect);
router.use(restrictTo("admin"));

router
  .route("/")
  .post(uploadDocumentFile, processDocumentFile, documentController.uploadDocument)
  .get(documentController.listDocuments);

router.patch("/:id/visibility", documentController.updateVisibility);

router
  .route("/:id")
  .delete(documentController.deleteDocument);

router
  .route("/:id/retry")
  .post(documentController.retryDocumentIngestion);

module.exports = router;
