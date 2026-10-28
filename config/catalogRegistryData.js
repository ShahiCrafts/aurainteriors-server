const { productTypes: ownerProductTypes } = require("./catalogTaxonomy");

const departments = [
  { key: "sofas-seating", label: "Sofas & Seating" },
  { key: "tables", label: "Tables" },
  { key: "beds-mattresses", label: "Beds & Mattresses" },
  { key: "storage", label: "Storage" },
  { key: "dining-bar", label: "Dining & Bar" },
  { key: "office-study", label: "Office & Study" },
  { key: "outdoor", label: "Outdoor" },
  { key: "kids", label: "Kids" },
  { key: "entryway", label: "Entryway" },
  { key: "furniture-sets", label: "Furniture Sets" },
];

const typeDefs = [
  // Sofas & Seating
  {
    key: "sofa",
    label: "Sofa",
    categoryKey: "sofas-seating",
    description:
      "Sofas and couches of any seating capacity (capacity is an attribute, not a type).",
  },
  {
    key: "chair",
    label: "Chair",
    categoryKey: "sofas-seating",
    description:
      "Single-seat chairs, including armchairs, lounge chairs and accent chairs.",
  },
  {
    key: "ottoman",
    label: "Ottoman",
    categoryKey: "sofas-seating",
    description: "Ottomans, poufs and footstools.",
    attributeKeys: ["upholstery", "frameMaterial"],
  },
  {
    key: "bench",
    label: "Bench",
    categoryKey: "sofas-seating",
    description: "Benches for seating areas and entryways.",
    attributeKeys: ["seatingCapacity", "frameMaterial"],
  },
  // Tables
  {
    key: "table",
    label: "Table",
    categoryKey: "tables",
    description:
      "General-purpose tables not covered by a more specific table kind.",
  },
  {
    key: "coffee-table",
    label: "Coffee Table",
    categoryKey: "tables",
    description: "Low tables for seating areas.",
    attributeKeys: ["shape", "frameMaterial"],
  },
  {
    key: "side-table",
    label: "Side Table",
    categoryKey: "tables",
    description: "Side, end and nesting tables.",
    attributeKeys: ["shape", "frameMaterial"],
  },
  {
    key: "console-table",
    label: "Console Table",
    categoryKey: "tables",
    description: "Narrow console and hallway tables.",
    attributeKeys: ["shape", "frameMaterial"],
  },
  // Beds & Mattresses
  {
    key: "bed",
    label: "Bed",
    categoryKey: "beds-mattresses",
    description: "Bed frames and complete beds (size is an attribute).",
  },
  {
    key: "mattress",
    label: "Mattress",
    categoryKey: "beds-mattresses",
    description: "Mattresses (size and firmness are attributes).",
  },
  // Storage
  {
    key: "wardrobe",
    label: "Wardrobe",
    categoryKey: "storage",
    description: "Wardrobes and armoires.",
  },
  {
    key: "cabinet",
    label: "Cabinet",
    categoryKey: "storage",
    description: "Cabinets, including shoe and filing cabinets.",
  },
  {
    key: "shelving",
    label: "Shelving",
    categoryKey: "storage",
    description: "Shelving units and bookcases.",
  },
  {
    key: "tv-unit",
    label: "TV Unit",
    categoryKey: "storage",
    description: "TV stands and media units.",
    attributeKeys: ["shelfCount", "doorType", "frameMaterial"],
  },
  {
    key: "dresser",
    label: "Dresser",
    categoryKey: "storage",
    description: "Dressers and chests of drawers.",
    attributeKeys: ["storageType", "frameMaterial"],
  },
  {
    key: "sideboard",
    label: "Sideboard",
    categoryKey: "storage",
    description: "Sideboards and buffets.",
    attributeKeys: ["doorType", "shelfCount", "frameMaterial"],
  },
  // Dining & Bar
  {
    key: "dining_set",
    label: "Dining Set",
    categoryKey: "dining-bar",
    description: "Dining table and chair sets sold as one product.",
  },
  {
    key: "dining-table",
    label: "Dining Table",
    categoryKey: "dining-bar",
    description: "Dining tables (distinct from the general table kind).",
    attributeKeys: ["shape", "frameMaterial", "extendable", "seatingCapacity"],
  },
  {
    key: "bar-stool",
    label: "Bar Stool",
    categoryKey: "dining-bar",
    description: "Bar stools and counter stools.",
    attributeKeys: ["seatingCapacity", "adjustableHeight", "frameMaterial"],
  },
  // Office & Study
  {
    key: "desk",
    label: "Desk",
    categoryKey: "office-study",
    description: "Desks and study tables.",
  },
  {
    key: "office_chair",
    label: "Office Chair",
    categoryKey: "office-study",
    description: "Task and office chairs.",
  },
  // Outdoor
  {
    key: "outdoor_seating",
    label: "Outdoor Seating",
    categoryKey: "outdoor",
    description: "Outdoor chairs, benches, loungers and seating sets.",
  },
  {
    key: "outdoor-table",
    label: "Outdoor Table",
    categoryKey: "outdoor",
    description: "Outdoor and balcony tables.",
    attributeKeys: ["shape", "frameMaterial", "weatherResistant"],
  },
  // Kids
  {
    key: "bunk-bed",
    label: "Bunk Bed",
    categoryKey: "kids",
    description: "Bunk and loft beds.",
    attributeKeys: ["bedSize", "storageType", "frameMaterial", "headboardType"],
  },
  {
    key: "crib",
    label: "Crib",
    categoryKey: "kids",
    description: "Cribs and toddler beds.",
    attributeKeys: ["frameMaterial"],
  },
  // Entryway
  {
    key: "coat-rack",
    label: "Coat Rack",
    categoryKey: "entryway",
    description: "Coat racks and hallway stands.",
    attributeKeys: ["frameMaterial"],
  },
  // Furniture Sets
  {
    key: "furniture_set",
    label: "Furniture Set",
    categoryKey: "furniture-sets",
    description:
      "Multi-piece furniture sets sold as one product (room sets, sofa sets).",
  },
];

const productTypes = typeDefs.map((def, index) => ({
  key: def.key,
  label: def.label,
  description: def.description,
  categoryKey: def.categoryKey,
  attributeKeys: def.attributeKeys || ownerProductTypes[def.key] || [],
  sortOrder: index * 10,
}));

const rooms = [
  {
    slug: "living-room",
    label: "Living Room",
    description: "Sofas, seating, tables and media furniture for living rooms.",
  },
  {
    slug: "bedroom",
    label: "Bedroom",
    description: "Beds, mattresses, wardrobes and bedroom storage.",
  },
  {
    slug: "dining-room",
    label: "Dining Room",
    description: "Dining tables, seating and sets.",
  },
  {
    slug: "home-office",
    label: "Home Office",
    description: "Desks, office chairs and study furniture.",
  },
  {
    slug: "outdoor-balcony",
    label: "Outdoor & Balcony",
    description: "Weather-ready outdoor and balcony furniture.",
  },
  {
    slug: "kids-nursery",
    label: "Kids & Nursery",
    description: "Kids' beds, cribs and nursery furniture.",
  },
  {
    slug: "entryway",
    label: "Entryway",
    description: "Console tables, benches, shoe storage and coat racks.",
  },
  {
    slug: "study-corner",
    label: "Study Corner",
    description: "Compact desks and shelving for study nooks.",
  },
  {
    slug: "small-spaces",
    label: "Small Spaces",
    description: "Space-saving furniture for compact homes.",
  },
].map((room, index) => ({ ...room, sortOrder: index * 10 }));

const collections = [
  {
    slug: "new-arrivals",
    label: "New Arrivals",
    description: "Products added in the last 30 days.",
    kind: "rule",
    rule: { type: "new-arrivals", params: { windowDays: 30 } },
  },
  {
    slug: "best-sellers",
    label: "Best Sellers",
    description: "Ranked by units sold across non-cancelled orders.",
    kind: "rule",
    rule: { type: "best-sellers", params: { limit: 20 } },
  },
  {
    slug: "featured-picks",
    label: "Featured Picks",
    description: "Products flagged as featured.",
    kind: "rule",
    rule: { type: "featured", params: {} },
  },
  {
    slug: "on-sale",
    label: "On Sale",
    description: "Products priced below their original price.",
    kind: "rule",
    rule: { type: "on-sale", params: {} },
  },
  {
    slug: "living-room-collection",
    label: "The Living Room Collection",
    description: "Admin-curated living room picks.",
    kind: "manual",
    productIds: [],
  },
  {
    slug: "bedroom-collection",
    label: "The Bedroom Collection",
    description: "Admin-curated bedroom picks.",
    kind: "manual",
    productIds: [],
  },
  {
    slug: "small-space-living",
    label: "Small Space Living",
    description: "Admin-curated picks for compact homes.",
    kind: "manual",
    productIds: [],
  },
  {
    slug: "outdoor-living",
    label: "Outdoor Living",
    description: "Admin-curated outdoor picks.",
    kind: "manual",
    productIds: [],
  },
  {
    slug: "work-from-home",
    label: "Work From Home",
    description: "Admin-curated home-office picks.",
    kind: "manual",
    productIds: [],
  },
  {
    slug: "kids-favourites",
    label: "Kids' Favourites",
    description: "Admin-curated kids and nursery picks.",
    kind: "manual",
    productIds: [],
  },
].map((collection, index) => ({ ...collection, sortOrder: index * 10 }));

module.exports = { departments, productTypes, rooms, collections };
