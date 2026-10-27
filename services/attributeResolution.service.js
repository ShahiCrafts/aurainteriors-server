// Phase 2 (catalog) — attribute applicability resolution.
//
// ONE service answers "which attributes apply here, with what
// effective settings" for a category, a product type, or a product.
// Applicability comes from three sources, merged in ascending
// precedence (later wins):
//
//   1. GLOBAL definitions — AttributeDefinition with
//      appliesTo "all" (e.g. material, color, and every
//      first-class-field definition).
//   2. PRODUCT-TYPE assignments — the category's ProductType:
//      its attributeKeys make attributes applicable; its
//      attributeAssignments add per-type overrides of
//      { required, displayGroup, sortOrder }.
//   3. CATEGORY assignments — Category.attributeAssignments on the
//      category and EVERY ancestor, applied root-first so the
//      NEAREST category wins for the overridable fields
//      { required, defaultValue, displayGroup, sortOrder }.
//
// Semantics pinned by the Phase 2 brief:
//   - A category assignment beats the type default for the same
//     key, at any depth (category level > type level > global).
//   - An assignment with active:false REMOVES the attribute for
//     that subtree — unless a nearer category re-assigns it
//     (nearest wins, applied last).
//   - A definition's type/unit/allowedValues are NEVER part of an
//     assignment and can never be overridden (data integrity).
//   - Inheritance follows the parent tree only, so circular
//     inheritance cannot occur; sibling branches never see each
//     other's assignments.
//   - Assignments (or type keys) naming an unknown or inactive
//     definition are skipped defensively — resolution never
//     invents an attribute. Write paths reject them with a 400.
//
// Each resolved entry carries the definition's integrity fields
// plus the EFFECTIVE required/defaultValue/displayGroup/sortOrder
// and a `source` ("global" | "type" | "category") recording which
// level last claimed the key (with `sourceCategoryId` for the
// category level), so admin UIs can explain where a setting came
// from.
const AttributeDefinition = require("../models/attributeDefinition.model");
const ProductType = require("../models/productType.model");
const Category = require("../models/category.model");
const { ancestorsForParent } = require("./categoryHierarchy.service");

async function loadActiveDefinitions() {
  // PERF-B-05 (U-4): registry cached in-process (60s) — this loader
  // also serves catalogFacets; attribute writes invalidate it.
  const {
    getAttributeDefinitionsCached,
  } = require("./attributeRegistryCache");
  const definitions = await getAttributeDefinitionsCached("active", () =>
    AttributeDefinition.find({ active: true }).lean()
  );
  return new Map(definitions.map((definition) => [definition.key, definition]));
}

function baseEntry(definition, source) {
  return {
    key: definition.key,
    label: definition.label,
    type: definition.type,
    storage: definition.storage || "catalogAttributes",
    fieldPath: definition.fieldPath,
    unit: definition.unit,
    acceptedUnits: definition.acceptedUnits || [],
    allowedValues: definition.allowedValues || [],
    min: definition.min,
    max: definition.max,
    step: definition.step,
    required: Boolean(definition.required),
    defaultValue: undefined,
    displayGroup: definition.displayGroup || "Specifications",
    sortOrder: definition.sortOrder || 0,
    filterable: Boolean(definition.filterable),
    sortable: Boolean(definition.sortable),
    comparable: Boolean(definition.comparable),
    source,
  };
}

function applyGlobal(entries, definitionsByKey) {
  for (const definition of definitionsByKey.values()) {
    if ((definition.appliesTo || "assigned") === "all") {
      entries.set(definition.key, baseEntry(definition, "global"));
    }
  }
}

// Applies a {required, displayGroup, sortOrder, defaultValue}
// override onto an entry in place; fields absent from the
// assignment leave the current (lower-level) value untouched.
function applyOverrides(entry, assignment, source) {
  if (assignment.required !== undefined && assignment.required !== null) {
    entry.required = Boolean(assignment.required);
  }
  if (assignment.defaultValue !== undefined) entry.defaultValue = assignment.defaultValue;
  if (assignment.displayGroup) entry.displayGroup = assignment.displayGroup;
  if (assignment.sortOrder !== undefined && assignment.sortOrder !== null) {
    entry.sortOrder = assignment.sortOrder;
  }
  entry.source = source;
  return entry;
}

async function applyTypeLevel(entries, definitionsByKey, typeKey) {
  if (!typeKey) return null;
  // Referenced by key regardless of the type's own active flag: a
  // deactivated type must not silently strip attributes from
  // products already classified under it. (Write paths validate
  // NEW category->type assignments against active types.)
  const productType = await ProductType.findOne({ key: typeKey }).lean();
  if (!productType) return null;
  const overrides = new Map(
    (productType.attributeAssignments || []).map((assignment) => [assignment.attributeKey, assignment])
  );
  const keys = [...new Set([...(productType.attributeKeys || []), ...overrides.keys()])];
  for (const key of keys) {
    const definition = definitionsByKey.get(key);
    if (!definition) continue;
    const entry = entries.get(key) || baseEntry(definition, "type");
    const override = overrides.get(key);
    if (override) applyOverrides(entry, override, "type");
    else entry.source = "type";
    entries.set(key, entry);
  }
  return productType;
}

// Root-first chain of category documents ending with `category`.
// Computed by walking parent links (ancestorsForParent), never by
// trusting the stored `ancestors` array — legacy documents written
// before Phase 1 may not carry it yet.
async function categoryChain(category) {
  const ancestorIds = await ancestorsForParent(category.parent);
  if (ancestorIds.length === 0) return [category];
  const docs = await Category.find({ _id: { $in: ancestorIds } }).lean();
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const chain = ancestorIds.map((id) => byId.get(String(id))).filter(Boolean);
  chain.push(category);
  return chain;
}

function sortedEntries(entries) {
  return [...entries.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  );
}

// Applicable attributes for a category document (or a lean object
// with _id/parent/productType): global + its productType's
// assignments + assignments along its whole ancestor chain.
//
// The target category is re-read from the database when it has an
// _id, so a stale in-memory copy (e.g. a document created before
// assignments were written through another copy) cannot produce a
// stale resolution; an unsaved category falls back to the object
// as passed. The EFFECTIVE product type is the category's own
// productType, or — when unset — the NEAREST ancestor's: a
// subcategory of a sofa category is still sofas unless it is
// explicitly re-typed (nearest wins, the same rule assignments
// follow).
//
// Phase 3: `options.typeKeyOverride` replaces the chain-derived
// type at the TYPE level (used by resolveForProduct with the
// product's own productType — the most specific classification
// wins the type-vs-type contest). Category assignments still sit
// ABOVE whichever type level applies, so a category's
// deactivation/override is never resurrected by a product's type.
async function resolveForCategory(category, options = {}) {
  const definitionsByKey = await loadActiveDefinitions();
  const entries = new Map();
  applyGlobal(entries, definitionsByKey);
  let target = category;
  if (category && category._id) {
    try {
      const fresh = await Category.findById(category._id);
      if (fresh) target = fresh;
    } catch {
      // Best-effort freshness: a failed re-read resolves from the
      // document as passed rather than failing the resolution.
      target = category;
    }
  }
  const chain = await categoryChain(target);
  let effectiveType = null;
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    if (chain[i].productType) {
      effectiveType = chain[i].productType;
      break;
    }
  }
  if (options.typeKeyOverride !== undefined) {
    effectiveType = options.typeKeyOverride || null;
  }
  await applyTypeLevel(entries, definitionsByKey, effectiveType);
  for (const chainCategory of chain) {
    for (const assignment of chainCategory.attributeAssignments || []) {
      const definition = definitionsByKey.get(assignment.attributeKey);
      if (!definition) continue;
      if (assignment.active === false) {
        entries.delete(assignment.attributeKey);
        continue;
      }
      const entry = entries.get(assignment.attributeKey) || baseEntry(definition, "category");
      applyOverrides(entry, assignment, "category");
      entry.sourceCategoryId = String(chainCategory._id);
      entries.set(assignment.attributeKey, entry);
    }
  }
  return sortedEntries(entries);
}

// Applicable attributes for a product type alone (global + type
// level). Returns null when the type does not exist.
async function resolveForProductType(typeKey) {
  const definitionsByKey = await loadActiveDefinitions();
  const entries = new Map();
  applyGlobal(entries, definitionsByKey);
  const productType = await applyTypeLevel(entries, definitionsByKey, typeKey);
  if (!productType) return null;
  return { productType, attributes: sortedEntries(entries) };
}

// A product's applicable attributes are its category's resolution
// (chain + type level + category assignments). Phase 3: when the
// product carries its OWN productType (Product.productType), that
// type supplies the type level INSTEAD of the category chain's —
// a product's own classification is the most specific statement
// about it (the precedence slot Phase 2 reserved). Category
// assignments still merge above the type level. A product whose
// category is missing (defensive: category is required and
// delete-guarded) degrades to the global set rather than failing.
async function resolveForProduct(product) {
  if (!product || !product.category) {
    const definitionsByKey = await loadActiveDefinitions();
    const entries = new Map();
    applyGlobal(entries, definitionsByKey);
    return sortedEntries(entries);
  }
  const category = await Category.findById(product.category).lean();
  if (!category) {
    const definitionsByKey = await loadActiveDefinitions();
    const entries = new Map();
    applyGlobal(entries, definitionsByKey);
    return sortedEntries(entries);
  }
  const typeKeyOverride =
    typeof product.productType === "string" && product.productType
      ? product.productType
      : undefined;
  return resolveForCategory(category, { typeKeyOverride });
}

module.exports = {
  loadActiveDefinitions,
  resolveForCategory,
  resolveForProductType,
  resolveForProduct,
};
