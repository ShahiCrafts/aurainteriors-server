const Document = require("../models/document.model");

// AR-39: a failure caused by a TIMEOUT (our embedding AbortController,
// or the Qdrant client's own abort) vs any other failure — the two must
// be distinguishable in the logs, because both surface as "retrieve
// returned []".
function isTimeoutError(error) {
  if (!error) return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  return /abort|timed out|timeout|time limit/i.test(
    String(error.message || ""),
  );
}

class RetrievalService {
  constructor() {
    // OA-1: lazy shared-resolver client (see ingestionService).
    // Construction never throws when QDRANT_URL is unset; the first
    // search operation fails loudly naming QDRANT_URL.
    this.qdrant = null; // pre-AR-32 property name: tests replace this field with a stub (AR-39 seam) - the lazy accessor below honors a pre-set value
    this.collectionName = "knowledge_base";
  }

  qdrantClient() {
    if (!this.qdrant) {
      // AR-39: explicit client timeout (SDK default was 300 s).
      this.qdrant = require("../config/appConfig").createQdrantClient(
        process.env,
        { timeout: this.qdrantTimeoutMs() },
      );
    }
    return this.qdrant;
  }

  // Batch 3a: settings-backed resolution, at parity with
  // ingestionService (Batch 2). The resolvers live on the ingestion
  // service — lazy-required here so module load order can never
  // cycle — and already implement the documented precedence:
  // admin-saved settings/secrets first, the historical env chain as
  // the fallback (and the only path when the DB is unavailable).
  async resolveEmbeddingApiKey() {
    return require("./ingestionService").resolveEmbeddingApiKey();
  }

  async resolveEmbeddingModel() {
    return require("./ingestionService").resolveEmbeddingModel();
  }

  // Batch 3a: settings-backed Qdrant client, mirroring
  // ingestionService.resolveQdrantClient (admin-saved URL + resolved
  // vector.qdrant secret win; an admin secret alone keeps the env
  // URL), with retrieval's AR-39 client timeout applied. A pre-set
  // this.qdrant (the AR-39 test seam) always wins, exactly as with
  // qdrantClient(). Cached on the instance like ingestion's, so a
  // mid-process settings change applies on restart.
  async resolveQdrantClient() {
    if (this.qdrant) return this.qdrant;
    try {
      const settingsService = require("./settings/settingsService");
      const secretsService = require("./settings/secretsService");
      if (settingsService.isDbReady()) {
        const raw = await settingsService.getRawStoredData();
        const savedUrl =
          raw &&
          raw.integrations &&
          raw.integrations.qdrant &&
          typeof raw.integrations.qdrant.url === "string"
            ? raw.integrations.qdrant.url.trim()
            : "";
        const resolvedKey = await secretsService
          .getResolvedSecret("vector.qdrant")
          .catch(() => null);
        const adminKey =
          resolvedKey && resolvedKey !== (process.env.QDRANT_API_KEY || "")
            ? resolvedKey
            : null;
        if (savedUrl || adminKey) {
          const { QdrantClient } = require("@qdrant/js-client-rest");
          const url = savedUrl
            ? savedUrl
            : require("../config/appConfig").qdrantConfig(process.env).url;
          this.qdrant = new QdrantClient({
            url,
            apiKey: resolvedKey || undefined,
            timeout: this.qdrantTimeoutMs(),
          });
          return this.qdrant;
        }
      }
    } catch {
      // fall through to the env path
    }
    return this.qdrantClient();
  }

  // AR-39: the embedding budget for chat RAG, from
  // RAG_EMBEDDING_TIMEOUT_MS. DEFAULT = 250 ms — exactly the value
  // chatService used to hard-code at the retrieve call site — so
  // behavior is unchanged until an operator raises it (a cold external
  // embedding call commonly exceeds 250 ms; measure before tuning).
  embeddingTimeoutMs(env = process.env) {
    const n = Number(env.RAG_EMBEDDING_TIMEOUT_MS);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 250;
  }

  // AR-39: explicit Qdrant client timeout (RAG_QDRANT_TIMEOUT_MS,
  // default 5000 ms). Previously the search call had no timeout at
  // all beyond the SDK's 300 s client default.
  qdrantTimeoutMs(env = process.env) {
    const n = Number(env.RAG_QDRANT_TIMEOUT_MS);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5000;
  }

  /**
   * Helper to retrieve embedding vector for a given query string
   */
  async getEmbedding(text, inputType = "query", { timeoutMs = 300 } = {}) {
    // Batch 3a: resolved via ingestionService's Batch-2 resolvers
    // (settings/secrets first, env chain as fallback) — previously
    // this duplicated the env-only chain inline.
    const apiKey = await this.resolveEmbeddingApiKey();
    if (!apiKey) {
      throw new Error(
        "Missing API Key for embedding model in environment variables.",
      );
    }

    const url =
      process.env.EMBEDDING_API_URL ||
      "https://integrate.api.nvidia.com/v1/embeddings";
    const model = await this.resolveEmbeddingModel();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
        throw new Error(
          `Embedding model responded with status ${response.status}: ${errorText}`,
        );
      }

      const result = await response.json();
      if (!result.data || result.data.length === 0) {
        throw new Error("Empty data returned from embedding service");
      }

      return result.data[0].embedding;
    } catch (error) {
      console.error("Embedding generation failed:", error.message);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Perform vector similarity search against Qdrant index
   */
  async search(query, limit = 5, minScore = 0.5, { timeoutMs = 300 } = {}) {
    let stage = "embedding";
    try {
      console.log(`[RAG] Generating embedding for query: "${query}"`);
      const queryEmbedding = await this.getEmbedding(query, "query", {
        timeoutMs,
      });

      stage = "qdrant";
      console.log(
        `[RAG] Searching Qdrant collection: "${this.collectionName}"`,
      );
      const searchResult = await (await this.resolveQdrantClient()).search(
        this.collectionName,
        {
          filter: { must: [{ key: "visibility", match: { value: "public" } }] },
          vector: queryEmbedding,
          limit: Math.min(Math.max(Number(limit) || 5, 1), 10),
          with_payload: true,
          // AR-39: explicit per-request timeout (seconds, the Qdrant
          // API's unit for the search request) derived from the same
          // configured client budget as the constructor timeout.
          timeout: Math.max(1, Math.ceil(this.qdrantTimeoutMs() / 1000)),
        },
      );

      const ids = searchResult
        .map((hit) => hit.payload?.documentId)
        .filter((id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id));
      const publicDocuments = await Document.find({
        _id: { $in: ids },
        visibility: "public",
        status: "indexed",
      })
        .select("_id")
        .lean();
      const allowed = new Set(publicDocuments.map((doc) => String(doc._id)));
      // Filter and map results that meet the minimum confidence score
      const matches = searchResult
        .filter(
          (hit) =>
            hit.score >= minScore &&
            hit.payload?.visibility === "public" &&
            allowed.has(hit.payload.documentId),
        )
        .map((hit) => ({
          text: hit.payload.text,
          fileName: hit.payload.fileName,
          documentId: hit.payload.documentId,
          score: hit.score,
        }));

      console.log(
        `[RAG] Found ${matches.length} matching chunks matching score >= ${minScore}`,
      );
      return matches;
    } catch (error) {
      // AR-39: an empty result caused by a TIMEOUT gets its own
      // structured one-line JSON log (stable event name
      // "rag_retrieve_timeout") so timeout-empty is distinguishable
      // from no-match-empty and from other failures in the logs.
      if (isTimeoutError(error)) {
        console.log(
          JSON.stringify({ event: "rag_retrieve_timeout", stage, timeoutMs }),
        );
      }
      console.error("Qdrant similarity search failed:", error.message);
      // Fallback: return empty array so system does not crash
      return [];
    }
  }
  async retrieveContext(query, { timeoutMs = 300 } = {}) {
    const matches = await this.search(query, 5, 0.5, { timeoutMs });
    return matches.map(({ text, fileName, documentId, score }) => ({
      text,
      fileName,
      documentId,
      score,
    }));
  }
}

module.exports = new RetrievalService();
