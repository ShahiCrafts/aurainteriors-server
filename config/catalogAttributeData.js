// Phase 2 (catalog) — attribute definition seed data.
//
// The BOOTSTRAP SOURCE for the AttributeDefinition registry
// (models/attributeDefinition.model.js), upserted idempotently
// ($setOnInsert) by services/catalogBootstrap.service.js — the
// database is the runtime source of truth and this file only
// guarantees the canonical baseline exists.
//
// Grounding rule (Phase 2 brief): every definition below is either
//   (a) one of the owner's 18 static definitions from
//       config/catalogTaxonomy.js — keys and labels kept verbatim,
//       owner types mapped onto engine types (number -> integer
//       for counts, decimal for weightCapacity; enum/boolean
//       unchanged; all owner enums were open vocabularies — no
//       allowedValues — and stay open), or
//   (b) named in the master brief's Phase 1/2 attribute vocabulary
//       (material, finish, color, assemblyRequired, careInstructions,
//       warrantyPeriod, firmness, upholsteryMaterial, legMaterial,
//       mattressSize, tableShape, extendsLength, powerSource), or
//   (c) a first-class Product field recorded with storage "field"
//       so forms/filters see one unified attribute list
//       (dimensions, weight, price, style, materials, colors,
//       roomSlugs — roomSlugs is the brief's "roomCompatibility").
//
// The brief's "storage" vocabulary item is the owner's existing
// `storageType` definition; no duplicate key was invented for it.
//
// sortOrder leaves gaps (steps of 10) for admin inserts, matching
// the Phase 1 registry convention.

const SPEC = "Specifications";
const MATERIALS = "Materials & Finish";
const DIMENSIONS = "Dimensions & Weight";
const CARE = "Care & Warranty";

const attributeDefinitions = [
  // ---- (a) The owner's 18 (config/catalogTaxonomy.js), verbatim keys ----
  { key: "seatingCapacity", label: "Seating Capacity", type: "integer", min: 1, filterable: true, sortable: true, comparable: true, displayGroup: SPEC, sortOrder: 10 },
  { key: "configuration", label: "Configuration", type: "enum", filterable: true, comparable: true, displayGroup: SPEC, sortOrder: 20 },
  { key: "upholstery", label: "Upholstery", type: "enum", filterable: true, displayGroup: MATERIALS, sortOrder: 30 },
  { key: "frameMaterial", label: "Frame Material", type: "enum", filterable: true, comparable: true, displayGroup: MATERIALS, sortOrder: 40 },
  { key: "shape", label: "Shape", type: "enum", filterable: true, displayGroup: SPEC, sortOrder: 50 },
  { key: "extendable", label: "Extendable", type: "boolean", filterable: true, displayGroup: SPEC, sortOrder: 60 },
  { key: "bedSize", label: "Bed Size", type: "enum", filterable: true, comparable: true, displayGroup: SPEC, sortOrder: 70 },
  { key: "storageType", label: "Storage Type", type: "enum", filterable: true, displayGroup: SPEC, sortOrder: 80 },
  { key: "doorType", label: "Door Type", type: "enum", filterable: true, displayGroup: SPEC, sortOrder: 90 },
  { key: "shelfCount", label: "Shelf Count", type: "integer", min: 0, sortable: true, comparable: true, displayGroup: SPEC, sortOrder: 100 },
  { key: "lumbarSupport", label: "Lumbar Support", type: "boolean", filterable: true, displayGroup: SPEC, sortOrder: 110 },
  { key: "adjustableHeight", label: "Adjustable Height", type: "boolean", filterable: true, displayGroup: SPEC, sortOrder: 120 },
  { key: "weatherResistant", label: "Weather Resistant", type: "boolean", filterable: true, displayGroup: SPEC, sortOrder: 130 },
  // Owner label already carries the unit; the value stays a scalar
  // (decimal + unit metadata), matching how the value is stored.
  { key: "weightCapacity", label: "Weight Capacity (kg)", type: "decimal", unit: "kg", min: 0, sortable: true, comparable: true, displayGroup: DIMENSIONS, sortOrder: 140 },
  { key: "headboardType", label: "Headboard Type", type: "enum", displayGroup: SPEC, sortOrder: 150 },
  { key: "cushionFirmness", label: "Cushion Firmness", type: "enum", filterable: true, displayGroup: SPEC, sortOrder: 160 },
  { key: "chaiseOrientation", label: "Chaise Orientation", type: "enum", displayGroup: SPEC, sortOrder: 170 },
  { key: "piecesIncluded", label: "Pieces Included", type: "integer", min: 1, comparable: true, displayGroup: SPEC, sortOrder: 180 },

  // ---- (b) Brief vocabulary: global (appliesTo "all") ----
  { key: "material", label: "Material", type: "enum", appliesTo: "all", filterable: true, comparable: true, displayGroup: MATERIALS, sortOrder: 200 },
  { key: "finish", label: "Finish", type: "enum", appliesTo: "all", filterable: true, displayGroup: MATERIALS, sortOrder: 210 },
  { key: "color", label: "Color", type: "color", appliesTo: "all", filterable: true, displayGroup: MATERIALS, sortOrder: 220 },
  { key: "assemblyRequired", label: "Assembly Required", type: "boolean", appliesTo: "all", filterable: true, displayGroup: SPEC, sortOrder: 230 },
  { key: "careInstructions", label: "Care Instructions", type: "string", appliesTo: "all", displayGroup: CARE, sortOrder: 240 },
  { key: "warrantyPeriod", label: "Warranty Period", type: "string", appliesTo: "all", displayGroup: CARE, sortOrder: 250 },

  // ---- (b) Brief vocabulary: assigned via types/categories ----
  { key: "firmness", label: "Firmness", type: "enum", filterable: true, displayGroup: SPEC, sortOrder: 260 },
  { key: "upholsteryMaterial", label: "Upholstery Material", type: "enum", filterable: true, displayGroup: MATERIALS, sortOrder: 270 },
  { key: "legMaterial", label: "Leg Material", type: "enum", filterable: true, displayGroup: MATERIALS, sortOrder: 280 },
  { key: "mattressSize", label: "Mattress Size", type: "enum", filterable: true, comparable: true, displayGroup: SPEC, sortOrder: 290 },
  { key: "tableShape", label: "Table Shape", type: "enum", filterable: true, displayGroup: SPEC, sortOrder: 300 },
  { key: "extendsLength", label: "Extended Length", type: "measurement", unit: "cm", acceptedUnits: ["cm", "m", "in"], comparable: true, displayGroup: DIMENSIONS, sortOrder: 310 },
  { key: "powerSource", label: "Power Source", type: "enum", filterable: true, displayGroup: SPEC, sortOrder: 320 },

  // ---- (c) First-class Product fields (storage "field") ----
  { key: "dimensions", label: "Dimensions", type: "dimensions", storage: "field", fieldPath: "dimensions", appliesTo: "all", comparable: true, displayGroup: DIMENSIONS, sortOrder: 330 },
  { key: "weight", label: "Weight", type: "measurement", storage: "field", fieldPath: "weight", unit: "kg", acceptedUnits: ["kg", "lb", "g"], appliesTo: "all", sortable: true, comparable: true, displayGroup: DIMENSIONS, sortOrder: 340 },
  { key: "price", label: "Price", type: "money", storage: "field", fieldPath: "price", appliesTo: "all", filterable: true, sortable: true, displayGroup: SPEC, sortOrder: 350 },
  {
    key: "style", label: "Style", type: "enum", storage: "field", fieldPath: "style", appliesTo: "all", filterable: true, displayGroup: SPEC, sortOrder: 360,
    // The closed enum the Product model itself enforces.
    allowedValues: ["modern", "contemporary", "classic", "minimal", "cozy", "industrial", "scandinavian", "bohemian"],
  },
  { key: "materials", label: "Materials", type: "multi-enum", storage: "field", fieldPath: "materials", appliesTo: "all", filterable: true, comparable: true, displayGroup: MATERIALS, sortOrder: 370 },
  { key: "colors", label: "Colors", type: "multi-enum", storage: "field", fieldPath: "colors", appliesTo: "all", filterable: true, displayGroup: MATERIALS, sortOrder: 380 },
  { key: "roomSlugs", label: "Rooms", type: "multi-enum", storage: "field", fieldPath: "roomSlugs", appliesTo: "all", filterable: true, displayGroup: SPEC, sortOrder: 390 },
];

module.exports = { attributeDefinitions };
