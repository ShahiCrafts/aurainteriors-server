const Document = require("../models/document.model");
const { runDocumentIngestion } = require("../services/backgroundTasks");
const { deleteFile } = require("../middleware/upload.middleware");
const AppError = require("../utils/AppError");
const { boundedLimit, boundedPage } = require("../utils/listQuery");

// OA-1 -9: Qdrant client is created LAZILY at first use via the shared
// resolver (config/appConfig.createQdrantClient). Import/construction
// never throws when QDRANT_URL is unset; the delete operation below
// fails loudly ("QDRANT_URL is not configured") inside its try/catch,
// which records the qdrant outcome as failed.
const getQdrant = () => require("../config/appConfig").createQdrantClient();
const COLLECTION_NAME = "knowledge_base";

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.processedDocument) {
      return next(new AppError("Document file upload failed", 400));
    }

    if (req.body.visibility !== undefined && !["private", "public"].includes(req.body.visibility)) return next(new AppError("Invalid document visibility", 400));
    const { fileName, fileUrl, cloudinaryPublicId, fileType } = req.processedDocument;

    const doc = await Document.create({
      fileName,
      visibility: req.body.visibility || "private",
      fileType,
      fileUrl,
      filePublicId: cloudinaryPublicId,
      status: "pending",
      uploadedBy: req.user.id,
    });

    // Start asynchronous document ingestion
    runDocumentIngestion(doc._id.toString());

    res.status(201).json({
      status: "success",
      message: "Document uploaded and scheduled for indexing",
      data: { document: doc },
    });
  } catch (error) {
    next(error);
  }
};

exports.listDocuments = async (req, res, next) => {
  try {
    const page = boundedPage(req.query.page);
    const limit = boundedLimit(req.query.limit, 20);
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      Document.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("uploadedBy", "firstName lastName email")
        .lean(),
      Document.countDocuments(),
    ]);

    res.status(200).json({
      status: "success",
      results: documents.length,
      data: {
        documents,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return next(new AppError("Document not found", 404));
    }

    // AR-22: track the outcome PER SYSTEM and report honestly. The
    // old code swallowed Qdrant/Cloudinary failures (and logged
    // "✓ Deleted file from Cloudinary" even when deleteFile had
    // failed - it reports failure by returning null, not throwing)
    // and always answered full success. The structured log below is
    // unconditional; the RESPONSE only changes behind
    // DOCUMENT_DELETE_HONEST_STATUS=on (see FLAGS.md) because the
    // legacy shape cannot express partial failure.
    const outcomes = { qdrant: "ok", cloudinary: doc.filePublicId ? "ok" : "skipped", database: "ok" };

    // 1. Delete vectors from Qdrant
    try {
      await getQdrant().delete(COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: "documentId",
              match: {
                value: doc._id.toString(),
              },
            },
          ],
        },
      });
      console.log(`✓ Deleted vectors for document ${doc._id} from Qdrant`);
    } catch (qdrantError) {
      outcomes.qdrant = "failed";
      console.error(`Failed to delete vectors from Qdrant: ${qdrantError.message}`);
    }

    // 2. Delete file from Cloudinary
    if (doc.filePublicId) {
      try {
        const result = await deleteFile(doc.filePublicId, "raw");
        if (result === null) {
          outcomes.cloudinary = "failed";
        } else {
          console.log(`✓ Deleted file from Cloudinary: ${doc.filePublicId}`);
        }
      } catch (cloudinaryError) {
        outcomes.cloudinary = "failed";
        console.error(`Failed to delete file from Cloudinary: ${cloudinaryError.message}`);
      }
    }

    // 3. Delete Document record from MongoDB
    await Document.findByIdAndDelete(doc._id);

    const failedSystems = ["qdrant", "cloudinary", "database"].filter((s) => outcomes[s] === "failed");
    if (failedSystems.length > 0) {
      console.error(JSON.stringify({
        level: "error",
        event: "document_delete_partial",
        documentId: doc._id.toString(),
        outcomes,
      }));
    }

    if (require("../config/appConfig").getString("DOCUMENT_DELETE_HONEST_STATUS") === "on" && failedSystems.length > 0) {
      return res.status(200).json({
        status: "partial",
        message: `Document deleted from the database, but cleanup failed for: ${failedSystems.join(", ")}. Support has been notified via the error log.`,
        data: { outcomes },
      });
    }

    res.status(200).json({
      status: "success",
      message: "Document deleted successfully from both database and vector store",
    });
  } catch (error) {
    next(error);
  }
};

exports.retryDocumentIngestion = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return next(new AppError("Document not found", 404));
    }

    doc.status = "pending";
    doc.error = null;
    await doc.save();

    // Restart asynchronous document ingestion
    runDocumentIngestion(doc._id.toString());

    res.status(200).json({
      status: "success",
      message: "Re-indexing scheduled successfully",
      data: { document: doc },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateVisibility = async (req, res, next) => {
  try {
    if (!["private", "public"].includes(req.body.visibility)) return next(new AppError("Invalid document visibility", 400));
    const doc = await Document.findByIdAndUpdate(req.params.id, { visibility: req.body.visibility }, { new: true, runValidators: true });
    if (!doc) return next(new AppError("Document not found", 404));
    // Mongo restriction takes effect immediately for private documents; public
    // publishing requires ingestion to update vector payloads as well.
    runDocumentIngestion(String(doc._id));
    res.status(200).json({ status: "success", data: { document: doc } });
  } catch (error) { next(error); }
};
