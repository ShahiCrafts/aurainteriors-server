// AR-39 — RAG retrieval budget. Pre-fix: chatService passed a hard-coded
// timeoutMs:250 to retrieveContext, the Qdrant search call had NO
// explicit client timeout, and a timeout-induced empty result was
// indistinguishable in the logs from a genuine no-match empty. Post-fix:
//   - the embedding budget comes from RAG_EMBEDDING_TIMEOUT_MS
//     (default 250 ms = the previous hard-coded value);
//   - the Qdrant search carries an explicit timeout;
//   - a retrieve that returns empty BECAUSE of a timeout emits one
//     structured JSON log line with event "rag_retrieve_timeout".
// These tests drive the REAL retrievalService through the REAL
// chatService call site (a captured chatV2 turn job), with a slow
// stubbed embedding endpoint (400 ms) as fault injection.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery } = require("./helpers");

const CHAT_ID = "64b64c2f4f5a6b7c8d9e0f99";
const DOC_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
let capturedJob = null;
let capturedRetrieve = null;
let capturedQdrantArgs = [];

const chatDoc = {
  _id: CHAT_ID,
  customer: "cust1",
  guestSession: null,
  status: "ai_handling",
  metadata: { botActive: true },
};
const latestDoc = {
  _id: CHAT_ID,
  status: "ai_handling",
  metadata: {},
  customer: "cust1",
};

stubModule("models/chat.model", {
  findOne: () => makeQuery(chatDoc),
  findById: () => makeQuery(latestDoc),
  exists: async () => true,
  updateOne: async () => ({ matchedCount: 1 }),
});
stubModule("models/chatMessage.model", {
  create: async (data) => {
    const doc = {
      _id: "msg-ar39",
      ...data,
      toObject: () => ({
        _id: "msg-ar39",
        chat: data.chat,
        senderRole: data.senderRole,
        content: data.content,
      }),
      populate: async () => doc,
    };
    return doc;
  },
  markAsRead: async () => ({}),
  findOne: () => makeQuery(null),
});
stubModule("models/guestSession.model", {});
stubModule("models/user.model", {
  findOne: () => makeQuery(null),
  findById: () => makeQuery(null),
});
stubModule("models/document.model", {
  find: () => makeQuery([{ _id: DOC_ID }]),
});
stubModule("services/notificationEventEmitter", {});
stubModule("services/chatV2", {
  queue: {
    resume: () => {},
    cancel: () => {},
    enqueue: (roomId, fn) => {
      capturedJob = fn;
      return Promise.resolve();
    },
  },
  pipeline: {
    run: async (turn) => {
      capturedRetrieve = await turn.context.retrieve("return policy");
      return { text: "Bot reply", productOptions: [], degraded: false };
    },
  },
});

// Real retrievalService; its Qdrant client is replaced with a stub that
// records the search arguments (no network).
const retrievalService = require("../../services/retrievalService");
retrievalService.qdrant = {
  search: async (_collection, args) => {
    capturedQdrantArgs.push(args);
    return [
      {
        score: 0.9,
        payload: {
          documentId: DOC_ID,
          text: "Policy text",
          fileName: "policy.pdf",
          visibility: "public",
        },
      },
    ];
  },
};

const runtimeContext = require("../../services/runtimeContext"); // AR-33: registry replaces global.notificationGateway
const service = require("../../services/chatService");
service.authorizeChat = async () => true;
runtimeContext.setNotificationGateway({
  io: { to: () => ({ emit: () => {} }) },
});

const originalFetch = global.fetch;
const originalLog = console.log;

function installSlowEmbeddingFetch() {
  global.fetch = async (_url, options = {}) => {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 400);
      if (options.signal) {
        options.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(t);
            const e = new Error("The operation was aborted");
            e.name = "AbortError";
            reject(e);
          },
          { once: true },
        );
      }
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
      text: async () => "",
    };
  };
}

async function runTurnCollectingLogs() {
  const lines = [];
  console.log = (...args) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    capturedJob = null;
    capturedRetrieve = null;
    await service.sendMessage(CHAT_ID, "cust1", "customer", {
      content: "What is the return policy?",
    });
    assert.ok(capturedJob, "the v2 turn job must have been enqueued");
    await capturedJob();
  } finally {
    console.log = originalLog;
  }
  return lines;
}

test("AR-39: embeddingTimeoutMs defaults to 250 and honors RAG_EMBEDDING_TIMEOUT_MS", () => {
  assert.equal(
    typeof retrievalService.embeddingTimeoutMs,
    "function",
    "retrievalService exposes the budget resolver",
  );
  const saved = process.env.RAG_EMBEDDING_TIMEOUT_MS;
  delete process.env.RAG_EMBEDDING_TIMEOUT_MS;
  try {
    assert.equal(
      retrievalService.embeddingTimeoutMs(),
      250,
      "default = the previous hard-coded 250 ms",
    );
    process.env.RAG_EMBEDDING_TIMEOUT_MS = "900";
    assert.equal(retrievalService.embeddingTimeoutMs(), 900);
    process.env.RAG_EMBEDDING_TIMEOUT_MS = "not-a-number";
    assert.equal(
      retrievalService.embeddingTimeoutMs(),
      250,
      "invalid values fall back to the default",
    );
    process.env.RAG_EMBEDDING_TIMEOUT_MS = "0";
    assert.equal(
      retrievalService.embeddingTimeoutMs(),
      250,
      "non-positive values fall back to the default",
    );
  } finally {
    if (saved === undefined) delete process.env.RAG_EMBEDDING_TIMEOUT_MS;
    else process.env.RAG_EMBEDDING_TIMEOUT_MS = saved;
  }
});

test("AR-39: with the default 250 ms budget a slow embedding returns empty AND logs rag_retrieve_timeout", async () => {
  process.env.NVIDIA_API_KEY = "ar39-test-key";
  process.env.EMBEDDING_API_URL = "https://embedding.stub/v1/embeddings";
  delete process.env.RAG_EMBEDDING_TIMEOUT_MS;
  installSlowEmbeddingFetch();
  capturedQdrantArgs = [];
  try {
    const lines = await runTurnCollectingLogs();
    assert.deepEqual(
      capturedRetrieve,
      [],
      "a 400 ms embedding under a 250 ms budget yields no context",
    );
    assert.equal(
      capturedQdrantArgs.length,
      0,
      "Qdrant is never reached when the embedding times out",
    );
    const timeoutEvents = lines.filter((l) => {
      try {
        return JSON.parse(l).event === "rag_retrieve_timeout";
      } catch {
        return false;
      }
    });
    assert.equal(
      timeoutEvents.length,
      1,
      `exactly one structured rag_retrieve_timeout line must be logged; lines: ${lines.join(" | ")}`,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("AR-39: with RAG_EMBEDDING_TIMEOUT_MS raised, the same slow embedding succeeds and Qdrant gets an explicit timeout", async () => {
  process.env.NVIDIA_API_KEY = "ar39-test-key";
  process.env.EMBEDDING_API_URL = "https://embedding.stub/v1/embeddings";
  process.env.RAG_EMBEDDING_TIMEOUT_MS = "2000";
  installSlowEmbeddingFetch();
  capturedQdrantArgs = [];
  try {
    const lines = await runTurnCollectingLogs();
    assert.equal(
      capturedRetrieve.length,
      1,
      "with a 2000 ms budget the 400 ms embedding succeeds",
    );
    assert.equal(capturedRetrieve[0].text, "Policy text");
    assert.equal(capturedQdrantArgs.length, 1, "Qdrant search runs once");
    const qargs = capturedQdrantArgs[0];
    assert.equal(
      typeof qargs.timeout,
      "number",
      "the Qdrant search call carries an explicit timeout",
    );
    assert.ok(
      qargs.timeout >= 1,
      "the explicit Qdrant timeout is positive (seconds)",
    );
    const timeoutEvents = lines.filter((l) => {
      try {
        return JSON.parse(l).event === "rag_retrieve_timeout";
      } catch {
        return false;
      }
    });
    assert.equal(
      timeoutEvents.length,
      0,
      "no timeout event on a successful retrieve",
    );
  } finally {
    global.fetch = originalFetch;
    delete process.env.RAG_EMBEDDING_TIMEOUT_MS;
  }
});
