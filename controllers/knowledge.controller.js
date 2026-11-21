const Document = require("../models/document.model");
const { runDocumentIngestion } = require("../services/backgroundTasks");
const auditLog = require("../services/auditLog.service");

// Batch 3a: POST /api/v1/admin/knowledge/reindex — re-ingest ALL
// knowledge-base documents. There is no bulk primitive in the
// ingestion flow: per-document ingestion is a durable
// "ingest-document" job enqueued by runDocumentIngestion (AR-05),
// whose idempotency key embeds the document's updatedAt. So this
// loops the exact per-document retry path used by
// document.controller.retryDocumentIngestion — reset status to
// "pending", clear the error, save (which bumps updatedAt, so the
// enqueue is a FRESH job rather than a dedupe of the last completed
// one), then enqueue — once per document.
exports.reindexAllDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find().select("_id status error");

    let queued = 0;
    for (const doc of documents) {
      doc.status = "pending";
      doc.error = null;
      await doc.save();
      runDocumentIngestion(doc._id.toString());
      queued += 1;
    }

    await auditLog.record({
      actor: req.user?._id,
      action: "knowledge.reindexAll",
      targetType: "Document",
      targetId: "all",
      after: { queued },
      ip: req.ip,
    });

    res.status(200).json({
      status: "success",
      message:
        queued > 0
          ? `Re-indexing scheduled for ${queued} document${queued === 1 ? "" : "s"}`
          : "No knowledge documents to re-index",
      data: { queued },
    });
  } catch (error) {
    next(error);
  }
};
