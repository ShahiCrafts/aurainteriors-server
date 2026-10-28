const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
    fileName: {
      type: String,
      required: [true, "Document must have a file name"],
      trim: true,
    },
    fileType: {
      type: String,
      enum: ["pdf", "docx", "txt", "csv"],
      required: [true, "Document must have a file type"],
    },
    fileUrl: {
      type: String,
      required: [true, "Document must have a file URL"],
    },
    filePublicId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "indexed", "failed"],
      default: "pending",
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    error: {
      type: String,
      default: null,
    },
    // AR-05: how many times the ingestion recovery sweep has
    // re-queued this document after it stalled in "processing"
    // (services/ingestionJobs.service.js). At INGEST_MAX_RECOVERIES
    // the sweep marks it "failed" instead of re-queueing forever.
    ingestRecoveries: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

documentSchema.index({ status: 1, createdAt: -1 });

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
