"use strict";
/**
 * 2026-10-27 — Catalog / list index migration (PERF-B-02, PERF-B-08)
 * ==================================================================
 * OPT-IN. Dry-run by default: without --apply the script only prints
 * what it WOULD create and exits. It never runs automatically, is
 * not imported by the server, and changes no model file — index
 * declarations in the Mongoose schemas are intentionally untouched
 * so nothing auto-builds on boot.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://…" node scripts/migrations/2026-10-27-catalog-indexes.js
 *   MONGO_URI="mongodb+srv://…" node scripts/migrations/2026-10-27-catalog-indexes.js --apply
 *
 * VERIFICATION CHECKLIST — run BEFORE --apply on a production-like
 * dataset (staging snapshot), and again AFTER, per index:
 *   1. Capture the current state:
 *        db.products.getIndexes()        (and each collection below)
 *   2. For each query listed beside an index, run:
 *        db.products.find({ status: "active", deletedAt: null })
 *          .sort({ price: 1 }).limit(20)
 *          .explain("executionStats")
 *   3. BEFORE: confirm the plan shows a SORT stage / high
 *      totalDocsExamined relative to nReturned for the un-indexed
 *      sort (that is the cost this migration removes). If a query
 *      already plans as a clean IXSCAN, SKIP that index — do not
 *      build indexes the planner does not need.
 *   4. AFTER --apply: re-run the same explains; expect an IXSCAN on
 *      the new index, no in-memory SORT stage, and
 *      totalDocsExamined ≈ nReturned for the page.
 *   5. Watch write latency and storage for 24h: every index here
 *      taxes product writes. Re-check with
 *      scripts/list-redundant-indexes.js (already in this repo)
 *      before considering the prunes listed at the bottom.
 *
 * Indexes proposed (from the schema-vs-query cross-reference in the
 * security & performance report, PERF-B-02 / PERF-B-08 IDX-1…7):
 *   products      { status:1, deletedAt:1, price:1 }        catalog sort=price under the status filter
 *   products      { status:1, deletedAt:1, name:1 }         catalog sort=name
 *   products      { status:1, deletedAt:1, createdAt:-1 }   catalog default sort under the status filter
 *   newsletters   { subscribedAt:-1 }                       admin subscriber list sort (IDX-1)
 *   blogs         { views:-1, likes:-1 }                    getPopular sort (IDX-2)
 *   reviews       { product:1, isApproved:1, createdAt:-1 } product review list filter+sort (IDX-3)
 *   jobs          { status:1, heartbeatAt:1 }               stale-claim branch of the queue poller (IDX-5)
 *   promotions    { status:1, scheduledAt:1 }               scheduled-send scan (IDX-6)
 *   categories    { sortOrder:1, name:1 }                   category list sort (IDX-7)
 *
 * Considered and NOT proposed as indexes (verify by explain first):
 *   - reviews.helpfulCount (IDX-3 note): an allowlisted admin/user
 *     sort, bounded by per-product review counts. If explain shows a
 *     costly SORT on large products, the candidate is
 *     { product:1, helpfulCount:-1 } — add it here, do not improvise
 *     it in a console.
 *   - users firstName/lastName/lastLogin (IDX-4): admin-only list
 *     sorts over a small collection; candidates if the user base
 *     grows: { lastLogin:-1 }, { firstName:1, lastName:1 }.
 *   - products colors/materials/collectionSlugs (PERF-B-02 facet
 *     filters): multikey indexes tax writes heavily and the facet
 *     path is aggregation-based; measure before proposing.
 *
 * Redundant-prefix PRUNES — commented out on purpose. Each is a
 * prefix of a compound index that would remain. Run
 * scripts/list-redundant-indexes.js and confirm with explain on the
 * affected queries BEFORE uncommenting any dropIndex:
 *   // await db.collection("products").dropIndex("status_1");
 *   //   — prefix of { status:1, category:1 } and others
 *   // await db.collection("categories").dropIndex("parent_1");
 *   //   — prefix of { parent:1, status:1 }
 *   // await db.collection("chats").dropIndex("customer_1");
 *   //   — field index duplicating the { customer:1, status:1 } prefix
 *   // await db.collection("chats").dropIndex("lastMessageAt_-1");
 *   //   — check chat-list explains first; { status:1, lastMessageAt:-1 } does not cover unfiltered sorts
 */

const INDEXES = [
  ["products", { status: 1, deletedAt: 1, price: 1 }],
  ["products", { status: 1, deletedAt: 1, name: 1 }],
  ["products", { status: 1, deletedAt: 1, createdAt: -1 }],
  ["newsletters", { subscribedAt: -1 }],
  ["blogs", { views: -1, likes: -1 }],
  ["reviews", { product: 1, isApproved: 1, createdAt: -1 }],
  ["jobs", { status: 1, heartbeatAt: 1 }],
  ["promotions", { status: 1, scheduledAt: 1 }],
  ["categories", { sortOrder: 1, name: 1 }],
];

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(
    apply
      ? "MODE: --apply (indexes WILL be created)"
      : "MODE: dry-run (nothing will be created; pass --apply to execute)"
  );
  for (const [collection, keys] of INDEXES) {
    console.log(
      `${apply ? "createIndex" : "would createIndex"}  ${collection}  ${JSON.stringify(keys)}`
    );
  }
  if (!apply) {
    console.log("\nDry-run only — no connection made. See the header checklist before applying.");
    return;
  }
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is required with --apply");
    process.exitCode = 1;
    return;
  }
  const mongoose = require("mongoose");
  await mongoose.connect(uri);
  try {
    for (const [collection, keys] of INDEXES) {
      const name = await mongoose.connection.db
        .collection(collection)
        .createIndex(keys, { background: true });
      console.log(`created ${collection}: ${name}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
