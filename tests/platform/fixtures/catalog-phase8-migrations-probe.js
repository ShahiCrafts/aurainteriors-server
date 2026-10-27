// Child-process probe for Phase 8 (catalog) migrations. Builds a
// LEGACY-shaped fixture against a real MMS mongod (disk-backed
// dbPath under ~/workspace/aura-catalog/mms-data) — categories
// written directly through the model (no hierarchy service, so
// ancestors/depth carry the pre-Phase-1 defaults), a product type
// carrying pre-SR-P6-2 lowercased attributeKeys, products with no
// variants — then runs each migration dry-run -> real -> again,
// printing RESULT lines for tests/platform/
// catalog-phase8-migrations.test.js to assert: dry-run writes
// NOTHING and reports accurately, the real run applies exactly the
// reported changes, and the second run is a no-op.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(path.join(REPO, "node_modules/mongodb-memory-server"));
  const base = path.join(process.env.HOME, "workspace/aura-catalog/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "cat8mig-"));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  const uri = mongod.getUri("aura_catalog_phase8_mig_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Category = require(path.join(REPO, "models/category.model"));
  const Product = require(path.join(REPO, "models/product.model"));
  const ProductType = require(path.join(REPO, "models/productType.model"));
  const AttributeDefinition = require(path.join(REPO, "models/attributeDefinition.model"));
  const bootstrap = require(path.join(REPO, "services/catalogBootstrap.service"));
  const migrations = require(path.join(REPO, "services/catalogMigration.service"));
  const { rebuildAllAncestors } = require(path.join(REPO, "services/categoryHierarchy.service"));
  const { ensureDefaultVariant } = require(path.join(REPO, "services/productVariant.service"));

  const say = (line) => console.log(`RESULT ${line}`);
  const counts = (r) => `examined=${r.examined} changed=${r.changed} skipped=${r.skipped} flagged=${r.flagged}`;

  await bootstrap.ensureCatalogRegistry();

  // ---------------- legacy fixture ----------------
  const root = await Category.create({ name: "Living Room", slug: "living-room" });
  const sofas = await Category.create({ name: "Upholstered Sofas", slug: "upholstered-sofas", parent: root._id });
  const tables = await Category.create({ name: "Living Room Tables", slug: "living-room-tables", parent: root._id });
  await Category.create({ name: "Lighting", slug: "lighting" });
  await Category.create({ name: "P8 Mystery", slug: "p8-mystery" });

  // Pre-fix product type: lowercased keys (framematerial /
  // seatingcapacity), one dangling key, plus assignment entries to
  // scan report-only. Written through the model on purpose — the
  // API would reject/store-verbatim today; these rows simulate
  // what the pre-6.5 validator persisted.
  await ProductType.create({
    key: "p8-repair",
    label: "P8 Repair",
    attributeKeys: ["framematerial", "notakey", "seatingcapacity"],
    attributeAssignments: [{ attributeKey: "framematerial" }, { attributeKey: "ghostkey" }],
  });
  // Ambiguity fixture: two definitions differing only by case, and
  // a stored entry matching both case-insensitively (but neither
  // exactly) — must be flagged, never guessed.
  await AttributeDefinition.create({ key: "p8CaseKey", label: "P8 Case Key", type: "string" });
  await AttributeDefinition.create({ key: "p8casekey", label: "P8 Case Key Lower", type: "string" });
  await ProductType.create({ key: "p8-ambig", label: "P8 Ambig", attributeKeys: ["P8CASEKEY"] });

  const mkProduct = (name, extra) =>
    Product.create({
      name,
      description: `Description for ${name}.`,
      category: sofas._id,
      price: 12345,
      stock: 7,
      status: "active",
      ...extra,
    });
  const prodOk = await mkProduct("P8 Variant Candidate", { sku: "P8-SKU-OK" });
  await mkProduct("P8 No Sku", {});
  await mkProduct("P8 Has Axes", { sku: "P8-SKU-AXES", variantOptionKeys: ["color"] });
  const prodHas = await mkProduct("P8 Has Variant", { sku: "P8-SKU-HAS" });
  await ensureDefaultVariant(prodHas);

  const storedCategory = async (slug) => Category.findOne({ slug }).lean();
  const childAncestors = async () => {
    const doc = await storedCategory("upholstered-sofas");
    return `${(doc.ancestors || []).length}/${doc.depth}`;
  };

  // ---------------- (a) ancestors ----------------
  const ancDry = await migrations.migrateCategoryAncestors({ dryRun: true });
  say(`ancestors-dry ${counts(ancDry)}`);
  say(`ancestors-dry untouched=${(await childAncestors()) === "0/0"}`);
  const ancReal = await migrations.migrateCategoryAncestors({});
  say(`ancestors-real ${counts(ancReal)}`);
  const sofaDoc = await storedCategory("upholstered-sofas");
  say(`ancestors-real child=${(sofaDoc.ancestors || []).map(String).join(",") === String(root._id) && sofaDoc.depth === 1}`);
  const ancAgain = await migrations.migrateCategoryAncestors({});
  say(`ancestors-again changed=${ancAgain.changed}`);
  // Equivalence with the hierarchy service: after the migration,
  // rebuildAllAncestors() must leave every value as stored.
  const snapshotBefore = JSON.stringify((await Category.find({}, "slug ancestors depth").lean()).map((c) => [c.slug, (c.ancestors || []).map(String), c.depth]).sort());
  await rebuildAllAncestors();
  const snapshotAfter = JSON.stringify((await Category.find({}, "slug ancestors depth").lean()).map((c) => [c.slug, (c.ancestors || []).map(String), c.depth]).sort());
  say(`ancestors-equivalence ${snapshotBefore === snapshotAfter}`);

  // ---------------- (d) category wiring ----------------
  const wireDry = await migrations.migrateCategoryWiring({ dryRun: true });
  say(`wiring-dry ${counts(wireDry)}`);
  const sofaDryDoc = await storedCategory("upholstered-sofas");
  say(`wiring-dry untouched=${!sofaDryDoc.productType && (sofaDryDoc.roomSlugs || []).length === 0}`);
  const wireReal = await migrations.migrateCategoryWiring({});
  say(`wiring-real ${counts(wireReal)}`);
  const sofaWired = await storedCategory("upholstered-sofas");
  say(`wiring-real sofas=${sofaWired.productType}/${(sofaWired.roomSlugs || []).join(",")}`);
  const rootWired = await storedCategory("living-room");
  say(`wiring-real root=${rootWired.productType || "none"}/${(rootWired.roomSlugs || []).join(",")}`);
  const tablesEntry = wireReal.entries.find((e) => e.slug === "living-room-tables");
  say(`wiring-real tables=${tablesEntry.changes.map((c) => c.field).join(",")} flags=${tablesEntry.flags.length}`);
  const lightingEntry = wireReal.entries.find((e) => e.slug === "lighting");
  say(`wiring-real lighting changes=${lightingEntry.changes.length} flags=${lightingEntry.flags.join(" | ").includes("open owner decision")}`);
  const mysteryEntry = wireReal.entries.find((e) => e.slug === "p8-mystery");
  say(`wiring-real mystery=${mysteryEntry.flags.join(" ").includes("no VOCABULARY")}`);
  const lightingDoc = await storedCategory("lighting");
  say(`wiring-real lighting-untouched=${!lightingDoc.productType && (lightingDoc.roomSlugs || []).length === 0}`);
  const wireAgain = await migrations.migrateCategoryWiring({});
  say(`wiring-again changed=${wireAgain.changed} flagged=${wireAgain.flagged}`);

  // ---------------- (b) product-type key repair ----------------
  const keysDry = await migrations.migrateProductTypeKeys({ dryRun: true });
  say(`keys-dry ${counts(keysDry)}`);
  const repairDry = await ProductType.findOne({ key: "p8-repair" }).lean();
  say(`keys-dry untouched=${(repairDry.attributeKeys || []).join(",") === "framematerial,notakey,seatingcapacity"}`);
  const keysReal = await migrations.migrateProductTypeKeys({});
  say(`keys-real ${counts(keysReal)}`);
  const repairEntry = keysReal.entries.find((e) => e.key === "p8-repair");
  say(`keys-real repair changes=${repairEntry.changes.map((c) => `${c.from}->${c.to}`).join(",")}`);
  say(`keys-real repair flagged=${repairEntry.flagged.map((f) => f.entry).join(",")}`);
  say(`keys-real repair findings=${repairEntry.assignmentFindings.map((f) => `${f.entry}:${f.verdict}`).join(",")}`);
  const ambigEntry = keysReal.entries.find((e) => e.key === "p8-ambig");
  say(`keys-real ambig=${ambigEntry.flagged.map((f) => f.entry).join(",")} changes=${ambigEntry.changes.length}`);
  const repairDoc = await ProductType.findOne({ key: "p8-repair" }).lean();
  say(`keys-real stored=${(repairDoc.attributeKeys || []).join(",")}`);
  say(`keys-real assignments-untouched=${(repairDoc.attributeAssignments || []).map((a) => a.attributeKey).join(",") === "framematerial,ghostkey"}`);
  const keysAgain = await migrations.migrateProductTypeKeys({});
  say(`keys-again changed=${keysAgain.changed}`);

  // ---------------- (c) default variants ----------------
  const varDry = await migrations.migrateDefaultVariants({ dryRun: true });
  say(`variants-dry ${counts(varDry)}`);
  const okDry = await Product.findById(prodOk._id).lean();
  say(`variants-dry untouched=${(okDry.catalogVariants || []).length === 0}`);
  const dryReasons = varDry.entries.filter((e) => e.outcome === "skipped").map((e) => e.reason).join(" | ");
  say(`variants-dry reason-nosku=${dryReasons.includes("no SKU to carry over")}`);
  say(`variants-dry reason-axes=${dryReasons.includes("declares variantOptionKeys")}`);
  say(`variants-dry reason-has=${dryReasons.includes("already has variants")}`);
  const varReal = await migrations.migrateDefaultVariants({});
  say(`variants-real ${counts(varReal)}`);
  const okDoc = await Product.findById(prodOk._id).lean();
  const variant = (okDoc.catalogVariants || [])[0] || {};
  say(`variants-real variant=${variant.sku}/${variant.price}/${variant.stock} hasVariants=${okDoc.hasVariants}`);
  const varAgain = await migrations.migrateDefaultVariants({});
  say(`variants-again changed=${varAgain.changed} skipped=${varAgain.skipped}`);

  await mongoose.disconnect();
  await mongod.stop({ doCleanup: true, force: true });
}

main().then(
  () => process.exit(0),
  (err) => { console.log(`RESULT probe-error ${err && err.message}`); process.exit(2); }
);
