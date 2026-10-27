// Child-process probe for Phase 8 (catalog) scope item 3:
// `attributeAssignments[].attributeKey` on product types was
// shape-validated but its EXISTENCE was never enforced (recorded in
// PHASE6_5_NOTES as the SR-P6-2 follow-up): resolution dropped
// unknown assignment keys silently — the same failure shape SR-P6-2
// fixed for `attributeKeys`. The Phase 8 fix routes assignment keys
// through the same assertAttributeKeysKnown helper on create and
// update; rejected writes must persist nothing.
//
// Drives the REAL Joi schemas (validate-middleware options), the
// REAL catalog controller and models against a real MMS mongod
// (disk-backed dbPath under ~/workspace/aura-catalog/mms-data);
// only req/res/next are mocked. Prints RESULT lines; the test file
// asserts them.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "cat8assign-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const uri = mongod.getUri("aura_catalog_phase8_assign_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const ProductType = require(path.join(REPO, "models/productType.model"));
  const bootstrap = require(path.join(REPO, "services/catalogBootstrap.service"));
  const catalogCtrl = require(path.join(REPO, "controllers/catalog.controller"));
  const {
    createProductTypeSchema,
    updateProductTypeSchema,
  } = require(path.join(REPO, "validators/catalog.validator"));

  const say = (line) => console.log(`RESULT ${line}`);

  async function call(handler, req) {
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    };
    let error;
    const next = (err) => { error = err; };
    handler({ file: undefined, files: undefined, params: {}, body: {}, query: {}, ...req }, res, next);
    const start = Date.now();
    while (res.body === undefined && error === undefined) {
      if (Date.now() - start > 15000) throw new Error("handler did not settle");
      await new Promise((r) => setTimeout(r, 5));
    }
    return { res, error };
  }
  const statusOf = ({ res, error }) => (error ? error.statusCode : res.statusCode);
  const messageOf = ({ res, error }) => (error ? error.message : (res.body && res.body.message) || "");

  const validated = (schema, body) => {
    const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
    if (error) throw new Error(`schema rejected fixture body: ${error.message}`);
    return value;
  };

  await bootstrap.ensureCatalogRegistry();

  // ---- create: unknown assignment key is rejected, nothing persisted ----
  const badCreate = await call(catalogCtrl.createProductType, {
    body: validated(createProductTypeSchema, {
      key: "p8-bad-create",
      label: "P8 Bad Create",
      attributeAssignments: [{ attributeKey: "noSuchAttribute" }],
    }),
  });
  say(`create-unknown status=${statusOf(badCreate)} named=${messageOf(badCreate).includes("noSuchAttribute")}`);
  say(`create-unknown persisted=${Boolean(await ProductType.findOne({ key: "p8-bad-create" }))}`);

  // ---- create: unknown keys in BOTH lists are named together ----
  const badBoth = await call(catalogCtrl.createProductType, {
    body: validated(createProductTypeSchema, {
      key: "p8-bad-both",
      label: "P8 Bad Both",
      attributeKeys: ["missingKeyOne"],
      attributeAssignments: [{ attributeKey: "missingKeyTwo" }],
    }),
  });
  const bothMsg = messageOf(badBoth);
  say(`create-both status=${statusOf(badBoth)} names=${bothMsg.includes("missingKeyOne") && bothMsg.includes("missingKeyTwo")}`);
  say(`create-both persisted=${Boolean(await ProductType.findOne({ key: "p8-bad-both" }))}`);

  // ---- create: known assignment key passes and is stored ----
  const goodCreate = await call(catalogCtrl.createProductType, {
    body: validated(createProductTypeSchema, {
      key: "p8-good",
      label: "P8 Good",
      attributeAssignments: [{ attributeKey: "frameMaterial", required: true }],
    }),
  });
  say(`create-known status=${statusOf(goodCreate)}`);
  const goodStored = await ProductType.findOne({ key: "p8-good" }).lean();
  say(`create-known stored=${goodStored.attributeAssignments.map((a) => a.attributeKey).join(",")}`);

  // ---- update: unknown assignment key rejected, stored doc unchanged ----
  const badUpdate = await call(catalogCtrl.updateProductType, {
    params: { key: "p8-good" },
    body: validated(updateProductTypeSchema, {
      attributeAssignments: [{ attributeKey: "anotherMissing" }],
    }),
  });
  say(`update-unknown status=${statusOf(badUpdate)} named=${messageOf(badUpdate).includes("anotherMissing")}`);
  const afterBadUpdate = await ProductType.findOne({ key: "p8-good" }).lean();
  say(`update-unknown stored=${afterBadUpdate.attributeAssignments.map((a) => a.attributeKey).join(",")}`);

  // ---- update: known assignment key passes ----
  const goodUpdate = await call(catalogCtrl.updateProductType, {
    params: { key: "p8-good" },
    body: validated(updateProductTypeSchema, {
      attributeAssignments: [{ attributeKey: "seatingCapacity" }],
    }),
  });
  say(`update-known status=${statusOf(goodUpdate)}`);
  const afterGoodUpdate = await ProductType.findOne({ key: "p8-good" }).lean();
  say(`update-known stored=${afterGoodUpdate.attributeAssignments.map((a) => a.attributeKey).join(",")}`);

  await mongoose.disconnect();
  await mongod.stop({ doCleanup: true, force: true });
}

main().then(
  () => process.exit(0),
  (err) => { console.log(`RESULT probe-error ${err && err.message}`); process.exit(2); }
);
