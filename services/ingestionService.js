const { PDFParse } = require("pdf-parse");
const extractDocxText = require("../utils/extractDocxText");
const Document = require("../models/document.model");
const AppError = require("../utils/AppError");

class IngestionService {
  constructor() {
    // OA-1 -9: no Qdrant client at construction (boot without Qdrant
    // stays valid). First OPERATION resolves via the shared resolver
    // and fails loudly naming QDRANT_URL when unconfigured.
    this.qdrant = null;

    this.collectionName = "knowledge_base";
    this.vectorSize = Number(process.env.EMBEDDING_VECTOR_SIZE) || 2048; // standard dimension for nvidia/llama-nemotron-embed-1b-v2
  }

  qdrantClient() {
    if (!this.qdrant) this.qdrant = require("../config/appConfig").createQdrantClient();
    return this.qdrant;
  }

  /**
   * Parse uploaded file to extract raw text
   */
  async parseFile(buffer, fileType) {
    if (fileType === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      await parser.destroy();
      return data.text;
    } else if (fileType === "docx") {
      return extractDocxText(buffer);
    } else if (fileType === "txt" || fileType === "csv") {
      return buffer.toString("utf-8");
    } else {
      throw new AppError(`Unsupported file type: ${fileType}`, 400);
    }
  }

  /**
   * Split text into overlapping chunks
   */
  chunkText(text, options = {}) {
    const chunkSize = options.chunkSize || 1000;
    const chunkOverlap = options.chunkOverlap || 200;

    // Clean whitespace
    const cleanedText = text.replace(/\s+/g, " ").trim();
    const chunks = [];
    let start = 0;

    while (start < cleanedText.length) {
      let end = start + chunkSize;
      
      // If we are not at the end of the text, try to find a sentence boundary or word boundary
      if (end < cleanedText.length) {
        // Try sentence boundary (period, question mark, exclamation mark followed by space)
        const lastPeriod = cleanedText.lastIndexOf(". ", end);
        if (lastPeriod > start + chunkSize / 2) {
          end = lastPeriod + 1; // include period
        } else {
          // Fall back to space boundary
          const lastSpace = cleanedText.lastIndexOf(" ", end);
          if (lastSpace > start + chunkSize / 2) {
            end = lastSpace;
          }
        }
      }

      const chunk = cleanedText.substring(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Stop at the end of the text (B-31): previously the loop
      // advanced by (chunkSize - overlap) past the final chunk and
      // emitted the tail AGAIN as a small duplicate chunk, polluting
      // the vector index with repeated content.
      if (end >= cleanedText.length) {
        break;
      }
      // Advance by chunk size minus overlap, always making progress.
      start = Math.max(end - chunkOverlap, start + 1);
    }

    return chunks;
  }

  /**
   * Call embedding API to generate vector
   */
  async getEmbedding(text, inputType = "passage") {
    const apiKey = process.env.NVIDIA_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing API Key for embedding model in environment variables.");
    }

    // Default to Nvidia NIM Embedding Model
    const url = process.env.EMBEDDING_API_URL || "https://integrate.api.nvidia.com/v1/embeddings";
    const model = process.env.EMBEDDING_MODEL_NAME || "nvidia/llama-3.2-nv-embed-qa-4";

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20000), // B-12: was unbounded
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: [text],
          model: model,
          encoding_format: "float",
          ...(model.startsWith("nvidia/") ? { input_type: inputType } : {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding model responded with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      if (!result.data || result.data.length === 0) {
        throw new Error("Empty data returned from embedding service");
      }

      return result.data[0].embedding;
    } catch (error) {
      console.error("Embedding generation failed:", error.message);
      throw error;
    }
  }

  /**
   * Initialize Qdrant collection if not exists
   */
  async initCollection() {
    try {
      const collections = await this.qdrantClient().getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

      if (!exists) {
        await this.qdrantClient().createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: "Cosine",
          },
        });
        console.log(`✓ Collection ${this.collectionName} created in Qdrant Vector Store`);
      }
    } catch (error) {
      console.error("Qdrant collection initialization failed:", error.message);
      throw error;
    }
  }

  /**
   * Ingest and index document in Qdrant
   */
  async ingestDocument(documentId) {
    const doc = await Document.findById(documentId);
    if (!doc) {
      throw new AppError("Document not found in database", 404);
    }

    try {
      doc.status = "processing";
      await doc.save();

      console.log(`Starting ingestion for document: ${doc.fileName}`);

      // Generate time-limited secure private download URL from Cloudinary
      let downloadUrl = doc.fileUrl;
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      if (doc.filePublicId) {
        try {
          const cloudinary = require("cloudinary").v2;
          const { getCloudinaryConfig } = require("../config/cloudinary");
          getCloudinaryConfig(); // Ensure config initialized
          
          downloadUrl = cloudinary.utils.private_download_url(doc.filePublicId, doc.fileType, {
            resource_type: "raw",
            type: "authenticated",
            expires_at: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
          });
          // Never log the URL itself: it is a signed credential (B-10).
          console.log(`[INGESTION] Generated secure download URL for document ${doc._id}`);
        } catch (signError) {
          console.warn("[INGESTION] Cloudinary private URL signing failed. Falling back:", signError.message);
        }
      }

      // FA-16: fetch via the shared guarded helper - the host is resolved
      // and validated once (all address forms), the request is pinned to
      // the validated address, redirects are re-validated per hop, and
      // the body is capped WHILE STREAMING (the previous code buffered
      // the whole response before checking its size).
      const parsedFetchUrl = new URL(downloadUrl);
      if (parsedFetchUrl.protocol !== "https:") {
        throw new Error(`Refusing to fetch document from a non-https URL for document ${doc._id}`);
      }
      const { guardedFetch } = require("../utils/guardedFetch");
      const response = await guardedFetch(downloadUrl, { headers, timeoutMs: 15000, maxBytes: 25 * 1024 * 1024 });
      if (!response.ok) {
        throw new Error(`Failed to fetch file for document ${doc._id}: HTTP ${response.status}`);
      }
      const buffer = await response.buffer();

      // Parse Text
      const rawText = await this.parseFile(buffer, doc.fileType);

      // Chunk Text
      const chunks = this.chunkText(rawText);
      console.log(`Segmented ${doc.fileName} into ${chunks.length} chunks`);

      if (chunks.length === 0) {
        throw new Error("No text content could be extracted from this document.");
      }

      // AR-05: optional per-job chunk cap (INGEST_MAX_CHUNKS_PER_JOB,
      // positive int; unset = no cap, preserving the previous
      // acceptance exactly). Checked before any embedding/Qdrant
      // work; the catch below marks the document "failed".
      const maxChunks = Number(process.env.INGEST_MAX_CHUNKS_PER_JOB);
      if (Number.isInteger(maxChunks) && maxChunks > 0 && chunks.length > maxChunks) {
        throw new Error(
          `Document produced ${chunks.length} chunks, exceeding INGEST_MAX_CHUNKS_PER_JOB=${maxChunks}`
        );
      }

      // Initialize Collection
      await this.initCollection();

      // AR-05 embed-then-swap: every run embeds under a fresh run id
      // and upserts FIRST; the previous version's points are deleted
      // only after the new version is live (below), so a failure
      // mid-embed leaves the document's existing vectors searchable.
      // (The previous code deleted the old points before embedding.)
      const ingestRun = require("crypto").randomUUID();

      // Embed and Upload Chunks
      const points = [];
      for (let i = 0; i < chunks.length; i++) {
        const textChunk = chunks[i];
        console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`);
        const embedding = await this.getEmbedding(textChunk);

        // Generate unique deterministic UUID for each chunk point
        const pointId = require("crypto")
          .createHash("md5")
          .update(`${doc._id.toString()}_chunk_${i}`)
          .digest("hex");
        
        // Add hyphen boundaries to fit standard UUID format (32 hex characters split as 8-4-4-4-12)
        const uuid = `${pointId.slice(0, 8)}-${pointId.slice(8, 12)}-${pointId.slice(12, 16)}-${pointId.slice(16, 20)}-${pointId.slice(20)}`;

        points.push({
          id: uuid,
          vector: embedding,
          payload: {
            text: textChunk,
            documentId: doc._id.toString(),
            visibility: doc.visibility || "private",
            fileName: doc.fileName,
            chunkIndex: i,
            totalChunks: chunks.length,
            fileType: doc.fileType,
            // AR-05: additive run marker for the embed-then-swap
            // delete below; retrieval filters only on
            // visibility/documentId, so this field is inert there.
            ingestRun,
          },
        });
      }

      // Batch upload points to Qdrant
      await this.qdrantClient().upsert(this.collectionName, {
        wait: true,
        points: points,
      });

      // AR-05: ONLY after the new version is live, delete the
      // previous version's points - every point of this document
      // that does NOT belong to this run.
      await this.qdrantClient().delete(this.collectionName, {
        filter: {
          must: [
            {
              key: "documentId",
              match: {
                value: doc._id.toString(),
              },
            },
          ],
          must_not: [
            {
              key: "ingestRun",
              match: {
                value: ingestRun,
              },
            },
          ],
        },
      });

      doc.status = "indexed";
      doc.error = null;
      await doc.save();

      console.log(`✓ Document ${doc.fileName} ingested successfully!`);
      return { success: true, chunksCount: chunks.length };
    } catch (error) {
      console.error(`✗ Ingestion failed for document ${doc.fileName}:`, error.message);
      doc.status = "failed";
      doc.error = error.message;
      await doc.save();
      throw error;
    }
  }
}

module.exports = new IngestionService();
