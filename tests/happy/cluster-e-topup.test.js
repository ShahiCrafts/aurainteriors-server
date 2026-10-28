// Happy-path top-up (Phase 0 coordinator): four handlers the cluster
// sweep's prose claimed but its files did not actually exercise —
// verified absent by a word-boundary search for the handler names over
// all tests: category getCategory, product getProduct, document
// uploadDocument, newsletter sendTrend. Same stubModule technique as
// the other cluster files.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("../audit/helpers");

const CAT_ID = "64b64c2f4f5a6b7c8d9e0f20";
const PROD_ID = "64b64c2f4f5a6b7c8d9e0f21";
const DOC_ID = "64b64c2f4f5a6b7c8d9e0f10";

const category = {
  _id: CAT_ID,
  name: "Chairs",
  slug: "chairs",
  status: "active",
};
const product = {
  _id: PROD_ID,
  name: "Sofa",
  slug: "sofa",
  status: "active",
  deletedAt: null,
  price: 100,
};

stubModule("models/category.model", {
  findOne: () => makeQuery(category),
  find: () => makeQuery([category]),
});
stubModule("models/product.model", {
  findOne: () => makeQuery(product),
  find: () => makeQuery([product]),
});

let ingestionCalls = [];
stubModule("models/document.model", {
  create: async (doc) => ({ _id: DOC_ID, ...doc }),
});
stubModule("services/backgroundTasks", {
  runDocumentIngestion: (id) => {
    ingestionCalls.push(id);
  },
  startBackgroundTasks: () => {},
  stopBackgroundTasks: () => {},
  releaseExpiredGuestCodHolds: async () => {},
});
stubModule("middleware/upload.middleware", {
  deleteFile: async () => ({}),
  deleteFiles: async () => {},
});
stubModule("@qdrant/js-client-rest", {
  QdrantClient: class {
    async delete() {
      return {};
    }
  },
});

let broadcastArgs;
stubModule("models/newsletter.model", {
  find: () =>
    makeQuery([
      {
        _id: "64b64c2f4f5a6b7c8d9e0f70",
        email: "sub@example.test",
        unsubscribeNonce: "nonce-1",
      },
    ]),
});
stubModule("services/email.service", {
  sendNewsletterBroadcast: async (subscribers, subject, html) => {
    broadcastArgs = { subscribers, subject, html };
    return { sent: subscribers.length, failed: 0 };
  },
  sendNewsletterConfirmationEmail: async () => true,
  sendNewsletterWelcomeEmail: async () => true,
});
stubModule("services/newsletterToken.service", {
  issueNewsletterToken: () => "token",
  verifyNewsletterToken: () => ({ valid: true }),
});

const categoryCtrl = require("../../controllers/category.controller");
const productCtrl = require("../../controllers/product.controller");
const documentCtrl = require("../../controllers/document.controller");
const newsletterCtrl = require("../../controllers/newsletter.controller");

test("GET /categories/:id — getCategory returns 200 with the category", async () => {
  const res = mockRes();
  const next = mockNext();
  categoryCtrl.getCategory(
    { params: { id: CAT_ID }, query: {}, body: {} },
    res,
    next,
  );
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.category._id, CAT_ID);
});

test("GET /products/:id — getProduct returns 200 with the product for a public caller", async () => {
  const res = mockRes();
  const next = mockNext();
  productCtrl.getProduct(
    { params: { id: PROD_ID }, query: {}, body: {}, user: undefined },
    res,
    next,
  );
  await until(() => res.statusCode !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.product._id, PROD_ID);
});

test("POST /documents — uploadDocument returns 201 and schedules ingestion", async () => {
  ingestionCalls = [];
  const res = mockRes();
  const next = mockNext();
  await documentCtrl.uploadDocument(
    {
      processedDocument: {
        fileName: "guide.pdf",
        fileUrl: "https://files/guide.pdf",
        cloudinaryPublicId: "pub-1",
        fileType: "pdf",
      },
      body: { visibility: "private" },
      user: { id: "64b64c2f4f5a6b7c8d9e0f01" },
    },
    res,
    next,
  );
  assert.equal(
    next.error,
    undefined,
    `unexpected error: ${next.error && next.error.message}`,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.document.fileName, "guide.pdf");
  assert.deepEqual(
    ingestionCalls,
    [DOC_ID],
    "ingestion must be scheduled for the new document",
  );
});

test("POST /newsletter/send-trend — sendTrend broadcasts to active subscribers and returns 200", async () => {
  broadcastArgs = undefined;
  const res = mockRes();
  await newsletterCtrl.sendTrend(
    {
      body: {
        subject: "Autumn trends",
        htmlContent: "<p>hi</p>",
        textContent: "hi",
      },
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.sent, 1);
  assert.equal(broadcastArgs.subject, "Autumn trends");
  assert.equal(broadcastArgs.subscribers.length, 1);
});
