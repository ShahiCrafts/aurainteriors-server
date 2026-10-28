// Phase 8 (catalog) — data migrations for existing databases.
//
// Four independent, composable migrations, each following the
// brief's migration law:
//   - DRY-RUN capable: with { dryRun: true } nothing is written and
//     the report describes exactly what a real run would do.
//   - REPORTED: every run returns { name, dryRun, examined,
//     changed, skipped, flagged, entries }. Entries carry BEFORE
//     values for everything a real run changes, so the printed
//     report doubles as the rollback map (see PHASE8_NOTES.md).
//   - IDEMPOTENT: a second real run changes nothing — writes happen
//     only where the stored value differs from the target value.
//   - CONSERVATIVE: ambiguous mappings are FLAGGED in the report
//     and left untouched, never guessed; no stock, price or spec
//     is ever invented (default variants carry the product's own
//     SKU/price/stock over via Phase 3's ensureDefaultVariant).
//
// The CLI wrapper is scripts/migrateCatalog.js; the canonical seed
// (scripts/seed.js) performs the equivalent steps inline for fresh
// installs, so these migrations are for databases that already hold
// catalog data written before the phase that introduced each field.
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const ProductType = require("../models/productType.model");
const AttributeDefinition = require("../models/attributeDefinition.model");
const { categoryWiring } = require("../config/catalogSeedWiring");
const { ensureDefaultVariant } = require("./productVariant.service");

// ------------------------------------------------------------------
// (a) Ancestors backfill
// ------------------------------------------------------------------
// Recomputes Category.ancestors/depth from the parent links — the
// same computation services/categoryHierarchy.service.js
// rebuildAllAncestors() performs (parent is the source of truth;
// stored ancestors are never trusted; walks are cycle-safe). The
// migration duplicates the chain walk so it can REPORT per category
// and write only the documents that actually differ; a test pins
// that after this migration rebuildAllAncestors() is a no-op.
function expectedChain(id, parentOf) {
  const chain = [];
  const seen = new Set();
  let current = parentOf.get(id) || null;
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.unshift(current);
    current = parentOf.get(current) || null;
  }
  return chain;
}

async function migrateCategoryAncestors({ dryRun = false } = {}) {
  const all = await Category.find({}, "_id slug parent ancestors depth").lean();
  const parentOf = new Map();
  for (const category of all) {
    parentOf.set(
      String(category._id),
      category.parent ? String(category.parent) : null,
    );
  }
  const entries = [];
  const ops = [];
  let changed = 0;
  for (const category of all) {
    const id = String(category._id);
    const expected = expectedChain(id, parentOf);
    const stored = (category.ancestors || []).map(String);
    const isChanged =
      stored.length !== expected.length ||
      stored.some((value, index) => value !== expected[index]) ||
      (category.depth || 0) !== expected.length;
    if (isChanged) {
      changed += 1;
      if (!dryRun) {
        ops.push({
          updateOne: {
            filter: { _id: category._id },
            update: { $set: { ancestors: expected, depth: expected.length } },
          },
        });
      }
    }
    entries.push({
      slug: category.slug,
      id,
      depth: expected.length,
      ancestorCount: expected.length,
      changed: isChanged,
      ...(isChanged
        ? {
            before: { ancestors: stored, depth: category.depth || 0 },
            after: { ancestors: expected, depth: expected.length },
          }
        : {}),
    });
  }
  if (ops.length > 0) await Category.bulkWrite(ops);
  return {
    name: "category-ancestors",
    dryRun,
    examined: all.length,
    changed,
    skipped: all.length - changed,
    flagged: 0,
    entries,
  };
}

// ------------------------------------------------------------------
// (b) SR-P6-2 lowercased-key repair (product types)
// ------------------------------------------------------------------
// Detection procedure from PHASE6_5_NOTES: a stored attributeKeys
// entry that is (a) NOT itself a definition key but (b) maps
// case-insensitively to EXACTLY ONE definition key is a remap
// candidate (the pre-fix validator lowercased it). Zero candidates
// = dangling, more than one = ambiguous: both are flagged and left
// untouched. attributeAssignments[].attributeKey gets the same scan
// REPORT-ONLY this phase (the Phase 8 write-path fix prevents new
// ones; silently rewriting assignment rows is a separate decision).
async function migrateProductTypeKeys({ dryRun = false } = {}) {
  const definitions = await AttributeDefinition.find({}).select("key").lean();
  const known = new Set(definitions.map((definition) => definition.key));
  const byLowercase = new Map();
  for (const key of known) {
    const lower = key.toLowerCase();
    if (!byLowercase.has(lower)) byLowercase.set(lower, []);
    byLowercase.get(lower).push(key);
  }
  const classify = (entry) => {
    if (known.has(entry)) return { verdict: "ok" };
    const candidates = byLowercase.get(String(entry).toLowerCase()) || [];
    if (candidates.length === 1)
      return { verdict: "remap-candidate", candidate: candidates[0] };
    if (candidates.length === 0) return { verdict: "dangling" };
    return { verdict: "ambiguous", candidates };
  };

  const types = await ProductType.find({})
    .select("key attributeKeys attributeAssignments")
    .lean();
  const entries = [];
  let changed = 0;
  let flagged = 0;
  for (const type of types) {
    const changes = [];
    const flags = [];
    const repairedKeys = (type.attributeKeys || []).map((entry) => {
      const result = classify(entry);
      if (result.verdict === "remap-candidate") {
        changes.push({
          field: "attributeKeys",
          from: entry,
          to: result.candidate,
        });
        return result.candidate;
      }
      if (result.verdict === "dangling") {
        flags.push({
          field: "attributeKeys",
          entry,
          reason:
            "no attribute definition matches even case-insensitively — dangling, left as-is",
        });
      } else if (result.verdict === "ambiguous") {
        flags.push({
          field: "attributeKeys",
          entry,
          reason: `matches ${result.candidates.join(", ")} case-insensitively — ambiguous, left as-is`,
        });
      }
      return entry;
    });
    const assignmentFindings = [];
    for (const assignment of type.attributeAssignments || []) {
      const result = classify(assignment.attributeKey);
      if (result.verdict !== "ok")
        assignmentFindings.push({ entry: assignment.attributeKey, ...result });
    }
    if (changes.length > 0) {
      changed += 1;
      if (!dryRun) {
        await ProductType.updateOne(
          { _id: type._id },
          { $set: { attributeKeys: repairedKeys } },
        );
      }
    }
    if (flags.length > 0 || assignmentFindings.length > 0) flagged += 1;
    if (
      changes.length > 0 ||
      flags.length > 0 ||
      assignmentFindings.length > 0
    ) {
      entries.push({
        key: type.key,
        changes,
        flagged: flags,
        assignmentFindings,
      });
    }
  }
  return {
    name: "product-type-keys",
    dryRun,
    examined: types.length,
    changed,
    skipped: types.length - entries.length,
    flagged,
    entries,
  };
}

// ------------------------------------------------------------------
// (c) Default variants for legacy products
// ------------------------------------------------------------------
// Runs Phase 3's ensureDefaultVariant over every product that has
// no variants. Products are skipped — with the reason recorded —
// when they already have variants, declare variantOptionKeys
// (their variants need explicit options), or have no SKU (a SKU is
// NEVER invented). Dry-run classifies with the same guards
// ensureDefaultVariant enforces, without calling it.
async function migrateDefaultVariants({ dryRun = false } = {}) {
  const products = await Product.find(
    {},
    "_id sku catalogVariants variantOptionKeys",
  ).lean();
  const entries = [];
  let created = 0;
  let skipped = 0;
  for (const product of products) {
    const productId = String(product._id);
    const sku = product.sku || null;
    let skipReason = null;
    if ((product.catalogVariants || []).length > 0)
      skipReason = "already has variants";
    else if ((product.variantOptionKeys || []).length > 0)
      skipReason =
        "declares variantOptionKeys — variants need explicit options";
    else if (!product.sku)
      skipReason = "no SKU to carry over — a SKU is never invented";
    if (skipReason) {
      skipped += 1;
      entries.push({ productId, sku, outcome: "skipped", reason: skipReason });
      continue;
    }
    if (dryRun) {
      created += 1;
      entries.push({ productId, sku, outcome: "would-create" });
      continue;
    }
    try {
      const result = await ensureDefaultVariant(product);
      if (result.created) {
        created += 1;
        entries.push({
          productId,
          sku,
          outcome: "created",
          variantId: String(result.variant._id || result.variant.id || ""),
          variantSku: result.variant.sku,
        });
      } else {
        skipped += 1;
        entries.push({
          productId,
          sku,
          outcome: "skipped",
          reason: "already has variants",
        });
      }
    } catch (error) {
      skipped += 1;
      entries.push({
        productId,
        sku,
        outcome: "skipped",
        reason: `ensureDefaultVariant refused: ${error.message}`,
      });
    }
  }
  return {
    name: "default-variants",
    dryRun,
    examined: products.length,
    changed: created,
    skipped,
    flagged: 0,
    entries,
  };
}

// ------------------------------------------------------------------
// (d) Category wiring backfill (VOCABULARY §3)
// ------------------------------------------------------------------
// Applies config/catalogSeedWiring.js to categories matched by
// slug: productType only where the vocabulary pins exactly one
// kind, roomSlugs only where the vocabulary pins rooms. Categories
// whose slug has no mapping, mixed-kind leaves, the mixed
// outdoor-extras leaf and lighting/decor (open owner decision) are
// FLAGGED and left untouched on the unpinned aspects.
const sameSlugSet = (a, b) => {
  const left = [...(a || [])].sort();
  const right = [...(b || [])].sort();
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
};

async function migrateCategoryWiring({ dryRun = false } = {}) {
  const categories = await Category.find(
    {},
    "_id slug productType roomSlugs",
  ).lean();
  const entries = [];
  let changed = 0;
  let flagged = 0;
  let skipped = 0;
  for (const category of categories) {
    const wiring = categoryWiring[category.slug];
    if (!wiring) {
      flagged += 1;
      entries.push({
        slug: category.slug,
        changes: [],
        flags: ["no VOCABULARY §3 mapping for this slug — left untouched"],
      });
      continue;
    }
    const changes = [];
    const flags = [];
    if (wiring.type) {
      if ((category.productType || null) !== wiring.type) {
        changes.push({
          field: "productType",
          from: category.productType || null,
          to: wiring.type,
        });
      }
    } else if (wiring.flag) {
      flags.push(wiring.flag);
    }
    if (wiring.roomsPinned) {
      if (!sameSlugSet(category.roomSlugs, wiring.rooms)) {
        changes.push({
          field: "roomSlugs",
          from: [...(category.roomSlugs || [])],
          to: [...wiring.rooms],
        });
      }
    } else {
      flags.push(
        "room assignment unpinned in VOCABULARY §3 ('all rooms') — roomSlugs left untouched",
      );
    }
    if (changes.length > 0) {
      changed += 1;
      if (!dryRun) {
        const update = {};
        for (const change of changes) update[change.field] = change.to;
        await Category.updateOne({ _id: category._id }, { $set: update });
      }
    }
    if (flags.length > 0) flagged += 1;
    if (changes.length === 0 && flags.length === 0) skipped += 1;
    if (changes.length > 0 || flags.length > 0)
      entries.push({ slug: category.slug, changes, flags });
  }
  return {
    name: "category-wiring",
    dryRun,
    examined: categories.length,
    changed,
    skipped,
    flagged,
    entries,
  };
}

async function runAllCatalogMigrations({ dryRun = false } = {}) {
  return [
    await migrateCategoryAncestors({ dryRun }),
    await migrateCategoryWiring({ dryRun }),
    await migrateProductTypeKeys({ dryRun }),
    await migrateDefaultVariants({ dryRun }),
  ];
}

module.exports = {
  migrateCategoryAncestors,
  migrateCategoryWiring,
  migrateProductTypeKeys,
  migrateDefaultVariants,
  runAllCatalogMigrations,
};
