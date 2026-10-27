// Phase 1 (catalog) — registry bootstrap.
//
// Idempotently ensures the canonical catalog registries exist in
// the database (ProductTypes, Rooms, Collections, and — Phase 2 —
// AttributeDefinitions). Seed data lives in
// config/catalogRegistryData.js + config/catalogAttributeData.js.
// Inserts use $setOnInsert ONLY:
// re-running the bootstrap never duplicates a record and never
// clobbers an admin's edits to a record it previously inserted —
// it only fills in keys that are missing entirely.
//
// Deliberately NOT wired into app boot in Phase 1: boot behavior is
// pinned by the app-config/boot-matrix suites, and the canonical
// seed entry point is a Phase 8 decision (Q4). Callers today: the
// Phase 1 tests and scripts/ensureCatalog.js; Phase 8 wires it into
// the unified seed/migration path.
const ProductType = require("../models/productType.model");
const Room = require("../models/room.model");
const Collection = require("../models/collection.model");
const AttributeDefinition = require("../models/attributeDefinition.model");
const { productTypes, rooms, collections } = require("../config/catalogRegistryData");
const { attributeDefinitions } = require("../config/catalogAttributeData");

async function upsertMissing(model, keyField, docs) {
  let inserted = 0;
  for (const doc of docs) {
    const result = await model.updateOne(
      { [keyField]: doc[keyField] },
      { $setOnInsert: doc },
      { upsert: true }
    );
    if (result.upsertedCount) inserted += result.upsertedCount;
  }
  return { inserted, total: await model.countDocuments() };
}

async function ensureProductTypes() {
  return upsertMissing(ProductType, "key", productTypes);
}

async function ensureRooms() {
  return upsertMissing(Room, "slug", rooms);
}

async function ensureCollections() {
  return upsertMissing(Collection, "slug", collections);
}

// Phase 2: the attribute definition registry joins the bootstrap
// (same $setOnInsert contract: reruns insert nothing and never
// clobber an admin's edits to a definition).
async function ensureAttributeDefinitions() {
  return upsertMissing(AttributeDefinition, "key", attributeDefinitions);
}

async function ensureCatalogRegistry() {
  const types = await ensureProductTypes();
  const roomResults = await ensureRooms();
  const collectionResults = await ensureCollections();
  const attributeResults = await ensureAttributeDefinitions();
  return {
    productTypes: types,
    rooms: roomResults,
    collections: collectionResults,
    attributeDefinitions: attributeResults,
  };
}

module.exports = {
  ensureProductTypes,
  ensureRooms,
  ensureCollections,
  ensureAttributeDefinitions,
  ensureCatalogRegistry,
};
