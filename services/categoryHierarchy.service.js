// Phase 1 (catalog) — Category ancestry maintenance.
//
// Category.parent is the single source of truth for the hierarchy.
// `ancestors` (root-first ObjectIds, excluding self) and `depth` on
// each category document are a derived, indexed materialization of
// the parent chain, kept in sync by the category write paths
// (controllers/category.controller.js) through this service:
//
//   - create: ancestorsForParent(parentId) computes the new node's
//     chain by walking parent links up to the root.
//   - reparent: rewriteSubtreeAncestors(id) recomputes the moved
//     node AND every descendant from a single parent-map scan and
//     persists the rewrite with one bulkWrite.
//   - rebuildAllAncestors(): the same computation for the whole
//     collection — the backfill the Phase 8 migration runs for
//     documents written before Phase 1 (or by seed scripts, which do
//     not call this service).
//
// Every walk is cycle-safe (visited set): a corrupt parent loop
// truncates the chain instead of looping forever. The controller's
// cycle guard rejects such writes before they happen; this is
// defense in depth for data written outside the API.
const Category = require("../models/category.model");

// Ancestor ids (root-first, as strings) for a category whose parent
// is `parentId` — i.e. the chain ENDS with parentId. Walks the
// parent links; never trusts stored `ancestors` values, so it is
// correct even for legacy documents that predate the field.
async function ancestorsForParent(parentId) {
  if (!parentId) return [];
  // PERF-B-06: walk the in-memory parent map (one collection scan)
  // instead of one findById round-trip per tree depth. The walk is
  // step-for-step the old one — same chain, same cycle truncation,
  // same behaviour for a parentId that does not exist ([parentId]).
  const { parentOf } = await loadParentMaps();
  const chain = [];
  const seen = new Set();
  let current = String(parentId);
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.unshift(current);
    current = parentOf.get(current) || null;
  }
  return chain;
}

// Build the id->parent and parent->children maps for one scan of the
// collection (the same access pattern getDescendantIds uses).
async function loadParentMaps() {
  const all = await Category.find({}, "_id parent").lean();
  const parentOf = new Map();
  const childrenOf = new Map();
  for (const category of all) {
    const id = String(category._id);
    parentOf.set(id, category.parent ? String(category.parent) : null);
    const key = String(category.parent || "");
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(id);
  }
  return { parentOf, childrenOf };
}

// Ancestor chain for `id` computed purely from the parent map.
function chainFromMap(id, parentOf) {
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

async function persistChains(ids, parentOf) {
  if (ids.length === 0) return 0;
  const ops = ids.map((id) => {
    const ancestors = chainFromMap(id, parentOf);
    return {
      updateOne: {
        filter: { _id: id },
        update: { $set: { ancestors, depth: ancestors.length } },
      },
    };
  });
  await Category.bulkWrite(ops);
  return ops.length;
}

// Recompute ancestors/depth for `rootId` and its whole subtree.
// Call AFTER the root's new parent link has been persisted. Returns
// the number of documents rewritten.
async function rewriteSubtreeAncestors(rootId) {
  const { parentOf, childrenOf } = await loadParentMaps();
  const ids = [];
  const seen = new Set();
  const queue = [String(rootId)];
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    ids.push(current);
    queue.push(...(childrenOf.get(current) || []));
  }
  return persistChains(ids, parentOf);
}

// Recompute ancestors/depth for EVERY category from the parent
// links. Idempotent; used by the Phase 8 migration/backfill.
async function rebuildAllAncestors() {
  const { parentOf } = await loadParentMaps();
  return persistChains([...parentOf.keys()], parentOf);
}

module.exports = {
  ancestorsForParent,
  rewriteSubtreeAncestors,
  rebuildAllAncestors,
};
