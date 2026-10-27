// Phase 8 (catalog) — seed/migration wiring derived from
// docs/catalog/VOCABULARY.md §3 ("Seed categories → rooms / likely
// types"). This module is that table as data; it is the ONE place
// the mapping lives in code. Consumers:
//   - scripts/seed.js (canonical CLI seed): enriches the category /
//     product payloads it writes, so a fresh seed carries the
//     Phase 1/2 wiring without editing the owner's data literal.
//   - services/catalogMigration.service.js (category-wiring
//     backfill): applies the same mapping to EXISTING databases.
//
// Honesty rules baked into the data (the brief's migration law —
// never invent, flag ambiguity, never guess):
//   - `type` is set ONLY where §3 names exactly one type for the
//     category. Multi-kind leaves keep `type: null` and carry a
//     `flag`: forcing one of several kinds onto a whole category
//     would mis-type the other products in it.
//   - Department roots keep `type: null` with NO flag (no type by
//     design — their leaves carry the types).
//   - lighting / decor keep `type: null` WITH a flag: the brief's
//     taxonomy has no lighting/decor kinds and Phase 1 (D-3) left
//     "new kinds vs attribute-only" as an open owner decision.
//     Phase 8 does not invent types for them.
//   - `roomsPinned: false` marks §3's "(all rooms)" rows (lighting,
//     decor): the vocabulary deliberately does not pin them to
//     specific rooms, so neither the seed nor the migration writes
//     roomSlugs for them. "(none)" rows (kitchen-and-utility) ARE
//     pinned — to the empty list.
//   - `outdoor-extras` is §3's "mixed — flag for review" row.
const categoryWiring = {
  // ---- Living Room -------------------------------------------------
  "living-room": { rooms: ["living-room"], roomsPinned: true, type: null, typeGuidance: [] },
  "upholstered-sofas": { rooms: ["living-room"], roomsPinned: true, type: "sofa", typeGuidance: ["sofa"] },
  "accent-seating": { rooms: ["living-room"], roomsPinned: true, type: "chair", typeGuidance: ["chair"] },
  "living-room-tables": {
    rooms: ["living-room"], roomsPinned: true, type: null,
    typeGuidance: ["coffee-table", "side-table", "console-table"],
    flag: "mixed-kind leaf (coffee-table / side-table / console-table): category productType left unset rather than forcing one kind",
  },
  // ---- Bedroom -----------------------------------------------------
  "bedroom": { rooms: ["bedroom"], roomsPinned: true, type: null, typeGuidance: [] },
  "bed-frames": { rooms: ["bedroom"], roomsPinned: true, type: "bed", typeGuidance: ["bed"] },
  "bedroom-storage": {
    rooms: ["bedroom"], roomsPinned: true, type: null,
    typeGuidance: ["wardrobe", "dresser", "cabinet"],
    flag: "mixed-kind leaf (wardrobe / dresser / cabinet): category productType left unset rather than forcing one kind",
  },
  "sleep-essentials": { rooms: ["bedroom"], roomsPinned: true, type: "mattress", typeGuidance: ["mattress"] },
  // ---- Dining ------------------------------------------------------
  "dining": { rooms: ["dining-room"], roomsPinned: true, type: null, typeGuidance: [] },
  "dining-tables": { rooms: ["dining-room"], roomsPinned: true, type: "dining-table", typeGuidance: ["dining-table"] },
  "dining-seating": {
    rooms: ["dining-room"], roomsPinned: true, type: null,
    typeGuidance: ["chair", "bench"],
    flag: "mixed-kind leaf (chair / bench): category productType left unset rather than forcing one kind",
  },
  "dining-storage": {
    rooms: ["dining-room"], roomsPinned: true, type: null,
    typeGuidance: ["sideboard", "cabinet"],
    flag: "mixed-kind leaf (sideboard / cabinet): category productType left unset rather than forcing one kind",
  },
  // ---- Home Office -------------------------------------------------
  "home-office": { rooms: ["home-office", "study-corner"], roomsPinned: true, type: null, typeGuidance: [] },
  "office-desks": { rooms: ["home-office", "study-corner"], roomsPinned: true, type: "desk", typeGuidance: ["desk"] },
  "office-seating": { rooms: ["home-office"], roomsPinned: true, type: "office_chair", typeGuidance: ["office_chair"] },
  "office-storage": {
    rooms: ["home-office"], roomsPinned: true, type: null,
    typeGuidance: ["shelving", "cabinet"],
    flag: "mixed-kind leaf (shelving / cabinet): category productType left unset rather than forcing one kind",
  },
  // ---- Outdoor -----------------------------------------------------
  "outdoor": { rooms: ["outdoor-balcony"], roomsPinned: true, type: null, typeGuidance: [] },
  "outdoor-seating": { rooms: ["outdoor-balcony"], roomsPinned: true, type: "outdoor_seating", typeGuidance: ["outdoor_seating"] },
  "outdoor-tables": { rooms: ["outdoor-balcony"], roomsPinned: true, type: "outdoor-table", typeGuidance: ["outdoor-table"] },
  "outdoor-extras": {
    rooms: ["outdoor-balcony"], roomsPinned: true, type: null, typeGuidance: [],
    flag: "VOCABULARY §3 marks this leaf 'mixed — flag for review': no type guidance to apply",
  },
  // ---- Lighting (open owner decision — Phase 1 D-3) ----------------
  "lighting": {
    rooms: [], roomsPinned: false, type: null, typeGuidance: [],
    flag: "no product type: lighting is not in the type registry — open owner decision (VOCABULARY §3 / Phase 1 D-3)",
  },
  "ceiling-lighting": {
    rooms: [], roomsPinned: false, type: null, typeGuidance: [],
    flag: "no product type: lighting is not in the type registry — open owner decision (VOCABULARY §3 / Phase 1 D-3)",
  },
  "portable-lighting": {
    rooms: [], roomsPinned: false, type: null, typeGuidance: [],
    flag: "no product type: lighting is not in the type registry — open owner decision (VOCABULARY §3 / Phase 1 D-3)",
  },
  "wall-lighting": {
    rooms: [], roomsPinned: false, type: null, typeGuidance: [],
    flag: "no product type: lighting is not in the type registry — open owner decision (VOCABULARY §3 / Phase 1 D-3)",
  },
  // ---- Decor (open owner decision — Phase 1 D-3) --------------------
  "decor": {
    rooms: [], roomsPinned: false, type: null, typeGuidance: [],
    flag: "no product type: decor is not in the type registry — open owner decision (VOCABULARY §3 / Phase 1 D-3)",
  },
  "wall-decor": {
    rooms: [], roomsPinned: false, type: null, typeGuidance: [],
    flag: "no product type: decor is not in the type registry — open owner decision (VOCABULARY §3 / Phase 1 D-3)",
  },
  "decorative-objects": {
    rooms: [], roomsPinned: false, type: null, typeGuidance: [],
    flag: "no product type: decor is not in the type registry — open owner decision (VOCABULARY §3 / Phase 1 D-3)",
  },
  "home-textiles": {
    rooms: [], roomsPinned: false, type: null, typeGuidance: [],
    flag: "no product type: decor is not in the type registry — open owner decision (VOCABULARY §3 / Phase 1 D-3)",
  },
  // ---- Kids --------------------------------------------------------
  "kids-room": { rooms: ["kids-nursery"], roomsPinned: true, type: null, typeGuidance: [] },
  "kids-beds": {
    rooms: ["kids-nursery"], roomsPinned: true, type: null,
    typeGuidance: ["bed", "bunk-bed", "crib"],
    flag: "mixed-kind leaf (bed / bunk-bed / crib): category productType left unset rather than forcing one kind",
  },
  "study-and-play": {
    rooms: ["kids-nursery", "study-corner"], roomsPinned: true, type: null,
    typeGuidance: ["desk", "chair"],
    flag: "mixed-kind leaf (desk / chair): category productType left unset rather than forcing one kind",
  },
  "kids-storage": {
    rooms: ["kids-nursery"], roomsPinned: true, type: null,
    typeGuidance: ["wardrobe", "shelving", "cabinet"],
    flag: "mixed-kind leaf (wardrobe / shelving / cabinet): category productType left unset rather than forcing one kind",
  },
  // ---- Kitchen & Utility (no matching room in the registry) --------
  "kitchen-and-utility": { rooms: [], roomsPinned: true, type: null, typeGuidance: [] },
  "kitchen-furniture": {
    rooms: [], roomsPinned: true, type: null,
    typeGuidance: ["table", "cabinet"],
    flag: "mixed-kind leaf (table / cabinet): category productType left unset rather than forcing one kind",
  },
  "pantry-storage": {
    rooms: [], roomsPinned: true, type: null,
    typeGuidance: ["shelving", "cabinet"],
    flag: "mixed-kind leaf (shelving / cabinet): category productType left unset rather than forcing one kind",
  },
  "utility-storage": {
    rooms: [], roomsPinned: true, type: null,
    typeGuidance: ["cabinet", "shelving"],
    flag: "mixed-kind leaf (cabinet / shelving): category productType left unset rather than forcing one kind",
  },
};

module.exports = { categoryWiring };
