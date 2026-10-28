// AR-29: inventory of redundant PREFIX indexes (a strict prefix of a compound
// index can never beat the compound for the queries both cover, so Mongo pays
// to maintain it on every write for nothing).
//
// THIS SCRIPT NEVER DROPS ANYTHING. It prints the inventory; with --dry-run it
// additionally prints the exact mongosh commands the OWNER may run after
// supplying production $indexStats showing zero accesses for the candidate
// over a representative window (see MIGRATIONS.md / AUDIT_ARCH_TRACKER AR-29:
// status = pending owner data).
//
// Usage: node scripts/list-redundant-indexes.js [--dry-run]
//
// Inventory source: models/* full reads in the architecture review
// (audit/arch/INDEX_MATRIX.md "Index hygiene"). Note the deliberate EXCLUSION:
// products {createdAt:-1} looks like a suffix duplicate of the createdAt
// compounds, but the measured default product list plan (explain-bench P1)
// USES createdAt_-1 — it is not redundant and is not listed here.

const REDUNDANT = [
  // [collection, indexName, keyPattern, declaredAt, supersetIndex, supersetDeclaredAt]
  [
    "products",
    "category_1",
    "{category:1}",
    "models/product.model.js:232",
    "{status:1,category:1}",
    "models/product.model.js:241",
  ],
  [
    "products",
    "status_1",
    "{status:1}",
    "models/product.model.js:233",
    "{status:1,category:1}",
    "models/product.model.js:241",
  ],
  [
    "products",
    "isFeatured_1",
    "{isFeatured:1}",
    "models/product.model.js:236",
    "{isFeatured:1,createdAt:-1}",
    "models/product.model.js:242",
  ],
  [
    "products",
    "deletedAt_1",
    "{deletedAt:1}",
    "models/product.model.js:237",
    "{deletedAt:1,status:1}",
    "models/product.model.js:244",
  ],
  [
    "chats",
    "customer_1",
    "{customer:1}",
    "models/chat.model.js:9 (inline)",
    "{customer:1,status:1}",
    "models/chat.model.js:124",
  ],
  [
    "chats",
    "guestSession_1",
    "{guestSession:1}",
    "models/chat.model.js:15 (inline)",
    "{guestSession:1,status:1}",
    "models/chat.model.js:128",
  ],
  [
    "chats",
    "status_1",
    "{status:1}",
    "models/chat.model.js:21 (inline)",
    "{status:1,lastMessageAt:-1}",
    "models/chat.model.js:127",
  ],
  [
    "chats",
    "lastMessageAt_1",
    "{lastMessageAt:1}",
    "models/chat.model.js:36 (inline)",
    "{lastMessageAt:-1} (same field, opposite direction)",
    "models/chat.model.js:126",
  ],
  [
    "chatmessages",
    "chat_1",
    "{chat:1}",
    "models/chatMessage.model.js:10 (inline)",
    "{chat:1,createdAt:-1}",
    "models/chatMessage.model.js:98",
  ],
  [
    "categories",
    "parent_1",
    "{parent:1}",
    "models/category.model.js:64",
    "{parent:1,status:1}",
    "models/category.model.js:67",
  ],
  [
    "documents",
    "status_1",
    "{status:1}",
    "models/document.model.js:28 (inline)",
    "{status:1,createdAt:-1}",
    "models/document.model.js:49",
  ],
  [
    "notifications",
    "recipient_1",
    "{recipient:1}",
    "models/notification.model.js:11 (inline)",
    "{recipient:1,createdAt:-1}",
    "models/notification.model.js:42",
  ],
];

function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(
    `Redundant prefix indexes (AR-29 inventory): ${REDUNDANT.length} candidates`,
  );
  console.log(
    "Status: PENDING OWNER DATA — do not drop until production $indexStats",
  );
  console.log(
    "shows zero accesses for the candidate over a representative window.",
  );
  console.log(
    "Check first (per collection): db.<coll>.aggregate([{ $indexStats: {} }])",
  );
  console.log("");
  for (const [coll, name, keys, at, superset, supAt] of REDUNDANT) {
    console.log(`- ${coll}.${name} ${keys} (declared ${at})`);
    console.log(`    superset: ${superset} (declared ${supAt})`);
    if (dryRun) console.log(`    mongosh: db.${coll}.dropIndex("${name}")`);
  }
  if (!dryRun)
    console.log(
      "\nRe-run with --dry-run to print the drop commands (still executes nothing).",
    );
}

main();
