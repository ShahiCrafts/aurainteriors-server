// Save this single file as scripts/seed.js in the existing Aura Interiors backend.
// EIGHT-CATEGORIES version with VARIED subcategory counts,
// DEEP SUBCATEGORY LEVELS REMOVED and the MAXIMUM DEPTH
// CAPPED AT 2 (v6):
// 106 categories in total, 288 detailed demo products.
// Subcategories per main category — Living Room: 5 (Upholstered Sofas, Accent Seating, Coffee Tables, Side Tables, Living Room Consoles); Bedroom: 4 (Bed Frames, Wardrobes, Dressers & Nightstands, Sleep Essentials); Dining: 4 (Dining Tables, Dining Chairs, Benches & Stools, Dining Storage); Home Office: 3 (Office Desks, Office Seating, Office Storage); Outdoor: 3 (Outdoor Seating, Outdoor Tables, Outdoor Extras); Lighting: 3 (Ceiling Lighting, Portable Lighting, Wall Lighting); Decor: 4 (Wall Decor, Decorative Objects, Rugs, Cushions & Throws); Kids Room: 3 (Kids Beds, Study and Play, Kids Storage).
// (The wider departments are split along their real product
// groups — Living Room Tables became its three table kinds,
// Bedroom Storage split into Wardrobes and Dressers &
// Nightstands, Dining Seating into Dining Chairs and Benches &
// Stools, Home Textiles into Rugs and Cushions & Throws.)
// Below each subcategory sits ONE level of product types, and the
// products live in those type categories — no finish-pair or
// colour sub-levels anymore, and no group wrappers either:
// Living Room's seating subcategories sit directly under the
// department, so the maximum depth is 2 everywhere.
// Category counts by depth: {"0":8,"1":29,"2":69}.
// Kitchen and Utility stays removed (no matching room in the
// registry), which is what trims the catalogue to 288 products;
// every product is otherwise unchanged apart from its placement.
// There is no external catalogue file needed.
// Default upsert preserves older records. Use a fresh demo database
// for exact counts. Preview without connecting: node scripts/seed.js --dry-run

const data = {
  "version": "2026-10-maxdepth2-v6",
  "currency": "NPR",
  "categories": [
    {
      "key": "living-room",
      "name": "Living Room",
      "slug": "living-room",
      "parentKey": null,
      "depth": 0,
      "description": "Living Room for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "upholstered-sofas",
      "name": "Upholstered Sofas",
      "slug": "upholstered-sofas",
      "parentKey": "living-room",
      "depth": 1,
      "description": "Upholstered Sofas for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "two-seater-sofas",
      "name": "Two Seater Sofas",
      "slug": "two-seater-sofas",
      "parentKey": "upholstered-sofas",
      "depth": 2,
      "description": "Two Seater Sofas for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "three-seater-sofas",
      "name": "Three Seater Sofas",
      "slug": "three-seater-sofas",
      "parentKey": "upholstered-sofas",
      "depth": 2,
      "description": "Three Seater Sofas for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "corner-sofas",
      "name": "Corner Sofas",
      "slug": "corner-sofas",
      "parentKey": "upholstered-sofas",
      "depth": 2,
      "description": "Corner Sofas for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "accent-seating",
      "name": "Accent Seating",
      "slug": "accent-seating",
      "parentKey": "living-room",
      "depth": 1,
      "description": "Accent Seating for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "lounge-chairs",
      "name": "Lounge Chairs",
      "slug": "lounge-chairs",
      "parentKey": "accent-seating",
      "depth": 2,
      "description": "Lounge Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "armchairs",
      "name": "Armchairs",
      "slug": "armchairs",
      "parentKey": "accent-seating",
      "depth": 2,
      "description": "Armchairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "manual-recliners",
      "name": "Manual Recliners",
      "slug": "manual-recliners",
      "parentKey": "accent-seating",
      "depth": 2,
      "description": "Manual Recliners for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "coffee-tables",
      "name": "Coffee Tables",
      "slug": "coffee-tables",
      "parentKey": "living-room",
      "depth": 1,
      "description": "Coffee Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "side-tables",
      "name": "Side Tables",
      "slug": "side-tables",
      "parentKey": "living-room",
      "depth": 1,
      "description": "Side Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 4,
      "status": "active"
    },
    {
      "key": "living-room-consoles",
      "name": "Living Room Consoles",
      "slug": "living-room-consoles",
      "parentKey": "living-room",
      "depth": 1,
      "description": "Living Room Consoles for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 5,
      "status": "active"
    },
    {
      "key": "bedroom",
      "name": "Bedroom",
      "slug": "bedroom",
      "parentKey": null,
      "depth": 0,
      "description": "Bedroom for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "bed-frames",
      "name": "Bed Frames",
      "slug": "bed-frames",
      "parentKey": "bedroom",
      "depth": 1,
      "description": "Bed Frames for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "queen-bed-frames",
      "name": "Queen Bed Frames",
      "slug": "queen-bed-frames",
      "parentKey": "bed-frames",
      "depth": 2,
      "description": "Queen Bed Frames for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "king-bed-frames",
      "name": "King Bed Frames",
      "slug": "king-bed-frames",
      "parentKey": "bed-frames",
      "depth": 2,
      "description": "King Bed Frames for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "queen-storage-beds",
      "name": "Queen Storage Beds",
      "slug": "queen-storage-beds",
      "parentKey": "bed-frames",
      "depth": 2,
      "description": "Queen Storage Beds for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "wardrobes",
      "name": "Wardrobes",
      "slug": "wardrobes",
      "parentKey": "bedroom",
      "depth": 1,
      "description": "Wardrobes for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "three-door-wardrobes",
      "name": "Three Door Wardrobes",
      "slug": "three-door-wardrobes",
      "parentKey": "wardrobes",
      "depth": 2,
      "description": "Three Door Wardrobes for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "dressers-nightstands",
      "name": "Dressers & Nightstands",
      "slug": "dressers-nightstands",
      "parentKey": "bedroom",
      "depth": 1,
      "description": "Dressers & Nightstands for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "six-drawer-dressers",
      "name": "Six Drawer Dressers",
      "slug": "six-drawer-dressers",
      "parentKey": "dressers-nightstands",
      "depth": 2,
      "description": "Six Drawer Dressers for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "two-drawer-nightstands",
      "name": "Two Drawer Nightstands",
      "slug": "two-drawer-nightstands",
      "parentKey": "dressers-nightstands",
      "depth": 2,
      "description": "Two Drawer Nightstands for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "sleep-essentials",
      "name": "Sleep Essentials",
      "slug": "sleep-essentials",
      "parentKey": "bedroom",
      "depth": 1,
      "description": "Sleep Essentials for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 4,
      "status": "active"
    },
    {
      "key": "queen-pocket-spring-mattresses",
      "name": "Queen Pocket Spring Mattresses",
      "slug": "queen-pocket-spring-mattresses",
      "parentKey": "sleep-essentials",
      "depth": 2,
      "description": "Queen Pocket Spring Mattresses for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "queen-upholstered-headboards",
      "name": "Queen Upholstered Headboards",
      "slug": "queen-upholstered-headboards",
      "parentKey": "sleep-essentials",
      "depth": 2,
      "description": "Queen Upholstered Headboards for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "upholstered-bedroom-benches",
      "name": "Upholstered Bedroom Benches",
      "slug": "upholstered-bedroom-benches",
      "parentKey": "sleep-essentials",
      "depth": 2,
      "description": "Upholstered Bedroom Benches for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "dining",
      "name": "Dining",
      "slug": "dining",
      "parentKey": null,
      "depth": 0,
      "description": "Dining for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "dining-tables",
      "name": "Dining Tables",
      "slug": "dining-tables",
      "parentKey": "dining",
      "depth": 1,
      "description": "Dining Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "four-seater-dining-tables",
      "name": "Four Seater Dining Tables",
      "slug": "four-seater-dining-tables",
      "parentKey": "dining-tables",
      "depth": 2,
      "description": "Four Seater Dining Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "six-seater-dining-tables",
      "name": "Six Seater Dining Tables",
      "slug": "six-seater-dining-tables",
      "parentKey": "dining-tables",
      "depth": 2,
      "description": "Six Seater Dining Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "eight-seater-dining-tables",
      "name": "Eight Seater Dining Tables",
      "slug": "eight-seater-dining-tables",
      "parentKey": "dining-tables",
      "depth": 2,
      "description": "Eight Seater Dining Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "dining-chairs",
      "name": "Dining Chairs",
      "slug": "dining-chairs",
      "parentKey": "dining",
      "depth": 1,
      "description": "Dining Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "upholstered-dining-chairs",
      "name": "Upholstered Dining Chairs",
      "slug": "upholstered-dining-chairs",
      "parentKey": "dining-chairs",
      "depth": 2,
      "description": "Upholstered Dining Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "benches-stools",
      "name": "Benches & Stools",
      "slug": "benches-stools",
      "parentKey": "dining",
      "depth": 1,
      "description": "Benches & Stools for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "dining-benches",
      "name": "Dining Benches",
      "slug": "dining-benches",
      "parentKey": "benches-stools",
      "depth": 2,
      "description": "Dining Benches for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "counter-height-stools",
      "name": "Counter Height Stools",
      "slug": "counter-height-stools",
      "parentKey": "benches-stools",
      "depth": 2,
      "description": "Counter Height Stools for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "dining-storage",
      "name": "Dining Storage",
      "slug": "dining-storage",
      "parentKey": "dining",
      "depth": 1,
      "description": "Dining Storage for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 4,
      "status": "active"
    },
    {
      "key": "three-door-sideboards",
      "name": "Three Door Sideboards",
      "slug": "three-door-sideboards",
      "parentKey": "dining-storage",
      "depth": 2,
      "description": "Three Door Sideboards for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "glass-front-crockery-cabinets",
      "name": "Glass Front Crockery Cabinets",
      "slug": "glass-front-crockery-cabinets",
      "parentKey": "dining-storage",
      "depth": 2,
      "description": "Glass Front Crockery Cabinets for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "two-tier-bar-trolleys",
      "name": "Two Tier Bar Trolleys",
      "slug": "two-tier-bar-trolleys",
      "parentKey": "dining-storage",
      "depth": 2,
      "description": "Two Tier Bar Trolleys for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "home-office",
      "name": "Home Office",
      "slug": "home-office",
      "parentKey": null,
      "depth": 0,
      "description": "Home Office for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 4,
      "status": "active"
    },
    {
      "key": "office-desks",
      "name": "Office Desks",
      "slug": "office-desks",
      "parentKey": "home-office",
      "depth": 1,
      "description": "Office Desks for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "writing-desks",
      "name": "Writing Desks",
      "slug": "writing-desks",
      "parentKey": "office-desks",
      "depth": 2,
      "description": "Writing Desks for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "computer-desks",
      "name": "Computer Desks",
      "slug": "computer-desks",
      "parentKey": "office-desks",
      "depth": 2,
      "description": "Computer Desks for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "electric-standing-desks",
      "name": "Electric Standing Desks",
      "slug": "electric-standing-desks",
      "parentKey": "office-desks",
      "depth": 2,
      "description": "Electric Standing Desks for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "office-seating",
      "name": "Office Seating",
      "slug": "office-seating",
      "parentKey": "home-office",
      "depth": 1,
      "description": "Office Seating for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "ergonomic-mesh-chairs",
      "name": "Ergonomic Mesh Chairs",
      "slug": "ergonomic-mesh-chairs",
      "parentKey": "office-seating",
      "depth": 2,
      "description": "Ergonomic Mesh Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "compact-task-chairs",
      "name": "Compact Task Chairs",
      "slug": "compact-task-chairs",
      "parentKey": "office-seating",
      "depth": 2,
      "description": "Compact Task Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "high-back-office-chairs",
      "name": "High Back Office Chairs",
      "slug": "high-back-office-chairs",
      "parentKey": "office-seating",
      "depth": 2,
      "description": "High Back Office Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "office-storage",
      "name": "Office Storage",
      "slug": "office-storage",
      "parentKey": "home-office",
      "depth": 1,
      "description": "Office Storage for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "five-shelf-bookcases",
      "name": "Five Shelf Bookcases",
      "slug": "five-shelf-bookcases",
      "parentKey": "office-storage",
      "depth": 2,
      "description": "Five Shelf Bookcases for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "two-drawer-filing-cabinets",
      "name": "Two Drawer Filing Cabinets",
      "slug": "two-drawer-filing-cabinets",
      "parentKey": "office-storage",
      "depth": 2,
      "description": "Two Drawer Filing Cabinets for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "three-drawer-desk-pedestals",
      "name": "Three Drawer Desk Pedestals",
      "slug": "three-drawer-desk-pedestals",
      "parentKey": "office-storage",
      "depth": 2,
      "description": "Three Drawer Desk Pedestals for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "outdoor",
      "name": "Outdoor",
      "slug": "outdoor",
      "parentKey": null,
      "depth": 0,
      "description": "Outdoor for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 5,
      "status": "active"
    },
    {
      "key": "outdoor-seating",
      "name": "Outdoor Seating",
      "slug": "outdoor-seating",
      "parentKey": "outdoor",
      "depth": 1,
      "description": "Outdoor Seating for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "patio-lounge-chairs",
      "name": "Patio Lounge Chairs",
      "slug": "patio-lounge-chairs",
      "parentKey": "outdoor-seating",
      "depth": 2,
      "description": "Patio Lounge Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "outdoor-two-seater-sofas",
      "name": "Outdoor Two Seater Sofas",
      "slug": "outdoor-two-seater-sofas",
      "parentKey": "outdoor-seating",
      "depth": 2,
      "description": "Outdoor Two Seater Sofas for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "freestanding-hanging-chairs",
      "name": "Freestanding Hanging Chairs",
      "slug": "freestanding-hanging-chairs",
      "parentKey": "outdoor-seating",
      "depth": 2,
      "description": "Freestanding Hanging Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "outdoor-tables",
      "name": "Outdoor Tables",
      "slug": "outdoor-tables",
      "parentKey": "outdoor",
      "depth": 1,
      "description": "Outdoor Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "round-bistro-tables",
      "name": "Round Bistro Tables",
      "slug": "round-bistro-tables",
      "parentKey": "outdoor-tables",
      "depth": 2,
      "description": "Round Bistro Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "patio-dining-tables",
      "name": "Patio Dining Tables",
      "slug": "patio-dining-tables",
      "parentKey": "outdoor-tables",
      "depth": 2,
      "description": "Patio Dining Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "folding-balcony-tables",
      "name": "Folding Balcony Tables",
      "slug": "folding-balcony-tables",
      "parentKey": "outdoor-tables",
      "depth": 2,
      "description": "Folding Balcony Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "outdoor-extras",
      "name": "Outdoor Extras",
      "slug": "outdoor-extras",
      "parentKey": "outdoor",
      "depth": 1,
      "description": "Outdoor Extras for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "adjustable-sun-loungers",
      "name": "Adjustable Sun Loungers",
      "slug": "adjustable-sun-loungers",
      "parentKey": "outdoor-extras",
      "depth": 2,
      "description": "Adjustable Sun Loungers for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "two-seater-garden-benches",
      "name": "Two Seater Garden Benches",
      "slug": "two-seater-garden-benches",
      "parentKey": "outdoor-extras",
      "depth": 2,
      "description": "Two Seater Garden Benches for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "three-tier-planter-stands",
      "name": "Three Tier Planter Stands",
      "slug": "three-tier-planter-stands",
      "parentKey": "outdoor-extras",
      "depth": 2,
      "description": "Three Tier Planter Stands for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "lighting",
      "name": "Lighting",
      "slug": "lighting",
      "parentKey": null,
      "depth": 0,
      "description": "Lighting for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 6,
      "status": "active"
    },
    {
      "key": "ceiling-lighting",
      "name": "Ceiling Lighting",
      "slug": "ceiling-lighting",
      "parentKey": "lighting",
      "depth": 1,
      "description": "Ceiling Lighting for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "single-pendant-lights",
      "name": "Single Pendant Lights",
      "slug": "single-pendant-lights",
      "parentKey": "ceiling-lighting",
      "depth": 2,
      "description": "Single Pendant Lights for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "six-arm-chandeliers",
      "name": "Six Arm Chandeliers",
      "slug": "six-arm-chandeliers",
      "parentKey": "ceiling-lighting",
      "depth": 2,
      "description": "Six Arm Chandeliers for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "flush-ceiling-lights",
      "name": "Flush Ceiling Lights",
      "slug": "flush-ceiling-lights",
      "parentKey": "ceiling-lighting",
      "depth": 2,
      "description": "Flush Ceiling Lights for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "portable-lighting",
      "name": "Portable Lighting",
      "slug": "portable-lighting",
      "parentKey": "lighting",
      "depth": 1,
      "description": "Portable Lighting for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "adjustable-floor-lamps",
      "name": "Adjustable Floor Lamps",
      "slug": "adjustable-floor-lamps",
      "parentKey": "portable-lighting",
      "depth": 2,
      "description": "Adjustable Floor Lamps for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "bedside-table-lamps",
      "name": "Bedside Table Lamps",
      "slug": "bedside-table-lamps",
      "parentKey": "portable-lighting",
      "depth": 2,
      "description": "Bedside Table Lamps for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "adjustable-desk-lamps",
      "name": "Adjustable Desk Lamps",
      "slug": "adjustable-desk-lamps",
      "parentKey": "portable-lighting",
      "depth": 2,
      "description": "Adjustable Desk Lamps for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "wall-lighting",
      "name": "Wall Lighting",
      "slug": "wall-lighting",
      "parentKey": "lighting",
      "depth": 1,
      "description": "Wall Lighting for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "wall-sconces",
      "name": "Wall Sconces",
      "slug": "wall-sconces",
      "parentKey": "wall-lighting",
      "depth": 2,
      "description": "Wall Sconces for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "adjustable-picture-lights",
      "name": "Adjustable Picture Lights",
      "slug": "adjustable-picture-lights",
      "parentKey": "wall-lighting",
      "depth": 2,
      "description": "Adjustable Picture Lights for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "swing-arm-wall-lights",
      "name": "Swing Arm Wall Lights",
      "slug": "swing-arm-wall-lights",
      "parentKey": "wall-lighting",
      "depth": 2,
      "description": "Swing Arm Wall Lights for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "decor",
      "name": "Decor",
      "slug": "decor",
      "parentKey": null,
      "depth": 0,
      "description": "Decor for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 7,
      "status": "active"
    },
    {
      "key": "wall-decor",
      "name": "Wall Decor",
      "slug": "wall-decor",
      "parentKey": "decor",
      "depth": 1,
      "description": "Wall Decor for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "round-wall-mirrors",
      "name": "Round Wall Mirrors",
      "slug": "round-wall-mirrors",
      "parentKey": "wall-decor",
      "depth": 2,
      "description": "Round Wall Mirrors for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "framed-abstract-prints",
      "name": "Framed Abstract Prints",
      "slug": "framed-abstract-prints",
      "parentKey": "wall-decor",
      "depth": 2,
      "description": "Framed Abstract Prints for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "floating-wall-shelf-sets",
      "name": "Floating Wall Shelf Sets",
      "slug": "floating-wall-shelf-sets",
      "parentKey": "wall-decor",
      "depth": 2,
      "description": "Floating Wall Shelf Sets for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "decorative-objects",
      "name": "Decorative Objects",
      "slug": "decorative-objects",
      "parentKey": "decor",
      "depth": 1,
      "description": "Decorative Objects for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "ceramic-vases",
      "name": "Ceramic Vases",
      "slug": "ceramic-vases",
      "parentKey": "decorative-objects",
      "depth": 2,
      "description": "Ceramic Vases for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "abstract-table-sculptures",
      "name": "Abstract Table Sculptures",
      "slug": "abstract-table-sculptures",
      "parentKey": "decorative-objects",
      "depth": 2,
      "description": "Abstract Table Sculptures for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "decorative-serving-trays",
      "name": "Decorative Serving Trays",
      "slug": "decorative-serving-trays",
      "parentKey": "decorative-objects",
      "depth": 2,
      "description": "Decorative Serving Trays for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "rugs",
      "name": "Rugs",
      "slug": "rugs",
      "parentKey": "decor",
      "depth": 1,
      "description": "Rugs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "woven-area-rugs",
      "name": "Woven Area Rugs",
      "slug": "woven-area-rugs",
      "parentKey": "rugs",
      "depth": 2,
      "description": "Woven Area Rugs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "cushions-throws",
      "name": "Cushions & Throws",
      "slug": "cushions-throws",
      "parentKey": "decor",
      "depth": 1,
      "description": "Cushions & Throws for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 4,
      "status": "active"
    },
    {
      "key": "cushion-cover-sets",
      "name": "Cushion Cover Sets",
      "slug": "cushion-cover-sets",
      "parentKey": "cushions-throws",
      "depth": 2,
      "description": "Cushion Cover Sets for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "textured-sofa-throws",
      "name": "Textured Sofa Throws",
      "slug": "textured-sofa-throws",
      "parentKey": "cushions-throws",
      "depth": 2,
      "description": "Textured Sofa Throws for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "kids-room",
      "name": "Kids Room",
      "slug": "kids-room",
      "parentKey": null,
      "depth": 0,
      "description": "Kids Room for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 8,
      "status": "active"
    },
    {
      "key": "kids-beds",
      "name": "Kids Beds",
      "slug": "kids-beds",
      "parentKey": "kids-room",
      "depth": 1,
      "description": "Kids Beds for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "single-kids-beds",
      "name": "Single Kids Beds",
      "slug": "single-kids-beds",
      "parentKey": "kids-beds",
      "depth": 2,
      "description": "Single Kids Beds for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "twin-bunk-beds",
      "name": "Twin Bunk Beds",
      "slug": "twin-bunk-beds",
      "parentKey": "kids-beds",
      "depth": 2,
      "description": "Twin Bunk Beds for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "single-trundle-beds",
      "name": "Single Trundle Beds",
      "slug": "single-trundle-beds",
      "parentKey": "kids-beds",
      "depth": 2,
      "description": "Single Trundle Beds for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "study-and-play",
      "name": "Study and Play",
      "slug": "study-and-play",
      "parentKey": "kids-room",
      "depth": 1,
      "description": "Study and Play for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "kids-study-desks",
      "name": "Kids Study Desks",
      "slug": "kids-study-desks",
      "parentKey": "study-and-play",
      "depth": 2,
      "description": "Kids Study Desks for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "kids-study-chairs",
      "name": "Kids Study Chairs",
      "slug": "kids-study-chairs",
      "parentKey": "study-and-play",
      "depth": 2,
      "description": "Kids Study Chairs for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "kids-play-tables",
      "name": "Kids Play Tables",
      "slug": "kids-play-tables",
      "parentKey": "study-and-play",
      "depth": 2,
      "description": "Kids Play Tables for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "kids-storage",
      "name": "Kids Storage",
      "slug": "kids-storage",
      "parentKey": "kids-room",
      "depth": 1,
      "description": "Kids Storage for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    },
    {
      "key": "toy-storage-organisers",
      "name": "Toy Storage Organisers",
      "slug": "toy-storage-organisers",
      "parentKey": "kids-storage",
      "depth": 2,
      "description": "Toy Storage Organisers for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 1,
      "status": "active"
    },
    {
      "key": "low-kids-bookcases",
      "name": "Low Kids Bookcases",
      "slug": "low-kids-bookcases",
      "parentKey": "kids-storage",
      "depth": 2,
      "description": "Low Kids Bookcases for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 2,
      "status": "active"
    },
    {
      "key": "two-door-kids-wardrobes",
      "name": "Two Door Kids Wardrobes",
      "slug": "two-door-kids-wardrobes",
      "parentKey": "kids-storage",
      "depth": 2,
      "description": "Two Door Kids Wardrobes for considered home interiors, with coordinated finishes and practical everyday dimensions.",
      "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "sortOrder": 3,
      "status": "active"
    }
  ],
  "products": [
    {
      "name": "Aster Two Seater Sofa in Sand",
      "slug": "aster-two-seater-sofa-in-sand",
      "sku": "AUR-DEMO-001-01",
      "categoryKey": "two-seater-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Two Seater Sofas"
      ],
      "description": "Aster Two Seater Sofa in Sand brings two seater sofas into a coordinated minimal interior. Compact two-seat proportions with supportive back cushions. Removable seat covers and raised legs simplify everyday cleaning.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 160 cm wide × 84 cm high × 88 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 34 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Compact two-seat proportions with supportive back cushions. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 35999,
      "stock": 0,
      "status": "out_of_stock",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for two seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 160,
        "height": 84,
        "depth": 88,
        "unit": "cm"
      },
      "weight": {
        "value": 34,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "two-seater-sofas",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Two Seater Sofa in Sand",
      "metaDescription": "Aster Two Seater Sofa in Sand. 160 cm wide × 84 cm high × 88 cm deep. Explore this sample two seater sofas listing for furniture catalogue development.",
      "originalPrice": 40399
    },
    {
      "name": "Niva Two Seater Sofa in Sage Green",
      "slug": "niva-two-seater-sofa-in-sage-green",
      "sku": "AUR-DEMO-001-02",
      "categoryKey": "two-seater-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Two Seater Sofas"
      ],
      "description": "Niva Two Seater Sofa in Sage Green brings two seater sofas into a coordinated scandinavian interior. Compact two-seat proportions with supportive back cushions. Removable seat covers and raised legs simplify everyday cleaning.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 160 cm wide × 84 cm high × 88 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 34 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Compact two-seat proportions with supportive back cushions. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 40599,
      "stock": 21,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for two seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 160,
        "height": 84,
        "depth": 88,
        "unit": "cm"
      },
      "weight": {
        "value": 34,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "two-seater-sofas",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Two Seater Sofa in Sage Green",
      "metaDescription": "Niva Two Seater Sofa in Sage Green. 160 cm wide × 84 cm high × 88 cm deep. Explore this sample two seater sofas listing for furniture catalogue development."
    },
    {
      "name": "Kanso Two Seater Sofa in Storm Grey",
      "slug": "kanso-two-seater-sofa-in-storm-grey",
      "sku": "AUR-DEMO-001-03",
      "categoryKey": "two-seater-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Two Seater Sofas"
      ],
      "description": "Kanso Two Seater Sofa in Storm Grey brings two seater sofas into a coordinated contemporary interior. Compact two-seat proportions with supportive back cushions. Removable seat covers and raised legs simplify everyday cleaning.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 160 cm wide × 84 cm high × 88 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 34 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Compact two-seat proportions with supportive back cushions. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 45999,
      "stock": 34,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for two seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 160,
        "height": 84,
        "depth": 88,
        "unit": "cm"
      },
      "weight": {
        "value": 34,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "two-seater-sofas",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Two Seater Sofa in Storm Grey",
      "metaDescription": "Kanso Two Seater Sofa in Storm Grey. 160 cm wide × 84 cm high × 88 cm deep. Explore this sample two seater sofas listing for furniture catalogue development."
    },
    {
      "name": "Aranya Two Seater Sofa in Terracotta",
      "slug": "aranya-two-seater-sofa-in-terracotta",
      "sku": "AUR-DEMO-001-04",
      "categoryKey": "two-seater-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Two Seater Sofas"
      ],
      "description": "Aranya Two Seater Sofa in Terracotta brings two seater sofas into a coordinated cozy interior. Compact two-seat proportions with supportive back cushions. Removable seat covers and raised legs simplify everyday cleaning.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 160 cm wide × 84 cm high × 88 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 34 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Compact two-seat proportions with supportive back cushions. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 53199,
      "stock": 47,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for two seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 160,
        "height": 84,
        "depth": 88,
        "unit": "cm"
      },
      "weight": {
        "value": 34,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "two-seater-sofas",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Two Seater Sofa in Terracotta",
      "metaDescription": "Aranya Two Seater Sofa in Terracotta. 160 cm wide × 84 cm high × 88 cm deep. Explore this sample two seater sofas listing for furniture catalogue development."
    },
    {
      "name": "Aster Three Seater Sofa in Sand",
      "slug": "aster-three-seater-sofa-in-sand",
      "sku": "AUR-DEMO-002-01",
      "categoryKey": "three-seater-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Three Seater Sofas"
      ],
      "description": "Aster Three Seater Sofa in Sand brings three seater sofas into a coordinated minimal interior. Three generous seats suit family living rooms. A kiln-dried timber frame supports layered foam cushions.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 215 cm wide × 86 cm high × 92 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 48 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three generous seats suit family living rooms. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 52999,
      "stock": 19,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for three seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 215,
        "height": 86,
        "depth": 92,
        "unit": "cm"
      },
      "weight": {
        "value": 48,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "three-seater-sofas",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Three Seater Sofa in Sand",
      "metaDescription": "Aster Three Seater Sofa in Sand. 215 cm wide × 86 cm high × 92 cm deep. Explore this sample three seater sofas listing for furniture catalogue development."
    },
    {
      "name": "Niva Three Seater Sofa in Sage Green",
      "slug": "niva-three-seater-sofa-in-sage-green",
      "sku": "AUR-DEMO-002-02",
      "categoryKey": "three-seater-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Three Seater Sofas"
      ],
      "description": "Niva Three Seater Sofa in Sage Green brings three seater sofas into a coordinated scandinavian interior. Three generous seats suit family living rooms. A kiln-dried timber frame supports layered foam cushions.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 215 cm wide × 86 cm high × 92 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 48 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three generous seats suit family living rooms. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 59799,
      "stock": 32,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for three seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 215,
        "height": 86,
        "depth": 92,
        "unit": "cm"
      },
      "weight": {
        "value": 48,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "three-seater-sofas",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Three Seater Sofa in Sage Green",
      "metaDescription": "Niva Three Seater Sofa in Sage Green. 215 cm wide × 86 cm high × 92 cm deep. Explore this sample three seater sofas listing for furniture catalogue development."
    },
    {
      "name": "Kanso Three Seater Sofa in Storm Grey",
      "slug": "kanso-three-seater-sofa-in-storm-grey",
      "sku": "AUR-DEMO-002-03",
      "categoryKey": "three-seater-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Three Seater Sofas"
      ],
      "description": "Kanso Three Seater Sofa in Storm Grey brings three seater sofas into a coordinated contemporary interior. Three generous seats suit family living rooms. A kiln-dried timber frame supports layered foam cushions.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 215 cm wide × 86 cm high × 92 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 48 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three generous seats suit family living rooms. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 67799,
      "stock": 45,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for three seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 215,
        "height": 86,
        "depth": 92,
        "unit": "cm"
      },
      "weight": {
        "value": 48,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "three-seater-sofas",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Three Seater Sofa in Storm Grey",
      "metaDescription": "Kanso Three Seater Sofa in Storm Grey. 215 cm wide × 86 cm high × 92 cm deep. Explore this sample three seater sofas listing for furniture catalogue development."
    },
    {
      "name": "Aranya Three Seater Sofa in Terracotta",
      "slug": "aranya-three-seater-sofa-in-terracotta",
      "sku": "AUR-DEMO-002-04",
      "categoryKey": "three-seater-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Three Seater Sofas"
      ],
      "description": "Aranya Three Seater Sofa in Terracotta brings three seater sofas into a coordinated cozy interior. Three generous seats suit family living rooms. A kiln-dried timber frame supports layered foam cushions.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 215 cm wide × 86 cm high × 92 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 48 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three generous seats suit family living rooms. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 78299,
      "stock": 17,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for three seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 215,
        "height": 86,
        "depth": 92,
        "unit": "cm"
      },
      "weight": {
        "value": 48,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "three-seater-sofas",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Three Seater Sofa in Terracotta",
      "metaDescription": "Aranya Three Seater Sofa in Terracotta. 215 cm wide × 86 cm high × 92 cm deep. Explore this sample three seater sofas listing for furniture catalogue development.",
      "originalPrice": 87699
    },
    {
      "name": "Aster Corner Sofa in Sand",
      "slug": "aster-corner-sofa-in-sand",
      "sku": "AUR-DEMO-003-01",
      "categoryKey": "corner-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Corner Sofas"
      ],
      "description": "Aster Corner Sofa in Sand brings corner sofas into a coordinated minimal interior. An L-shaped seat creates a relaxed conversation area. A reversible chaise can be positioned to suit the room layout.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 265 cm wide × 86 cm high × 165 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 78 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An L-shaped seat creates a relaxed conversation area. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 85999,
      "stock": 30,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for corner sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 265,
        "height": 86,
        "depth": 165,
        "unit": "cm"
      },
      "weight": {
        "value": 78,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "corner-sofas",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Corner Sofa in Sand",
      "metaDescription": "Aster Corner Sofa in Sand. 265 cm wide × 86 cm high × 165 cm deep. Explore this sample corner sofas listing for furniture catalogue development."
    },
    {
      "name": "Niva Corner Sofa in Sage Green",
      "slug": "niva-corner-sofa-in-sage-green",
      "sku": "AUR-DEMO-003-02",
      "categoryKey": "corner-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Corner Sofas"
      ],
      "description": "Niva Corner Sofa in Sage Green brings corner sofas into a coordinated scandinavian interior. An L-shaped seat creates a relaxed conversation area. A reversible chaise can be positioned to suit the room layout.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 265 cm wide × 86 cm high × 165 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 78 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An L-shaped seat creates a relaxed conversation area. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 97099,
      "stock": 43,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for corner sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 265,
        "height": 86,
        "depth": 165,
        "unit": "cm"
      },
      "weight": {
        "value": 78,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "corner-sofas",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Corner Sofa in Sage Green",
      "metaDescription": "Niva Corner Sofa in Sage Green. 265 cm wide × 86 cm high × 165 cm deep. Explore this sample corner sofas listing for furniture catalogue development."
    },
    {
      "name": "Kanso Corner Sofa in Storm Grey",
      "slug": "kanso-corner-sofa-in-storm-grey",
      "sku": "AUR-DEMO-003-03",
      "categoryKey": "corner-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Corner Sofas"
      ],
      "description": "Kanso Corner Sofa in Storm Grey brings corner sofas into a coordinated contemporary interior. An L-shaped seat creates a relaxed conversation area. A reversible chaise can be positioned to suit the room layout.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 265 cm wide × 86 cm high × 165 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 78 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An L-shaped seat creates a relaxed conversation area. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 109999,
      "stock": 15,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for corner sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 265,
        "height": 86,
        "depth": 165,
        "unit": "cm"
      },
      "weight": {
        "value": 78,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "corner-sofas",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Corner Sofa in Storm Grey",
      "metaDescription": "Kanso Corner Sofa in Storm Grey. 265 cm wide × 86 cm high × 165 cm deep. Explore this sample corner sofas listing for furniture catalogue development."
    },
    {
      "name": "Aranya Corner Sofa in Terracotta",
      "slug": "aranya-corner-sofa-in-terracotta",
      "sku": "AUR-DEMO-003-04",
      "categoryKey": "corner-sofas",
      "categoryPath": [
        "Living Room",
        "Upholstered Sofas",
        "Corner Sofas"
      ],
      "description": "Aranya Corner Sofa in Terracotta brings corner sofas into a coordinated cozy interior. An L-shaped seat creates a relaxed conversation area. A reversible chaise can be positioned to suit the room layout.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 265 cm wide × 86 cm high × 165 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 78 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An L-shaped seat creates a relaxed conversation area. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 127199,
      "stock": 28,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for corner sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 265,
        "height": 86,
        "depth": 165,
        "unit": "cm"
      },
      "weight": {
        "value": 78,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "upholstered-sofas",
        "corner-sofas",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Corner Sofa in Terracotta",
      "metaDescription": "Aranya Corner Sofa in Terracotta. 265 cm wide × 86 cm high × 165 cm deep. Explore this sample corner sofas listing for furniture catalogue development."
    },
    {
      "name": "Aster Lounge Chair in Sand",
      "slug": "aster-lounge-chair-in-sand",
      "sku": "AUR-DEMO-004-01",
      "categoryKey": "lounge-chairs",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Lounge Chairs"
      ],
      "description": "Aster Lounge Chair in Sand brings lounge chairs into a coordinated minimal interior. A gently reclined seat suits reading and relaxed lounging. A supportive back and padded arms provide everyday comfort.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 78 cm wide × 96 cm high × 83 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 18 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A gently reclined seat suits reading and relaxed lounging. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 18999,
      "stock": 41,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for lounge chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 78,
        "height": 96,
        "depth": 83,
        "unit": "cm"
      },
      "weight": {
        "value": 18,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "lounge-chairs",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Lounge Chair in Sand",
      "metaDescription": "Aster Lounge Chair in Sand. 78 cm wide × 96 cm high × 83 cm deep. Explore this sample lounge chairs listing for furniture catalogue development."
    },
    {
      "name": "Niva Lounge Chair in Sage Green",
      "slug": "niva-lounge-chair-in-sage-green",
      "sku": "AUR-DEMO-004-02",
      "categoryKey": "lounge-chairs",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Lounge Chairs"
      ],
      "description": "Niva Lounge Chair in Sage Green brings lounge chairs into a coordinated scandinavian interior. A gently reclined seat suits reading and relaxed lounging. A supportive back and padded arms provide everyday comfort.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 78 cm wide × 96 cm high × 83 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 18 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A gently reclined seat suits reading and relaxed lounging. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 21399,
      "stock": 13,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for lounge chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 78,
        "height": 96,
        "depth": 83,
        "unit": "cm"
      },
      "weight": {
        "value": 18,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "lounge-chairs",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Lounge Chair in Sage Green",
      "metaDescription": "Niva Lounge Chair in Sage Green. 78 cm wide × 96 cm high × 83 cm deep. Explore this sample lounge chairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Lounge Chair in Storm Grey",
      "slug": "kanso-lounge-chair-in-storm-grey",
      "sku": "AUR-DEMO-004-03",
      "categoryKey": "lounge-chairs",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Lounge Chairs"
      ],
      "description": "Kanso Lounge Chair in Storm Grey brings lounge chairs into a coordinated contemporary interior. A gently reclined seat suits reading and relaxed lounging. A supportive back and padded arms provide everyday comfort.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 78 cm wide × 96 cm high × 83 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 18 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A gently reclined seat suits reading and relaxed lounging. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 24199,
      "stock": 26,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for lounge chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 78,
        "height": 96,
        "depth": 83,
        "unit": "cm"
      },
      "weight": {
        "value": 18,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "lounge-chairs",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Lounge Chair in Storm Grey",
      "metaDescription": "Kanso Lounge Chair in Storm Grey. 78 cm wide × 96 cm high × 83 cm deep. Explore this sample lounge chairs listing for furniture catalogue development.",
      "originalPrice": 27199
    },
    {
      "name": "Aranya Lounge Chair in Terracotta",
      "slug": "aranya-lounge-chair-in-terracotta",
      "sku": "AUR-DEMO-004-04",
      "categoryKey": "lounge-chairs",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Lounge Chairs"
      ],
      "description": "Aranya Lounge Chair in Terracotta brings lounge chairs into a coordinated cozy interior. A gently reclined seat suits reading and relaxed lounging. A supportive back and padded arms provide everyday comfort.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 78 cm wide × 96 cm high × 83 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 18 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A gently reclined seat suits reading and relaxed lounging. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 27999,
      "stock": 39,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for lounge chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 78,
        "height": 96,
        "depth": 83,
        "unit": "cm"
      },
      "weight": {
        "value": 18,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "lounge-chairs",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Lounge Chair in Terracotta",
      "metaDescription": "Aranya Lounge Chair in Terracotta. 78 cm wide × 96 cm high × 83 cm deep. Explore this sample lounge chairs listing for furniture catalogue development."
    },
    {
      "name": "Aster Armchair in Sand",
      "slug": "aster-armchair-in-sand",
      "sku": "AUR-DEMO-005-01",
      "categoryKey": "armchairs",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Armchairs"
      ],
      "description": "Aster Armchair in Sand brings armchairs into a coordinated minimal interior. An upright cushioned seat works beside a sofa or desk. A compact footprint leaves room for side tables.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 84 cm wide × 91 cm high × 86 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 23 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An upright cushioned seat works beside a sofa or desk. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 22999,
      "stock": 11,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for armchair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 84,
        "height": 91,
        "depth": 86,
        "unit": "cm"
      },
      "weight": {
        "value": 23,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "armchairs",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Armchair in Sand",
      "metaDescription": "Aster Armchair in Sand. 84 cm wide × 91 cm high × 86 cm deep. Explore this sample armchairs listing for furniture catalogue development."
    },
    {
      "name": "Niva Armchair in Sage Green",
      "slug": "niva-armchair-in-sage-green",
      "sku": "AUR-DEMO-005-02",
      "categoryKey": "armchairs",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Armchairs"
      ],
      "description": "Niva Armchair in Sage Green brings armchairs into a coordinated scandinavian interior. An upright cushioned seat works beside a sofa or desk. A compact footprint leaves room for side tables.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 84 cm wide × 91 cm high × 86 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 23 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An upright cushioned seat works beside a sofa or desk. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 25899,
      "stock": 24,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for armchair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 84,
        "height": 91,
        "depth": 86,
        "unit": "cm"
      },
      "weight": {
        "value": 23,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "armchairs",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Armchair in Sage Green",
      "metaDescription": "Niva Armchair in Sage Green. 84 cm wide × 91 cm high × 86 cm deep. Explore this sample armchairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Armchair in Storm Grey",
      "slug": "kanso-armchair-in-storm-grey",
      "sku": "AUR-DEMO-005-03",
      "categoryKey": "armchairs",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Armchairs"
      ],
      "description": "Kanso Armchair in Storm Grey brings armchairs into a coordinated contemporary interior. An upright cushioned seat works beside a sofa or desk. A compact footprint leaves room for side tables.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 84 cm wide × 91 cm high × 86 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 23 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An upright cushioned seat works beside a sofa or desk. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 29399,
      "stock": 37,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for armchair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 84,
        "height": 91,
        "depth": 86,
        "unit": "cm"
      },
      "weight": {
        "value": 23,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "armchairs",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Armchair in Storm Grey",
      "metaDescription": "Kanso Armchair in Storm Grey. 84 cm wide × 91 cm high × 86 cm deep. Explore this sample armchairs listing for furniture catalogue development."
    },
    {
      "name": "Aranya Armchair in Terracotta",
      "slug": "aranya-armchair-in-terracotta",
      "sku": "AUR-DEMO-005-04",
      "categoryKey": "armchairs",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Armchairs"
      ],
      "description": "Aranya Armchair in Terracotta brings armchairs into a coordinated cozy interior. An upright cushioned seat works beside a sofa or desk. A compact footprint leaves room for side tables.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 84 cm wide × 91 cm high × 86 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 23 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An upright cushioned seat works beside a sofa or desk. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 33899,
      "stock": 9,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for armchair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 84,
        "height": 91,
        "depth": 86,
        "unit": "cm"
      },
      "weight": {
        "value": 23,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "armchairs",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Armchair in Terracotta",
      "metaDescription": "Aranya Armchair in Terracotta. 84 cm wide × 91 cm high × 86 cm deep. Explore this sample armchairs listing for furniture catalogue development."
    },
    {
      "name": "Aster Manual Recliner in Sand",
      "slug": "aster-manual-recliner-in-sand",
      "sku": "AUR-DEMO-006-01",
      "categoryKey": "manual-recliners",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Manual Recliners"
      ],
      "description": "Aster Manual Recliner in Sand brings recliners into a coordinated minimal interior. A manual reclining mechanism extends the footrest. Allow at least 60 cm behind the chair for reclining clearance.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 88 cm wide × 104 cm high × 96 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 39 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A manual reclining mechanism extends the footrest. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 45999,
      "stock": 22,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for manual recliner",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 88,
        "height": 104,
        "depth": 96,
        "unit": "cm"
      },
      "weight": {
        "value": 39,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "recliners",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Manual Recliner in Sand",
      "metaDescription": "Aster Manual Recliner in Sand. 88 cm wide × 104 cm high × 96 cm deep. Explore this sample recliners listing for furniture catalogue development."
    },
    {
      "name": "Niva Manual Recliner in Sage Green",
      "slug": "niva-manual-recliner-in-sage-green",
      "sku": "AUR-DEMO-006-02",
      "categoryKey": "manual-recliners",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Manual Recliners"
      ],
      "description": "Niva Manual Recliner in Sage Green brings recliners into a coordinated scandinavian interior. A manual reclining mechanism extends the footrest. Allow at least 60 cm behind the chair for reclining clearance.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 88 cm wide × 104 cm high × 96 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 39 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A manual reclining mechanism extends the footrest. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 51899,
      "stock": 35,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for manual recliner",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 88,
        "height": 104,
        "depth": 96,
        "unit": "cm"
      },
      "weight": {
        "value": 39,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "recliners",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Manual Recliner in Sage Green",
      "metaDescription": "Niva Manual Recliner in Sage Green. 88 cm wide × 104 cm high × 96 cm deep. Explore this sample recliners listing for furniture catalogue development.",
      "originalPrice": 58199
    },
    {
      "name": "Kanso Manual Recliner in Storm Grey",
      "slug": "kanso-manual-recliner-in-storm-grey",
      "sku": "AUR-DEMO-006-03",
      "categoryKey": "manual-recliners",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Manual Recliners"
      ],
      "description": "Kanso Manual Recliner in Storm Grey brings recliners into a coordinated contemporary interior. A manual reclining mechanism extends the footrest. Allow at least 60 cm behind the chair for reclining clearance.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 88 cm wide × 104 cm high × 96 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 39 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A manual reclining mechanism extends the footrest. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 58799,
      "stock": 48,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for manual recliner",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 88,
        "height": 104,
        "depth": 96,
        "unit": "cm"
      },
      "weight": {
        "value": 39,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "recliners",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Manual Recliner in Storm Grey",
      "metaDescription": "Kanso Manual Recliner in Storm Grey. 88 cm wide × 104 cm high × 96 cm deep. Explore this sample recliners listing for furniture catalogue development."
    },
    {
      "name": "Aranya Manual Recliner in Terracotta",
      "slug": "aranya-manual-recliner-in-terracotta",
      "sku": "AUR-DEMO-006-04",
      "categoryKey": "manual-recliners",
      "categoryPath": [
        "Living Room",
        "Accent Seating",
        "Manual Recliners"
      ],
      "description": "Aranya Manual Recliner in Terracotta brings recliners into a coordinated cozy interior. A manual reclining mechanism extends the footrest. Allow at least 60 cm behind the chair for reclining clearance.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 88 cm wide × 104 cm high × 96 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 39 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A manual reclining mechanism extends the footrest. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 67999,
      "stock": 20,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for manual recliner",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 88,
        "height": 104,
        "depth": 96,
        "unit": "cm"
      },
      "weight": {
        "value": 39,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "accent-seating",
        "recliners",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Manual Recliner in Terracotta",
      "metaDescription": "Aranya Manual Recliner in Terracotta. 88 cm wide × 104 cm high × 96 cm deep. Explore this sample recliners listing for furniture catalogue development."
    },
    {
      "name": "Aster Coffee Table in Natural Oak",
      "slug": "aster-coffee-table-in-natural-oak",
      "sku": "AUR-DEMO-007-01",
      "categoryKey": "coffee-tables",
      "categoryPath": [
        "Living Room",
        "Coffee Tables"
      ],
      "description": "Aster Coffee Table in Natural Oak brings coffee tables into a coordinated minimal interior. A low rectangular surface keeps refreshments within reach. A lower shelf stores books and everyday accessories.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 110 cm wide × 42 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 19 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A low rectangular surface keeps refreshments within reach. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 14999,
      "stock": 33,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for coffee table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 110,
        "height": 42,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 19,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "coffee-tables",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Coffee Table in Natural Oak",
      "metaDescription": "Aster Coffee Table in Natural Oak. 110 cm wide × 42 cm high × 60 cm deep. Explore this sample coffee tables listing for furniture catalogue development."
    },
    {
      "name": "Niva Coffee Table in Walnut",
      "slug": "niva-coffee-table-in-walnut",
      "sku": "AUR-DEMO-007-02",
      "categoryKey": "coffee-tables",
      "categoryPath": [
        "Living Room",
        "Coffee Tables"
      ],
      "description": "Niva Coffee Table in Walnut brings coffee tables into a coordinated scandinavian interior. A low rectangular surface keeps refreshments within reach. A lower shelf stores books and everyday accessories.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 110 cm wide × 42 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 19 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A low rectangular surface keeps refreshments within reach. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 16899,
      "stock": 46,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for coffee table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 110,
        "height": 42,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 19,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "coffee-tables",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Coffee Table in Walnut",
      "metaDescription": "Niva Coffee Table in Walnut. 110 cm wide × 42 cm high × 60 cm deep. Explore this sample coffee tables listing for furniture catalogue development."
    },
    {
      "name": "Kanso Coffee Table in Charcoal",
      "slug": "kanso-coffee-table-in-charcoal",
      "sku": "AUR-DEMO-007-03",
      "categoryKey": "coffee-tables",
      "categoryPath": [
        "Living Room",
        "Coffee Tables"
      ],
      "description": "Kanso Coffee Table in Charcoal brings coffee tables into a coordinated industrial interior. A low rectangular surface keeps refreshments within reach. A lower shelf stores books and everyday accessories.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 110 cm wide × 42 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 19 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A low rectangular surface keeps refreshments within reach. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 19099,
      "stock": 18,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for coffee table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 110,
        "height": 42,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 19,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "coffee-tables",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Coffee Table in Charcoal",
      "metaDescription": "Kanso Coffee Table in Charcoal. 110 cm wide × 42 cm high × 60 cm deep. Explore this sample coffee tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Coffee Table in Honey Brown",
      "slug": "aranya-coffee-table-in-honey-brown",
      "sku": "AUR-DEMO-007-04",
      "categoryKey": "coffee-tables",
      "categoryPath": [
        "Living Room",
        "Coffee Tables"
      ],
      "description": "Aranya Coffee Table in Honey Brown brings coffee tables into a coordinated classic interior. A low rectangular surface keeps refreshments within reach. A lower shelf stores books and everyday accessories.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 110 cm wide × 42 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 19 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A low rectangular surface keeps refreshments within reach. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 22099,
      "stock": 31,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for coffee table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 110,
        "height": 42,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 19,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "coffee-tables",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Coffee Table in Honey Brown",
      "metaDescription": "Aranya Coffee Table in Honey Brown. 110 cm wide × 42 cm high × 60 cm deep. Explore this sample coffee tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Side Table in Natural Oak",
      "slug": "aster-side-table-in-natural-oak",
      "sku": "AUR-DEMO-008-01",
      "categoryKey": "side-tables",
      "categoryPath": [
        "Living Room",
        "Side Tables"
      ],
      "description": "Aster Side Table in Natural Oak brings side tables into a coordinated minimal interior. A compact tabletop fits beside a sofa or reading chair. Rounded corners and a stable base suit smaller rooms.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 45 cm wide × 54 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact tabletop fits beside a sofa or reading chair. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 6999,
      "stock": 44,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for side table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 45,
        "height": 54,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "side-tables",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Side Table in Natural Oak",
      "metaDescription": "Aster Side Table in Natural Oak. 45 cm wide × 54 cm high × 45 cm deep. Explore this sample side tables listing for furniture catalogue development.",
      "originalPrice": 7899
    },
    {
      "name": "Niva Side Table in Walnut",
      "slug": "niva-side-table-in-walnut",
      "sku": "AUR-DEMO-008-02",
      "categoryKey": "side-tables",
      "categoryPath": [
        "Living Room",
        "Side Tables"
      ],
      "description": "Niva Side Table in Walnut brings side tables into a coordinated scandinavian interior. A compact tabletop fits beside a sofa or reading chair. Rounded corners and a stable base suit smaller rooms.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 45 cm wide × 54 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact tabletop fits beside a sofa or reading chair. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 7799,
      "stock": 16,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for side table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 45,
        "height": 54,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "side-tables",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Side Table in Walnut",
      "metaDescription": "Niva Side Table in Walnut. 45 cm wide × 54 cm high × 45 cm deep. Explore this sample side tables listing for furniture catalogue development."
    },
    {
      "name": "Kanso Side Table in Charcoal",
      "slug": "kanso-side-table-in-charcoal",
      "sku": "AUR-DEMO-008-03",
      "categoryKey": "side-tables",
      "categoryPath": [
        "Living Room",
        "Side Tables"
      ],
      "description": "Kanso Side Table in Charcoal brings side tables into a coordinated industrial interior. A compact tabletop fits beside a sofa or reading chair. Rounded corners and a stable base suit smaller rooms.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 45 cm wide × 54 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact tabletop fits beside a sofa or reading chair. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 8899,
      "stock": 29,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for side table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 45,
        "height": 54,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "side-tables",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Side Table in Charcoal",
      "metaDescription": "Kanso Side Table in Charcoal. 45 cm wide × 54 cm high × 45 cm deep. Explore this sample side tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Side Table in Honey Brown",
      "slug": "aranya-side-table-in-honey-brown",
      "sku": "AUR-DEMO-008-04",
      "categoryKey": "side-tables",
      "categoryPath": [
        "Living Room",
        "Side Tables"
      ],
      "description": "Aranya Side Table in Honey Brown brings side tables into a coordinated classic interior. A compact tabletop fits beside a sofa or reading chair. Rounded corners and a stable base suit smaller rooms.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 45 cm wide × 54 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact tabletop fits beside a sofa or reading chair. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 10299,
      "stock": 42,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for side table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 45,
        "height": 54,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "side-tables",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Side Table in Honey Brown",
      "metaDescription": "Aranya Side Table in Honey Brown. 45 cm wide × 54 cm high × 45 cm deep. Explore this sample side tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Living Room Console in Natural Oak",
      "slug": "aster-living-room-console-in-natural-oak",
      "sku": "AUR-DEMO-009-01",
      "categoryKey": "living-room-consoles",
      "categoryPath": [
        "Living Room",
        "Living Room Consoles"
      ],
      "description": "Aster Living Room Console in Natural Oak brings living room consoles into a coordinated minimal interior. A narrow footprint suits the wall behind a sofa. Two drawers keep chargers and small accessories organised.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 120 cm wide × 78 cm high × 35 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 24 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A narrow footprint suits the wall behind a sofa. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 21999,
      "stock": 14,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for living room console",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 120,
        "height": 78,
        "depth": 35,
        "unit": "cm"
      },
      "weight": {
        "value": 24,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "living-room-consoles",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Living Room Console in Natural Oak",
      "metaDescription": "Aster Living Room Console in Natural Oak. 120 cm wide × 78 cm high × 35 cm deep. Explore this sample living room consoles listing for furniture catalogue development."
    },
    {
      "name": "Niva Living Room Console in Walnut",
      "slug": "niva-living-room-console-in-walnut",
      "sku": "AUR-DEMO-009-02",
      "categoryKey": "living-room-consoles",
      "categoryPath": [
        "Living Room",
        "Living Room Consoles"
      ],
      "description": "Niva Living Room Console in Walnut brings living room consoles into a coordinated scandinavian interior. A narrow footprint suits the wall behind a sofa. Two drawers keep chargers and small accessories organised.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 120 cm wide × 78 cm high × 35 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 24 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A narrow footprint suits the wall behind a sofa. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 24799,
      "stock": 27,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for living room console",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 120,
        "height": 78,
        "depth": 35,
        "unit": "cm"
      },
      "weight": {
        "value": 24,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "living-room-consoles",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Living Room Console in Walnut",
      "metaDescription": "Niva Living Room Console in Walnut. 120 cm wide × 78 cm high × 35 cm deep. Explore this sample living room consoles listing for furniture catalogue development."
    },
    {
      "name": "Kanso Living Room Console in Charcoal",
      "slug": "kanso-living-room-console-in-charcoal",
      "sku": "AUR-DEMO-009-03",
      "categoryKey": "living-room-consoles",
      "categoryPath": [
        "Living Room",
        "Living Room Consoles"
      ],
      "description": "Kanso Living Room Console in Charcoal brings living room consoles into a coordinated industrial interior. A narrow footprint suits the wall behind a sofa. Two drawers keep chargers and small accessories organised.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 120 cm wide × 78 cm high × 35 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 24 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A narrow footprint suits the wall behind a sofa. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 28099,
      "stock": 40,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for living room console",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 120,
        "height": 78,
        "depth": 35,
        "unit": "cm"
      },
      "weight": {
        "value": 24,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "living-room-consoles",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Living Room Console in Charcoal",
      "metaDescription": "Kanso Living Room Console in Charcoal. 120 cm wide × 78 cm high × 35 cm deep. Explore this sample living room consoles listing for furniture catalogue development."
    },
    {
      "name": "Aranya Living Room Console in Honey Brown",
      "slug": "aranya-living-room-console-in-honey-brown",
      "sku": "AUR-DEMO-009-04",
      "categoryKey": "living-room-consoles",
      "categoryPath": [
        "Living Room",
        "Living Room Consoles"
      ],
      "description": "Aranya Living Room Console in Honey Brown brings living room consoles into a coordinated classic interior. A narrow footprint suits the wall behind a sofa. Two drawers keep chargers and small accessories organised.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 120 cm wide × 78 cm high × 35 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 24 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A narrow footprint suits the wall behind a sofa. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 32499,
      "stock": 12,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
          "alt": "Living Room interior reference for living room console",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 120,
        "height": 78,
        "depth": 35,
        "unit": "cm"
      },
      "weight": {
        "value": 24,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "living-room",
        "living-room-tables",
        "living-room-consoles",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Living Room Console in Honey Brown",
      "metaDescription": "Aranya Living Room Console in Honey Brown. 120 cm wide × 78 cm high × 35 cm deep. Explore this sample living room consoles listing for furniture catalogue development.",
      "originalPrice": 36399
    },
    {
      "name": "Aster Queen Bed Frame in Natural Oak",
      "slug": "aster-queen-bed-frame-in-natural-oak",
      "sku": "AUR-DEMO-010-01",
      "categoryKey": "queen-bed-frames",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "Queen Bed Frames"
      ],
      "description": "Aster Queen Bed Frame in Natural Oak brings queen beds into a coordinated minimal interior. Designed for a separately purchased 152 by 198 cm mattress. A ventilated slatted base supports everyday sleeping comfort.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 160 cm wide × 100 cm high × 211 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 57 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Designed for a separately purchased 152 by 198 cm mattress. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 42999,
      "stock": 25,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen bed frame",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 160,
        "height": 100,
        "depth": 211,
        "unit": "cm"
      },
      "weight": {
        "value": 57,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "queen-beds",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Queen Bed Frame in Natural Oak",
      "metaDescription": "Aster Queen Bed Frame in Natural Oak. 160 cm wide × 100 cm high × 211 cm deep. Explore this sample queen beds listing for furniture catalogue development."
    },
    {
      "name": "Niva Queen Bed Frame in Walnut",
      "slug": "niva-queen-bed-frame-in-walnut",
      "sku": "AUR-DEMO-010-02",
      "categoryKey": "queen-bed-frames",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "Queen Bed Frames"
      ],
      "description": "Niva Queen Bed Frame in Walnut brings queen beds into a coordinated scandinavian interior. Designed for a separately purchased 152 by 198 cm mattress. A ventilated slatted base supports everyday sleeping comfort.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 160 cm wide × 100 cm high × 211 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 57 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Designed for a separately purchased 152 by 198 cm mattress. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 48499,
      "stock": 0,
      "status": "out_of_stock",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen bed frame",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 160,
        "height": 100,
        "depth": 211,
        "unit": "cm"
      },
      "weight": {
        "value": 57,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "queen-beds",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Queen Bed Frame in Walnut",
      "metaDescription": "Niva Queen Bed Frame in Walnut. 160 cm wide × 100 cm high × 211 cm deep. Explore this sample queen beds listing for furniture catalogue development."
    },
    {
      "name": "Kanso Queen Bed Frame in Charcoal",
      "slug": "kanso-queen-bed-frame-in-charcoal",
      "sku": "AUR-DEMO-010-03",
      "categoryKey": "queen-bed-frames",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "Queen Bed Frames"
      ],
      "description": "Kanso Queen Bed Frame in Charcoal brings queen beds into a coordinated industrial interior. Designed for a separately purchased 152 by 198 cm mattress. A ventilated slatted base supports everyday sleeping comfort.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 160 cm wide × 100 cm high × 211 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 57 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Designed for a separately purchased 152 by 198 cm mattress. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 54999,
      "stock": 10,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen bed frame",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 160,
        "height": 100,
        "depth": 211,
        "unit": "cm"
      },
      "weight": {
        "value": 57,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "queen-beds",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Queen Bed Frame in Charcoal",
      "metaDescription": "Kanso Queen Bed Frame in Charcoal. 160 cm wide × 100 cm high × 211 cm deep. Explore this sample queen beds listing for furniture catalogue development."
    },
    {
      "name": "Aranya Queen Bed Frame in Honey Brown",
      "slug": "aranya-queen-bed-frame-in-honey-brown",
      "sku": "AUR-DEMO-010-04",
      "categoryKey": "queen-bed-frames",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "Queen Bed Frames"
      ],
      "description": "Aranya Queen Bed Frame in Honey Brown brings queen beds into a coordinated classic interior. Designed for a separately purchased 152 by 198 cm mattress. A ventilated slatted base supports everyday sleeping comfort.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 160 cm wide × 100 cm high × 211 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 57 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Designed for a separately purchased 152 by 198 cm mattress. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 63499,
      "stock": 23,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen bed frame",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 160,
        "height": 100,
        "depth": 211,
        "unit": "cm"
      },
      "weight": {
        "value": 57,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "queen-beds",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Queen Bed Frame in Honey Brown",
      "metaDescription": "Aranya Queen Bed Frame in Honey Brown. 160 cm wide × 100 cm high × 211 cm deep. Explore this sample queen beds listing for furniture catalogue development."
    },
    {
      "name": "Aster King Bed Frame in Natural Oak",
      "slug": "aster-king-bed-frame-in-natural-oak",
      "sku": "AUR-DEMO-011-01",
      "categoryKey": "king-bed-frames",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "King Bed Frames"
      ],
      "description": "Aster King Bed Frame in Natural Oak brings king beds into a coordinated minimal interior. Designed for a separately purchased 183 by 198 cm mattress. A centre support rail reinforces the wider sleeping platform.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 190 cm wide × 105 cm high × 211 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 72 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Designed for a separately purchased 183 by 198 cm mattress. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 58999,
      "stock": 36,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for king bed frame",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 190,
        "height": 105,
        "depth": 211,
        "unit": "cm"
      },
      "weight": {
        "value": 72,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "king-beds",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster King Bed Frame in Natural Oak",
      "metaDescription": "Aster King Bed Frame in Natural Oak. 190 cm wide × 105 cm high × 211 cm deep. Explore this sample king beds listing for furniture catalogue development."
    },
    {
      "name": "Niva King Bed Frame in Walnut",
      "slug": "niva-king-bed-frame-in-walnut",
      "sku": "AUR-DEMO-011-02",
      "categoryKey": "king-bed-frames",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "King Bed Frames"
      ],
      "description": "Niva King Bed Frame in Walnut brings king beds into a coordinated scandinavian interior. Designed for a separately purchased 183 by 198 cm mattress. A centre support rail reinforces the wider sleeping platform.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 190 cm wide × 105 cm high × 211 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 72 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Designed for a separately purchased 183 by 198 cm mattress. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 66599,
      "stock": 8,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for king bed frame",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 190,
        "height": 105,
        "depth": 211,
        "unit": "cm"
      },
      "weight": {
        "value": 72,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "king-beds",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva King Bed Frame in Walnut",
      "metaDescription": "Niva King Bed Frame in Walnut. 190 cm wide × 105 cm high × 211 cm deep. Explore this sample king beds listing for furniture catalogue development."
    },
    {
      "name": "Kanso King Bed Frame in Charcoal",
      "slug": "kanso-king-bed-frame-in-charcoal",
      "sku": "AUR-DEMO-011-03",
      "categoryKey": "king-bed-frames",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "King Bed Frames"
      ],
      "description": "Kanso King Bed Frame in Charcoal brings king beds into a coordinated industrial interior. Designed for a separately purchased 183 by 198 cm mattress. A centre support rail reinforces the wider sleeping platform.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 190 cm wide × 105 cm high × 211 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 72 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Designed for a separately purchased 183 by 198 cm mattress. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 75399,
      "stock": 21,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for king bed frame",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 190,
        "height": 105,
        "depth": 211,
        "unit": "cm"
      },
      "weight": {
        "value": 72,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "king-beds",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso King Bed Frame in Charcoal",
      "metaDescription": "Kanso King Bed Frame in Charcoal. 190 cm wide × 105 cm high × 211 cm deep. Explore this sample king beds listing for furniture catalogue development.",
      "originalPrice": 84499
    },
    {
      "name": "Aranya King Bed Frame in Honey Brown",
      "slug": "aranya-king-bed-frame-in-honey-brown",
      "sku": "AUR-DEMO-011-04",
      "categoryKey": "king-bed-frames",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "King Bed Frames"
      ],
      "description": "Aranya King Bed Frame in Honey Brown brings king beds into a coordinated classic interior. Designed for a separately purchased 183 by 198 cm mattress. A centre support rail reinforces the wider sleeping platform.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 190 cm wide × 105 cm high × 211 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 72 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Designed for a separately purchased 183 by 198 cm mattress. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 87199,
      "stock": 34,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for king bed frame",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 190,
        "height": 105,
        "depth": 211,
        "unit": "cm"
      },
      "weight": {
        "value": 72,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "king-beds",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya King Bed Frame in Honey Brown",
      "metaDescription": "Aranya King Bed Frame in Honey Brown. 190 cm wide × 105 cm high × 211 cm deep. Explore this sample king beds listing for furniture catalogue development."
    },
    {
      "name": "Aster Queen Storage Bed in Natural Oak",
      "slug": "aster-queen-storage-bed-in-natural-oak",
      "sku": "AUR-DEMO-012-01",
      "categoryKey": "queen-storage-beds",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "Queen Storage Beds"
      ],
      "description": "Aster Queen Storage Bed in Natural Oak brings storage beds into a coordinated minimal interior. Lift-up under-bed storage keeps spare bedding accessible. Designed for a separately purchased 152 by 198 cm mattress.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 162 cm wide × 108 cm high × 213 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 89 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Lift-up under-bed storage keeps spare bedding accessible. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 67999,
      "stock": 47,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen storage bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 162,
        "height": 108,
        "depth": 213,
        "unit": "cm"
      },
      "weight": {
        "value": 89,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "storage-beds",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Queen Storage Bed in Natural Oak",
      "metaDescription": "Aster Queen Storage Bed in Natural Oak. 162 cm wide × 108 cm high × 213 cm deep. Explore this sample storage beds listing for furniture catalogue development."
    },
    {
      "name": "Niva Queen Storage Bed in Walnut",
      "slug": "niva-queen-storage-bed-in-walnut",
      "sku": "AUR-DEMO-012-02",
      "categoryKey": "queen-storage-beds",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "Queen Storage Beds"
      ],
      "description": "Niva Queen Storage Bed in Walnut brings storage beds into a coordinated scandinavian interior. Lift-up under-bed storage keeps spare bedding accessible. Designed for a separately purchased 152 by 198 cm mattress.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 162 cm wide × 108 cm high × 213 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 89 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Lift-up under-bed storage keeps spare bedding accessible. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 76799,
      "stock": 19,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen storage bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 162,
        "height": 108,
        "depth": 213,
        "unit": "cm"
      },
      "weight": {
        "value": 89,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "storage-beds",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Queen Storage Bed in Walnut",
      "metaDescription": "Niva Queen Storage Bed in Walnut. 162 cm wide × 108 cm high × 213 cm deep. Explore this sample storage beds listing for furniture catalogue development."
    },
    {
      "name": "Kanso Queen Storage Bed in Charcoal",
      "slug": "kanso-queen-storage-bed-in-charcoal",
      "sku": "AUR-DEMO-012-03",
      "categoryKey": "queen-storage-beds",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "Queen Storage Beds"
      ],
      "description": "Kanso Queen Storage Bed in Charcoal brings storage beds into a coordinated industrial interior. Lift-up under-bed storage keeps spare bedding accessible. Designed for a separately purchased 152 by 198 cm mattress.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 162 cm wide × 108 cm high × 213 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 89 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Lift-up under-bed storage keeps spare bedding accessible. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 86999,
      "stock": 32,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen storage bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 162,
        "height": 108,
        "depth": 213,
        "unit": "cm"
      },
      "weight": {
        "value": 89,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "storage-beds",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Queen Storage Bed in Charcoal",
      "metaDescription": "Kanso Queen Storage Bed in Charcoal. 162 cm wide × 108 cm high × 213 cm deep. Explore this sample storage beds listing for furniture catalogue development."
    },
    {
      "name": "Aranya Queen Storage Bed in Honey Brown",
      "slug": "aranya-queen-storage-bed-in-honey-brown",
      "sku": "AUR-DEMO-012-04",
      "categoryKey": "queen-storage-beds",
      "categoryPath": [
        "Bedroom",
        "Bed Frames",
        "Queen Storage Beds"
      ],
      "description": "Aranya Queen Storage Bed in Honey Brown brings storage beds into a coordinated classic interior. Lift-up under-bed storage keeps spare bedding accessible. Designed for a separately purchased 152 by 198 cm mattress.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 162 cm wide × 108 cm high × 213 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 89 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Lift-up under-bed storage keeps spare bedding accessible. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 100499,
      "stock": 45,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen storage bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 162,
        "height": 108,
        "depth": 213,
        "unit": "cm"
      },
      "weight": {
        "value": 89,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bed-frames",
        "storage-beds",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Queen Storage Bed in Honey Brown",
      "metaDescription": "Aranya Queen Storage Bed in Honey Brown. 162 cm wide × 108 cm high × 213 cm deep. Explore this sample storage beds listing for furniture catalogue development."
    },
    {
      "name": "Aster Three Door Wardrobe in Natural Oak",
      "slug": "aster-three-door-wardrobe-in-natural-oak",
      "sku": "AUR-DEMO-013-01",
      "categoryKey": "three-door-wardrobes",
      "categoryPath": [
        "Bedroom",
        "Wardrobes",
        "Three Door Wardrobes"
      ],
      "description": "Aster Three Door Wardrobe in Natural Oak brings wardrobes into a coordinated minimal interior. A hanging rail and adjustable shelves divide everyday clothing. Three doors open to separate storage compartments.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 150 cm wide × 210 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 94 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A hanging rail and adjustable shelves divide everyday clothing. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 54999,
      "stock": 17,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for three door wardrobe",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 150,
        "height": 210,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 94,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "wardrobes",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Three Door Wardrobe in Natural Oak",
      "metaDescription": "Aster Three Door Wardrobe in Natural Oak. 150 cm wide × 210 cm high × 58 cm deep. Explore this sample wardrobes listing for furniture catalogue development."
    },
    {
      "name": "Niva Three Door Wardrobe in Walnut",
      "slug": "niva-three-door-wardrobe-in-walnut",
      "sku": "AUR-DEMO-013-02",
      "categoryKey": "three-door-wardrobes",
      "categoryPath": [
        "Bedroom",
        "Wardrobes",
        "Three Door Wardrobes"
      ],
      "description": "Niva Three Door Wardrobe in Walnut brings wardrobes into a coordinated scandinavian interior. A hanging rail and adjustable shelves divide everyday clothing. Three doors open to separate storage compartments.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 150 cm wide × 210 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 94 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A hanging rail and adjustable shelves divide everyday clothing. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 62099,
      "stock": 30,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for three door wardrobe",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 150,
        "height": 210,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 94,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "wardrobes",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Three Door Wardrobe in Walnut",
      "metaDescription": "Niva Three Door Wardrobe in Walnut. 150 cm wide × 210 cm high × 58 cm deep. Explore this sample wardrobes listing for furniture catalogue development.",
      "originalPrice": 69599
    },
    {
      "name": "Kanso Three Door Wardrobe in Charcoal",
      "slug": "kanso-three-door-wardrobe-in-charcoal",
      "sku": "AUR-DEMO-013-03",
      "categoryKey": "three-door-wardrobes",
      "categoryPath": [
        "Bedroom",
        "Wardrobes",
        "Three Door Wardrobes"
      ],
      "description": "Kanso Three Door Wardrobe in Charcoal brings wardrobes into a coordinated industrial interior. A hanging rail and adjustable shelves divide everyday clothing. Three doors open to separate storage compartments.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 150 cm wide × 210 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 94 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A hanging rail and adjustable shelves divide everyday clothing. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 70299,
      "stock": 43,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for three door wardrobe",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 150,
        "height": 210,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 94,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "wardrobes",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Three Door Wardrobe in Charcoal",
      "metaDescription": "Kanso Three Door Wardrobe in Charcoal. 150 cm wide × 210 cm high × 58 cm deep. Explore this sample wardrobes listing for furniture catalogue development."
    },
    {
      "name": "Aranya Three Door Wardrobe in Honey Brown",
      "slug": "aranya-three-door-wardrobe-in-honey-brown",
      "sku": "AUR-DEMO-013-04",
      "categoryKey": "three-door-wardrobes",
      "categoryPath": [
        "Bedroom",
        "Wardrobes",
        "Three Door Wardrobes"
      ],
      "description": "Aranya Three Door Wardrobe in Honey Brown brings wardrobes into a coordinated classic interior. A hanging rail and adjustable shelves divide everyday clothing. Three doors open to separate storage compartments.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 150 cm wide × 210 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 94 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A hanging rail and adjustable shelves divide everyday clothing. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 81299,
      "stock": 15,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for three door wardrobe",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 150,
        "height": 210,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 94,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "wardrobes",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Three Door Wardrobe in Honey Brown",
      "metaDescription": "Aranya Three Door Wardrobe in Honey Brown. 150 cm wide × 210 cm high × 58 cm deep. Explore this sample wardrobes listing for furniture catalogue development."
    },
    {
      "name": "Aster Six Drawer Dresser in Natural Oak",
      "slug": "aster-six-drawer-dresser-in-natural-oak",
      "sku": "AUR-DEMO-014-01",
      "categoryKey": "six-drawer-dressers",
      "categoryPath": [
        "Bedroom",
        "Dressers & Nightstands",
        "Six Drawer Dressers"
      ],
      "description": "Aster Six Drawer Dresser in Natural Oak brings dressers into a coordinated minimal interior. Six drawers separate clothing and folded linens. An anti-tip bracket must be fitted to a suitable wall.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 120 cm wide × 80 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 48 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Six drawers separate clothing and folded linens. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 32999,
      "stock": 28,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for six drawer dresser",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 120,
        "height": 80,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 48,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "dressers",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Six Drawer Dresser in Natural Oak",
      "metaDescription": "Aster Six Drawer Dresser in Natural Oak. 120 cm wide × 80 cm high × 45 cm deep. Explore this sample dressers listing for furniture catalogue development."
    },
    {
      "name": "Niva Six Drawer Dresser in Walnut",
      "slug": "niva-six-drawer-dresser-in-walnut",
      "sku": "AUR-DEMO-014-02",
      "categoryKey": "six-drawer-dressers",
      "categoryPath": [
        "Bedroom",
        "Dressers & Nightstands",
        "Six Drawer Dressers"
      ],
      "description": "Niva Six Drawer Dresser in Walnut brings dressers into a coordinated scandinavian interior. Six drawers separate clothing and folded linens. An anti-tip bracket must be fitted to a suitable wall.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 120 cm wide × 80 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 48 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Six drawers separate clothing and folded linens. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 37199,
      "stock": 41,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for six drawer dresser",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 120,
        "height": 80,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 48,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "dressers",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Six Drawer Dresser in Walnut",
      "metaDescription": "Niva Six Drawer Dresser in Walnut. 120 cm wide × 80 cm high × 45 cm deep. Explore this sample dressers listing for furniture catalogue development."
    },
    {
      "name": "Kanso Six Drawer Dresser in Charcoal",
      "slug": "kanso-six-drawer-dresser-in-charcoal",
      "sku": "AUR-DEMO-014-03",
      "categoryKey": "six-drawer-dressers",
      "categoryPath": [
        "Bedroom",
        "Dressers & Nightstands",
        "Six Drawer Dressers"
      ],
      "description": "Kanso Six Drawer Dresser in Charcoal brings dressers into a coordinated industrial interior. Six drawers separate clothing and folded linens. An anti-tip bracket must be fitted to a suitable wall.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 120 cm wide × 80 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 48 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Six drawers separate clothing and folded linens. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 42199,
      "stock": 13,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for six drawer dresser",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 120,
        "height": 80,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 48,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "dressers",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Six Drawer Dresser in Charcoal",
      "metaDescription": "Kanso Six Drawer Dresser in Charcoal. 120 cm wide × 80 cm high × 45 cm deep. Explore this sample dressers listing for furniture catalogue development."
    },
    {
      "name": "Aranya Six Drawer Dresser in Honey Brown",
      "slug": "aranya-six-drawer-dresser-in-honey-brown",
      "sku": "AUR-DEMO-014-04",
      "categoryKey": "six-drawer-dressers",
      "categoryPath": [
        "Bedroom",
        "Dressers & Nightstands",
        "Six Drawer Dressers"
      ],
      "description": "Aranya Six Drawer Dresser in Honey Brown brings dressers into a coordinated classic interior. Six drawers separate clothing and folded linens. An anti-tip bracket must be fitted to a suitable wall.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 120 cm wide × 80 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 48 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Six drawers separate clothing and folded linens. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 48699,
      "stock": 26,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for six drawer dresser",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 120,
        "height": 80,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 48,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "dressers",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Six Drawer Dresser in Honey Brown",
      "metaDescription": "Aranya Six Drawer Dresser in Honey Brown. 120 cm wide × 80 cm high × 45 cm deep. Explore this sample dressers listing for furniture catalogue development."
    },
    {
      "name": "Aster Two Drawer Nightstand in Natural Oak",
      "slug": "aster-two-drawer-nightstand-in-natural-oak",
      "sku": "AUR-DEMO-015-01",
      "categoryKey": "two-drawer-nightstands",
      "categoryPath": [
        "Bedroom",
        "Dressers & Nightstands",
        "Two Drawer Nightstands"
      ],
      "description": "Aster Two Drawer Nightstand in Natural Oak brings nightstands into a coordinated minimal interior. Two bedside drawers keep essentials close at hand. A cable opening at the back helps route a charger.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 48 cm wide × 54 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 13 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two bedside drawers keep essentials close at hand. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 8999,
      "stock": 39,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for two drawer nightstand",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 48,
        "height": 54,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 13,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "nightstands",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Two Drawer Nightstand in Natural Oak",
      "metaDescription": "Aster Two Drawer Nightstand in Natural Oak. 48 cm wide × 54 cm high × 40 cm deep. Explore this sample nightstands listing for furniture catalogue development.",
      "originalPrice": 10099
    },
    {
      "name": "Niva Two Drawer Nightstand in Walnut",
      "slug": "niva-two-drawer-nightstand-in-walnut",
      "sku": "AUR-DEMO-015-02",
      "categoryKey": "two-drawer-nightstands",
      "categoryPath": [
        "Bedroom",
        "Dressers & Nightstands",
        "Two Drawer Nightstands"
      ],
      "description": "Niva Two Drawer Nightstand in Walnut brings nightstands into a coordinated scandinavian interior. Two bedside drawers keep essentials close at hand. A cable opening at the back helps route a charger.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 48 cm wide × 54 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 13 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two bedside drawers keep essentials close at hand. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 10099,
      "stock": 11,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for two drawer nightstand",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 48,
        "height": 54,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 13,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "nightstands",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Two Drawer Nightstand in Walnut",
      "metaDescription": "Niva Two Drawer Nightstand in Walnut. 48 cm wide × 54 cm high × 40 cm deep. Explore this sample nightstands listing for furniture catalogue development."
    },
    {
      "name": "Kanso Two Drawer Nightstand in Charcoal",
      "slug": "kanso-two-drawer-nightstand-in-charcoal",
      "sku": "AUR-DEMO-015-03",
      "categoryKey": "two-drawer-nightstands",
      "categoryPath": [
        "Bedroom",
        "Dressers & Nightstands",
        "Two Drawer Nightstands"
      ],
      "description": "Kanso Two Drawer Nightstand in Charcoal brings nightstands into a coordinated industrial interior. Two bedside drawers keep essentials close at hand. A cable opening at the back helps route a charger.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 48 cm wide × 54 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 13 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two bedside drawers keep essentials close at hand. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 11399,
      "stock": 24,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for two drawer nightstand",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 48,
        "height": 54,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 13,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "nightstands",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Two Drawer Nightstand in Charcoal",
      "metaDescription": "Kanso Two Drawer Nightstand in Charcoal. 48 cm wide × 54 cm high × 40 cm deep. Explore this sample nightstands listing for furniture catalogue development."
    },
    {
      "name": "Aranya Two Drawer Nightstand in Honey Brown",
      "slug": "aranya-two-drawer-nightstand-in-honey-brown",
      "sku": "AUR-DEMO-015-04",
      "categoryKey": "two-drawer-nightstands",
      "categoryPath": [
        "Bedroom",
        "Dressers & Nightstands",
        "Two Drawer Nightstands"
      ],
      "description": "Aranya Two Drawer Nightstand in Honey Brown brings nightstands into a coordinated classic interior. Two bedside drawers keep essentials close at hand. A cable opening at the back helps route a charger.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 48 cm wide × 54 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 13 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two bedside drawers keep essentials close at hand. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 13199,
      "stock": 37,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for two drawer nightstand",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 48,
        "height": 54,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 13,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "bedroom-storage",
        "nightstands",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Two Drawer Nightstand in Honey Brown",
      "metaDescription": "Aranya Two Drawer Nightstand in Honey Brown. 48 cm wide × 54 cm high × 40 cm deep. Explore this sample nightstands listing for furniture catalogue development."
    },
    {
      "name": "Aster Queen Pocket Spring Mattress in Ivory",
      "slug": "aster-queen-pocket-spring-mattress-in-ivory",
      "sku": "AUR-DEMO-016-01",
      "categoryKey": "queen-pocket-spring-mattresses",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Queen Pocket Spring Mattresses"
      ],
      "description": "Aster Queen Pocket Spring Mattress in Ivory brings mattresses into a coordinated modern interior. Individually wrapped springs limit motion transfer across the bed. A breathable quilted cover surrounds a medium-firm comfort layer.\n\nDesign and construction\nA quilted ivory cover encloses a medium-firm spring and foam core. Materials: Pocket springs, Comfort foam, Polyester quilted cover. The 152 cm wide × 25 cm high × 198 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 32 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Rotate regularly and use a washable mattress protector.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Individually wrapped springs limit motion transfer across the bed. Finished in ivory, with pocket springs, comfort foam.",
      "price": 27999,
      "stock": 9,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen pocket spring mattress",
          "isPrimary": true
        }
      ],
      "colors": [
        "Ivory"
      ],
      "materials": [
        "Pocket springs",
        "Comfort foam",
        "Polyester quilted cover"
      ],
      "style": "modern",
      "dimensions": {
        "width": 152,
        "height": 25,
        "depth": 198,
        "unit": "cm"
      },
      "weight": {
        "value": 32,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "mattresses",
        "aster",
        "ivory",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Queen Pocket Spring Mattress in Ivory",
      "metaDescription": "Aster Queen Pocket Spring Mattress in Ivory. 152 cm wide × 25 cm high × 198 cm deep. Explore this sample mattresses listing for furniture catalogue development."
    },
    {
      "name": "Niva Queen Pocket Spring Mattress in Natural White",
      "slug": "niva-queen-pocket-spring-mattress-in-natural-white",
      "sku": "AUR-DEMO-016-02",
      "categoryKey": "queen-pocket-spring-mattresses",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Queen Pocket Spring Mattresses"
      ],
      "description": "Niva Queen Pocket Spring Mattress in Natural White brings mattresses into a coordinated scandinavian interior. Individually wrapped springs limit motion transfer across the bed. A breathable quilted cover surrounds a medium-firm comfort layer.\n\nDesign and construction\nA cotton-blend cover adds a softer hand feel to the medium-firm core. Materials: Pocket springs, Comfort foam, Cotton blend cover. The 152 cm wide × 25 cm high × 198 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 32 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Air the mattress periodically; blot spills and allow to dry fully before use.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Individually wrapped springs limit motion transfer across the bed. Finished in natural white, with pocket springs, comfort foam.",
      "price": 31599,
      "stock": 22,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen pocket spring mattress",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural White"
      ],
      "materials": [
        "Pocket springs",
        "Comfort foam",
        "Cotton blend cover"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 152,
        "height": 25,
        "depth": 198,
        "unit": "cm"
      },
      "weight": {
        "value": 32,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "mattresses",
        "niva",
        "natural-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Queen Pocket Spring Mattress in Natural White",
      "metaDescription": "Niva Queen Pocket Spring Mattress in Natural White. 152 cm wide × 25 cm high × 198 cm deep. Explore this sample mattresses listing for furniture catalogue development."
    },
    {
      "name": "Kanso Queen Pocket Spring Mattress in Pearl Grey",
      "slug": "kanso-queen-pocket-spring-mattress-in-pearl-grey",
      "sku": "AUR-DEMO-016-03",
      "categoryKey": "queen-pocket-spring-mattresses",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Queen Pocket Spring Mattresses"
      ],
      "description": "Kanso Queen Pocket Spring Mattress in Pearl Grey brings mattresses into a coordinated contemporary interior. Individually wrapped springs limit motion transfer across the bed. A breathable quilted cover surrounds a medium-firm comfort layer.\n\nDesign and construction\nA knitted grey cover surrounds a firmer-density comfort foam layer. Materials: Pocket springs, High-density foam, Knitted polyester cover. The 152 cm wide × 25 cm high × 198 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 32 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a ventilated bed base and avoid folding or soaking the mattress.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Individually wrapped springs limit motion transfer across the bed. Finished in pearl grey, with pocket springs, high-density foam.",
      "price": 35799,
      "stock": 35,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen pocket spring mattress",
          "isPrimary": true
        }
      ],
      "colors": [
        "Pearl Grey"
      ],
      "materials": [
        "Pocket springs",
        "High-density foam",
        "Knitted polyester cover"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 152,
        "height": 25,
        "depth": 198,
        "unit": "cm"
      },
      "weight": {
        "value": 32,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "mattresses",
        "kanso",
        "pearl-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Queen Pocket Spring Mattress in Pearl Grey",
      "metaDescription": "Kanso Queen Pocket Spring Mattress in Pearl Grey. 152 cm wide × 25 cm high × 198 cm deep. Explore this sample mattresses listing for furniture catalogue development."
    },
    {
      "name": "Aranya Queen Pocket Spring Mattress in Cream",
      "slug": "aranya-queen-pocket-spring-mattress-in-cream",
      "sku": "AUR-DEMO-016-04",
      "categoryKey": "queen-pocket-spring-mattresses",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Queen Pocket Spring Mattresses"
      ],
      "description": "Aranya Queen Pocket Spring Mattress in Cream brings mattresses into a coordinated cozy interior. Individually wrapped springs limit motion transfer across the bed. A breathable quilted cover surrounds a medium-firm comfort layer.\n\nDesign and construction\nA cream quilted surface and layered foam provide a softer initial contact over supportive springs. Materials: Pocket springs, Layered comfort foam, Cotton blend quilted cover. The 152 cm wide × 25 cm high × 198 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 32 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Rotate head-to-foot and follow the care label when spot-cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Individually wrapped springs limit motion transfer across the bed. Finished in cream, with pocket springs, layered comfort foam.",
      "price": 41299,
      "stock": 48,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen pocket spring mattress",
          "isPrimary": true
        }
      ],
      "colors": [
        "Cream"
      ],
      "materials": [
        "Pocket springs",
        "Layered comfort foam",
        "Cotton blend quilted cover"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 152,
        "height": 25,
        "depth": 198,
        "unit": "cm"
      },
      "weight": {
        "value": 32,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "mattresses",
        "aranya",
        "cream",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Queen Pocket Spring Mattress in Cream",
      "metaDescription": "Aranya Queen Pocket Spring Mattress in Cream. 152 cm wide × 25 cm high × 198 cm deep. Explore this sample mattresses listing for furniture catalogue development.",
      "originalPrice": 46299
    },
    {
      "name": "Aster Queen Upholstered Headboard in Sand",
      "slug": "aster-queen-upholstered-headboard-in-sand",
      "sku": "AUR-DEMO-017-01",
      "categoryKey": "queen-upholstered-headboards",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Queen Upholstered Headboards"
      ],
      "description": "Aster Queen Upholstered Headboard in Sand brings headboards into a coordinated minimal interior. A padded face provides support for sitting up in bed. Mounting hardware must suit the wall or compatible bed frame.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 165 cm wide × 115 cm high × 9 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded face provides support for sitting up in bed. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 15999,
      "stock": 20,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen upholstered headboard",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 165,
        "height": 115,
        "depth": 9,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "headboards",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Queen Upholstered Headboard in Sand",
      "metaDescription": "Aster Queen Upholstered Headboard in Sand. 165 cm wide × 115 cm high × 9 cm deep. Explore this sample headboards listing for furniture catalogue development."
    },
    {
      "name": "Niva Queen Upholstered Headboard in Sage Green",
      "slug": "niva-queen-upholstered-headboard-in-sage-green",
      "sku": "AUR-DEMO-017-02",
      "categoryKey": "queen-upholstered-headboards",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Queen Upholstered Headboards"
      ],
      "description": "Niva Queen Upholstered Headboard in Sage Green brings headboards into a coordinated scandinavian interior. A padded face provides support for sitting up in bed. Mounting hardware must suit the wall or compatible bed frame.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 165 cm wide × 115 cm high × 9 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded face provides support for sitting up in bed. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 17999,
      "stock": 33,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen upholstered headboard",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 165,
        "height": 115,
        "depth": 9,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "headboards",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Queen Upholstered Headboard in Sage Green",
      "metaDescription": "Niva Queen Upholstered Headboard in Sage Green. 165 cm wide × 115 cm high × 9 cm deep. Explore this sample headboards listing for furniture catalogue development."
    },
    {
      "name": "Kanso Queen Upholstered Headboard in Storm Grey",
      "slug": "kanso-queen-upholstered-headboard-in-storm-grey",
      "sku": "AUR-DEMO-017-03",
      "categoryKey": "queen-upholstered-headboards",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Queen Upholstered Headboards"
      ],
      "description": "Kanso Queen Upholstered Headboard in Storm Grey brings headboards into a coordinated contemporary interior. A padded face provides support for sitting up in bed. Mounting hardware must suit the wall or compatible bed frame.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 165 cm wide × 115 cm high × 9 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded face provides support for sitting up in bed. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 20399,
      "stock": 46,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen upholstered headboard",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 165,
        "height": 115,
        "depth": 9,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "headboards",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Queen Upholstered Headboard in Storm Grey",
      "metaDescription": "Kanso Queen Upholstered Headboard in Storm Grey. 165 cm wide × 115 cm high × 9 cm deep. Explore this sample headboards listing for furniture catalogue development."
    },
    {
      "name": "Aranya Queen Upholstered Headboard in Terracotta",
      "slug": "aranya-queen-upholstered-headboard-in-terracotta",
      "sku": "AUR-DEMO-017-04",
      "categoryKey": "queen-upholstered-headboards",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Queen Upholstered Headboards"
      ],
      "description": "Aranya Queen Upholstered Headboard in Terracotta brings headboards into a coordinated cozy interior. A padded face provides support for sitting up in bed. Mounting hardware must suit the wall or compatible bed frame.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 165 cm wide × 115 cm high × 9 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded face provides support for sitting up in bed. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 23599,
      "stock": 18,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for queen upholstered headboard",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 165,
        "height": 115,
        "depth": 9,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "headboards",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Queen Upholstered Headboard in Terracotta",
      "metaDescription": "Aranya Queen Upholstered Headboard in Terracotta. 165 cm wide × 115 cm high × 9 cm deep. Explore this sample headboards listing for furniture catalogue development."
    },
    {
      "name": "Aster Upholstered Bedroom Bench in Sand",
      "slug": "aster-upholstered-bedroom-bench-in-sand",
      "sku": "AUR-DEMO-018-01",
      "categoryKey": "upholstered-bedroom-benches",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Upholstered Bedroom Benches"
      ],
      "description": "Aster Upholstered Bedroom Bench in Sand brings bedroom benches into a coordinated minimal interior. A padded bench fits at the foot of a queen bed. A lower open shelf accommodates baskets or folded throws.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 120 cm wide × 46 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded bench fits at the foot of a queen bed. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 16999,
      "stock": 31,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for upholstered bedroom bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 120,
        "height": 46,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "bedroom-benches",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Upholstered Bedroom Bench in Sand",
      "metaDescription": "Aster Upholstered Bedroom Bench in Sand. 120 cm wide × 46 cm high × 42 cm deep. Explore this sample bedroom benches listing for furniture catalogue development."
    },
    {
      "name": "Niva Upholstered Bedroom Bench in Sage Green",
      "slug": "niva-upholstered-bedroom-bench-in-sage-green",
      "sku": "AUR-DEMO-018-02",
      "categoryKey": "upholstered-bedroom-benches",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Upholstered Bedroom Benches"
      ],
      "description": "Niva Upholstered Bedroom Bench in Sage Green brings bedroom benches into a coordinated scandinavian interior. A padded bench fits at the foot of a queen bed. A lower open shelf accommodates baskets or folded throws.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 120 cm wide × 46 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded bench fits at the foot of a queen bed. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 19099,
      "stock": 44,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for upholstered bedroom bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 120,
        "height": 46,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "bedroom-benches",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Upholstered Bedroom Bench in Sage Green",
      "metaDescription": "Niva Upholstered Bedroom Bench in Sage Green. 120 cm wide × 46 cm high × 42 cm deep. Explore this sample bedroom benches listing for furniture catalogue development."
    },
    {
      "name": "Kanso Upholstered Bedroom Bench in Storm Grey",
      "slug": "kanso-upholstered-bedroom-bench-in-storm-grey",
      "sku": "AUR-DEMO-018-03",
      "categoryKey": "upholstered-bedroom-benches",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Upholstered Bedroom Benches"
      ],
      "description": "Kanso Upholstered Bedroom Bench in Storm Grey brings bedroom benches into a coordinated contemporary interior. A padded bench fits at the foot of a queen bed. A lower open shelf accommodates baskets or folded throws.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 120 cm wide × 46 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded bench fits at the foot of a queen bed. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 21699,
      "stock": 16,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for upholstered bedroom bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 120,
        "height": 46,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "bedroom-benches",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Upholstered Bedroom Bench in Storm Grey",
      "metaDescription": "Kanso Upholstered Bedroom Bench in Storm Grey. 120 cm wide × 46 cm high × 42 cm deep. Explore this sample bedroom benches listing for furniture catalogue development.",
      "originalPrice": 24399
    },
    {
      "name": "Aranya Upholstered Bedroom Bench in Terracotta",
      "slug": "aranya-upholstered-bedroom-bench-in-terracotta",
      "sku": "AUR-DEMO-018-04",
      "categoryKey": "upholstered-bedroom-benches",
      "categoryPath": [
        "Bedroom",
        "Sleep Essentials",
        "Upholstered Bedroom Benches"
      ],
      "description": "Aranya Upholstered Bedroom Bench in Terracotta brings bedroom benches into a coordinated cozy interior. A padded bench fits at the foot of a queen bed. A lower open shelf accommodates baskets or folded throws.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 120 cm wide × 46 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded bench fits at the foot of a queen bed. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 25099,
      "stock": 29,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
          "alt": "Bedroom interior reference for upholstered bedroom bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 120,
        "height": 46,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "bedroom",
        "sleep-essentials",
        "bedroom-benches",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Upholstered Bedroom Bench in Terracotta",
      "metaDescription": "Aranya Upholstered Bedroom Bench in Terracotta. 120 cm wide × 46 cm high × 42 cm deep. Explore this sample bedroom benches listing for furniture catalogue development."
    },
    {
      "name": "Aster Four Seater Dining Table in Natural Oak",
      "slug": "aster-four-seater-dining-table-in-natural-oak",
      "sku": "AUR-DEMO-019-01",
      "categoryKey": "four-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Four Seater Dining Tables"
      ],
      "description": "Aster Four Seater Dining Table in Natural Oak brings four seater dining tables into a coordinated minimal interior. A four-place layout suits apartment dining areas. Allow room around the table for chair movement.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 120 cm wide × 75 cm high × 80 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 29 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A four-place layout suits apartment dining areas. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 28999,
      "stock": 42,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for four seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 120,
        "height": 75,
        "depth": 80,
        "unit": "cm"
      },
      "weight": {
        "value": 29,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "four-seater-dining-tables",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Four Seater Dining Table in Natural Oak",
      "metaDescription": "Aster Four Seater Dining Table in Natural Oak. 120 cm wide × 75 cm high × 80 cm deep. Explore this sample four seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Niva Four Seater Dining Table in Walnut",
      "slug": "niva-four-seater-dining-table-in-walnut",
      "sku": "AUR-DEMO-019-02",
      "categoryKey": "four-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Four Seater Dining Tables"
      ],
      "description": "Niva Four Seater Dining Table in Walnut brings four seater dining tables into a coordinated scandinavian interior. A four-place layout suits apartment dining areas. Allow room around the table for chair movement.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 120 cm wide × 75 cm high × 80 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 29 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A four-place layout suits apartment dining areas. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 32699,
      "stock": 14,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for four seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 120,
        "height": 75,
        "depth": 80,
        "unit": "cm"
      },
      "weight": {
        "value": 29,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "four-seater-dining-tables",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Four Seater Dining Table in Walnut",
      "metaDescription": "Niva Four Seater Dining Table in Walnut. 120 cm wide × 75 cm high × 80 cm deep. Explore this sample four seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Kanso Four Seater Dining Table in Charcoal",
      "slug": "kanso-four-seater-dining-table-in-charcoal",
      "sku": "AUR-DEMO-019-03",
      "categoryKey": "four-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Four Seater Dining Tables"
      ],
      "description": "Kanso Four Seater Dining Table in Charcoal brings four seater dining tables into a coordinated industrial interior. A four-place layout suits apartment dining areas. Allow room around the table for chair movement.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 120 cm wide × 75 cm high × 80 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 29 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A four-place layout suits apartment dining areas. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 36999,
      "stock": 0,
      "status": "out_of_stock",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for four seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 120,
        "height": 75,
        "depth": 80,
        "unit": "cm"
      },
      "weight": {
        "value": 29,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "four-seater-dining-tables",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Four Seater Dining Table in Charcoal",
      "metaDescription": "Kanso Four Seater Dining Table in Charcoal. 120 cm wide × 75 cm high × 80 cm deep. Explore this sample four seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Four Seater Dining Table in Honey Brown",
      "slug": "aranya-four-seater-dining-table-in-honey-brown",
      "sku": "AUR-DEMO-019-04",
      "categoryKey": "four-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Four Seater Dining Tables"
      ],
      "description": "Aranya Four Seater Dining Table in Honey Brown brings four seater dining tables into a coordinated classic interior. A four-place layout suits apartment dining areas. Allow room around the table for chair movement.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 120 cm wide × 75 cm high × 80 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 29 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A four-place layout suits apartment dining areas. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 42799,
      "stock": 40,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for four seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 120,
        "height": 75,
        "depth": 80,
        "unit": "cm"
      },
      "weight": {
        "value": 29,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "four-seater-dining-tables",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Four Seater Dining Table in Honey Brown",
      "metaDescription": "Aranya Four Seater Dining Table in Honey Brown. 120 cm wide × 75 cm high × 80 cm deep. Explore this sample four seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Six Seater Dining Table in Natural Oak",
      "slug": "aster-six-seater-dining-table-in-natural-oak",
      "sku": "AUR-DEMO-020-01",
      "categoryKey": "six-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Six Seater Dining Tables"
      ],
      "description": "Aster Six Seater Dining Table in Natural Oak brings six seater dining tables into a coordinated minimal interior. A six-place tabletop accommodates family meals. A reinforced underframe supports the extended surface.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 180 cm wide × 75 cm high × 90 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 46 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A six-place tabletop accommodates family meals. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 45999,
      "stock": 12,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for six seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 180,
        "height": 75,
        "depth": 90,
        "unit": "cm"
      },
      "weight": {
        "value": 46,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "six-seater-dining-tables",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Six Seater Dining Table in Natural Oak",
      "metaDescription": "Aster Six Seater Dining Table in Natural Oak. 180 cm wide × 75 cm high × 90 cm deep. Explore this sample six seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Niva Six Seater Dining Table in Walnut",
      "slug": "niva-six-seater-dining-table-in-walnut",
      "sku": "AUR-DEMO-020-02",
      "categoryKey": "six-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Six Seater Dining Tables"
      ],
      "description": "Niva Six Seater Dining Table in Walnut brings six seater dining tables into a coordinated scandinavian interior. A six-place tabletop accommodates family meals. A reinforced underframe supports the extended surface.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 180 cm wide × 75 cm high × 90 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 46 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A six-place tabletop accommodates family meals. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 51899,
      "stock": 25,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for six seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 180,
        "height": 75,
        "depth": 90,
        "unit": "cm"
      },
      "weight": {
        "value": 46,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "six-seater-dining-tables",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Six Seater Dining Table in Walnut",
      "metaDescription": "Niva Six Seater Dining Table in Walnut. 180 cm wide × 75 cm high × 90 cm deep. Explore this sample six seater dining tables listing for furniture catalogue development.",
      "originalPrice": 58199
    },
    {
      "name": "Kanso Six Seater Dining Table in Charcoal",
      "slug": "kanso-six-seater-dining-table-in-charcoal",
      "sku": "AUR-DEMO-020-03",
      "categoryKey": "six-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Six Seater Dining Tables"
      ],
      "description": "Kanso Six Seater Dining Table in Charcoal brings six seater dining tables into a coordinated industrial interior. A six-place tabletop accommodates family meals. A reinforced underframe supports the extended surface.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 180 cm wide × 75 cm high × 90 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 46 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A six-place tabletop accommodates family meals. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 58799,
      "stock": 38,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for six seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 180,
        "height": 75,
        "depth": 90,
        "unit": "cm"
      },
      "weight": {
        "value": 46,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "six-seater-dining-tables",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Six Seater Dining Table in Charcoal",
      "metaDescription": "Kanso Six Seater Dining Table in Charcoal. 180 cm wide × 75 cm high × 90 cm deep. Explore this sample six seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Six Seater Dining Table in Honey Brown",
      "slug": "aranya-six-seater-dining-table-in-honey-brown",
      "sku": "AUR-DEMO-020-04",
      "categoryKey": "six-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Six Seater Dining Tables"
      ],
      "description": "Aranya Six Seater Dining Table in Honey Brown brings six seater dining tables into a coordinated classic interior. A six-place tabletop accommodates family meals. A reinforced underframe supports the extended surface.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 180 cm wide × 75 cm high × 90 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 46 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A six-place tabletop accommodates family meals. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 67999,
      "stock": 10,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for six seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 180,
        "height": 75,
        "depth": 90,
        "unit": "cm"
      },
      "weight": {
        "value": 46,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "six-seater-dining-tables",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Six Seater Dining Table in Honey Brown",
      "metaDescription": "Aranya Six Seater Dining Table in Honey Brown. 180 cm wide × 75 cm high × 90 cm deep. Explore this sample six seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Eight Seater Dining Table in Natural Oak",
      "slug": "aster-eight-seater-dining-table-in-natural-oak",
      "sku": "AUR-DEMO-021-01",
      "categoryKey": "eight-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Eight Seater Dining Tables"
      ],
      "description": "Aster Eight Seater Dining Table in Natural Oak brings eight seater dining tables into a coordinated minimal interior. A spacious eight-place tabletop suits larger dining rooms. The substantial base keeps long-table seating stable.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 220 cm wide × 76 cm high × 100 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 64 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A spacious eight-place tabletop suits larger dining rooms. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 69999,
      "stock": 23,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for eight seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 220,
        "height": 76,
        "depth": 100,
        "unit": "cm"
      },
      "weight": {
        "value": 64,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "eight-seater-dining-tables",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Eight Seater Dining Table in Natural Oak",
      "metaDescription": "Aster Eight Seater Dining Table in Natural Oak. 220 cm wide × 76 cm high × 100 cm deep. Explore this sample eight seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Niva Eight Seater Dining Table in Walnut",
      "slug": "niva-eight-seater-dining-table-in-walnut",
      "sku": "AUR-DEMO-021-02",
      "categoryKey": "eight-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Eight Seater Dining Tables"
      ],
      "description": "Niva Eight Seater Dining Table in Walnut brings eight seater dining tables into a coordinated scandinavian interior. A spacious eight-place tabletop suits larger dining rooms. The substantial base keeps long-table seating stable.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 220 cm wide × 76 cm high × 100 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 64 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A spacious eight-place tabletop suits larger dining rooms. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 78999,
      "stock": 36,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for eight seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 220,
        "height": 76,
        "depth": 100,
        "unit": "cm"
      },
      "weight": {
        "value": 64,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "eight-seater-dining-tables",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Eight Seater Dining Table in Walnut",
      "metaDescription": "Niva Eight Seater Dining Table in Walnut. 220 cm wide × 76 cm high × 100 cm deep. Explore this sample eight seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Kanso Eight Seater Dining Table in Charcoal",
      "slug": "kanso-eight-seater-dining-table-in-charcoal",
      "sku": "AUR-DEMO-021-03",
      "categoryKey": "eight-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Eight Seater Dining Tables"
      ],
      "description": "Kanso Eight Seater Dining Table in Charcoal brings eight seater dining tables into a coordinated industrial interior. A spacious eight-place tabletop suits larger dining rooms. The substantial base keeps long-table seating stable.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 220 cm wide × 76 cm high × 100 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 64 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A spacious eight-place tabletop suits larger dining rooms. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 89499,
      "stock": 8,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for eight seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 220,
        "height": 76,
        "depth": 100,
        "unit": "cm"
      },
      "weight": {
        "value": 64,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "eight-seater-dining-tables",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Eight Seater Dining Table in Charcoal",
      "metaDescription": "Kanso Eight Seater Dining Table in Charcoal. 220 cm wide × 76 cm high × 100 cm deep. Explore this sample eight seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Eight Seater Dining Table in Honey Brown",
      "slug": "aranya-eight-seater-dining-table-in-honey-brown",
      "sku": "AUR-DEMO-021-04",
      "categoryKey": "eight-seater-dining-tables",
      "categoryPath": [
        "Dining",
        "Dining Tables",
        "Eight Seater Dining Tables"
      ],
      "description": "Aranya Eight Seater Dining Table in Honey Brown brings eight seater dining tables into a coordinated classic interior. A spacious eight-place tabletop suits larger dining rooms. The substantial base keeps long-table seating stable.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 220 cm wide × 76 cm high × 100 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 64 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A spacious eight-place tabletop suits larger dining rooms. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 103499,
      "stock": 21,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for eight seater dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 220,
        "height": 76,
        "depth": 100,
        "unit": "cm"
      },
      "weight": {
        "value": 64,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-tables",
        "eight-seater-dining-tables",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Eight Seater Dining Table in Honey Brown",
      "metaDescription": "Aranya Eight Seater Dining Table in Honey Brown. 220 cm wide × 76 cm high × 100 cm deep. Explore this sample eight seater dining tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Upholstered Dining Chair in Sand",
      "slug": "aster-upholstered-dining-chair-in-sand",
      "sku": "AUR-DEMO-022-01",
      "categoryKey": "upholstered-dining-chairs",
      "categoryPath": [
        "Dining",
        "Dining Chairs",
        "Upholstered Dining Chairs"
      ],
      "description": "Aster Upholstered Dining Chair in Sand brings dining chairs into a coordinated minimal interior. A padded seat and shaped back support everyday meals. Sold as one chair so a dining set can be assembled gradually.\n\nDesign and construction\nA tightly woven sand fabric is paired with a simple timber frame for an understated finish. Materials: Woven polyester upholstery, Timber frame, High-density foam. The 48 cm wide × 86 cm high × 54 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum with an upholstery attachment and spot-clean using a fabric-compatible cleaner.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded seat and shaped back support everyday meals. Finished in sand, with woven polyester upholstery, timber frame.",
      "price": 7999,
      "stock": 34,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for upholstered dining chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sand"
      ],
      "materials": [
        "Woven polyester upholstery",
        "Timber frame",
        "High-density foam"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 48,
        "height": 86,
        "depth": 54,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "dining-chairs",
        "aster",
        "sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Upholstered Dining Chair in Sand",
      "metaDescription": "Aster Upholstered Dining Chair in Sand. 48 cm wide × 86 cm high × 54 cm deep. Explore this sample dining chairs listing for furniture catalogue development.",
      "originalPrice": 8999
    },
    {
      "name": "Niva Upholstered Dining Chair in Sage Green",
      "slug": "niva-upholstered-dining-chair-in-sage-green",
      "sku": "AUR-DEMO-022-02",
      "categoryKey": "upholstered-dining-chairs",
      "categoryPath": [
        "Dining",
        "Dining Chairs",
        "Upholstered Dining Chairs"
      ],
      "description": "Niva Upholstered Dining Chair in Sage Green brings dining chairs into a coordinated scandinavian interior. A padded seat and shaped back support everyday meals. Sold as one chair so a dining set can be assembled gradually.\n\nDesign and construction\nSoft sage upholstery and exposed timber details suit light neutral interiors. Materials: Cotton blend upholstery, Rubberwood frame, Layered foam. The 48 cm wide × 86 cm high × 54 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum regularly and blot spills immediately. Test any cleaner on a hidden patch first.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded seat and shaped back support everyday meals. Finished in sage green, with cotton blend upholstery, rubberwood frame.",
      "price": 8999,
      "stock": 47,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for upholstered dining chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Cotton blend upholstery",
        "Rubberwood frame",
        "Layered foam"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 48,
        "height": 86,
        "depth": 54,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "dining-chairs",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Upholstered Dining Chair in Sage Green",
      "metaDescription": "Niva Upholstered Dining Chair in Sage Green. 48 cm wide × 86 cm high × 54 cm deep. Explore this sample dining chairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Upholstered Dining Chair in Storm Grey",
      "slug": "kanso-upholstered-dining-chair-in-storm-grey",
      "sku": "AUR-DEMO-022-03",
      "categoryKey": "upholstered-dining-chairs",
      "categoryPath": [
        "Dining",
        "Dining Chairs",
        "Upholstered Dining Chairs"
      ],
      "description": "Kanso Upholstered Dining Chair in Storm Grey brings dining chairs into a coordinated contemporary interior. A padded seat and shaped back support everyday meals. Sold as one chair so a dining set can be assembled gradually.\n\nDesign and construction\nTextured grey upholstery and defined seam lines provide a tailored contemporary appearance. Materials: Textured polyester upholstery, Hardwood frame, Resilient foam. The 48 cm wide × 86 cm high × 54 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Brush or vacuum gently. Avoid soaking the upholstery and keep away from direct heat.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded seat and shaped back support everyday meals. Finished in storm grey, with textured polyester upholstery, hardwood frame.",
      "price": 10199,
      "stock": 19,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for upholstered dining chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Storm Grey"
      ],
      "materials": [
        "Textured polyester upholstery",
        "Hardwood frame",
        "Resilient foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 48,
        "height": 86,
        "depth": 54,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "dining-chairs",
        "kanso",
        "storm-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Upholstered Dining Chair in Storm Grey",
      "metaDescription": "Kanso Upholstered Dining Chair in Storm Grey. 48 cm wide × 86 cm high × 54 cm deep. Explore this sample dining chairs listing for furniture catalogue development."
    },
    {
      "name": "Aranya Upholstered Dining Chair in Terracotta",
      "slug": "aranya-upholstered-dining-chair-in-terracotta",
      "sku": "AUR-DEMO-022-04",
      "categoryKey": "upholstered-dining-chairs",
      "categoryPath": [
        "Dining",
        "Dining Chairs",
        "Upholstered Dining Chairs"
      ],
      "description": "Aranya Upholstered Dining Chair in Terracotta brings dining chairs into a coordinated cozy interior. A padded seat and shaped back support everyday meals. Sold as one chair so a dining set can be assembled gradually.\n\nDesign and construction\nA terracotta velvet surface adds a warmer accent while the layered padding softens the seat. Materials: Velvet upholstery, Solid wood frame, Layered foam. The 48 cm wide × 86 cm high × 54 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a soft upholstery brush in the direction of the pile and blot spills without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A padded seat and shaped back support everyday meals. Finished in terracotta, with velvet upholstery, solid wood frame.",
      "price": 11699,
      "stock": 32,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for upholstered dining chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Velvet upholstery",
        "Solid wood frame",
        "Layered foam"
      ],
      "style": "cozy",
      "dimensions": {
        "width": 48,
        "height": 86,
        "depth": 54,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "dining-chairs",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Upholstered Dining Chair in Terracotta",
      "metaDescription": "Aranya Upholstered Dining Chair in Terracotta. 48 cm wide × 86 cm high × 54 cm deep. Explore this sample dining chairs listing for furniture catalogue development."
    },
    {
      "name": "Aster Dining Bench in Natural Oak",
      "slug": "aster-dining-bench-in-natural-oak",
      "sku": "AUR-DEMO-023-01",
      "categoryKey": "dining-benches",
      "categoryPath": [
        "Dining",
        "Benches & Stools",
        "Dining Benches"
      ],
      "description": "Aster Dining Bench in Natural Oak brings dining benches into a coordinated minimal interior. An open bench provides flexible seating at a dining table. Its backless design slides beneath many rectangular tables.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 140 cm wide × 46 cm high × 38 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An open bench provides flexible seating at a dining table. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 11999,
      "stock": 45,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for dining bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 140,
        "height": 46,
        "depth": 38,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "dining-benches",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Dining Bench in Natural Oak",
      "metaDescription": "Aster Dining Bench in Natural Oak. 140 cm wide × 46 cm high × 38 cm deep. Explore this sample dining benches listing for furniture catalogue development."
    },
    {
      "name": "Niva Dining Bench in Walnut",
      "slug": "niva-dining-bench-in-walnut",
      "sku": "AUR-DEMO-023-02",
      "categoryKey": "dining-benches",
      "categoryPath": [
        "Dining",
        "Benches & Stools",
        "Dining Benches"
      ],
      "description": "Niva Dining Bench in Walnut brings dining benches into a coordinated scandinavian interior. An open bench provides flexible seating at a dining table. Its backless design slides beneath many rectangular tables.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 140 cm wide × 46 cm high × 38 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An open bench provides flexible seating at a dining table. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 13499,
      "stock": 17,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for dining bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 140,
        "height": 46,
        "depth": 38,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "dining-benches",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Dining Bench in Walnut",
      "metaDescription": "Niva Dining Bench in Walnut. 140 cm wide × 46 cm high × 38 cm deep. Explore this sample dining benches listing for furniture catalogue development."
    },
    {
      "name": "Kanso Dining Bench in Charcoal",
      "slug": "kanso-dining-bench-in-charcoal",
      "sku": "AUR-DEMO-023-03",
      "categoryKey": "dining-benches",
      "categoryPath": [
        "Dining",
        "Benches & Stools",
        "Dining Benches"
      ],
      "description": "Kanso Dining Bench in Charcoal brings dining benches into a coordinated industrial interior. An open bench provides flexible seating at a dining table. Its backless design slides beneath many rectangular tables.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 140 cm wide × 46 cm high × 38 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An open bench provides flexible seating at a dining table. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 15299,
      "stock": 30,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for dining bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 140,
        "height": 46,
        "depth": 38,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "dining-benches",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Dining Bench in Charcoal",
      "metaDescription": "Kanso Dining Bench in Charcoal. 140 cm wide × 46 cm high × 38 cm deep. Explore this sample dining benches listing for furniture catalogue development."
    },
    {
      "name": "Aranya Dining Bench in Honey Brown",
      "slug": "aranya-dining-bench-in-honey-brown",
      "sku": "AUR-DEMO-023-04",
      "categoryKey": "dining-benches",
      "categoryPath": [
        "Dining",
        "Benches & Stools",
        "Dining Benches"
      ],
      "description": "Aranya Dining Bench in Honey Brown brings dining benches into a coordinated classic interior. An open bench provides flexible seating at a dining table. Its backless design slides beneath many rectangular tables.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 140 cm wide × 46 cm high × 38 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An open bench provides flexible seating at a dining table. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 17699,
      "stock": 43,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for dining bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 140,
        "height": 46,
        "depth": 38,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "dining-benches",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Dining Bench in Honey Brown",
      "metaDescription": "Aranya Dining Bench in Honey Brown. 140 cm wide × 46 cm high × 38 cm deep. Explore this sample dining benches listing for furniture catalogue development.",
      "originalPrice": 19899
    },
    {
      "name": "Aster Counter Height Stool in Matte Black",
      "slug": "aster-counter-height-stool-in-matte-black",
      "sku": "AUR-DEMO-024-01",
      "categoryKey": "counter-height-stools",
      "categoryPath": [
        "Dining",
        "Benches & Stools",
        "Counter Height Stools"
      ],
      "description": "Aster Counter Height Stool in Matte Black brings bar stools into a coordinated minimal interior. A 65 cm seat height suits a typical kitchen counter. A footrest provides a comfortable resting position.\n\nDesign and construction\nA matte black powder coating keeps the structure visually simple. Materials: Powder-coated steel. The 43 cm wide × 92 cm high × 47 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 8 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft damp cloth and dry thoroughly.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 65 cm seat height suits a typical kitchen counter. Finished in matte black, with powder-coated steel.",
      "price": 9999,
      "stock": 15,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for counter height stool",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 43,
        "height": 92,
        "depth": 47,
        "unit": "cm"
      },
      "weight": {
        "value": 8,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "bar-stools",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Counter Height Stool in Matte Black",
      "metaDescription": "Aster Counter Height Stool in Matte Black. 43 cm wide × 92 cm high × 47 cm deep. Explore this sample bar stools listing for furniture catalogue development."
    },
    {
      "name": "Niva Counter Height Stool in Warm White",
      "slug": "niva-counter-height-stool-in-warm-white",
      "sku": "AUR-DEMO-024-02",
      "categoryKey": "counter-height-stools",
      "categoryPath": [
        "Dining",
        "Benches & Stools",
        "Counter Height Stools"
      ],
      "description": "Niva Counter Height Stool in Warm White brings bar stools into a coordinated scandinavian interior. A 65 cm seat height suits a typical kitchen counter. A footrest provides a comfortable resting position.\n\nDesign and construction\nWarm white surfaces and small timber details soften the metal construction. Materials: Powder-coated steel, Rubberwood accents. The 43 cm wide × 92 cm high × 47 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 8 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use mild diluted soap when needed and dry all joints after cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 65 cm seat height suits a typical kitchen counter. Finished in warm white, with powder-coated steel, rubberwood accents.",
      "price": 11199,
      "stock": 28,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for counter height stool",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Powder-coated steel",
        "Rubberwood accents"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 43,
        "height": 92,
        "depth": 47,
        "unit": "cm"
      },
      "weight": {
        "value": 8,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "bar-stools",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Counter Height Stool in Warm White",
      "metaDescription": "Niva Counter Height Stool in Warm White. 43 cm wide × 92 cm high × 47 cm deep. Explore this sample bar stools listing for furniture catalogue development."
    },
    {
      "name": "Kanso Counter Height Stool in Graphite",
      "slug": "kanso-counter-height-stool-in-graphite",
      "sku": "AUR-DEMO-024-03",
      "categoryKey": "counter-height-stools",
      "categoryPath": [
        "Dining",
        "Benches & Stools",
        "Counter Height Stools"
      ],
      "description": "Kanso Counter Height Stool in Graphite brings bar stools into a coordinated industrial interior. A 65 cm seat height suits a typical kitchen counter. A footrest provides a comfortable resting position.\n\nDesign and construction\nGraphite metal and contrasting panel details suit a functional industrial interior. Materials: Powder-coated steel, Engineered wood accents. The 43 cm wide × 92 cm high × 47 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 8 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Avoid abrasive pads and inspect fixings periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 65 cm seat height suits a typical kitchen counter. Finished in graphite, with powder-coated steel, engineered wood accents.",
      "price": 12699,
      "stock": 41,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for counter height stool",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Engineered wood accents"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 43,
        "height": 92,
        "depth": 47,
        "unit": "cm"
      },
      "weight": {
        "value": 8,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "bar-stools",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Counter Height Stool in Graphite",
      "metaDescription": "Kanso Counter Height Stool in Graphite. 43 cm wide × 92 cm high × 47 cm deep. Explore this sample bar stools listing for furniture catalogue development."
    },
    {
      "name": "Aranya Counter Height Stool in Brushed Bronze",
      "slug": "aranya-counter-height-stool-in-brushed-bronze",
      "sku": "AUR-DEMO-024-04",
      "categoryKey": "counter-height-stools",
      "categoryPath": [
        "Dining",
        "Benches & Stools",
        "Counter Height Stools"
      ],
      "description": "Aranya Counter Height Stool in Brushed Bronze brings bar stools into a coordinated contemporary interior. A 65 cm seat height suits a typical kitchen counter. A footrest provides a comfortable resting position.\n\nDesign and construction\nA brushed bronze finish gives the structure a warmer contemporary appearance. Materials: Bronze-finished steel. The 43 cm wide × 92 cm high × 47 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 8 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use a dry microfibre cloth and avoid metal polish on the coated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 65 cm seat height suits a typical kitchen counter. Finished in brushed bronze, with bronze-finished steel.",
      "price": 14699,
      "stock": 13,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for counter height stool",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Bronze"
      ],
      "materials": [
        "Bronze-finished steel"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 43,
        "height": 92,
        "depth": 47,
        "unit": "cm"
      },
      "weight": {
        "value": 8,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-seating",
        "bar-stools",
        "aranya",
        "brushed-bronze",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Counter Height Stool in Brushed Bronze",
      "metaDescription": "Aranya Counter Height Stool in Brushed Bronze. 43 cm wide × 92 cm high × 47 cm deep. Explore this sample bar stools listing for furniture catalogue development."
    },
    {
      "name": "Aster Three Door Sideboard in Natural Oak",
      "slug": "aster-three-door-sideboard-in-natural-oak",
      "sku": "AUR-DEMO-025-01",
      "categoryKey": "three-door-sideboards",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Three Door Sideboards"
      ],
      "description": "Aster Three Door Sideboard in Natural Oak brings sideboards into a coordinated minimal interior. Enclosed shelves keep tableware and serving pieces organised. A broad top provides space for a lamp or display objects.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 150 cm wide × 82 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 51 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Enclosed shelves keep tableware and serving pieces organised. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 36999,
      "stock": 26,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for three door sideboard",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 150,
        "height": 82,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 51,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "sideboards",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Three Door Sideboard in Natural Oak",
      "metaDescription": "Aster Three Door Sideboard in Natural Oak. 150 cm wide × 82 cm high × 42 cm deep. Explore this sample sideboards listing for furniture catalogue development."
    },
    {
      "name": "Niva Three Door Sideboard in Walnut",
      "slug": "niva-three-door-sideboard-in-walnut",
      "sku": "AUR-DEMO-025-02",
      "categoryKey": "three-door-sideboards",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Three Door Sideboards"
      ],
      "description": "Niva Three Door Sideboard in Walnut brings sideboards into a coordinated scandinavian interior. Enclosed shelves keep tableware and serving pieces organised. A broad top provides space for a lamp or display objects.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 150 cm wide × 82 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 51 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Enclosed shelves keep tableware and serving pieces organised. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 41699,
      "stock": 39,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for three door sideboard",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 150,
        "height": 82,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 51,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "sideboards",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Three Door Sideboard in Walnut",
      "metaDescription": "Niva Three Door Sideboard in Walnut. 150 cm wide × 82 cm high × 42 cm deep. Explore this sample sideboards listing for furniture catalogue development."
    },
    {
      "name": "Kanso Three Door Sideboard in Charcoal",
      "slug": "kanso-three-door-sideboard-in-charcoal",
      "sku": "AUR-DEMO-025-03",
      "categoryKey": "three-door-sideboards",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Three Door Sideboards"
      ],
      "description": "Kanso Three Door Sideboard in Charcoal brings sideboards into a coordinated industrial interior. Enclosed shelves keep tableware and serving pieces organised. A broad top provides space for a lamp or display objects.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 150 cm wide × 82 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 51 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Enclosed shelves keep tableware and serving pieces organised. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 47299,
      "stock": 11,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for three door sideboard",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 150,
        "height": 82,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 51,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "sideboards",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Three Door Sideboard in Charcoal",
      "metaDescription": "Kanso Three Door Sideboard in Charcoal. 150 cm wide × 82 cm high × 42 cm deep. Explore this sample sideboards listing for furniture catalogue development.",
      "originalPrice": 52999
    },
    {
      "name": "Aranya Three Door Sideboard in Honey Brown",
      "slug": "aranya-three-door-sideboard-in-honey-brown",
      "sku": "AUR-DEMO-025-04",
      "categoryKey": "three-door-sideboards",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Three Door Sideboards"
      ],
      "description": "Aranya Three Door Sideboard in Honey Brown brings sideboards into a coordinated classic interior. Enclosed shelves keep tableware and serving pieces organised. A broad top provides space for a lamp or display objects.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 150 cm wide × 82 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 51 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Enclosed shelves keep tableware and serving pieces organised. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 54699,
      "stock": 24,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for three door sideboard",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 150,
        "height": 82,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 51,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "sideboards",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Three Door Sideboard in Honey Brown",
      "metaDescription": "Aranya Three Door Sideboard in Honey Brown. 150 cm wide × 82 cm high × 42 cm deep. Explore this sample sideboards listing for furniture catalogue development."
    },
    {
      "name": "Aster Glass Front Crockery Cabinet in Natural Oak",
      "slug": "aster-glass-front-crockery-cabinet-in-natural-oak",
      "sku": "AUR-DEMO-026-01",
      "categoryKey": "glass-front-crockery-cabinets",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Glass Front Crockery Cabinets"
      ],
      "description": "Aster Glass Front Crockery Cabinet in Natural Oak brings crockery units into a coordinated minimal interior. Glazed upper doors display glassware while lower cabinets conceal storage. An anti-tip bracket must be fitted before use.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 100 cm wide × 190 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 67 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Glazed upper doors display glassware while lower cabinets conceal storage. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 49999,
      "stock": 37,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for glass front crockery cabinet",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 100,
        "height": 190,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 67,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "crockery-units",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Glass Front Crockery Cabinet in Natural Oak",
      "metaDescription": "Aster Glass Front Crockery Cabinet in Natural Oak. 100 cm wide × 190 cm high × 42 cm deep. Explore this sample crockery units listing for furniture catalogue development."
    },
    {
      "name": "Niva Glass Front Crockery Cabinet in Walnut",
      "slug": "niva-glass-front-crockery-cabinet-in-walnut",
      "sku": "AUR-DEMO-026-02",
      "categoryKey": "glass-front-crockery-cabinets",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Glass Front Crockery Cabinets"
      ],
      "description": "Niva Glass Front Crockery Cabinet in Walnut brings crockery units into a coordinated scandinavian interior. Glazed upper doors display glassware while lower cabinets conceal storage. An anti-tip bracket must be fitted before use.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 100 cm wide × 190 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 67 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Glazed upper doors display glassware while lower cabinets conceal storage. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 56399,
      "stock": 9,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for glass front crockery cabinet",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 100,
        "height": 190,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 67,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "crockery-units",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Glass Front Crockery Cabinet in Walnut",
      "metaDescription": "Niva Glass Front Crockery Cabinet in Walnut. 100 cm wide × 190 cm high × 42 cm deep. Explore this sample crockery units listing for furniture catalogue development."
    },
    {
      "name": "Kanso Glass Front Crockery Cabinet in Charcoal",
      "slug": "kanso-glass-front-crockery-cabinet-in-charcoal",
      "sku": "AUR-DEMO-026-03",
      "categoryKey": "glass-front-crockery-cabinets",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Glass Front Crockery Cabinets"
      ],
      "description": "Kanso Glass Front Crockery Cabinet in Charcoal brings crockery units into a coordinated industrial interior. Glazed upper doors display glassware while lower cabinets conceal storage. An anti-tip bracket must be fitted before use.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 100 cm wide × 190 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 67 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Glazed upper doors display glassware while lower cabinets conceal storage. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 63899,
      "stock": 22,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for glass front crockery cabinet",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 100,
        "height": 190,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 67,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "crockery-units",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Glass Front Crockery Cabinet in Charcoal",
      "metaDescription": "Kanso Glass Front Crockery Cabinet in Charcoal. 100 cm wide × 190 cm high × 42 cm deep. Explore this sample crockery units listing for furniture catalogue development."
    },
    {
      "name": "Aranya Glass Front Crockery Cabinet in Honey Brown",
      "slug": "aranya-glass-front-crockery-cabinet-in-honey-brown",
      "sku": "AUR-DEMO-026-04",
      "categoryKey": "glass-front-crockery-cabinets",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Glass Front Crockery Cabinets"
      ],
      "description": "Aranya Glass Front Crockery Cabinet in Honey Brown brings crockery units into a coordinated classic interior. Glazed upper doors display glassware while lower cabinets conceal storage. An anti-tip bracket must be fitted before use.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 100 cm wide × 190 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 67 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Glazed upper doors display glassware while lower cabinets conceal storage. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 73899,
      "stock": 35,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for glass front crockery cabinet",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 100,
        "height": 190,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 67,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "crockery-units",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Glass Front Crockery Cabinet in Honey Brown",
      "metaDescription": "Aranya Glass Front Crockery Cabinet in Honey Brown. 100 cm wide × 190 cm high × 42 cm deep. Explore this sample crockery units listing for furniture catalogue development."
    },
    {
      "name": "Aster Two Tier Bar Trolley in Matte Black",
      "slug": "aster-two-tier-bar-trolley-in-matte-black",
      "sku": "AUR-DEMO-027-01",
      "categoryKey": "two-tier-bar-trolleys",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Two Tier Bar Trolleys"
      ],
      "description": "Aster Two Tier Bar Trolley in Matte Black brings bar trolleys into a coordinated minimal interior. Two shelves carry bottles and serving accessories. Lockable castors keep the trolley steady during service.\n\nDesign and construction\nA matte black powder coating keeps the structure visually simple. Materials: Powder-coated steel. The 72 cm wide × 82 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 12 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft damp cloth and dry thoroughly.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two shelves carry bottles and serving accessories. Finished in matte black, with powder-coated steel.",
      "price": 13999,
      "stock": 48,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for two tier bar trolley",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 72,
        "height": 82,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 12,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "bar-trolleys",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Two Tier Bar Trolley in Matte Black",
      "metaDescription": "Aster Two Tier Bar Trolley in Matte Black. 72 cm wide × 82 cm high × 40 cm deep. Explore this sample bar trolleys listing for furniture catalogue development."
    },
    {
      "name": "Niva Two Tier Bar Trolley in Warm White",
      "slug": "niva-two-tier-bar-trolley-in-warm-white",
      "sku": "AUR-DEMO-027-02",
      "categoryKey": "two-tier-bar-trolleys",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Two Tier Bar Trolleys"
      ],
      "description": "Niva Two Tier Bar Trolley in Warm White brings bar trolleys into a coordinated scandinavian interior. Two shelves carry bottles and serving accessories. Lockable castors keep the trolley steady during service.\n\nDesign and construction\nWarm white surfaces and small timber details soften the metal construction. Materials: Powder-coated steel, Rubberwood accents. The 72 cm wide × 82 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 12 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use mild diluted soap when needed and dry all joints after cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two shelves carry bottles and serving accessories. Finished in warm white, with powder-coated steel, rubberwood accents.",
      "price": 15799,
      "stock": 20,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for two tier bar trolley",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Powder-coated steel",
        "Rubberwood accents"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 72,
        "height": 82,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 12,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "bar-trolleys",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Two Tier Bar Trolley in Warm White",
      "metaDescription": "Niva Two Tier Bar Trolley in Warm White. 72 cm wide × 82 cm high × 40 cm deep. Explore this sample bar trolleys listing for furniture catalogue development.",
      "originalPrice": 17699
    },
    {
      "name": "Kanso Two Tier Bar Trolley in Graphite",
      "slug": "kanso-two-tier-bar-trolley-in-graphite",
      "sku": "AUR-DEMO-027-03",
      "categoryKey": "two-tier-bar-trolleys",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Two Tier Bar Trolleys"
      ],
      "description": "Kanso Two Tier Bar Trolley in Graphite brings bar trolleys into a coordinated industrial interior. Two shelves carry bottles and serving accessories. Lockable castors keep the trolley steady during service.\n\nDesign and construction\nGraphite metal and contrasting panel details suit a functional industrial interior. Materials: Powder-coated steel, Engineered wood accents. The 72 cm wide × 82 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 12 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Avoid abrasive pads and inspect fixings periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two shelves carry bottles and serving accessories. Finished in graphite, with powder-coated steel, engineered wood accents.",
      "price": 17799,
      "stock": 33,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for two tier bar trolley",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Engineered wood accents"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 72,
        "height": 82,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 12,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "bar-trolleys",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Two Tier Bar Trolley in Graphite",
      "metaDescription": "Kanso Two Tier Bar Trolley in Graphite. 72 cm wide × 82 cm high × 40 cm deep. Explore this sample bar trolleys listing for furniture catalogue development."
    },
    {
      "name": "Aranya Two Tier Bar Trolley in Brushed Bronze",
      "slug": "aranya-two-tier-bar-trolley-in-brushed-bronze",
      "sku": "AUR-DEMO-027-04",
      "categoryKey": "two-tier-bar-trolleys",
      "categoryPath": [
        "Dining",
        "Dining Storage",
        "Two Tier Bar Trolleys"
      ],
      "description": "Aranya Two Tier Bar Trolley in Brushed Bronze brings bar trolleys into a coordinated contemporary interior. Two shelves carry bottles and serving accessories. Lockable castors keep the trolley steady during service.\n\nDesign and construction\nA brushed bronze finish gives the structure a warmer contemporary appearance. Materials: Bronze-finished steel. The 72 cm wide × 82 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 12 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use a dry microfibre cloth and avoid metal polish on the coated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two shelves carry bottles and serving accessories. Finished in brushed bronze, with bronze-finished steel.",
      "price": 20599,
      "stock": 46,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
          "alt": "Dining interior reference for two tier bar trolley",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Bronze"
      ],
      "materials": [
        "Bronze-finished steel"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 72,
        "height": 82,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 12,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "dining",
        "dining-storage",
        "bar-trolleys",
        "aranya",
        "brushed-bronze",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Two Tier Bar Trolley in Brushed Bronze",
      "metaDescription": "Aranya Two Tier Bar Trolley in Brushed Bronze. 72 cm wide × 82 cm high × 40 cm deep. Explore this sample bar trolleys listing for furniture catalogue development."
    },
    {
      "name": "Aster Writing Desk in Natural Oak",
      "slug": "aster-writing-desk-in-natural-oak",
      "sku": "AUR-DEMO-028-01",
      "categoryKey": "writing-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Writing Desks"
      ],
      "description": "Aster Writing Desk in Natural Oak brings writing desks into a coordinated minimal interior. A clean work surface suits writing and laptop use. A shallow drawer stores notebooks and stationery.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 110 cm wide × 75 cm high × 55 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A clean work surface suits writing and laptop use. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 16999,
      "stock": 18,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for writing desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 110,
        "height": 75,
        "depth": 55,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "writing-desks",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Writing Desk in Natural Oak",
      "metaDescription": "Aster Writing Desk in Natural Oak. 110 cm wide × 75 cm high × 55 cm deep. Explore this sample writing desks listing for furniture catalogue development."
    },
    {
      "name": "Niva Writing Desk in Walnut",
      "slug": "niva-writing-desk-in-walnut",
      "sku": "AUR-DEMO-028-02",
      "categoryKey": "writing-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Writing Desks"
      ],
      "description": "Niva Writing Desk in Walnut brings writing desks into a coordinated scandinavian interior. A clean work surface suits writing and laptop use. A shallow drawer stores notebooks and stationery.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 110 cm wide × 75 cm high × 55 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A clean work surface suits writing and laptop use. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 19099,
      "stock": 31,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for writing desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 110,
        "height": 75,
        "depth": 55,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "writing-desks",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Writing Desk in Walnut",
      "metaDescription": "Niva Writing Desk in Walnut. 110 cm wide × 75 cm high × 55 cm deep. Explore this sample writing desks listing for furniture catalogue development."
    },
    {
      "name": "Kanso Writing Desk in Charcoal",
      "slug": "kanso-writing-desk-in-charcoal",
      "sku": "AUR-DEMO-028-03",
      "categoryKey": "writing-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Writing Desks"
      ],
      "description": "Kanso Writing Desk in Charcoal brings writing desks into a coordinated industrial interior. A clean work surface suits writing and laptop use. A shallow drawer stores notebooks and stationery.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 110 cm wide × 75 cm high × 55 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A clean work surface suits writing and laptop use. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 21699,
      "stock": 44,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for writing desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 110,
        "height": 75,
        "depth": 55,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "writing-desks",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Writing Desk in Charcoal",
      "metaDescription": "Kanso Writing Desk in Charcoal. 110 cm wide × 75 cm high × 55 cm deep. Explore this sample writing desks listing for furniture catalogue development."
    },
    {
      "name": "Aranya Writing Desk in Honey Brown",
      "slug": "aranya-writing-desk-in-honey-brown",
      "sku": "AUR-DEMO-028-04",
      "categoryKey": "writing-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Writing Desks"
      ],
      "description": "Aranya Writing Desk in Honey Brown brings writing desks into a coordinated classic interior. A clean work surface suits writing and laptop use. A shallow drawer stores notebooks and stationery.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 110 cm wide × 75 cm high × 55 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A clean work surface suits writing and laptop use. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 25099,
      "stock": 0,
      "status": "out_of_stock",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for writing desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 110,
        "height": 75,
        "depth": 55,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "writing-desks",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Writing Desk in Honey Brown",
      "metaDescription": "Aranya Writing Desk in Honey Brown. 110 cm wide × 75 cm high × 55 cm deep. Explore this sample writing desks listing for furniture catalogue development."
    },
    {
      "name": "Aster Computer Desk in Natural Oak",
      "slug": "aster-computer-desk-in-natural-oak",
      "sku": "AUR-DEMO-029-01",
      "categoryKey": "computer-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Computer Desks"
      ],
      "description": "Aster Computer Desk in Natural Oak brings computer desks into a coordinated minimal interior. A deeper desktop accommodates a monitor and keyboard. Cable ports help keep power and data leads organised.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 140 cm wide × 75 cm high × 65 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 29 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A deeper desktop accommodates a monitor and keyboard. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 23999,
      "stock": 29,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for computer desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 140,
        "height": 75,
        "depth": 65,
        "unit": "cm"
      },
      "weight": {
        "value": 29,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "computer-desks",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Computer Desk in Natural Oak",
      "metaDescription": "Aster Computer Desk in Natural Oak. 140 cm wide × 75 cm high × 65 cm deep. Explore this sample computer desks listing for furniture catalogue development.",
      "originalPrice": 26899
    },
    {
      "name": "Niva Computer Desk in Walnut",
      "slug": "niva-computer-desk-in-walnut",
      "sku": "AUR-DEMO-029-02",
      "categoryKey": "computer-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Computer Desks"
      ],
      "description": "Niva Computer Desk in Walnut brings computer desks into a coordinated scandinavian interior. A deeper desktop accommodates a monitor and keyboard. Cable ports help keep power and data leads organised.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 140 cm wide × 75 cm high × 65 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 29 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A deeper desktop accommodates a monitor and keyboard. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 27099,
      "stock": 42,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for computer desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 140,
        "height": 75,
        "depth": 65,
        "unit": "cm"
      },
      "weight": {
        "value": 29,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "computer-desks",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Computer Desk in Walnut",
      "metaDescription": "Niva Computer Desk in Walnut. 140 cm wide × 75 cm high × 65 cm deep. Explore this sample computer desks listing for furniture catalogue development."
    },
    {
      "name": "Kanso Computer Desk in Charcoal",
      "slug": "kanso-computer-desk-in-charcoal",
      "sku": "AUR-DEMO-029-03",
      "categoryKey": "computer-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Computer Desks"
      ],
      "description": "Kanso Computer Desk in Charcoal brings computer desks into a coordinated industrial interior. A deeper desktop accommodates a monitor and keyboard. Cable ports help keep power and data leads organised.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 140 cm wide × 75 cm high × 65 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 29 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A deeper desktop accommodates a monitor and keyboard. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 30599,
      "stock": 14,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for computer desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 140,
        "height": 75,
        "depth": 65,
        "unit": "cm"
      },
      "weight": {
        "value": 29,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "computer-desks",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Computer Desk in Charcoal",
      "metaDescription": "Kanso Computer Desk in Charcoal. 140 cm wide × 75 cm high × 65 cm deep. Explore this sample computer desks listing for furniture catalogue development."
    },
    {
      "name": "Aranya Computer Desk in Honey Brown",
      "slug": "aranya-computer-desk-in-honey-brown",
      "sku": "AUR-DEMO-029-04",
      "categoryKey": "computer-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Computer Desks"
      ],
      "description": "Aranya Computer Desk in Honey Brown brings computer desks into a coordinated classic interior. A deeper desktop accommodates a monitor and keyboard. Cable ports help keep power and data leads organised.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 140 cm wide × 75 cm high × 65 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 29 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A deeper desktop accommodates a monitor and keyboard. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 35399,
      "stock": 27,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for computer desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 140,
        "height": 75,
        "depth": 65,
        "unit": "cm"
      },
      "weight": {
        "value": 29,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "computer-desks",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Computer Desk in Honey Brown",
      "metaDescription": "Aranya Computer Desk in Honey Brown. 140 cm wide × 75 cm high × 65 cm deep. Explore this sample computer desks listing for furniture catalogue development."
    },
    {
      "name": "Aster Electric Standing Desk in Matte Black",
      "slug": "aster-electric-standing-desk-in-matte-black",
      "sku": "AUR-DEMO-030-01",
      "categoryKey": "electric-standing-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Electric Standing Desks"
      ],
      "description": "Aster Electric Standing Desk in Matte Black brings standing desks into a coordinated minimal interior. Height adjusts from 72 to 120 cm for seated and standing work. A memory controller stores preferred working heights.\n\nDesign and construction\nA matte black powder coating keeps the structure visually simple. Materials: Powder-coated steel. The 140 cm wide × 72 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 37 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft damp cloth and dry thoroughly.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Height adjusts from 72 to 120 cm for seated and standing work. Finished in matte black, with powder-coated steel.",
      "price": 49999,
      "stock": 40,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for electric standing desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 140,
        "height": 72,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 37,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "standing-desks",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Electric Standing Desk in Matte Black",
      "metaDescription": "Aster Electric Standing Desk in Matte Black. 140 cm wide × 72 cm high × 70 cm deep. Explore this sample standing desks listing for furniture catalogue development."
    },
    {
      "name": "Niva Electric Standing Desk in Warm White",
      "slug": "niva-electric-standing-desk-in-warm-white",
      "sku": "AUR-DEMO-030-02",
      "categoryKey": "electric-standing-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Electric Standing Desks"
      ],
      "description": "Niva Electric Standing Desk in Warm White brings standing desks into a coordinated scandinavian interior. Height adjusts from 72 to 120 cm for seated and standing work. A memory controller stores preferred working heights.\n\nDesign and construction\nWarm white surfaces and small timber details soften the metal construction. Materials: Powder-coated steel, Rubberwood accents. The 140 cm wide × 72 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 37 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use mild diluted soap when needed and dry all joints after cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Height adjusts from 72 to 120 cm for seated and standing work. Finished in warm white, with powder-coated steel, rubberwood accents.",
      "price": 56399,
      "stock": 12,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for electric standing desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Powder-coated steel",
        "Rubberwood accents"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 140,
        "height": 72,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 37,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "standing-desks",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Electric Standing Desk in Warm White",
      "metaDescription": "Niva Electric Standing Desk in Warm White. 140 cm wide × 72 cm high × 70 cm deep. Explore this sample standing desks listing for furniture catalogue development."
    },
    {
      "name": "Kanso Electric Standing Desk in Graphite",
      "slug": "kanso-electric-standing-desk-in-graphite",
      "sku": "AUR-DEMO-030-03",
      "categoryKey": "electric-standing-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Electric Standing Desks"
      ],
      "description": "Kanso Electric Standing Desk in Graphite brings standing desks into a coordinated industrial interior. Height adjusts from 72 to 120 cm for seated and standing work. A memory controller stores preferred working heights.\n\nDesign and construction\nGraphite metal and contrasting panel details suit a functional industrial interior. Materials: Powder-coated steel, Engineered wood accents. The 140 cm wide × 72 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 37 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Avoid abrasive pads and inspect fixings periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Height adjusts from 72 to 120 cm for seated and standing work. Finished in graphite, with powder-coated steel, engineered wood accents.",
      "price": 63899,
      "stock": 25,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for electric standing desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Engineered wood accents"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 140,
        "height": 72,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 37,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "standing-desks",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Electric Standing Desk in Graphite",
      "metaDescription": "Kanso Electric Standing Desk in Graphite. 140 cm wide × 72 cm high × 70 cm deep. Explore this sample standing desks listing for furniture catalogue development."
    },
    {
      "name": "Aranya Electric Standing Desk in Brushed Bronze",
      "slug": "aranya-electric-standing-desk-in-brushed-bronze",
      "sku": "AUR-DEMO-030-04",
      "categoryKey": "electric-standing-desks",
      "categoryPath": [
        "Home Office",
        "Office Desks",
        "Electric Standing Desks"
      ],
      "description": "Aranya Electric Standing Desk in Brushed Bronze brings standing desks into a coordinated contemporary interior. Height adjusts from 72 to 120 cm for seated and standing work. A memory controller stores preferred working heights.\n\nDesign and construction\nA brushed bronze finish gives the structure a warmer contemporary appearance. Materials: Bronze-finished steel. The 140 cm wide × 72 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 37 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use a dry microfibre cloth and avoid metal polish on the coated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Height adjusts from 72 to 120 cm for seated and standing work. Finished in brushed bronze, with bronze-finished steel.",
      "price": 73899,
      "stock": 38,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for electric standing desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Bronze"
      ],
      "materials": [
        "Bronze-finished steel"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 140,
        "height": 72,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 37,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-desks",
        "standing-desks",
        "aranya",
        "brushed-bronze",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Electric Standing Desk in Brushed Bronze",
      "metaDescription": "Aranya Electric Standing Desk in Brushed Bronze. 140 cm wide × 72 cm high × 70 cm deep. Explore this sample standing desks listing for furniture catalogue development.",
      "originalPrice": 82799
    },
    {
      "name": "Aster Ergonomic Mesh Chair in Black",
      "slug": "aster-ergonomic-mesh-chair-in-black",
      "sku": "AUR-DEMO-031-01",
      "categoryKey": "ergonomic-mesh-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "Ergonomic Mesh Chairs"
      ],
      "description": "Aster Ergonomic Mesh Chair in Black brings ergonomic chairs into a coordinated modern interior. Adjustable lumbar support and seat height suit longer work sessions. A mesh back promotes airflow around the upper body.\n\nDesign and construction\nA breathable mesh surface and durable five-point base suit everyday desk work. Materials: Polyester mesh, Nylon base, Foam seat. The 65 cm wide × 118 cm high × 65 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Vacuum the seat and wipe the frame with mild soapy water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Adjustable lumbar support and seat height suit longer work sessions. Finished in black, with polyester mesh, nylon base.",
      "price": 22999,
      "stock": 10,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for ergonomic mesh chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Black"
      ],
      "materials": [
        "Polyester mesh",
        "Nylon base",
        "Foam seat"
      ],
      "style": "modern",
      "dimensions": {
        "width": 65,
        "height": 118,
        "depth": 65,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "ergonomic-chairs",
        "aster",
        "black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Ergonomic Mesh Chair in Black",
      "metaDescription": "Aster Ergonomic Mesh Chair in Black. 65 cm wide × 118 cm high × 65 cm deep. Explore this sample ergonomic chairs listing for furniture catalogue development."
    },
    {
      "name": "Niva Ergonomic Mesh Chair in Light Grey",
      "slug": "niva-ergonomic-mesh-chair-in-light-grey",
      "sku": "AUR-DEMO-031-02",
      "categoryKey": "ergonomic-mesh-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "Ergonomic Mesh Chairs"
      ],
      "description": "Niva Ergonomic Mesh Chair in Light Grey brings ergonomic chairs into a coordinated scandinavian interior. Adjustable lumbar support and seat height suit longer work sessions. A mesh back promotes airflow around the upper body.\n\nDesign and construction\nA light grey fabric seat gives the workspace a softer appearance. Materials: Woven fabric, Steel base, Foam seat. The 65 cm wide × 118 cm high × 65 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Spot-clean the upholstery and keep castors free of hair and dust.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Adjustable lumbar support and seat height suit longer work sessions. Finished in light grey, with woven fabric, steel base.",
      "price": 25899,
      "stock": 23,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for ergonomic mesh chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Light Grey"
      ],
      "materials": [
        "Woven fabric",
        "Steel base",
        "Foam seat"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 65,
        "height": 118,
        "depth": 65,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "ergonomic-chairs",
        "niva",
        "light-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Ergonomic Mesh Chair in Light Grey",
      "metaDescription": "Niva Ergonomic Mesh Chair in Light Grey. 65 cm wide × 118 cm high × 65 cm deep. Explore this sample ergonomic chairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Ergonomic Mesh Chair in Graphite",
      "slug": "kanso-ergonomic-mesh-chair-in-graphite",
      "sku": "AUR-DEMO-031-03",
      "categoryKey": "ergonomic-mesh-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "Ergonomic Mesh Chairs"
      ],
      "description": "Kanso Ergonomic Mesh Chair in Graphite brings ergonomic chairs into a coordinated contemporary interior. Adjustable lumbar support and seat height suit longer work sessions. A mesh back promotes airflow around the upper body.\n\nDesign and construction\nGraphite mesh and shaped foam padding combine a restrained look with adjustable support. Materials: Polyester mesh, Steel base, Moulded foam. The 65 cm wide × 118 cm high × 65 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe accessible mechanisms clean and inspect fasteners periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Adjustable lumbar support and seat height suit longer work sessions. Finished in graphite, with polyester mesh, steel base.",
      "price": 29399,
      "stock": 36,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for ergonomic mesh chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Polyester mesh",
        "Steel base",
        "Moulded foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 65,
        "height": 118,
        "depth": 65,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "ergonomic-chairs",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Ergonomic Mesh Chair in Graphite",
      "metaDescription": "Kanso Ergonomic Mesh Chair in Graphite. 65 cm wide × 118 cm high × 65 cm deep. Explore this sample ergonomic chairs listing for furniture catalogue development."
    },
    {
      "name": "Aranya Ergonomic Mesh Chair in Cognac",
      "slug": "aranya-ergonomic-mesh-chair-in-cognac",
      "sku": "AUR-DEMO-031-04",
      "categoryKey": "ergonomic-mesh-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "Ergonomic Mesh Chairs"
      ],
      "description": "Aranya Ergonomic Mesh Chair in Cognac brings ergonomic chairs into a coordinated classic interior. Adjustable lumbar support and seat height suit longer work sessions. A mesh back promotes airflow around the upper body.\n\nDesign and construction\nCognac upholstery provides a warmer traditional finish without changing the compact office footprint. Materials: PU upholstery, Steel base, Layered foam. The 65 cm wide × 118 cm high × 65 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe PU surfaces with a soft damp cloth. Avoid alcohol and solvent-based cleaners.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Adjustable lumbar support and seat height suit longer work sessions. Finished in cognac, with pu upholstery, steel base.",
      "price": 33899,
      "stock": 8,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for ergonomic mesh chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Cognac"
      ],
      "materials": [
        "PU upholstery",
        "Steel base",
        "Layered foam"
      ],
      "style": "classic",
      "dimensions": {
        "width": 65,
        "height": 118,
        "depth": 65,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "ergonomic-chairs",
        "aranya",
        "cognac",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Ergonomic Mesh Chair in Cognac",
      "metaDescription": "Aranya Ergonomic Mesh Chair in Cognac. 65 cm wide × 118 cm high × 65 cm deep. Explore this sample ergonomic chairs listing for furniture catalogue development."
    },
    {
      "name": "Aster Compact Task Chair in Black",
      "slug": "aster-compact-task-chair-in-black",
      "sku": "AUR-DEMO-032-01",
      "categoryKey": "compact-task-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "Compact Task Chairs"
      ],
      "description": "Aster Compact Task Chair in Black brings task chairs into a coordinated modern interior. A compact swivel seat suits smaller work areas. Seat height adjusts to align with a standard desk.\n\nDesign and construction\nA breathable mesh surface and durable five-point base suit everyday desk work. Materials: Polyester mesh, Nylon base, Foam seat. The 58 cm wide × 96 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Vacuum the seat and wipe the frame with mild soapy water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact swivel seat suits smaller work areas. Finished in black, with polyester mesh, nylon base.",
      "price": 11999,
      "stock": 21,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for compact task chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Black"
      ],
      "materials": [
        "Polyester mesh",
        "Nylon base",
        "Foam seat"
      ],
      "style": "modern",
      "dimensions": {
        "width": 58,
        "height": 96,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "task-chairs",
        "aster",
        "black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Compact Task Chair in Black",
      "metaDescription": "Aster Compact Task Chair in Black. 58 cm wide × 96 cm high × 58 cm deep. Explore this sample task chairs listing for furniture catalogue development."
    },
    {
      "name": "Niva Compact Task Chair in Light Grey",
      "slug": "niva-compact-task-chair-in-light-grey",
      "sku": "AUR-DEMO-032-02",
      "categoryKey": "compact-task-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "Compact Task Chairs"
      ],
      "description": "Niva Compact Task Chair in Light Grey brings task chairs into a coordinated scandinavian interior. A compact swivel seat suits smaller work areas. Seat height adjusts to align with a standard desk.\n\nDesign and construction\nA light grey fabric seat gives the workspace a softer appearance. Materials: Woven fabric, Steel base, Foam seat. The 58 cm wide × 96 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Spot-clean the upholstery and keep castors free of hair and dust.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact swivel seat suits smaller work areas. Finished in light grey, with woven fabric, steel base.",
      "price": 13499,
      "stock": 34,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for compact task chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Light Grey"
      ],
      "materials": [
        "Woven fabric",
        "Steel base",
        "Foam seat"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 58,
        "height": 96,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "task-chairs",
        "niva",
        "light-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Compact Task Chair in Light Grey",
      "metaDescription": "Niva Compact Task Chair in Light Grey. 58 cm wide × 96 cm high × 58 cm deep. Explore this sample task chairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Compact Task Chair in Graphite",
      "slug": "kanso-compact-task-chair-in-graphite",
      "sku": "AUR-DEMO-032-03",
      "categoryKey": "compact-task-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "Compact Task Chairs"
      ],
      "description": "Kanso Compact Task Chair in Graphite brings task chairs into a coordinated contemporary interior. A compact swivel seat suits smaller work areas. Seat height adjusts to align with a standard desk.\n\nDesign and construction\nGraphite mesh and shaped foam padding combine a restrained look with adjustable support. Materials: Polyester mesh, Steel base, Moulded foam. The 58 cm wide × 96 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe accessible mechanisms clean and inspect fasteners periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact swivel seat suits smaller work areas. Finished in graphite, with polyester mesh, steel base.",
      "price": 15299,
      "stock": 47,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for compact task chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Polyester mesh",
        "Steel base",
        "Moulded foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 58,
        "height": 96,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "task-chairs",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Compact Task Chair in Graphite",
      "metaDescription": "Kanso Compact Task Chair in Graphite. 58 cm wide × 96 cm high × 58 cm deep. Explore this sample task chairs listing for furniture catalogue development.",
      "originalPrice": 17199
    },
    {
      "name": "Aranya Compact Task Chair in Cognac",
      "slug": "aranya-compact-task-chair-in-cognac",
      "sku": "AUR-DEMO-032-04",
      "categoryKey": "compact-task-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "Compact Task Chairs"
      ],
      "description": "Aranya Compact Task Chair in Cognac brings task chairs into a coordinated classic interior. A compact swivel seat suits smaller work areas. Seat height adjusts to align with a standard desk.\n\nDesign and construction\nCognac upholstery provides a warmer traditional finish without changing the compact office footprint. Materials: PU upholstery, Steel base, Layered foam. The 58 cm wide × 96 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe PU surfaces with a soft damp cloth. Avoid alcohol and solvent-based cleaners.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact swivel seat suits smaller work areas. Finished in cognac, with pu upholstery, steel base.",
      "price": 17699,
      "stock": 19,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for compact task chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Cognac"
      ],
      "materials": [
        "PU upholstery",
        "Steel base",
        "Layered foam"
      ],
      "style": "classic",
      "dimensions": {
        "width": 58,
        "height": 96,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "task-chairs",
        "aranya",
        "cognac",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Compact Task Chair in Cognac",
      "metaDescription": "Aranya Compact Task Chair in Cognac. 58 cm wide × 96 cm high × 58 cm deep. Explore this sample task chairs listing for furniture catalogue development."
    },
    {
      "name": "Aster High Back Office Chair in Black",
      "slug": "aster-high-back-office-chair-in-black",
      "sku": "AUR-DEMO-033-01",
      "categoryKey": "high-back-office-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "High Back Office Chairs"
      ],
      "description": "Aster High Back Office Chair in Black brings executive chairs into a coordinated modern interior. A high back supports the shoulders during desk work. Adjustable armrests and a tilt lock help tailor the seating position.\n\nDesign and construction\nA breathable mesh surface and durable five-point base suit everyday desk work. Materials: Polyester mesh, Nylon base, Foam seat. The 69 cm wide × 124 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Vacuum the seat and wipe the frame with mild soapy water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A high back supports the shoulders during desk work. Finished in black, with polyester mesh, nylon base.",
      "price": 29999,
      "stock": 32,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for high back office chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Black"
      ],
      "materials": [
        "Polyester mesh",
        "Nylon base",
        "Foam seat"
      ],
      "style": "modern",
      "dimensions": {
        "width": 69,
        "height": 124,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "executive-chairs",
        "aster",
        "black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster High Back Office Chair in Black",
      "metaDescription": "Aster High Back Office Chair in Black. 69 cm wide × 124 cm high × 70 cm deep. Explore this sample executive chairs listing for furniture catalogue development."
    },
    {
      "name": "Niva High Back Office Chair in Light Grey",
      "slug": "niva-high-back-office-chair-in-light-grey",
      "sku": "AUR-DEMO-033-02",
      "categoryKey": "high-back-office-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "High Back Office Chairs"
      ],
      "description": "Niva High Back Office Chair in Light Grey brings executive chairs into a coordinated scandinavian interior. A high back supports the shoulders during desk work. Adjustable armrests and a tilt lock help tailor the seating position.\n\nDesign and construction\nA light grey fabric seat gives the workspace a softer appearance. Materials: Woven fabric, Steel base, Foam seat. The 69 cm wide × 124 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Spot-clean the upholstery and keep castors free of hair and dust.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A high back supports the shoulders during desk work. Finished in light grey, with woven fabric, steel base.",
      "price": 33799,
      "stock": 45,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for high back office chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Light Grey"
      ],
      "materials": [
        "Woven fabric",
        "Steel base",
        "Foam seat"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 69,
        "height": 124,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "executive-chairs",
        "niva",
        "light-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Niva High Back Office Chair in Light Grey",
      "metaDescription": "Niva High Back Office Chair in Light Grey. 69 cm wide × 124 cm high × 70 cm deep. Explore this sample executive chairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso High Back Office Chair in Graphite",
      "slug": "kanso-high-back-office-chair-in-graphite",
      "sku": "AUR-DEMO-033-03",
      "categoryKey": "high-back-office-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "High Back Office Chairs"
      ],
      "description": "Kanso High Back Office Chair in Graphite brings executive chairs into a coordinated contemporary interior. A high back supports the shoulders during desk work. Adjustable armrests and a tilt lock help tailor the seating position.\n\nDesign and construction\nGraphite mesh and shaped foam padding combine a restrained look with adjustable support. Materials: Polyester mesh, Steel base, Moulded foam. The 69 cm wide × 124 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe accessible mechanisms clean and inspect fasteners periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A high back supports the shoulders during desk work. Finished in graphite, with polyester mesh, steel base.",
      "price": 38299,
      "stock": 17,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for high back office chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Polyester mesh",
        "Steel base",
        "Moulded foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 69,
        "height": 124,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "executive-chairs",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso High Back Office Chair in Graphite",
      "metaDescription": "Kanso High Back Office Chair in Graphite. 69 cm wide × 124 cm high × 70 cm deep. Explore this sample executive chairs listing for furniture catalogue development."
    },
    {
      "name": "Aranya High Back Office Chair in Cognac",
      "slug": "aranya-high-back-office-chair-in-cognac",
      "sku": "AUR-DEMO-033-04",
      "categoryKey": "high-back-office-chairs",
      "categoryPath": [
        "Home Office",
        "Office Seating",
        "High Back Office Chairs"
      ],
      "description": "Aranya High Back Office Chair in Cognac brings executive chairs into a coordinated classic interior. A high back supports the shoulders during desk work. Adjustable armrests and a tilt lock help tailor the seating position.\n\nDesign and construction\nCognac upholstery provides a warmer traditional finish without changing the compact office footprint. Materials: PU upholstery, Steel base, Layered foam. The 69 cm wide × 124 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe PU surfaces with a soft damp cloth. Avoid alcohol and solvent-based cleaners.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A high back supports the shoulders during desk work. Finished in cognac, with pu upholstery, steel base.",
      "price": 44299,
      "stock": 30,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for high back office chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Cognac"
      ],
      "materials": [
        "PU upholstery",
        "Steel base",
        "Layered foam"
      ],
      "style": "classic",
      "dimensions": {
        "width": 69,
        "height": 124,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-seating",
        "executive-chairs",
        "aranya",
        "cognac",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya High Back Office Chair in Cognac",
      "metaDescription": "Aranya High Back Office Chair in Cognac. 69 cm wide × 124 cm high × 70 cm deep. Explore this sample executive chairs listing for furniture catalogue development."
    },
    {
      "name": "Aster Five Shelf Bookcase in Natural Oak",
      "slug": "aster-five-shelf-bookcase-in-natural-oak",
      "sku": "AUR-DEMO-034-01",
      "categoryKey": "five-shelf-bookcases",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Five Shelf Bookcases"
      ],
      "description": "Aster Five Shelf Bookcase in Natural Oak brings bookcases into a coordinated minimal interior. Five shelves organise books and reference materials. Fit the supplied anti-tip bracket to a suitable wall.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 80 cm wide × 180 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 28 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Five shelves organise books and reference materials. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 21999,
      "stock": 43,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for five shelf bookcase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 80,
        "height": 180,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 28,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "bookcases",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Five Shelf Bookcase in Natural Oak",
      "metaDescription": "Aster Five Shelf Bookcase in Natural Oak. 80 cm wide × 180 cm high × 30 cm deep. Explore this sample bookcases listing for furniture catalogue development."
    },
    {
      "name": "Niva Five Shelf Bookcase in Walnut",
      "slug": "niva-five-shelf-bookcase-in-walnut",
      "sku": "AUR-DEMO-034-02",
      "categoryKey": "five-shelf-bookcases",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Five Shelf Bookcases"
      ],
      "description": "Niva Five Shelf Bookcase in Walnut brings bookcases into a coordinated scandinavian interior. Five shelves organise books and reference materials. Fit the supplied anti-tip bracket to a suitable wall.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 80 cm wide × 180 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 28 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Five shelves organise books and reference materials. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 24799,
      "stock": 15,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for five shelf bookcase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 80,
        "height": 180,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 28,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "bookcases",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Five Shelf Bookcase in Walnut",
      "metaDescription": "Niva Five Shelf Bookcase in Walnut. 80 cm wide × 180 cm high × 30 cm deep. Explore this sample bookcases listing for furniture catalogue development.",
      "originalPrice": 27799
    },
    {
      "name": "Kanso Five Shelf Bookcase in Charcoal",
      "slug": "kanso-five-shelf-bookcase-in-charcoal",
      "sku": "AUR-DEMO-034-03",
      "categoryKey": "five-shelf-bookcases",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Five Shelf Bookcases"
      ],
      "description": "Kanso Five Shelf Bookcase in Charcoal brings bookcases into a coordinated industrial interior. Five shelves organise books and reference materials. Fit the supplied anti-tip bracket to a suitable wall.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 80 cm wide × 180 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 28 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Five shelves organise books and reference materials. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 28099,
      "stock": 28,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for five shelf bookcase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 80,
        "height": 180,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 28,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "bookcases",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Five Shelf Bookcase in Charcoal",
      "metaDescription": "Kanso Five Shelf Bookcase in Charcoal. 80 cm wide × 180 cm high × 30 cm deep. Explore this sample bookcases listing for furniture catalogue development."
    },
    {
      "name": "Aranya Five Shelf Bookcase in Honey Brown",
      "slug": "aranya-five-shelf-bookcase-in-honey-brown",
      "sku": "AUR-DEMO-034-04",
      "categoryKey": "five-shelf-bookcases",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Five Shelf Bookcases"
      ],
      "description": "Aranya Five Shelf Bookcase in Honey Brown brings bookcases into a coordinated classic interior. Five shelves organise books and reference materials. Fit the supplied anti-tip bracket to a suitable wall.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 80 cm wide × 180 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 28 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Five shelves organise books and reference materials. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 32499,
      "stock": 41,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for five shelf bookcase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 80,
        "height": 180,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 28,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "bookcases",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Five Shelf Bookcase in Honey Brown",
      "metaDescription": "Aranya Five Shelf Bookcase in Honey Brown. 80 cm wide × 180 cm high × 30 cm deep. Explore this sample bookcases listing for furniture catalogue development."
    },
    {
      "name": "Aster Two Drawer Filing Cabinet in Matte Black",
      "slug": "aster-two-drawer-filing-cabinet-in-matte-black",
      "sku": "AUR-DEMO-035-01",
      "categoryKey": "two-drawer-filing-cabinets",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Two Drawer Filing Cabinets"
      ],
      "description": "Aster Two Drawer Filing Cabinet in Matte Black brings filing cabinets into a coordinated minimal interior. Two drawers organise A4 hanging files. A central lock keeps both drawers secured when closed.\n\nDesign and construction\nA matte black powder coating keeps the structure visually simple. Materials: Powder-coated steel. The 45 cm wide × 70 cm high × 55 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 23 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft damp cloth and dry thoroughly.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two drawers organise A4 hanging files. Finished in matte black, with powder-coated steel.",
      "price": 15999,
      "stock": 13,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for two drawer filing cabinet",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 45,
        "height": 70,
        "depth": 55,
        "unit": "cm"
      },
      "weight": {
        "value": 23,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "filing-cabinets",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Two Drawer Filing Cabinet in Matte Black",
      "metaDescription": "Aster Two Drawer Filing Cabinet in Matte Black. 45 cm wide × 70 cm high × 55 cm deep. Explore this sample filing cabinets listing for furniture catalogue development."
    },
    {
      "name": "Niva Two Drawer Filing Cabinet in Warm White",
      "slug": "niva-two-drawer-filing-cabinet-in-warm-white",
      "sku": "AUR-DEMO-035-02",
      "categoryKey": "two-drawer-filing-cabinets",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Two Drawer Filing Cabinets"
      ],
      "description": "Niva Two Drawer Filing Cabinet in Warm White brings filing cabinets into a coordinated scandinavian interior. Two drawers organise A4 hanging files. A central lock keeps both drawers secured when closed.\n\nDesign and construction\nWarm white surfaces and small timber details soften the metal construction. Materials: Powder-coated steel, Rubberwood accents. The 45 cm wide × 70 cm high × 55 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 23 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use mild diluted soap when needed and dry all joints after cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two drawers organise A4 hanging files. Finished in warm white, with powder-coated steel, rubberwood accents.",
      "price": 17999,
      "stock": 26,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for two drawer filing cabinet",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Powder-coated steel",
        "Rubberwood accents"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 45,
        "height": 70,
        "depth": 55,
        "unit": "cm"
      },
      "weight": {
        "value": 23,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "filing-cabinets",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Two Drawer Filing Cabinet in Warm White",
      "metaDescription": "Niva Two Drawer Filing Cabinet in Warm White. 45 cm wide × 70 cm high × 55 cm deep. Explore this sample filing cabinets listing for furniture catalogue development."
    },
    {
      "name": "Kanso Two Drawer Filing Cabinet in Graphite",
      "slug": "kanso-two-drawer-filing-cabinet-in-graphite",
      "sku": "AUR-DEMO-035-03",
      "categoryKey": "two-drawer-filing-cabinets",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Two Drawer Filing Cabinets"
      ],
      "description": "Kanso Two Drawer Filing Cabinet in Graphite brings filing cabinets into a coordinated industrial interior. Two drawers organise A4 hanging files. A central lock keeps both drawers secured when closed.\n\nDesign and construction\nGraphite metal and contrasting panel details suit a functional industrial interior. Materials: Powder-coated steel, Engineered wood accents. The 45 cm wide × 70 cm high × 55 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 23 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Avoid abrasive pads and inspect fixings periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two drawers organise A4 hanging files. Finished in graphite, with powder-coated steel, engineered wood accents.",
      "price": 20399,
      "stock": 39,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for two drawer filing cabinet",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Engineered wood accents"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 45,
        "height": 70,
        "depth": 55,
        "unit": "cm"
      },
      "weight": {
        "value": 23,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "filing-cabinets",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Two Drawer Filing Cabinet in Graphite",
      "metaDescription": "Kanso Two Drawer Filing Cabinet in Graphite. 45 cm wide × 70 cm high × 55 cm deep. Explore this sample filing cabinets listing for furniture catalogue development."
    },
    {
      "name": "Aranya Two Drawer Filing Cabinet in Brushed Bronze",
      "slug": "aranya-two-drawer-filing-cabinet-in-brushed-bronze",
      "sku": "AUR-DEMO-035-04",
      "categoryKey": "two-drawer-filing-cabinets",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Two Drawer Filing Cabinets"
      ],
      "description": "Aranya Two Drawer Filing Cabinet in Brushed Bronze brings filing cabinets into a coordinated contemporary interior. Two drawers organise A4 hanging files. A central lock keeps both drawers secured when closed.\n\nDesign and construction\nA brushed bronze finish gives the structure a warmer contemporary appearance. Materials: Bronze-finished steel. The 45 cm wide × 70 cm high × 55 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 23 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use a dry microfibre cloth and avoid metal polish on the coated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two drawers organise A4 hanging files. Finished in brushed bronze, with bronze-finished steel.",
      "price": 23599,
      "stock": 11,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for two drawer filing cabinet",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Bronze"
      ],
      "materials": [
        "Bronze-finished steel"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 45,
        "height": 70,
        "depth": 55,
        "unit": "cm"
      },
      "weight": {
        "value": 23,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "filing-cabinets",
        "aranya",
        "brushed-bronze",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Two Drawer Filing Cabinet in Brushed Bronze",
      "metaDescription": "Aranya Two Drawer Filing Cabinet in Brushed Bronze. 45 cm wide × 70 cm high × 55 cm deep. Explore this sample filing cabinets listing for furniture catalogue development."
    },
    {
      "name": "Aster Three Drawer Desk Pedestal in Natural Oak",
      "slug": "aster-three-drawer-desk-pedestal-in-natural-oak",
      "sku": "AUR-DEMO-036-01",
      "categoryKey": "three-drawer-desk-pedestals",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Three Drawer Desk Pedestals"
      ],
      "description": "Aster Three Drawer Desk Pedestal in Natural Oak brings mobile pedestals into a coordinated minimal interior. Three drawers keep desk supplies within easy reach. Castors let the pedestal move between workstations.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 42 cm wide × 61 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three drawers keep desk supplies within easy reach. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 11999,
      "stock": 24,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for three drawer desk pedestal",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 42,
        "height": 61,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "mobile-pedestals",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Three Drawer Desk Pedestal in Natural Oak",
      "metaDescription": "Aster Three Drawer Desk Pedestal in Natural Oak. 42 cm wide × 61 cm high × 50 cm deep. Explore this sample mobile pedestals listing for furniture catalogue development.",
      "originalPrice": 13499
    },
    {
      "name": "Niva Three Drawer Desk Pedestal in Walnut",
      "slug": "niva-three-drawer-desk-pedestal-in-walnut",
      "sku": "AUR-DEMO-036-02",
      "categoryKey": "three-drawer-desk-pedestals",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Three Drawer Desk Pedestals"
      ],
      "description": "Niva Three Drawer Desk Pedestal in Walnut brings mobile pedestals into a coordinated scandinavian interior. Three drawers keep desk supplies within easy reach. Castors let the pedestal move between workstations.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 42 cm wide × 61 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three drawers keep desk supplies within easy reach. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 13499,
      "stock": 37,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for three drawer desk pedestal",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 42,
        "height": 61,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "mobile-pedestals",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Three Drawer Desk Pedestal in Walnut",
      "metaDescription": "Niva Three Drawer Desk Pedestal in Walnut. 42 cm wide × 61 cm high × 50 cm deep. Explore this sample mobile pedestals listing for furniture catalogue development."
    },
    {
      "name": "Kanso Three Drawer Desk Pedestal in Charcoal",
      "slug": "kanso-three-drawer-desk-pedestal-in-charcoal",
      "sku": "AUR-DEMO-036-03",
      "categoryKey": "three-drawer-desk-pedestals",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Three Drawer Desk Pedestals"
      ],
      "description": "Kanso Three Drawer Desk Pedestal in Charcoal brings mobile pedestals into a coordinated industrial interior. Three drawers keep desk supplies within easy reach. Castors let the pedestal move between workstations.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 42 cm wide × 61 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three drawers keep desk supplies within easy reach. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 15299,
      "stock": 9,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for three drawer desk pedestal",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 42,
        "height": 61,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "mobile-pedestals",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Three Drawer Desk Pedestal in Charcoal",
      "metaDescription": "Kanso Three Drawer Desk Pedestal in Charcoal. 42 cm wide × 61 cm high × 50 cm deep. Explore this sample mobile pedestals listing for furniture catalogue development."
    },
    {
      "name": "Aranya Three Drawer Desk Pedestal in Honey Brown",
      "slug": "aranya-three-drawer-desk-pedestal-in-honey-brown",
      "sku": "AUR-DEMO-036-04",
      "categoryKey": "three-drawer-desk-pedestals",
      "categoryPath": [
        "Home Office",
        "Office Storage",
        "Three Drawer Desk Pedestals"
      ],
      "description": "Aranya Three Drawer Desk Pedestal in Honey Brown brings mobile pedestals into a coordinated classic interior. Three drawers keep desk supplies within easy reach. Castors let the pedestal move between workstations.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 42 cm wide × 61 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three drawers keep desk supplies within easy reach. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 17699,
      "stock": 22,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
          "alt": "Home Office interior reference for three drawer desk pedestal",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 42,
        "height": 61,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "home-office",
        "office-storage",
        "mobile-pedestals",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Three Drawer Desk Pedestal in Honey Brown",
      "metaDescription": "Aranya Three Drawer Desk Pedestal in Honey Brown. 42 cm wide × 61 cm high × 50 cm deep. Explore this sample mobile pedestals listing for furniture catalogue development."
    },
    {
      "name": "Aster Patio Lounge Chair in Slate Grey",
      "slug": "aster-patio-lounge-chair-in-slate-grey",
      "sku": "AUR-DEMO-037-01",
      "categoryKey": "patio-lounge-chairs",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Patio Lounge Chairs"
      ],
      "description": "Aster Patio Lounge Chair in Slate Grey brings patio chairs into a coordinated modern interior. An open-weave seat suits a covered patio or balcony. Removable outdoor cushions simplify seasonal storage.\n\nDesign and construction\nA slate aluminium frame provides an easy-to-maintain sheltered outdoor option. Materials: Powder-coated aluminium, Outdoor polyester cushions. The 74 cm wide × 80 cm high × 78 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Brush away dust, wash with mild soap and store cushions indoors after use.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An open-weave seat suits a covered patio or balcony. Finished in slate grey, with powder-coated aluminium, outdoor polyester cushions.",
      "price": 16999,
      "stock": 35,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for patio lounge chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Slate Grey"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Outdoor polyester cushions"
      ],
      "style": "modern",
      "dimensions": {
        "width": 74,
        "height": 80,
        "depth": 78,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "patio-chairs",
        "aster",
        "slate-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Patio Lounge Chair in Slate Grey",
      "metaDescription": "Aster Patio Lounge Chair in Slate Grey. 74 cm wide × 80 cm high × 78 cm deep. Explore this sample patio chairs listing for furniture catalogue development."
    },
    {
      "name": "Niva Patio Lounge Chair in Natural Teak",
      "slug": "niva-patio-lounge-chair-in-natural-teak",
      "sku": "AUR-DEMO-037-02",
      "categoryKey": "patio-lounge-chairs",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Patio Lounge Chairs"
      ],
      "description": "Niva Patio Lounge Chair in Natural Teak brings patio chairs into a coordinated scandinavian interior. An open-weave seat suits a covered patio or balcony. Removable outdoor cushions simplify seasonal storage.\n\nDesign and construction\nAn acacia timber structure with teak-tone oil complements planted terraces. Materials: Solid acacia wood, Teak-tone protective oil. The 74 cm wide × 80 cm high × 78 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean gently, let surfaces dry and renew the protective oil as needed.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An open-weave seat suits a covered patio or balcony. Finished in natural teak, with solid acacia wood, teak-tone protective oil.",
      "price": 19099,
      "stock": 48,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for patio lounge chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Teak"
      ],
      "materials": [
        "Solid acacia wood",
        "Teak-tone protective oil"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 74,
        "height": 80,
        "depth": 78,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "patio-chairs",
        "niva",
        "natural-teak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Patio Lounge Chair in Natural Teak",
      "metaDescription": "Niva Patio Lounge Chair in Natural Teak. 74 cm wide × 80 cm high × 78 cm deep. Explore this sample patio chairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Patio Lounge Chair in Graphite",
      "slug": "kanso-patio-lounge-chair-in-graphite",
      "sku": "AUR-DEMO-037-03",
      "categoryKey": "patio-lounge-chairs",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Patio Lounge Chairs"
      ],
      "description": "Kanso Patio Lounge Chair in Graphite brings patio chairs into a coordinated industrial interior. An open-weave seat suits a covered patio or balcony. Removable outdoor cushions simplify seasonal storage.\n\nDesign and construction\nA graphite coated-steel structure lends the design a more architectural character. Materials: Powder-coated steel, Weather-resistant synthetic panels. The 74 cm wide × 80 cm high × 78 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dry after rain and touch up any chips in the coating to reduce corrosion risk.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An open-weave seat suits a covered patio or balcony. Finished in graphite, with powder-coated steel, weather-resistant synthetic panels.",
      "price": 21699,
      "stock": 20,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for patio lounge chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Weather-resistant synthetic panels"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 74,
        "height": 80,
        "depth": 78,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "patio-chairs",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Patio Lounge Chair in Graphite",
      "metaDescription": "Kanso Patio Lounge Chair in Graphite. 74 cm wide × 80 cm high × 78 cm deep. Explore this sample patio chairs listing for furniture catalogue development."
    },
    {
      "name": "Aranya Patio Lounge Chair in Warm Sand",
      "slug": "aranya-patio-lounge-chair-in-warm-sand",
      "sku": "AUR-DEMO-037-04",
      "categoryKey": "patio-lounge-chairs",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Patio Lounge Chairs"
      ],
      "description": "Aranya Patio Lounge Chair in Warm Sand brings patio chairs into a coordinated contemporary interior. An open-weave seat suits a covered patio or balcony. Removable outdoor cushions simplify seasonal storage.\n\nDesign and construction\nSand-coloured aluminium and warm timber details suit a covered balcony or patio. Materials: Powder-coated aluminium, Acacia wood details. The 74 cm wide × 80 cm high × 78 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Keep covered when not in use and bring soft components indoors during heavy rain.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An open-weave seat suits a covered patio or balcony. Finished in warm sand, with powder-coated aluminium, acacia wood details.",
      "price": 25099,
      "stock": 33,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for patio lounge chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Sand"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Acacia wood details"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 74,
        "height": 80,
        "depth": 78,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "patio-chairs",
        "aranya",
        "warm-sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Patio Lounge Chair in Warm Sand",
      "metaDescription": "Aranya Patio Lounge Chair in Warm Sand. 74 cm wide × 80 cm high × 78 cm deep. Explore this sample patio chairs listing for furniture catalogue development.",
      "originalPrice": 28199
    },
    {
      "name": "Aster Outdoor Two Seater Sofa in Slate Grey",
      "slug": "aster-outdoor-two-seater-sofa-in-slate-grey",
      "sku": "AUR-DEMO-038-01",
      "categoryKey": "outdoor-two-seater-sofas",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Outdoor Two Seater Sofas"
      ],
      "description": "Aster Outdoor Two Seater Sofa in Slate Grey brings garden sofas into a coordinated modern interior. Two cushioned seats create a relaxed outdoor conversation area. A raised frame helps air circulate beneath the cushions.\n\nDesign and construction\nA slate aluminium frame provides an easy-to-maintain sheltered outdoor option. Materials: Powder-coated aluminium, Outdoor polyester cushions. The 152 cm wide × 78 cm high × 80 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 24 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Brush away dust, wash with mild soap and store cushions indoors after use.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two cushioned seats create a relaxed outdoor conversation area. Finished in slate grey, with powder-coated aluminium, outdoor polyester cushions.",
      "price": 38999,
      "stock": 0,
      "status": "out_of_stock",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for outdoor two seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Slate Grey"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Outdoor polyester cushions"
      ],
      "style": "modern",
      "dimensions": {
        "width": 152,
        "height": 78,
        "depth": 80,
        "unit": "cm"
      },
      "weight": {
        "value": 24,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "garden-sofas",
        "aster",
        "slate-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Outdoor Two Seater Sofa in Slate Grey",
      "metaDescription": "Aster Outdoor Two Seater Sofa in Slate Grey. 152 cm wide × 78 cm high × 80 cm deep. Explore this sample garden sofas listing for furniture catalogue development."
    },
    {
      "name": "Niva Outdoor Two Seater Sofa in Natural Teak",
      "slug": "niva-outdoor-two-seater-sofa-in-natural-teak",
      "sku": "AUR-DEMO-038-02",
      "categoryKey": "outdoor-two-seater-sofas",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Outdoor Two Seater Sofas"
      ],
      "description": "Niva Outdoor Two Seater Sofa in Natural Teak brings garden sofas into a coordinated scandinavian interior. Two cushioned seats create a relaxed outdoor conversation area. A raised frame helps air circulate beneath the cushions.\n\nDesign and construction\nAn acacia timber structure with teak-tone oil complements planted terraces. Materials: Solid acacia wood, Teak-tone protective oil. The 152 cm wide × 78 cm high × 80 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 24 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean gently, let surfaces dry and renew the protective oil as needed.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two cushioned seats create a relaxed outdoor conversation area. Finished in natural teak, with solid acacia wood, teak-tone protective oil.",
      "price": 43999,
      "stock": 18,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for outdoor two seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Teak"
      ],
      "materials": [
        "Solid acacia wood",
        "Teak-tone protective oil"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 152,
        "height": 78,
        "depth": 80,
        "unit": "cm"
      },
      "weight": {
        "value": 24,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "garden-sofas",
        "niva",
        "natural-teak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Outdoor Two Seater Sofa in Natural Teak",
      "metaDescription": "Niva Outdoor Two Seater Sofa in Natural Teak. 152 cm wide × 78 cm high × 80 cm deep. Explore this sample garden sofas listing for furniture catalogue development."
    },
    {
      "name": "Kanso Outdoor Two Seater Sofa in Graphite",
      "slug": "kanso-outdoor-two-seater-sofa-in-graphite",
      "sku": "AUR-DEMO-038-03",
      "categoryKey": "outdoor-two-seater-sofas",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Outdoor Two Seater Sofas"
      ],
      "description": "Kanso Outdoor Two Seater Sofa in Graphite brings garden sofas into a coordinated industrial interior. Two cushioned seats create a relaxed outdoor conversation area. A raised frame helps air circulate beneath the cushions.\n\nDesign and construction\nA graphite coated-steel structure lends the design a more architectural character. Materials: Powder-coated steel, Weather-resistant synthetic panels. The 152 cm wide × 78 cm high × 80 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 24 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dry after rain and touch up any chips in the coating to reduce corrosion risk.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two cushioned seats create a relaxed outdoor conversation area. Finished in graphite, with powder-coated steel, weather-resistant synthetic panels.",
      "price": 49799,
      "stock": 31,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for outdoor two seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Weather-resistant synthetic panels"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 152,
        "height": 78,
        "depth": 80,
        "unit": "cm"
      },
      "weight": {
        "value": 24,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "garden-sofas",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Outdoor Two Seater Sofa in Graphite",
      "metaDescription": "Kanso Outdoor Two Seater Sofa in Graphite. 152 cm wide × 78 cm high × 80 cm deep. Explore this sample garden sofas listing for furniture catalogue development."
    },
    {
      "name": "Aranya Outdoor Two Seater Sofa in Warm Sand",
      "slug": "aranya-outdoor-two-seater-sofa-in-warm-sand",
      "sku": "AUR-DEMO-038-04",
      "categoryKey": "outdoor-two-seater-sofas",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Outdoor Two Seater Sofas"
      ],
      "description": "Aranya Outdoor Two Seater Sofa in Warm Sand brings garden sofas into a coordinated contemporary interior. Two cushioned seats create a relaxed outdoor conversation area. A raised frame helps air circulate beneath the cushions.\n\nDesign and construction\nSand-coloured aluminium and warm timber details suit a covered balcony or patio. Materials: Powder-coated aluminium, Acacia wood details. The 152 cm wide × 78 cm high × 80 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 24 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Keep covered when not in use and bring soft components indoors during heavy rain.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two cushioned seats create a relaxed outdoor conversation area. Finished in warm sand, with powder-coated aluminium, acacia wood details.",
      "price": 57599,
      "stock": 44,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for outdoor two seater sofa",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Sand"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Acacia wood details"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 152,
        "height": 78,
        "depth": 80,
        "unit": "cm"
      },
      "weight": {
        "value": 24,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "garden-sofas",
        "aranya",
        "warm-sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Outdoor Two Seater Sofa in Warm Sand",
      "metaDescription": "Aranya Outdoor Two Seater Sofa in Warm Sand. 152 cm wide × 78 cm high × 80 cm deep. Explore this sample garden sofas listing for furniture catalogue development."
    },
    {
      "name": "Aster Freestanding Hanging Chair in Slate Grey",
      "slug": "aster-freestanding-hanging-chair-in-slate-grey",
      "sku": "AUR-DEMO-039-01",
      "categoryKey": "freestanding-hanging-chairs",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Freestanding Hanging Chairs"
      ],
      "description": "Aster Freestanding Hanging Chair in Slate Grey brings hanging chairs into a coordinated modern interior. A suspended basket seat hangs from its own metal stand. Use on a level stable surface and follow the supplied loading instructions.\n\nDesign and construction\nA slate aluminium frame provides an easy-to-maintain sheltered outdoor option. Materials: Powder-coated aluminium, Outdoor polyester cushions. The 105 cm wide × 195 cm high × 105 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 31 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Brush away dust, wash with mild soap and store cushions indoors after use.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A suspended basket seat hangs from its own metal stand. Finished in slate grey, with powder-coated aluminium, outdoor polyester cushions.",
      "price": 32999,
      "stock": 16,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for freestanding hanging chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Slate Grey"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Outdoor polyester cushions"
      ],
      "style": "modern",
      "dimensions": {
        "width": 105,
        "height": 195,
        "depth": 105,
        "unit": "cm"
      },
      "weight": {
        "value": 31,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "hanging-chairs",
        "aster",
        "slate-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Freestanding Hanging Chair in Slate Grey",
      "metaDescription": "Aster Freestanding Hanging Chair in Slate Grey. 105 cm wide × 195 cm high × 105 cm deep. Explore this sample hanging chairs listing for furniture catalogue development."
    },
    {
      "name": "Niva Freestanding Hanging Chair in Natural Teak",
      "slug": "niva-freestanding-hanging-chair-in-natural-teak",
      "sku": "AUR-DEMO-039-02",
      "categoryKey": "freestanding-hanging-chairs",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Freestanding Hanging Chairs"
      ],
      "description": "Niva Freestanding Hanging Chair in Natural Teak brings hanging chairs into a coordinated scandinavian interior. A suspended basket seat hangs from its own metal stand. Use on a level stable surface and follow the supplied loading instructions.\n\nDesign and construction\nAn acacia timber structure with teak-tone oil complements planted terraces. Materials: Solid acacia wood, Teak-tone protective oil. The 105 cm wide × 195 cm high × 105 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 31 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean gently, let surfaces dry and renew the protective oil as needed.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A suspended basket seat hangs from its own metal stand. Finished in natural teak, with solid acacia wood, teak-tone protective oil.",
      "price": 37199,
      "stock": 29,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for freestanding hanging chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Teak"
      ],
      "materials": [
        "Solid acacia wood",
        "Teak-tone protective oil"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 105,
        "height": 195,
        "depth": 105,
        "unit": "cm"
      },
      "weight": {
        "value": 31,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "hanging-chairs",
        "niva",
        "natural-teak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Freestanding Hanging Chair in Natural Teak",
      "metaDescription": "Niva Freestanding Hanging Chair in Natural Teak. 105 cm wide × 195 cm high × 105 cm deep. Explore this sample hanging chairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Freestanding Hanging Chair in Graphite",
      "slug": "kanso-freestanding-hanging-chair-in-graphite",
      "sku": "AUR-DEMO-039-03",
      "categoryKey": "freestanding-hanging-chairs",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Freestanding Hanging Chairs"
      ],
      "description": "Kanso Freestanding Hanging Chair in Graphite brings hanging chairs into a coordinated industrial interior. A suspended basket seat hangs from its own metal stand. Use on a level stable surface and follow the supplied loading instructions.\n\nDesign and construction\nA graphite coated-steel structure lends the design a more architectural character. Materials: Powder-coated steel, Weather-resistant synthetic panels. The 105 cm wide × 195 cm high × 105 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 31 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dry after rain and touch up any chips in the coating to reduce corrosion risk.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A suspended basket seat hangs from its own metal stand. Finished in graphite, with powder-coated steel, weather-resistant synthetic panels.",
      "price": 42199,
      "stock": 42,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for freestanding hanging chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Weather-resistant synthetic panels"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 105,
        "height": 195,
        "depth": 105,
        "unit": "cm"
      },
      "weight": {
        "value": 31,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "hanging-chairs",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Freestanding Hanging Chair in Graphite",
      "metaDescription": "Kanso Freestanding Hanging Chair in Graphite. 105 cm wide × 195 cm high × 105 cm deep. Explore this sample hanging chairs listing for furniture catalogue development.",
      "originalPrice": 47299
    },
    {
      "name": "Aranya Freestanding Hanging Chair in Warm Sand",
      "slug": "aranya-freestanding-hanging-chair-in-warm-sand",
      "sku": "AUR-DEMO-039-04",
      "categoryKey": "freestanding-hanging-chairs",
      "categoryPath": [
        "Outdoor",
        "Outdoor Seating",
        "Freestanding Hanging Chairs"
      ],
      "description": "Aranya Freestanding Hanging Chair in Warm Sand brings hanging chairs into a coordinated contemporary interior. A suspended basket seat hangs from its own metal stand. Use on a level stable surface and follow the supplied loading instructions.\n\nDesign and construction\nSand-coloured aluminium and warm timber details suit a covered balcony or patio. Materials: Powder-coated aluminium, Acacia wood details. The 105 cm wide × 195 cm high × 105 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 31 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Keep covered when not in use and bring soft components indoors during heavy rain.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A suspended basket seat hangs from its own metal stand. Finished in warm sand, with powder-coated aluminium, acacia wood details.",
      "price": 48699,
      "stock": 14,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for freestanding hanging chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Sand"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Acacia wood details"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 105,
        "height": 195,
        "depth": 105,
        "unit": "cm"
      },
      "weight": {
        "value": 31,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-seating",
        "hanging-chairs",
        "aranya",
        "warm-sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Freestanding Hanging Chair in Warm Sand",
      "metaDescription": "Aranya Freestanding Hanging Chair in Warm Sand. 105 cm wide × 195 cm high × 105 cm deep. Explore this sample hanging chairs listing for furniture catalogue development."
    },
    {
      "name": "Aster Round Bistro Table in Natural Acacia",
      "slug": "aster-round-bistro-table-in-natural-acacia",
      "sku": "AUR-DEMO-040-01",
      "categoryKey": "round-bistro-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Round Bistro Tables"
      ],
      "description": "Aster Round Bistro Table in Natural Acacia brings bistro tables into a coordinated modern interior. A small round top suits two-person balcony dining. A compact central base leaves space for chairs.\n\nDesign and construction\nAn acacia top and coated aluminium base suit sheltered outdoor dining. Materials: Acacia wood, Powder-coated aluminium. The 70 cm wide × 74 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 11 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wash with mild soap, dry thoroughly and keep covered during prolonged rain.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A small round top suits two-person balcony dining. Finished in natural acacia, with acacia wood, powder-coated aluminium.",
      "price": 11999,
      "stock": 27,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for round bistro table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Acacia"
      ],
      "materials": [
        "Acacia wood",
        "Powder-coated aluminium"
      ],
      "style": "modern",
      "dimensions": {
        "width": 70,
        "height": 74,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 11,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "bistro-tables",
        "aster",
        "natural-acacia",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Round Bistro Table in Natural Acacia",
      "metaDescription": "Aster Round Bistro Table in Natural Acacia. 70 cm wide × 74 cm high × 70 cm deep. Explore this sample bistro tables listing for furniture catalogue development."
    },
    {
      "name": "Niva Round Bistro Table in Natural Teak",
      "slug": "niva-round-bistro-table-in-natural-teak",
      "sku": "AUR-DEMO-040-02",
      "categoryKey": "round-bistro-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Round Bistro Tables"
      ],
      "description": "Niva Round Bistro Table in Natural Teak brings bistro tables into a coordinated scandinavian interior. A small round top suits two-person balcony dining. A compact central base leaves space for chairs.\n\nDesign and construction\nOiled acacia surfaces provide a warm timber finish. Materials: Solid acacia wood, Teak-tone protective oil. The 70 cm wide × 74 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 11 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean gently and renew the protective oil as needed.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A small round top suits two-person balcony dining. Finished in natural teak, with solid acacia wood, teak-tone protective oil.",
      "price": 13499,
      "stock": 40,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for round bistro table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Teak"
      ],
      "materials": [
        "Solid acacia wood",
        "Teak-tone protective oil"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 70,
        "height": 74,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 11,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "bistro-tables",
        "niva",
        "natural-teak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Round Bistro Table in Natural Teak",
      "metaDescription": "Niva Round Bistro Table in Natural Teak. 70 cm wide × 74 cm high × 70 cm deep. Explore this sample bistro tables listing for furniture catalogue development."
    },
    {
      "name": "Kanso Round Bistro Table in Graphite",
      "slug": "kanso-round-bistro-table-in-graphite",
      "sku": "AUR-DEMO-040-03",
      "categoryKey": "round-bistro-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Round Bistro Tables"
      ],
      "description": "Kanso Round Bistro Table in Graphite brings bistro tables into a coordinated industrial interior. A small round top suits two-person balcony dining. A compact central base leaves space for chairs.\n\nDesign and construction\nA graphite steel base supports a practical composite surface. Materials: Powder-coated steel, Weather-resistant composite top. The 70 cm wide × 74 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 11 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe clean, dry after rain and inspect the coating periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A small round top suits two-person balcony dining. Finished in graphite, with powder-coated steel, weather-resistant composite top.",
      "price": 15299,
      "stock": 12,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for round bistro table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Weather-resistant composite top"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 70,
        "height": 74,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 11,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "bistro-tables",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Round Bistro Table in Graphite",
      "metaDescription": "Kanso Round Bistro Table in Graphite. 70 cm wide × 74 cm high × 70 cm deep. Explore this sample bistro tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Round Bistro Table in Warm Sand",
      "slug": "aranya-round-bistro-table-in-warm-sand",
      "sku": "AUR-DEMO-040-04",
      "categoryKey": "round-bistro-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Round Bistro Tables"
      ],
      "description": "Aranya Round Bistro Table in Warm Sand brings bistro tables into a coordinated contemporary interior. A small round top suits two-person balcony dining. A compact central base leaves space for chairs.\n\nDesign and construction\nSand-finished metal and a timber surface create a softer outdoor palette. Materials: Powder-coated aluminium, Acacia tabletop. The 70 cm wide × 74 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 11 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use a cover when stored outdoors and avoid leaving standing water on the surface.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A small round top suits two-person balcony dining. Finished in warm sand, with powder-coated aluminium, acacia tabletop.",
      "price": 17699,
      "stock": 25,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for round bistro table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Sand"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Acacia tabletop"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 70,
        "height": 74,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 11,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "bistro-tables",
        "aranya",
        "warm-sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Round Bistro Table in Warm Sand",
      "metaDescription": "Aranya Round Bistro Table in Warm Sand. 70 cm wide × 74 cm high × 70 cm deep. Explore this sample bistro tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Patio Dining Table in Natural Acacia",
      "slug": "aster-patio-dining-table-in-natural-acacia",
      "sku": "AUR-DEMO-041-01",
      "categoryKey": "patio-dining-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Patio Dining Tables"
      ],
      "description": "Aster Patio Dining Table in Natural Acacia brings patio dining tables into a coordinated modern interior. A four-to-six-place surface accommodates outdoor meals. A slatted tabletop lets light rain drain between boards.\n\nDesign and construction\nAn acacia top and coated aluminium base suit sheltered outdoor dining. Materials: Acacia wood, Powder-coated aluminium. The 150 cm wide × 75 cm high × 85 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 25 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wash with mild soap, dry thoroughly and keep covered during prolonged rain.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A four-to-six-place surface accommodates outdoor meals. Finished in natural acacia, with acacia wood, powder-coated aluminium.",
      "price": 26999,
      "stock": 38,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for patio dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Acacia"
      ],
      "materials": [
        "Acacia wood",
        "Powder-coated aluminium"
      ],
      "style": "modern",
      "dimensions": {
        "width": 150,
        "height": 75,
        "depth": 85,
        "unit": "cm"
      },
      "weight": {
        "value": 25,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "patio-dining-tables",
        "aster",
        "natural-acacia",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Patio Dining Table in Natural Acacia",
      "metaDescription": "Aster Patio Dining Table in Natural Acacia. 150 cm wide × 75 cm high × 85 cm deep. Explore this sample patio dining tables listing for furniture catalogue development."
    },
    {
      "name": "Niva Patio Dining Table in Natural Teak",
      "slug": "niva-patio-dining-table-in-natural-teak",
      "sku": "AUR-DEMO-041-02",
      "categoryKey": "patio-dining-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Patio Dining Tables"
      ],
      "description": "Niva Patio Dining Table in Natural Teak brings patio dining tables into a coordinated scandinavian interior. A four-to-six-place surface accommodates outdoor meals. A slatted tabletop lets light rain drain between boards.\n\nDesign and construction\nOiled acacia surfaces provide a warm timber finish. Materials: Solid acacia wood, Teak-tone protective oil. The 150 cm wide × 75 cm high × 85 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 25 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean gently and renew the protective oil as needed.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A four-to-six-place surface accommodates outdoor meals. Finished in natural teak, with solid acacia wood, teak-tone protective oil.",
      "price": 30399,
      "stock": 10,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for patio dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Teak"
      ],
      "materials": [
        "Solid acacia wood",
        "Teak-tone protective oil"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 150,
        "height": 75,
        "depth": 85,
        "unit": "cm"
      },
      "weight": {
        "value": 25,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "patio-dining-tables",
        "niva",
        "natural-teak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Patio Dining Table in Natural Teak",
      "metaDescription": "Niva Patio Dining Table in Natural Teak. 150 cm wide × 75 cm high × 85 cm deep. Explore this sample patio dining tables listing for furniture catalogue development.",
      "originalPrice": 34099
    },
    {
      "name": "Kanso Patio Dining Table in Graphite",
      "slug": "kanso-patio-dining-table-in-graphite",
      "sku": "AUR-DEMO-041-03",
      "categoryKey": "patio-dining-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Patio Dining Tables"
      ],
      "description": "Kanso Patio Dining Table in Graphite brings patio dining tables into a coordinated industrial interior. A four-to-six-place surface accommodates outdoor meals. A slatted tabletop lets light rain drain between boards.\n\nDesign and construction\nA graphite steel base supports a practical composite surface. Materials: Powder-coated steel, Weather-resistant composite top. The 150 cm wide × 75 cm high × 85 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 25 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe clean, dry after rain and inspect the coating periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A four-to-six-place surface accommodates outdoor meals. Finished in graphite, with powder-coated steel, weather-resistant composite top.",
      "price": 34499,
      "stock": 23,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for patio dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Weather-resistant composite top"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 150,
        "height": 75,
        "depth": 85,
        "unit": "cm"
      },
      "weight": {
        "value": 25,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "patio-dining-tables",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Patio Dining Table in Graphite",
      "metaDescription": "Kanso Patio Dining Table in Graphite. 150 cm wide × 75 cm high × 85 cm deep. Explore this sample patio dining tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Patio Dining Table in Warm Sand",
      "slug": "aranya-patio-dining-table-in-warm-sand",
      "sku": "AUR-DEMO-041-04",
      "categoryKey": "patio-dining-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Patio Dining Tables"
      ],
      "description": "Aranya Patio Dining Table in Warm Sand brings patio dining tables into a coordinated contemporary interior. A four-to-six-place surface accommodates outdoor meals. A slatted tabletop lets light rain drain between boards.\n\nDesign and construction\nSand-finished metal and a timber surface create a softer outdoor palette. Materials: Powder-coated aluminium, Acacia tabletop. The 150 cm wide × 75 cm high × 85 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 25 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use a cover when stored outdoors and avoid leaving standing water on the surface.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A four-to-six-place surface accommodates outdoor meals. Finished in warm sand, with powder-coated aluminium, acacia tabletop.",
      "price": 39899,
      "stock": 36,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for patio dining table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Sand"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Acacia tabletop"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 150,
        "height": 75,
        "depth": 85,
        "unit": "cm"
      },
      "weight": {
        "value": 25,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "patio-dining-tables",
        "aranya",
        "warm-sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Patio Dining Table in Warm Sand",
      "metaDescription": "Aranya Patio Dining Table in Warm Sand. 150 cm wide × 75 cm high × 85 cm deep. Explore this sample patio dining tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Folding Balcony Table in Natural Acacia",
      "slug": "aster-folding-balcony-table-in-natural-acacia",
      "sku": "AUR-DEMO-042-01",
      "categoryKey": "folding-balcony-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Folding Balcony Tables"
      ],
      "description": "Aster Folding Balcony Table in Natural Acacia brings balcony tables into a coordinated modern interior. A folding frame creates occasional dining space on a balcony. The compact table stores flat when not in use.\n\nDesign and construction\nAn acacia top and coated aluminium base suit sheltered outdoor dining. Materials: Acacia wood, Powder-coated aluminium. The 60 cm wide × 74 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wash with mild soap, dry thoroughly and keep covered during prolonged rain.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A folding frame creates occasional dining space on a balcony. Finished in natural acacia, with acacia wood, powder-coated aluminium.",
      "price": 7999,
      "stock": 8,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for folding balcony table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Acacia"
      ],
      "materials": [
        "Acacia wood",
        "Powder-coated aluminium"
      ],
      "style": "modern",
      "dimensions": {
        "width": 60,
        "height": 74,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "balcony-tables",
        "aster",
        "natural-acacia",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Folding Balcony Table in Natural Acacia",
      "metaDescription": "Aster Folding Balcony Table in Natural Acacia. 60 cm wide × 74 cm high × 60 cm deep. Explore this sample balcony tables listing for furniture catalogue development."
    },
    {
      "name": "Niva Folding Balcony Table in Natural Teak",
      "slug": "niva-folding-balcony-table-in-natural-teak",
      "sku": "AUR-DEMO-042-02",
      "categoryKey": "folding-balcony-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Folding Balcony Tables"
      ],
      "description": "Niva Folding Balcony Table in Natural Teak brings balcony tables into a coordinated scandinavian interior. A folding frame creates occasional dining space on a balcony. The compact table stores flat when not in use.\n\nDesign and construction\nOiled acacia surfaces provide a warm timber finish. Materials: Solid acacia wood, Teak-tone protective oil. The 60 cm wide × 74 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean gently and renew the protective oil as needed.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A folding frame creates occasional dining space on a balcony. Finished in natural teak, with solid acacia wood, teak-tone protective oil.",
      "price": 8999,
      "stock": 21,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for folding balcony table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Teak"
      ],
      "materials": [
        "Solid acacia wood",
        "Teak-tone protective oil"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 60,
        "height": 74,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "balcony-tables",
        "niva",
        "natural-teak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Folding Balcony Table in Natural Teak",
      "metaDescription": "Niva Folding Balcony Table in Natural Teak. 60 cm wide × 74 cm high × 60 cm deep. Explore this sample balcony tables listing for furniture catalogue development."
    },
    {
      "name": "Kanso Folding Balcony Table in Graphite",
      "slug": "kanso-folding-balcony-table-in-graphite",
      "sku": "AUR-DEMO-042-03",
      "categoryKey": "folding-balcony-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Folding Balcony Tables"
      ],
      "description": "Kanso Folding Balcony Table in Graphite brings balcony tables into a coordinated industrial interior. A folding frame creates occasional dining space on a balcony. The compact table stores flat when not in use.\n\nDesign and construction\nA graphite steel base supports a practical composite surface. Materials: Powder-coated steel, Weather-resistant composite top. The 60 cm wide × 74 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe clean, dry after rain and inspect the coating periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A folding frame creates occasional dining space on a balcony. Finished in graphite, with powder-coated steel, weather-resistant composite top.",
      "price": 10199,
      "stock": 34,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for folding balcony table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Weather-resistant composite top"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 60,
        "height": 74,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "balcony-tables",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Folding Balcony Table in Graphite",
      "metaDescription": "Kanso Folding Balcony Table in Graphite. 60 cm wide × 74 cm high × 60 cm deep. Explore this sample balcony tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Folding Balcony Table in Warm Sand",
      "slug": "aranya-folding-balcony-table-in-warm-sand",
      "sku": "AUR-DEMO-042-04",
      "categoryKey": "folding-balcony-tables",
      "categoryPath": [
        "Outdoor",
        "Outdoor Tables",
        "Folding Balcony Tables"
      ],
      "description": "Aranya Folding Balcony Table in Warm Sand brings balcony tables into a coordinated contemporary interior. A folding frame creates occasional dining space on a balcony. The compact table stores flat when not in use.\n\nDesign and construction\nSand-finished metal and a timber surface create a softer outdoor palette. Materials: Powder-coated aluminium, Acacia tabletop. The 60 cm wide × 74 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use a cover when stored outdoors and avoid leaving standing water on the surface.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A folding frame creates occasional dining space on a balcony. Finished in warm sand, with powder-coated aluminium, acacia tabletop.",
      "price": 11699,
      "stock": 47,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for folding balcony table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Sand"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Acacia tabletop"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 60,
        "height": 74,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-tables",
        "balcony-tables",
        "aranya",
        "warm-sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Folding Balcony Table in Warm Sand",
      "metaDescription": "Aranya Folding Balcony Table in Warm Sand. 60 cm wide × 74 cm high × 60 cm deep. Explore this sample balcony tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Adjustable Sun Lounger in Slate Grey",
      "slug": "aster-adjustable-sun-lounger-in-slate-grey",
      "sku": "AUR-DEMO-043-01",
      "categoryKey": "adjustable-sun-loungers",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Adjustable Sun Loungers"
      ],
      "description": "Aster Adjustable Sun Lounger in Slate Grey brings sun loungers into a coordinated modern interior. An adjustable back supports reading or reclining outdoors. A replaceable cushion adds comfort over the slatted base.\n\nDesign and construction\nA slate aluminium frame provides an easy-to-maintain sheltered outdoor option. Materials: Powder-coated aluminium, Outdoor polyester cushions. The 70 cm wide × 35 cm high × 195 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Brush away dust, wash with mild soap and store cushions indoors after use.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An adjustable back supports reading or reclining outdoors. Finished in slate grey, with powder-coated aluminium, outdoor polyester cushions.",
      "price": 25999,
      "stock": 19,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for adjustable sun lounger",
          "isPrimary": true
        }
      ],
      "colors": [
        "Slate Grey"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Outdoor polyester cushions"
      ],
      "style": "modern",
      "dimensions": {
        "width": 70,
        "height": 35,
        "depth": 195,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "sun-loungers",
        "aster",
        "slate-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Adjustable Sun Lounger in Slate Grey",
      "metaDescription": "Aster Adjustable Sun Lounger in Slate Grey. 70 cm wide × 35 cm high × 195 cm deep. Explore this sample sun loungers listing for furniture catalogue development.",
      "originalPrice": 29199
    },
    {
      "name": "Niva Adjustable Sun Lounger in Natural Teak",
      "slug": "niva-adjustable-sun-lounger-in-natural-teak",
      "sku": "AUR-DEMO-043-02",
      "categoryKey": "adjustable-sun-loungers",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Adjustable Sun Loungers"
      ],
      "description": "Niva Adjustable Sun Lounger in Natural Teak brings sun loungers into a coordinated scandinavian interior. An adjustable back supports reading or reclining outdoors. A replaceable cushion adds comfort over the slatted base.\n\nDesign and construction\nAn acacia timber structure with teak-tone oil complements planted terraces. Materials: Solid acacia wood, Teak-tone protective oil. The 70 cm wide × 35 cm high × 195 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean gently, let surfaces dry and renew the protective oil as needed.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An adjustable back supports reading or reclining outdoors. Finished in natural teak, with solid acacia wood, teak-tone protective oil.",
      "price": 29299,
      "stock": 32,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for adjustable sun lounger",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Teak"
      ],
      "materials": [
        "Solid acacia wood",
        "Teak-tone protective oil"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 70,
        "height": 35,
        "depth": 195,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "sun-loungers",
        "niva",
        "natural-teak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Adjustable Sun Lounger in Natural Teak",
      "metaDescription": "Niva Adjustable Sun Lounger in Natural Teak. 70 cm wide × 35 cm high × 195 cm deep. Explore this sample sun loungers listing for furniture catalogue development."
    },
    {
      "name": "Kanso Adjustable Sun Lounger in Graphite",
      "slug": "kanso-adjustable-sun-lounger-in-graphite",
      "sku": "AUR-DEMO-043-03",
      "categoryKey": "adjustable-sun-loungers",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Adjustable Sun Loungers"
      ],
      "description": "Kanso Adjustable Sun Lounger in Graphite brings sun loungers into a coordinated industrial interior. An adjustable back supports reading or reclining outdoors. A replaceable cushion adds comfort over the slatted base.\n\nDesign and construction\nA graphite coated-steel structure lends the design a more architectural character. Materials: Powder-coated steel, Weather-resistant synthetic panels. The 70 cm wide × 35 cm high × 195 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dry after rain and touch up any chips in the coating to reduce corrosion risk.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An adjustable back supports reading or reclining outdoors. Finished in graphite, with powder-coated steel, weather-resistant synthetic panels.",
      "price": 33199,
      "stock": 45,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for adjustable sun lounger",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Weather-resistant synthetic panels"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 70,
        "height": 35,
        "depth": 195,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "sun-loungers",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Adjustable Sun Lounger in Graphite",
      "metaDescription": "Kanso Adjustable Sun Lounger in Graphite. 70 cm wide × 35 cm high × 195 cm deep. Explore this sample sun loungers listing for furniture catalogue development."
    },
    {
      "name": "Aranya Adjustable Sun Lounger in Warm Sand",
      "slug": "aranya-adjustable-sun-lounger-in-warm-sand",
      "sku": "AUR-DEMO-043-04",
      "categoryKey": "adjustable-sun-loungers",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Adjustable Sun Loungers"
      ],
      "description": "Aranya Adjustable Sun Lounger in Warm Sand brings sun loungers into a coordinated contemporary interior. An adjustable back supports reading or reclining outdoors. A replaceable cushion adds comfort over the slatted base.\n\nDesign and construction\nSand-coloured aluminium and warm timber details suit a covered balcony or patio. Materials: Powder-coated aluminium, Acacia wood details. The 70 cm wide × 35 cm high × 195 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Keep covered when not in use and bring soft components indoors during heavy rain.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An adjustable back supports reading or reclining outdoors. Finished in warm sand, with powder-coated aluminium, acacia wood details.",
      "price": 38399,
      "stock": 17,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for adjustable sun lounger",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Sand"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Acacia wood details"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 70,
        "height": 35,
        "depth": 195,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "sun-loungers",
        "aranya",
        "warm-sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Adjustable Sun Lounger in Warm Sand",
      "metaDescription": "Aranya Adjustable Sun Lounger in Warm Sand. 70 cm wide × 35 cm high × 195 cm deep. Explore this sample sun loungers listing for furniture catalogue development."
    },
    {
      "name": "Aster Two Seater Garden Bench in Slate Grey",
      "slug": "aster-two-seater-garden-bench-in-slate-grey",
      "sku": "AUR-DEMO-044-01",
      "categoryKey": "two-seater-garden-benches",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Two Seater Garden Benches"
      ],
      "description": "Aster Two Seater Garden Bench in Slate Grey brings garden benches into a coordinated modern interior. A two-person bench suits a covered garden terrace. Open slats allow airflow around the seat and back.\n\nDesign and construction\nA slate aluminium frame provides an easy-to-maintain sheltered outdoor option. Materials: Powder-coated aluminium, Outdoor polyester cushions. The 120 cm wide × 86 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Brush away dust, wash with mild soap and store cushions indoors after use.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A two-person bench suits a covered garden terrace. Finished in slate grey, with powder-coated aluminium, outdoor polyester cushions.",
      "price": 18999,
      "stock": 30,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for two seater garden bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Slate Grey"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Outdoor polyester cushions"
      ],
      "style": "modern",
      "dimensions": {
        "width": 120,
        "height": 86,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "garden-benches",
        "aster",
        "slate-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Two Seater Garden Bench in Slate Grey",
      "metaDescription": "Aster Two Seater Garden Bench in Slate Grey. 120 cm wide × 86 cm high × 58 cm deep. Explore this sample garden benches listing for furniture catalogue development."
    },
    {
      "name": "Niva Two Seater Garden Bench in Natural Teak",
      "slug": "niva-two-seater-garden-bench-in-natural-teak",
      "sku": "AUR-DEMO-044-02",
      "categoryKey": "two-seater-garden-benches",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Two Seater Garden Benches"
      ],
      "description": "Niva Two Seater Garden Bench in Natural Teak brings garden benches into a coordinated scandinavian interior. A two-person bench suits a covered garden terrace. Open slats allow airflow around the seat and back.\n\nDesign and construction\nAn acacia timber structure with teak-tone oil complements planted terraces. Materials: Solid acacia wood, Teak-tone protective oil. The 120 cm wide × 86 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean gently, let surfaces dry and renew the protective oil as needed.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A two-person bench suits a covered garden terrace. Finished in natural teak, with solid acacia wood, teak-tone protective oil.",
      "price": 21399,
      "stock": 43,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for two seater garden bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Teak"
      ],
      "materials": [
        "Solid acacia wood",
        "Teak-tone protective oil"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 120,
        "height": 86,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "garden-benches",
        "niva",
        "natural-teak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Two Seater Garden Bench in Natural Teak",
      "metaDescription": "Niva Two Seater Garden Bench in Natural Teak. 120 cm wide × 86 cm high × 58 cm deep. Explore this sample garden benches listing for furniture catalogue development."
    },
    {
      "name": "Kanso Two Seater Garden Bench in Graphite",
      "slug": "kanso-two-seater-garden-bench-in-graphite",
      "sku": "AUR-DEMO-044-03",
      "categoryKey": "two-seater-garden-benches",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Two Seater Garden Benches"
      ],
      "description": "Kanso Two Seater Garden Bench in Graphite brings garden benches into a coordinated industrial interior. A two-person bench suits a covered garden terrace. Open slats allow airflow around the seat and back.\n\nDesign and construction\nA graphite coated-steel structure lends the design a more architectural character. Materials: Powder-coated steel, Weather-resistant synthetic panels. The 120 cm wide × 86 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dry after rain and touch up any chips in the coating to reduce corrosion risk.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A two-person bench suits a covered garden terrace. Finished in graphite, with powder-coated steel, weather-resistant synthetic panels.",
      "price": 24199,
      "stock": 15,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for two seater garden bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Weather-resistant synthetic panels"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 120,
        "height": 86,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "garden-benches",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Two Seater Garden Bench in Graphite",
      "metaDescription": "Kanso Two Seater Garden Bench in Graphite. 120 cm wide × 86 cm high × 58 cm deep. Explore this sample garden benches listing for furniture catalogue development."
    },
    {
      "name": "Aranya Two Seater Garden Bench in Warm Sand",
      "slug": "aranya-two-seater-garden-bench-in-warm-sand",
      "sku": "AUR-DEMO-044-04",
      "categoryKey": "two-seater-garden-benches",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Two Seater Garden Benches"
      ],
      "description": "Aranya Two Seater Garden Bench in Warm Sand brings garden benches into a coordinated contemporary interior. A two-person bench suits a covered garden terrace. Open slats allow airflow around the seat and back.\n\nDesign and construction\nSand-coloured aluminium and warm timber details suit a covered balcony or patio. Materials: Powder-coated aluminium, Acacia wood details. The 120 cm wide × 86 cm high × 58 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 21 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Keep covered when not in use and bring soft components indoors during heavy rain.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A two-person bench suits a covered garden terrace. Finished in warm sand, with powder-coated aluminium, acacia wood details.",
      "price": 27999,
      "stock": 28,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for two seater garden bench",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Sand"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Acacia wood details"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 120,
        "height": 86,
        "depth": 58,
        "unit": "cm"
      },
      "weight": {
        "value": 21,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "garden-benches",
        "aranya",
        "warm-sand",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Two Seater Garden Bench in Warm Sand",
      "metaDescription": "Aranya Two Seater Garden Bench in Warm Sand. 120 cm wide × 86 cm high × 58 cm deep. Explore this sample garden benches listing for furniture catalogue development.",
      "originalPrice": 31399
    },
    {
      "name": "Aster Three Tier Planter Stand in Matte Black",
      "slug": "aster-three-tier-planter-stand-in-matte-black",
      "sku": "AUR-DEMO-045-01",
      "categoryKey": "three-tier-planter-stands",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Three Tier Planter Stands"
      ],
      "description": "Aster Three Tier Planter Stand in Matte Black brings planter stands into a coordinated minimal interior. Three stepped shelves display indoor or sheltered outdoor plants. Raised edges help keep plant pots in position.\n\nDesign and construction\nA matte black powder coating keeps the structure visually simple. Materials: Powder-coated steel. The 65 cm wide × 85 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft damp cloth and dry thoroughly.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three stepped shelves display indoor or sheltered outdoor plants. Finished in matte black, with powder-coated steel.",
      "price": 5999,
      "stock": 41,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for three tier planter stand",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 65,
        "height": 85,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "planter-stands",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Three Tier Planter Stand in Matte Black",
      "metaDescription": "Aster Three Tier Planter Stand in Matte Black. 65 cm wide × 85 cm high × 30 cm deep. Explore this sample planter stands listing for furniture catalogue development."
    },
    {
      "name": "Niva Three Tier Planter Stand in Warm White",
      "slug": "niva-three-tier-planter-stand-in-warm-white",
      "sku": "AUR-DEMO-045-02",
      "categoryKey": "three-tier-planter-stands",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Three Tier Planter Stands"
      ],
      "description": "Niva Three Tier Planter Stand in Warm White brings planter stands into a coordinated scandinavian interior. Three stepped shelves display indoor or sheltered outdoor plants. Raised edges help keep plant pots in position.\n\nDesign and construction\nWarm white surfaces and small timber details soften the metal construction. Materials: Powder-coated steel, Rubberwood accents. The 65 cm wide × 85 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use mild diluted soap when needed and dry all joints after cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three stepped shelves display indoor or sheltered outdoor plants. Finished in warm white, with powder-coated steel, rubberwood accents.",
      "price": 6699,
      "stock": 13,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for three tier planter stand",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Powder-coated steel",
        "Rubberwood accents"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 65,
        "height": 85,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "planter-stands",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Three Tier Planter Stand in Warm White",
      "metaDescription": "Niva Three Tier Planter Stand in Warm White. 65 cm wide × 85 cm high × 30 cm deep. Explore this sample planter stands listing for furniture catalogue development."
    },
    {
      "name": "Kanso Three Tier Planter Stand in Graphite",
      "slug": "kanso-three-tier-planter-stand-in-graphite",
      "sku": "AUR-DEMO-045-03",
      "categoryKey": "three-tier-planter-stands",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Three Tier Planter Stands"
      ],
      "description": "Kanso Three Tier Planter Stand in Graphite brings planter stands into a coordinated industrial interior. Three stepped shelves display indoor or sheltered outdoor plants. Raised edges help keep plant pots in position.\n\nDesign and construction\nGraphite metal and contrasting panel details suit a functional industrial interior. Materials: Powder-coated steel, Engineered wood accents. The 65 cm wide × 85 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Avoid abrasive pads and inspect fixings periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three stepped shelves display indoor or sheltered outdoor plants. Finished in graphite, with powder-coated steel, engineered wood accents.",
      "price": 7599,
      "stock": 26,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for three tier planter stand",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated steel",
        "Engineered wood accents"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 65,
        "height": 85,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "planter-stands",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Three Tier Planter Stand in Graphite",
      "metaDescription": "Kanso Three Tier Planter Stand in Graphite. 65 cm wide × 85 cm high × 30 cm deep. Explore this sample planter stands listing for furniture catalogue development."
    },
    {
      "name": "Aranya Three Tier Planter Stand in Brushed Bronze",
      "slug": "aranya-three-tier-planter-stand-in-brushed-bronze",
      "sku": "AUR-DEMO-045-04",
      "categoryKey": "three-tier-planter-stands",
      "categoryPath": [
        "Outdoor",
        "Outdoor Extras",
        "Three Tier Planter Stands"
      ],
      "description": "Aranya Three Tier Planter Stand in Brushed Bronze brings planter stands into a coordinated contemporary interior. Three stepped shelves display indoor or sheltered outdoor plants. Raised edges help keep plant pots in position.\n\nDesign and construction\nA brushed bronze finish gives the structure a warmer contemporary appearance. Materials: Bronze-finished steel. The 65 cm wide × 85 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Use a dry microfibre cloth and avoid metal polish on the coated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Three stepped shelves display indoor or sheltered outdoor plants. Finished in brushed bronze, with bronze-finished steel.",
      "price": 8799,
      "stock": 39,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
          "alt": "Outdoor interior reference for three tier planter stand",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Bronze"
      ],
      "materials": [
        "Bronze-finished steel"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 65,
        "height": 85,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "outdoor",
        "outdoor-extras",
        "planter-stands",
        "aranya",
        "brushed-bronze",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Three Tier Planter Stand in Brushed Bronze",
      "metaDescription": "Aranya Three Tier Planter Stand in Brushed Bronze. 65 cm wide × 85 cm high × 30 cm deep. Explore this sample planter stands listing for furniture catalogue development."
    },
    {
      "name": "Aster Single Pendant Light in Matte Black",
      "slug": "aster-single-pendant-light-in-matte-black",
      "sku": "AUR-DEMO-046-01",
      "categoryKey": "single-pendant-lights",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Single Pendant Lights"
      ],
      "description": "Aster Single Pendant Light in Matte Black brings pendant lights into a coordinated minimal interior. A height-adjustable cord centres light over a table or counter. Uses one E27 bulb which is sold separately.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 32 cm wide × 120 cm high × 32 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A height-adjustable cord centres light over a table or counter. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 6999,
      "stock": 11,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for single pendant light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 32,
        "height": 120,
        "depth": 32,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "pendant-lights",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Single Pendant Light in Matte Black",
      "metaDescription": "Aster Single Pendant Light in Matte Black. 32 cm wide × 120 cm high × 32 cm deep. Explore this sample pendant lights listing for furniture catalogue development."
    },
    {
      "name": "Niva Single Pendant Light in Warm White",
      "slug": "niva-single-pendant-light-in-warm-white",
      "sku": "AUR-DEMO-046-02",
      "categoryKey": "single-pendant-lights",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Single Pendant Lights"
      ],
      "description": "Niva Single Pendant Light in Warm White brings pendant lights into a coordinated scandinavian interior. A height-adjustable cord centres light over a table or counter. Uses one E27 bulb which is sold separately.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 32 cm wide × 120 cm high × 32 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A height-adjustable cord centres light over a table or counter. Finished in warm white, with painted steel, glass diffuser.",
      "price": 7799,
      "stock": 24,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for single pendant light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 32,
        "height": 120,
        "depth": 32,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "pendant-lights",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Single Pendant Light in Warm White",
      "metaDescription": "Niva Single Pendant Light in Warm White. 32 cm wide × 120 cm high × 32 cm deep. Explore this sample pendant lights listing for furniture catalogue development."
    },
    {
      "name": "Kanso Single Pendant Light in Graphite",
      "slug": "kanso-single-pendant-light-in-graphite",
      "sku": "AUR-DEMO-046-03",
      "categoryKey": "single-pendant-lights",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Single Pendant Lights"
      ],
      "description": "Kanso Single Pendant Light in Graphite brings pendant lights into a coordinated industrial interior. A height-adjustable cord centres light over a table or counter. Uses one E27 bulb which is sold separately.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 32 cm wide × 120 cm high × 32 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A height-adjustable cord centres light over a table or counter. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 8899,
      "stock": 37,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for single pendant light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 32,
        "height": 120,
        "depth": 32,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "pendant-lights",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Single Pendant Light in Graphite",
      "metaDescription": "Kanso Single Pendant Light in Graphite. 32 cm wide × 120 cm high × 32 cm deep. Explore this sample pendant lights listing for furniture catalogue development.",
      "originalPrice": 9999
    },
    {
      "name": "Aranya Single Pendant Light in Brushed Brass",
      "slug": "aranya-single-pendant-light-in-brushed-brass",
      "sku": "AUR-DEMO-046-04",
      "categoryKey": "single-pendant-lights",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Single Pendant Lights"
      ],
      "description": "Aranya Single Pendant Light in Brushed Brass brings pendant lights into a coordinated contemporary interior. A height-adjustable cord centres light over a table or counter. Uses one E27 bulb which is sold separately.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 32 cm wide × 120 cm high × 32 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A height-adjustable cord centres light over a table or counter. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 10299,
      "stock": 9,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for single pendant light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 32,
        "height": 120,
        "depth": 32,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "pendant-lights",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Single Pendant Light in Brushed Brass",
      "metaDescription": "Aranya Single Pendant Light in Brushed Brass. 32 cm wide × 120 cm high × 32 cm deep. Explore this sample pendant lights listing for furniture catalogue development."
    },
    {
      "name": "Aster Six Arm Chandelier in Matte Black",
      "slug": "aster-six-arm-chandelier-in-matte-black",
      "sku": "AUR-DEMO-047-01",
      "categoryKey": "six-arm-chandeliers",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Six Arm Chandeliers"
      ],
      "description": "Aster Six Arm Chandelier in Matte Black brings chandeliers into a coordinated minimal interior. Six arms create a focal point above a dining table. Uses six E14 bulbs which are sold separately.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 70 cm wide × 75 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "Six arms create a focal point above a dining table. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 21999,
      "stock": 22,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for six arm chandelier",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 70,
        "height": 75,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "chandeliers",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Six Arm Chandelier in Matte Black",
      "metaDescription": "Aster Six Arm Chandelier in Matte Black. 70 cm wide × 75 cm high × 70 cm deep. Explore this sample chandeliers listing for furniture catalogue development."
    },
    {
      "name": "Niva Six Arm Chandelier in Warm White",
      "slug": "niva-six-arm-chandelier-in-warm-white",
      "sku": "AUR-DEMO-047-02",
      "categoryKey": "six-arm-chandeliers",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Six Arm Chandeliers"
      ],
      "description": "Niva Six Arm Chandelier in Warm White brings chandeliers into a coordinated scandinavian interior. Six arms create a focal point above a dining table. Uses six E14 bulbs which are sold separately.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 70 cm wide × 75 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "Six arms create a focal point above a dining table. Finished in warm white, with painted steel, glass diffuser.",
      "price": 24799,
      "stock": 0,
      "status": "out_of_stock",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for six arm chandelier",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 70,
        "height": 75,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "chandeliers",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Six Arm Chandelier in Warm White",
      "metaDescription": "Niva Six Arm Chandelier in Warm White. 70 cm wide × 75 cm high × 70 cm deep. Explore this sample chandeliers listing for furniture catalogue development."
    },
    {
      "name": "Kanso Six Arm Chandelier in Graphite",
      "slug": "kanso-six-arm-chandelier-in-graphite",
      "sku": "AUR-DEMO-047-03",
      "categoryKey": "six-arm-chandeliers",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Six Arm Chandeliers"
      ],
      "description": "Kanso Six Arm Chandelier in Graphite brings chandeliers into a coordinated industrial interior. Six arms create a focal point above a dining table. Uses six E14 bulbs which are sold separately.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 70 cm wide × 75 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "Six arms create a focal point above a dining table. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 28099,
      "stock": 48,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for six arm chandelier",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 70,
        "height": 75,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "chandeliers",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Six Arm Chandelier in Graphite",
      "metaDescription": "Kanso Six Arm Chandelier in Graphite. 70 cm wide × 75 cm high × 70 cm deep. Explore this sample chandeliers listing for furniture catalogue development."
    },
    {
      "name": "Aranya Six Arm Chandelier in Brushed Brass",
      "slug": "aranya-six-arm-chandelier-in-brushed-brass",
      "sku": "AUR-DEMO-047-04",
      "categoryKey": "six-arm-chandeliers",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Six Arm Chandeliers"
      ],
      "description": "Aranya Six Arm Chandelier in Brushed Brass brings chandeliers into a coordinated contemporary interior. Six arms create a focal point above a dining table. Uses six E14 bulbs which are sold separately.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 70 cm wide × 75 cm high × 70 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "Six arms create a focal point above a dining table. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 32499,
      "stock": 20,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for six arm chandelier",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 70,
        "height": 75,
        "depth": 70,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "chandeliers",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Six Arm Chandelier in Brushed Brass",
      "metaDescription": "Aranya Six Arm Chandelier in Brushed Brass. 70 cm wide × 75 cm high × 70 cm deep. Explore this sample chandeliers listing for furniture catalogue development."
    },
    {
      "name": "Aster Flush Ceiling Light in Matte Black",
      "slug": "aster-flush-ceiling-light-in-matte-black",
      "sku": "AUR-DEMO-048-01",
      "categoryKey": "flush-ceiling-lights",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Flush Ceiling Lights"
      ],
      "description": "Aster Flush Ceiling Light in Matte Black brings flush ceiling lights into a coordinated minimal interior. A shallow housing suits rooms with lower ceilings. An integrated 18 W warm-white LED module provides general illumination.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 40 cm wide × 12 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A shallow housing suits rooms with lower ceilings. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 8999,
      "stock": 33,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for flush ceiling light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 40,
        "height": 12,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "flush-ceiling-lights",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Flush Ceiling Light in Matte Black",
      "metaDescription": "Aster Flush Ceiling Light in Matte Black. 40 cm wide × 12 cm high × 40 cm deep. Explore this sample flush ceiling lights listing for furniture catalogue development."
    },
    {
      "name": "Niva Flush Ceiling Light in Warm White",
      "slug": "niva-flush-ceiling-light-in-warm-white",
      "sku": "AUR-DEMO-048-02",
      "categoryKey": "flush-ceiling-lights",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Flush Ceiling Lights"
      ],
      "description": "Niva Flush Ceiling Light in Warm White brings flush ceiling lights into a coordinated scandinavian interior. A shallow housing suits rooms with lower ceilings. An integrated 18 W warm-white LED module provides general illumination.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 40 cm wide × 12 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A shallow housing suits rooms with lower ceilings. Finished in warm white, with painted steel, glass diffuser.",
      "price": 10099,
      "stock": 46,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for flush ceiling light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 40,
        "height": 12,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "flush-ceiling-lights",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Flush Ceiling Light in Warm White",
      "metaDescription": "Niva Flush Ceiling Light in Warm White. 40 cm wide × 12 cm high × 40 cm deep. Explore this sample flush ceiling lights listing for furniture catalogue development.",
      "originalPrice": 11399
    },
    {
      "name": "Kanso Flush Ceiling Light in Graphite",
      "slug": "kanso-flush-ceiling-light-in-graphite",
      "sku": "AUR-DEMO-048-03",
      "categoryKey": "flush-ceiling-lights",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Flush Ceiling Lights"
      ],
      "description": "Kanso Flush Ceiling Light in Graphite brings flush ceiling lights into a coordinated industrial interior. A shallow housing suits rooms with lower ceilings. An integrated 18 W warm-white LED module provides general illumination.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 40 cm wide × 12 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A shallow housing suits rooms with lower ceilings. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 11399,
      "stock": 18,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for flush ceiling light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 40,
        "height": 12,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "flush-ceiling-lights",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Flush Ceiling Light in Graphite",
      "metaDescription": "Kanso Flush Ceiling Light in Graphite. 40 cm wide × 12 cm high × 40 cm deep. Explore this sample flush ceiling lights listing for furniture catalogue development."
    },
    {
      "name": "Aranya Flush Ceiling Light in Brushed Brass",
      "slug": "aranya-flush-ceiling-light-in-brushed-brass",
      "sku": "AUR-DEMO-048-04",
      "categoryKey": "flush-ceiling-lights",
      "categoryPath": [
        "Lighting",
        "Ceiling Lighting",
        "Flush Ceiling Lights"
      ],
      "description": "Aranya Flush Ceiling Light in Brushed Brass brings flush ceiling lights into a coordinated contemporary interior. A shallow housing suits rooms with lower ceilings. An integrated 18 W warm-white LED module provides general illumination.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 40 cm wide × 12 cm high × 40 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A shallow housing suits rooms with lower ceilings. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 13199,
      "stock": 31,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for flush ceiling light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 40,
        "height": 12,
        "depth": 40,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "ceiling-lighting",
        "flush-ceiling-lights",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Flush Ceiling Light in Brushed Brass",
      "metaDescription": "Aranya Flush Ceiling Light in Brushed Brass. 40 cm wide × 12 cm high × 40 cm deep. Explore this sample flush ceiling lights listing for furniture catalogue development."
    },
    {
      "name": "Aster Adjustable Floor Lamp in Matte Black",
      "slug": "aster-adjustable-floor-lamp-in-matte-black",
      "sku": "AUR-DEMO-049-01",
      "categoryKey": "adjustable-floor-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Adjustable Floor Lamps"
      ],
      "description": "Aster Adjustable Floor Lamp in Matte Black brings floor lamps into a coordinated minimal interior. A repositionable shade directs light toward a reading seat. A weighted base supports the upright stem.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 42 cm wide × 158 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A repositionable shade directs light toward a reading seat. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 11999,
      "stock": 44,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable floor lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 42,
        "height": 158,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "floor-lamps",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Adjustable Floor Lamp in Matte Black",
      "metaDescription": "Aster Adjustable Floor Lamp in Matte Black. 42 cm wide × 158 cm high × 42 cm deep. Explore this sample floor lamps listing for furniture catalogue development."
    },
    {
      "name": "Niva Adjustable Floor Lamp in Warm White",
      "slug": "niva-adjustable-floor-lamp-in-warm-white",
      "sku": "AUR-DEMO-049-02",
      "categoryKey": "adjustable-floor-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Adjustable Floor Lamps"
      ],
      "description": "Niva Adjustable Floor Lamp in Warm White brings floor lamps into a coordinated scandinavian interior. A repositionable shade directs light toward a reading seat. A weighted base supports the upright stem.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 42 cm wide × 158 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A repositionable shade directs light toward a reading seat. Finished in warm white, with painted steel, glass diffuser.",
      "price": 13499,
      "stock": 16,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable floor lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 42,
        "height": 158,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "floor-lamps",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Adjustable Floor Lamp in Warm White",
      "metaDescription": "Niva Adjustable Floor Lamp in Warm White. 42 cm wide × 158 cm high × 42 cm deep. Explore this sample floor lamps listing for furniture catalogue development."
    },
    {
      "name": "Kanso Adjustable Floor Lamp in Graphite",
      "slug": "kanso-adjustable-floor-lamp-in-graphite",
      "sku": "AUR-DEMO-049-03",
      "categoryKey": "adjustable-floor-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Adjustable Floor Lamps"
      ],
      "description": "Kanso Adjustable Floor Lamp in Graphite brings floor lamps into a coordinated industrial interior. A repositionable shade directs light toward a reading seat. A weighted base supports the upright stem.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 42 cm wide × 158 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A repositionable shade directs light toward a reading seat. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 15299,
      "stock": 29,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable floor lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 42,
        "height": 158,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "floor-lamps",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Adjustable Floor Lamp in Graphite",
      "metaDescription": "Kanso Adjustable Floor Lamp in Graphite. 42 cm wide × 158 cm high × 42 cm deep. Explore this sample floor lamps listing for furniture catalogue development."
    },
    {
      "name": "Aranya Adjustable Floor Lamp in Brushed Brass",
      "slug": "aranya-adjustable-floor-lamp-in-brushed-brass",
      "sku": "AUR-DEMO-049-04",
      "categoryKey": "adjustable-floor-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Adjustable Floor Lamps"
      ],
      "description": "Aranya Adjustable Floor Lamp in Brushed Brass brings floor lamps into a coordinated contemporary interior. A repositionable shade directs light toward a reading seat. A weighted base supports the upright stem.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 42 cm wide × 158 cm high × 42 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A repositionable shade directs light toward a reading seat. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 17699,
      "stock": 42,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable floor lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 42,
        "height": 158,
        "depth": 42,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "floor-lamps",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Adjustable Floor Lamp in Brushed Brass",
      "metaDescription": "Aranya Adjustable Floor Lamp in Brushed Brass. 42 cm wide × 158 cm high × 42 cm deep. Explore this sample floor lamps listing for furniture catalogue development."
    },
    {
      "name": "Aster Bedside Table Lamp in Matte Black",
      "slug": "aster-bedside-table-lamp-in-matte-black",
      "sku": "AUR-DEMO-050-01",
      "categoryKey": "bedside-table-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Bedside Table Lamps"
      ],
      "description": "Aster Bedside Table Lamp in Matte Black brings table lamps into a coordinated minimal interior. A diffusing shade softens bedside illumination. An inline switch sits on the power cord.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 28 cm wide × 46 cm high × 28 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A diffusing shade softens bedside illumination. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 5999,
      "stock": 14,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for bedside table lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 28,
        "height": 46,
        "depth": 28,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "table-lamps",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Bedside Table Lamp in Matte Black",
      "metaDescription": "Aster Bedside Table Lamp in Matte Black. 28 cm wide × 46 cm high × 28 cm deep. Explore this sample table lamps listing for furniture catalogue development.",
      "originalPrice": 6799
    },
    {
      "name": "Niva Bedside Table Lamp in Warm White",
      "slug": "niva-bedside-table-lamp-in-warm-white",
      "sku": "AUR-DEMO-050-02",
      "categoryKey": "bedside-table-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Bedside Table Lamps"
      ],
      "description": "Niva Bedside Table Lamp in Warm White brings table lamps into a coordinated scandinavian interior. A diffusing shade softens bedside illumination. An inline switch sits on the power cord.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 28 cm wide × 46 cm high × 28 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A diffusing shade softens bedside illumination. Finished in warm white, with painted steel, glass diffuser.",
      "price": 6699,
      "stock": 27,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for bedside table lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 28,
        "height": 46,
        "depth": 28,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "table-lamps",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Bedside Table Lamp in Warm White",
      "metaDescription": "Niva Bedside Table Lamp in Warm White. 28 cm wide × 46 cm high × 28 cm deep. Explore this sample table lamps listing for furniture catalogue development."
    },
    {
      "name": "Kanso Bedside Table Lamp in Graphite",
      "slug": "kanso-bedside-table-lamp-in-graphite",
      "sku": "AUR-DEMO-050-03",
      "categoryKey": "bedside-table-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Bedside Table Lamps"
      ],
      "description": "Kanso Bedside Table Lamp in Graphite brings table lamps into a coordinated industrial interior. A diffusing shade softens bedside illumination. An inline switch sits on the power cord.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 28 cm wide × 46 cm high × 28 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A diffusing shade softens bedside illumination. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 7599,
      "stock": 40,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for bedside table lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 28,
        "height": 46,
        "depth": 28,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "table-lamps",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Bedside Table Lamp in Graphite",
      "metaDescription": "Kanso Bedside Table Lamp in Graphite. 28 cm wide × 46 cm high × 28 cm deep. Explore this sample table lamps listing for furniture catalogue development."
    },
    {
      "name": "Aranya Bedside Table Lamp in Brushed Brass",
      "slug": "aranya-bedside-table-lamp-in-brushed-brass",
      "sku": "AUR-DEMO-050-04",
      "categoryKey": "bedside-table-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Bedside Table Lamps"
      ],
      "description": "Aranya Bedside Table Lamp in Brushed Brass brings table lamps into a coordinated contemporary interior. A diffusing shade softens bedside illumination. An inline switch sits on the power cord.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 28 cm wide × 46 cm high × 28 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A diffusing shade softens bedside illumination. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 8799,
      "stock": 12,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for bedside table lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 28,
        "height": 46,
        "depth": 28,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "table-lamps",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Bedside Table Lamp in Brushed Brass",
      "metaDescription": "Aranya Bedside Table Lamp in Brushed Brass. 28 cm wide × 46 cm high × 28 cm deep. Explore this sample table lamps listing for furniture catalogue development."
    },
    {
      "name": "Aster Adjustable Desk Lamp in Matte Black",
      "slug": "aster-adjustable-desk-lamp-in-matte-black",
      "sku": "AUR-DEMO-051-01",
      "categoryKey": "adjustable-desk-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Adjustable Desk Lamps"
      ],
      "description": "Aster Adjustable Desk Lamp in Matte Black brings desk lamps into a coordinated minimal interior. An articulated arm directs light over documents and keyboards. An integrated 8 W LED module provides focused task lighting.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 18 cm wide × 42 cm high × 32 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "An articulated arm directs light over documents and keyboards. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 4999,
      "stock": 25,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable desk lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 18,
        "height": 42,
        "depth": 32,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "desk-lamps",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Adjustable Desk Lamp in Matte Black",
      "metaDescription": "Aster Adjustable Desk Lamp in Matte Black. 18 cm wide × 42 cm high × 32 cm deep. Explore this sample desk lamps listing for furniture catalogue development."
    },
    {
      "name": "Niva Adjustable Desk Lamp in Warm White",
      "slug": "niva-adjustable-desk-lamp-in-warm-white",
      "sku": "AUR-DEMO-051-02",
      "categoryKey": "adjustable-desk-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Adjustable Desk Lamps"
      ],
      "description": "Niva Adjustable Desk Lamp in Warm White brings desk lamps into a coordinated scandinavian interior. An articulated arm directs light over documents and keyboards. An integrated 8 W LED module provides focused task lighting.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 18 cm wide × 42 cm high × 32 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "An articulated arm directs light over documents and keyboards. Finished in warm white, with painted steel, glass diffuser.",
      "price": 5599,
      "stock": 38,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable desk lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 18,
        "height": 42,
        "depth": 32,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "desk-lamps",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Adjustable Desk Lamp in Warm White",
      "metaDescription": "Niva Adjustable Desk Lamp in Warm White. 18 cm wide × 42 cm high × 32 cm deep. Explore this sample desk lamps listing for furniture catalogue development."
    },
    {
      "name": "Kanso Adjustable Desk Lamp in Graphite",
      "slug": "kanso-adjustable-desk-lamp-in-graphite",
      "sku": "AUR-DEMO-051-03",
      "categoryKey": "adjustable-desk-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Adjustable Desk Lamps"
      ],
      "description": "Kanso Adjustable Desk Lamp in Graphite brings desk lamps into a coordinated industrial interior. An articulated arm directs light over documents and keyboards. An integrated 8 W LED module provides focused task lighting.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 18 cm wide × 42 cm high × 32 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "An articulated arm directs light over documents and keyboards. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 6299,
      "stock": 10,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable desk lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 18,
        "height": 42,
        "depth": 32,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "desk-lamps",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Adjustable Desk Lamp in Graphite",
      "metaDescription": "Kanso Adjustable Desk Lamp in Graphite. 18 cm wide × 42 cm high × 32 cm deep. Explore this sample desk lamps listing for furniture catalogue development."
    },
    {
      "name": "Aranya Adjustable Desk Lamp in Brushed Brass",
      "slug": "aranya-adjustable-desk-lamp-in-brushed-brass",
      "sku": "AUR-DEMO-051-04",
      "categoryKey": "adjustable-desk-lamps",
      "categoryPath": [
        "Lighting",
        "Portable Lighting",
        "Adjustable Desk Lamps"
      ],
      "description": "Aranya Adjustable Desk Lamp in Brushed Brass brings desk lamps into a coordinated contemporary interior. An articulated arm directs light over documents and keyboards. An integrated 8 W LED module provides focused task lighting.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 18 cm wide × 42 cm high × 32 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "An articulated arm directs light over documents and keyboards. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 7299,
      "stock": 23,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable desk lamp",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 18,
        "height": 42,
        "depth": 32,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "portable-lighting",
        "desk-lamps",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Adjustable Desk Lamp in Brushed Brass",
      "metaDescription": "Aranya Adjustable Desk Lamp in Brushed Brass. 18 cm wide × 42 cm high × 32 cm deep. Explore this sample desk lamps listing for furniture catalogue development.",
      "originalPrice": 8199
    },
    {
      "name": "Aster Wall Sconce in Matte Black",
      "slug": "aster-wall-sconce-in-matte-black",
      "sku": "AUR-DEMO-052-01",
      "categoryKey": "wall-sconces",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Wall Sconces"
      ],
      "description": "Aster Wall Sconce in Matte Black brings wall sconces into a coordinated minimal interior. A compact shade adds accent lighting along a wall. Professional installation is required for the hardwired fitting.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 16 cm wide × 30 cm high × 20 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A compact shade adds accent lighting along a wall. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 3999,
      "stock": 36,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for wall sconce",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 16,
        "height": 30,
        "depth": 20,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "wall-sconces",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Wall Sconce in Matte Black",
      "metaDescription": "Aster Wall Sconce in Matte Black. 16 cm wide × 30 cm high × 20 cm deep. Explore this sample wall sconces listing for furniture catalogue development."
    },
    {
      "name": "Niva Wall Sconce in Warm White",
      "slug": "niva-wall-sconce-in-warm-white",
      "sku": "AUR-DEMO-052-02",
      "categoryKey": "wall-sconces",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Wall Sconces"
      ],
      "description": "Niva Wall Sconce in Warm White brings wall sconces into a coordinated scandinavian interior. A compact shade adds accent lighting along a wall. Professional installation is required for the hardwired fitting.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 16 cm wide × 30 cm high × 20 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A compact shade adds accent lighting along a wall. Finished in warm white, with painted steel, glass diffuser.",
      "price": 4499,
      "stock": 8,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for wall sconce",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 16,
        "height": 30,
        "depth": 20,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "wall-sconces",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Wall Sconce in Warm White",
      "metaDescription": "Niva Wall Sconce in Warm White. 16 cm wide × 30 cm high × 20 cm deep. Explore this sample wall sconces listing for furniture catalogue development."
    },
    {
      "name": "Kanso Wall Sconce in Graphite",
      "slug": "kanso-wall-sconce-in-graphite",
      "sku": "AUR-DEMO-052-03",
      "categoryKey": "wall-sconces",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Wall Sconces"
      ],
      "description": "Kanso Wall Sconce in Graphite brings wall sconces into a coordinated industrial interior. A compact shade adds accent lighting along a wall. Professional installation is required for the hardwired fitting.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 16 cm wide × 30 cm high × 20 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A compact shade adds accent lighting along a wall. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 4999,
      "stock": 21,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for wall sconce",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 16,
        "height": 30,
        "depth": 20,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "wall-sconces",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Wall Sconce in Graphite",
      "metaDescription": "Kanso Wall Sconce in Graphite. 16 cm wide × 30 cm high × 20 cm deep. Explore this sample wall sconces listing for furniture catalogue development."
    },
    {
      "name": "Aranya Wall Sconce in Brushed Brass",
      "slug": "aranya-wall-sconce-in-brushed-brass",
      "sku": "AUR-DEMO-052-04",
      "categoryKey": "wall-sconces",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Wall Sconces"
      ],
      "description": "Aranya Wall Sconce in Brushed Brass brings wall sconces into a coordinated contemporary interior. A compact shade adds accent lighting along a wall. Professional installation is required for the hardwired fitting.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 16 cm wide × 30 cm high × 20 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A compact shade adds accent lighting along a wall. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 5799,
      "stock": 34,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for wall sconce",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 16,
        "height": 30,
        "depth": 20,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "wall-sconces",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Wall Sconce in Brushed Brass",
      "metaDescription": "Aranya Wall Sconce in Brushed Brass. 16 cm wide × 30 cm high × 20 cm deep. Explore this sample wall sconces listing for furniture catalogue development."
    },
    {
      "name": "Aster Adjustable Picture Light in Matte Black",
      "slug": "aster-adjustable-picture-light-in-matte-black",
      "sku": "AUR-DEMO-053-01",
      "categoryKey": "adjustable-picture-lights",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Adjustable Picture Lights"
      ],
      "description": "Aster Adjustable Picture Light in Matte Black brings picture lights into a coordinated minimal interior. A slim adjustable light bar illuminates framed artwork. An integrated warm-white LED module limits visible fixture bulk.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 45 cm wide × 10 cm high × 18 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A slim adjustable light bar illuminates framed artwork. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 6999,
      "stock": 47,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable picture light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 45,
        "height": 10,
        "depth": 18,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "picture-lights",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Adjustable Picture Light in Matte Black",
      "metaDescription": "Aster Adjustable Picture Light in Matte Black. 45 cm wide × 10 cm high × 18 cm deep. Explore this sample picture lights listing for furniture catalogue development."
    },
    {
      "name": "Niva Adjustable Picture Light in Warm White",
      "slug": "niva-adjustable-picture-light-in-warm-white",
      "sku": "AUR-DEMO-053-02",
      "categoryKey": "adjustable-picture-lights",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Adjustable Picture Lights"
      ],
      "description": "Niva Adjustable Picture Light in Warm White brings picture lights into a coordinated scandinavian interior. A slim adjustable light bar illuminates framed artwork. An integrated warm-white LED module limits visible fixture bulk.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 45 cm wide × 10 cm high × 18 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A slim adjustable light bar illuminates framed artwork. Finished in warm white, with painted steel, glass diffuser.",
      "price": 7799,
      "stock": 19,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable picture light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 45,
        "height": 10,
        "depth": 18,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "picture-lights",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Adjustable Picture Light in Warm White",
      "metaDescription": "Niva Adjustable Picture Light in Warm White. 45 cm wide × 10 cm high × 18 cm deep. Explore this sample picture lights listing for furniture catalogue development."
    },
    {
      "name": "Kanso Adjustable Picture Light in Graphite",
      "slug": "kanso-adjustable-picture-light-in-graphite",
      "sku": "AUR-DEMO-053-03",
      "categoryKey": "adjustable-picture-lights",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Adjustable Picture Lights"
      ],
      "description": "Kanso Adjustable Picture Light in Graphite brings picture lights into a coordinated industrial interior. A slim adjustable light bar illuminates framed artwork. An integrated warm-white LED module limits visible fixture bulk.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 45 cm wide × 10 cm high × 18 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A slim adjustable light bar illuminates framed artwork. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 8899,
      "stock": 32,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable picture light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 45,
        "height": 10,
        "depth": 18,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "picture-lights",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Adjustable Picture Light in Graphite",
      "metaDescription": "Kanso Adjustable Picture Light in Graphite. 45 cm wide × 10 cm high × 18 cm deep. Explore this sample picture lights listing for furniture catalogue development.",
      "originalPrice": 9999
    },
    {
      "name": "Aranya Adjustable Picture Light in Brushed Brass",
      "slug": "aranya-adjustable-picture-light-in-brushed-brass",
      "sku": "AUR-DEMO-053-04",
      "categoryKey": "adjustable-picture-lights",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Adjustable Picture Lights"
      ],
      "description": "Aranya Adjustable Picture Light in Brushed Brass brings picture lights into a coordinated contemporary interior. A slim adjustable light bar illuminates framed artwork. An integrated warm-white LED module limits visible fixture bulk.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 45 cm wide × 10 cm high × 18 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A slim adjustable light bar illuminates framed artwork. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 10299,
      "stock": 45,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for adjustable picture light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 45,
        "height": 10,
        "depth": 18,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "picture-lights",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Adjustable Picture Light in Brushed Brass",
      "metaDescription": "Aranya Adjustable Picture Light in Brushed Brass. 45 cm wide × 10 cm high × 18 cm deep. Explore this sample picture lights listing for furniture catalogue development."
    },
    {
      "name": "Aster Swing Arm Wall Light in Matte Black",
      "slug": "aster-swing-arm-wall-light-in-matte-black",
      "sku": "AUR-DEMO-054-01",
      "categoryKey": "swing-arm-wall-lights",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Swing Arm Wall Lights"
      ],
      "description": "Aster Swing Arm Wall Light in Matte Black brings bedside wall lights into a coordinated minimal interior. A swing arm brings reading light closer to the bed. A wall plate leaves the bedside surface free.\n\nDesign and construction\nA matte black housing and opal diffuser create a clean contrast. Materials: Powder-coated steel, Opal glass diffuser. The 18 cm wide × 24 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Switch off and disconnect the fitting before dusting with a dry cloth.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A swing arm brings reading light closer to the bed. Finished in matte black, with powder-coated steel, opal glass diffuser.",
      "price": 5999,
      "stock": 17,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for swing arm wall light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Powder-coated steel",
        "Opal glass diffuser"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 18,
        "height": 24,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "bedside-wall-lights",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Swing Arm Wall Light in Matte Black",
      "metaDescription": "Aster Swing Arm Wall Light in Matte Black. 18 cm wide × 24 cm high × 45 cm deep. Explore this sample bedside wall lights listing for furniture catalogue development."
    },
    {
      "name": "Niva Swing Arm Wall Light in Warm White",
      "slug": "niva-swing-arm-wall-light-in-warm-white",
      "sku": "AUR-DEMO-054-02",
      "categoryKey": "swing-arm-wall-lights",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Swing Arm Wall Lights"
      ],
      "description": "Niva Swing Arm Wall Light in Warm White brings bedside wall lights into a coordinated scandinavian interior. A swing arm brings reading light closer to the bed. A wall plate leaves the bedside surface free.\n\nDesign and construction\nWarm white painted surfaces suit a lighter neutral lighting scheme. Materials: Painted steel, Glass diffuser. The 18 cm wide × 24 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Allow the lamp to cool before cleaning; never spray cleaner into electrical parts.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A swing arm brings reading light closer to the bed. Finished in warm white, with painted steel, glass diffuser.",
      "price": 6699,
      "stock": 30,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for swing arm wall light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm White"
      ],
      "materials": [
        "Painted steel",
        "Glass diffuser"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 18,
        "height": 24,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "bedside-wall-lights",
        "niva",
        "warm-white",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Swing Arm Wall Light in Warm White",
      "metaDescription": "Niva Swing Arm Wall Light in Warm White. 18 cm wide × 24 cm high × 45 cm deep. Explore this sample bedside wall lights listing for furniture catalogue development."
    },
    {
      "name": "Kanso Swing Arm Wall Light in Graphite",
      "slug": "kanso-swing-arm-wall-light-in-graphite",
      "sku": "AUR-DEMO-054-03",
      "categoryKey": "swing-arm-wall-lights",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Swing Arm Wall Lights"
      ],
      "description": "Kanso Swing Arm Wall Light in Graphite brings bedside wall lights into a coordinated industrial interior. A swing arm brings reading light closer to the bed. A wall plate leaves the bedside surface free.\n\nDesign and construction\nA graphite aluminium housing gives the fitting a defined industrial profile. Materials: Powder-coated aluminium, Glass diffuser. The 18 cm wide × 24 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Dust regularly and use only bulbs within the stated fitting rating.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A swing arm brings reading light closer to the bed. Finished in graphite, with powder-coated aluminium, glass diffuser.",
      "price": 7599,
      "stock": 43,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for swing arm wall light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Powder-coated aluminium",
        "Glass diffuser"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 18,
        "height": 24,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "bedside-wall-lights",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Swing Arm Wall Light in Graphite",
      "metaDescription": "Kanso Swing Arm Wall Light in Graphite. 18 cm wide × 24 cm high × 45 cm deep. Explore this sample bedside wall lights listing for furniture catalogue development."
    },
    {
      "name": "Aranya Swing Arm Wall Light in Brushed Brass",
      "slug": "aranya-swing-arm-wall-light-in-brushed-brass",
      "sku": "AUR-DEMO-054-04",
      "categoryKey": "swing-arm-wall-lights",
      "categoryPath": [
        "Lighting",
        "Wall Lighting",
        "Swing Arm Wall Lights"
      ],
      "description": "Aranya Swing Arm Wall Light in Brushed Brass brings bedside wall lights into a coordinated contemporary interior. A swing arm brings reading light closer to the bed. A wall plate leaves the bedside surface free.\n\nDesign and construction\nA brushed brass finish adds warmth to the light fitting. Materials: Brass-finished steel, Opal glass diffuser. The 18 cm wide × 24 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nInstallation by a qualified electrician is recommended for fixed electrical fittings. Wipe with a dry cloth and avoid abrasive polish on the plated finish.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Replaceable bulbs are sold separately; integrated LED modules are supplied as part of the fitting where stated.",
      "shortDescription": "A swing arm brings reading light closer to the bed. Finished in brushed brass, with brass-finished steel, opal glass diffuser.",
      "price": 8799,
      "stock": 15,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
          "alt": "Lighting interior reference for swing arm wall light",
          "isPrimary": true
        }
      ],
      "colors": [
        "Brushed Brass"
      ],
      "materials": [
        "Brass-finished steel",
        "Opal glass diffuser"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 18,
        "height": 24,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "lighting",
        "wall-lighting",
        "bedside-wall-lights",
        "aranya",
        "brushed-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Swing Arm Wall Light in Brushed Brass",
      "metaDescription": "Aranya Swing Arm Wall Light in Brushed Brass. 18 cm wide × 24 cm high × 45 cm deep. Explore this sample bedside wall lights listing for furniture catalogue development."
    },
    {
      "name": "Aster Round Wall Mirror in Matte Black",
      "slug": "aster-round-wall-mirror-in-matte-black",
      "sku": "AUR-DEMO-055-01",
      "categoryKey": "round-wall-mirrors",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Round Wall Mirrors"
      ],
      "description": "Aster Round Wall Mirror in Matte Black brings wall mirrors into a coordinated minimal interior. An 80 cm reflective surface brightens a hallway or living room. Use wall fixings appropriate to the wall construction and mirror weight.\n\nDesign and construction\nA slim black frame keeps attention on the reflective surface. Materials: Mirror glass, Painted steel frame. The 80 cm wide × 80 cm high × 3 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Apply glass cleaner to a cloth rather than directly to the frame.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An 80 cm reflective surface brightens a hallway or living room. Finished in matte black, with mirror glass, painted steel frame.",
      "price": 9999,
      "stock": 28,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for round wall mirror",
          "isPrimary": true
        }
      ],
      "colors": [
        "Matte Black"
      ],
      "materials": [
        "Mirror glass",
        "Painted steel frame"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 80,
        "height": 80,
        "depth": 3,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-mirrors",
        "aster",
        "matte-black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Round Wall Mirror in Matte Black",
      "metaDescription": "Aster Round Wall Mirror in Matte Black. 80 cm wide × 80 cm high × 3 cm deep. Explore this sample wall mirrors listing for furniture catalogue development."
    },
    {
      "name": "Niva Round Wall Mirror in Natural Oak",
      "slug": "niva-round-wall-mirror-in-natural-oak",
      "sku": "AUR-DEMO-055-02",
      "categoryKey": "round-wall-mirrors",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Round Wall Mirrors"
      ],
      "description": "Niva Round Wall Mirror in Natural Oak brings wall mirrors into a coordinated scandinavian interior. An 80 cm reflective surface brightens a hallway or living room. Use wall fixings appropriate to the wall construction and mirror weight.\n\nDesign and construction\nAn oak-toned surround softens the mirror outline. Materials: Mirror glass, Oak veneer frame. The 80 cm wide × 80 cm high × 3 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Use a dry cloth on the timber surround and keep the edges dry.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An 80 cm reflective surface brightens a hallway or living room. Finished in natural oak, with mirror glass, oak veneer frame.",
      "price": 11199,
      "stock": 41,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for round wall mirror",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Mirror glass",
        "Oak veneer frame"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 80,
        "height": 80,
        "depth": 3,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-mirrors",
        "niva",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Round Wall Mirror in Natural Oak",
      "metaDescription": "Niva Round Wall Mirror in Natural Oak. 80 cm wide × 80 cm high × 3 cm deep. Explore this sample wall mirrors listing for furniture catalogue development.",
      "originalPrice": 12599
    },
    {
      "name": "Kanso Round Wall Mirror in Graphite",
      "slug": "kanso-round-wall-mirror-in-graphite",
      "sku": "AUR-DEMO-055-03",
      "categoryKey": "round-wall-mirrors",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Round Wall Mirrors"
      ],
      "description": "Kanso Round Wall Mirror in Graphite brings wall mirrors into a coordinated industrial interior. An 80 cm reflective surface brightens a hallway or living room. Use wall fixings appropriate to the wall construction and mirror weight.\n\nDesign and construction\nA graphite aluminium surround gives the mirror a crisp architectural edge. Materials: Mirror glass, Powder-coated aluminium frame. The 80 cm wide × 80 cm high × 3 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Wipe the frame gently and avoid abrasive glass-cleaning tools.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An 80 cm reflective surface brightens a hallway or living room. Finished in graphite, with mirror glass, powder-coated aluminium frame.",
      "price": 12699,
      "stock": 13,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for round wall mirror",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Mirror glass",
        "Powder-coated aluminium frame"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 80,
        "height": 80,
        "depth": 3,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-mirrors",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Round Wall Mirror in Graphite",
      "metaDescription": "Kanso Round Wall Mirror in Graphite. 80 cm wide × 80 cm high × 3 cm deep. Explore this sample wall mirrors listing for furniture catalogue development."
    },
    {
      "name": "Aranya Round Wall Mirror in Antique Brass",
      "slug": "aranya-round-wall-mirror-in-antique-brass",
      "sku": "AUR-DEMO-055-04",
      "categoryKey": "round-wall-mirrors",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Round Wall Mirrors"
      ],
      "description": "Aranya Round Wall Mirror in Antique Brass brings wall mirrors into a coordinated classic interior. An 80 cm reflective surface brightens a hallway or living room. Use wall fixings appropriate to the wall construction and mirror weight.\n\nDesign and construction\nAn antique brass surround adds a warmer decorative accent. Materials: Mirror glass, Brass-finished steel frame. The 80 cm wide × 80 cm high × 3 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 7 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Clean the glass with a soft cloth and avoid polish on the coated frame.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "An 80 cm reflective surface brightens a hallway or living room. Finished in antique brass, with mirror glass, brass-finished steel frame.",
      "price": 14699,
      "stock": 26,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for round wall mirror",
          "isPrimary": true
        }
      ],
      "colors": [
        "Antique Brass"
      ],
      "materials": [
        "Mirror glass",
        "Brass-finished steel frame"
      ],
      "style": "classic",
      "dimensions": {
        "width": 80,
        "height": 80,
        "depth": 3,
        "unit": "cm"
      },
      "weight": {
        "value": 7,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-mirrors",
        "aranya",
        "antique-brass",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Round Wall Mirror in Antique Brass",
      "metaDescription": "Aranya Round Wall Mirror in Antique Brass. 80 cm wide × 80 cm high × 3 cm deep. Explore this sample wall mirrors listing for furniture catalogue development."
    },
    {
      "name": "Aster Framed Abstract Print in Monochrome",
      "slug": "aster-framed-abstract-print-in-monochrome",
      "sku": "AUR-DEMO-056-01",
      "categoryKey": "framed-abstract-prints",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Framed Abstract Prints"
      ],
      "description": "Aster Framed Abstract Print in Monochrome brings wall art into a coordinated minimal interior. A framed abstract print introduces colour without occupying floor space. A protective clear front keeps the printed surface clean.\n\nDesign and construction\nMonochrome abstract forms are presented in a simple black frame. Materials: Matte printed paper, Black engineered wood frame, Clear protective front. The 60 cm wide × 80 cm high × 3 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Dust the protective front gently and keep away from direct moisture.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A framed abstract print introduces colour without occupying floor space. Finished in monochrome, with matte printed paper, black engineered wood frame.",
      "price": 4999,
      "stock": 39,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for framed abstract print",
          "isPrimary": true
        }
      ],
      "colors": [
        "Monochrome"
      ],
      "materials": [
        "Matte printed paper",
        "Black engineered wood frame",
        "Clear protective front"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 60,
        "height": 80,
        "depth": 3,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-art",
        "aster",
        "monochrome",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Framed Abstract Print in Monochrome",
      "metaDescription": "Aster Framed Abstract Print in Monochrome. 60 cm wide × 80 cm high × 3 cm deep. Explore this sample wall art listing for furniture catalogue development."
    },
    {
      "name": "Niva Framed Abstract Print in Earth Tones",
      "slug": "niva-framed-abstract-print-in-earth-tones",
      "sku": "AUR-DEMO-056-02",
      "categoryKey": "framed-abstract-prints",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Framed Abstract Prints"
      ],
      "description": "Niva Framed Abstract Print in Earth Tones brings wall art into a coordinated scandinavian interior. A framed abstract print introduces colour without occupying floor space. A protective clear front keeps the printed surface clean.\n\nDesign and construction\nMuted earth-tone shapes complement the oak-toned frame. Materials: Printed paper, Oak-tone engineered wood frame, Clear protective front. The 60 cm wide × 80 cm high × 3 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Avoid prolonged direct sun and clean only the outer protective surface.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A framed abstract print introduces colour without occupying floor space. Finished in earth tones, with printed paper, oak-tone engineered wood frame.",
      "price": 5599,
      "stock": 11,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for framed abstract print",
          "isPrimary": true
        }
      ],
      "colors": [
        "Earth Tones"
      ],
      "materials": [
        "Printed paper",
        "Oak-tone engineered wood frame",
        "Clear protective front"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 60,
        "height": 80,
        "depth": 3,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-art",
        "niva",
        "earth-tones",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Framed Abstract Print in Earth Tones",
      "metaDescription": "Niva Framed Abstract Print in Earth Tones. 60 cm wide × 80 cm high × 3 cm deep. Explore this sample wall art listing for furniture catalogue development."
    },
    {
      "name": "Kanso Framed Abstract Print in Blue Grey",
      "slug": "kanso-framed-abstract-print-in-blue-grey",
      "sku": "AUR-DEMO-056-03",
      "categoryKey": "framed-abstract-prints",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Framed Abstract Prints"
      ],
      "description": "Kanso Framed Abstract Print in Blue Grey brings wall art into a coordinated contemporary interior. A framed abstract print introduces colour without occupying floor space. A protective clear front keeps the printed surface clean.\n\nDesign and construction\nBlue-grey geometric shapes provide a restrained contemporary accent. Materials: Printed paper, Graphite engineered wood frame, Clear protective front. The 60 cm wide × 80 cm high × 3 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Wipe the frame with a dry cloth and check wall fixings periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A framed abstract print introduces colour without occupying floor space. Finished in blue grey, with printed paper, graphite engineered wood frame.",
      "price": 6299,
      "stock": 0,
      "status": "out_of_stock",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for framed abstract print",
          "isPrimary": true
        }
      ],
      "colors": [
        "Blue Grey"
      ],
      "materials": [
        "Printed paper",
        "Graphite engineered wood frame",
        "Clear protective front"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 60,
        "height": 80,
        "depth": 3,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-art",
        "kanso",
        "blue-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Framed Abstract Print in Blue Grey",
      "metaDescription": "Kanso Framed Abstract Print in Blue Grey. 60 cm wide × 80 cm high × 3 cm deep. Explore this sample wall art listing for furniture catalogue development."
    },
    {
      "name": "Aranya Framed Abstract Print in Terracotta",
      "slug": "aranya-framed-abstract-print-in-terracotta",
      "sku": "AUR-DEMO-056-04",
      "categoryKey": "framed-abstract-prints",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Framed Abstract Prints"
      ],
      "description": "Aranya Framed Abstract Print in Terracotta brings wall art into a coordinated bohemian interior. A framed abstract print introduces colour without occupying floor space. A protective clear front keeps the printed surface clean.\n\nDesign and construction\nTerracotta abstract forms and a walnut-toned frame introduce a warmer palette. Materials: Printed paper, Walnut-tone engineered wood frame, Clear protective front. The 60 cm wide × 80 cm high × 3 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Keep the print indoors and away from damp walls.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A framed abstract print introduces colour without occupying floor space. Finished in terracotta, with printed paper, walnut-tone engineered wood frame.",
      "price": 7299,
      "stock": 37,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for framed abstract print",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Printed paper",
        "Walnut-tone engineered wood frame",
        "Clear protective front"
      ],
      "style": "bohemian",
      "dimensions": {
        "width": 60,
        "height": 80,
        "depth": 3,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-art",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Framed Abstract Print in Terracotta",
      "metaDescription": "Aranya Framed Abstract Print in Terracotta. 60 cm wide × 80 cm high × 3 cm deep. Explore this sample wall art listing for furniture catalogue development."
    },
    {
      "name": "Aster Floating Wall Shelf Set in Natural Oak",
      "slug": "aster-floating-wall-shelf-set-in-natural-oak",
      "sku": "AUR-DEMO-057-01",
      "categoryKey": "floating-wall-shelf-sets",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Floating Wall Shelf Sets"
      ],
      "description": "Aster Floating Wall Shelf Set in Natural Oak brings wall shelves into a coordinated minimal interior. Two matching floating shelves display books and small objects. Load capacity depends on suitable wall fixings and wall condition.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 80 cm wide × 8 cm high × 22 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 5 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two matching floating shelves display books and small objects. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 3999,
      "stock": 9,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for floating wall shelf set",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 80,
        "height": 8,
        "depth": 22,
        "unit": "cm"
      },
      "weight": {
        "value": 5,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-shelves",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Floating Wall Shelf Set in Natural Oak",
      "metaDescription": "Aster Floating Wall Shelf Set in Natural Oak. 80 cm wide × 8 cm high × 22 cm deep. Explore this sample wall shelves listing for furniture catalogue development.",
      "originalPrice": 4499
    },
    {
      "name": "Niva Floating Wall Shelf Set in Walnut",
      "slug": "niva-floating-wall-shelf-set-in-walnut",
      "sku": "AUR-DEMO-057-02",
      "categoryKey": "floating-wall-shelf-sets",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Floating Wall Shelf Sets"
      ],
      "description": "Niva Floating Wall Shelf Set in Walnut brings wall shelves into a coordinated scandinavian interior. Two matching floating shelves display books and small objects. Load capacity depends on suitable wall fixings and wall condition.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 80 cm wide × 8 cm high × 22 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 5 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two matching floating shelves display books and small objects. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 4499,
      "stock": 22,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for floating wall shelf set",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 80,
        "height": 8,
        "depth": 22,
        "unit": "cm"
      },
      "weight": {
        "value": 5,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-shelves",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Floating Wall Shelf Set in Walnut",
      "metaDescription": "Niva Floating Wall Shelf Set in Walnut. 80 cm wide × 8 cm high × 22 cm deep. Explore this sample wall shelves listing for furniture catalogue development."
    },
    {
      "name": "Kanso Floating Wall Shelf Set in Charcoal",
      "slug": "kanso-floating-wall-shelf-set-in-charcoal",
      "sku": "AUR-DEMO-057-03",
      "categoryKey": "floating-wall-shelf-sets",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Floating Wall Shelf Sets"
      ],
      "description": "Kanso Floating Wall Shelf Set in Charcoal brings wall shelves into a coordinated industrial interior. Two matching floating shelves display books and small objects. Load capacity depends on suitable wall fixings and wall condition.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 80 cm wide × 8 cm high × 22 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 5 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two matching floating shelves display books and small objects. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 4999,
      "stock": 35,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for floating wall shelf set",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 80,
        "height": 8,
        "depth": 22,
        "unit": "cm"
      },
      "weight": {
        "value": 5,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-shelves",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Floating Wall Shelf Set in Charcoal",
      "metaDescription": "Kanso Floating Wall Shelf Set in Charcoal. 80 cm wide × 8 cm high × 22 cm deep. Explore this sample wall shelves listing for furniture catalogue development."
    },
    {
      "name": "Aranya Floating Wall Shelf Set in Honey Brown",
      "slug": "aranya-floating-wall-shelf-set-in-honey-brown",
      "sku": "AUR-DEMO-057-04",
      "categoryKey": "floating-wall-shelf-sets",
      "categoryPath": [
        "Decor",
        "Wall Decor",
        "Floating Wall Shelf Sets"
      ],
      "description": "Aranya Floating Wall Shelf Set in Honey Brown brings wall shelves into a coordinated classic interior. Two matching floating shelves display books and small objects. Load capacity depends on suitable wall fixings and wall condition.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 80 cm wide × 8 cm high × 22 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 5 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Two matching floating shelves display books and small objects. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 5799,
      "stock": 48,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for floating wall shelf set",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 80,
        "height": 8,
        "depth": 22,
        "unit": "cm"
      },
      "weight": {
        "value": 5,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "wall-decor",
        "wall-shelves",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Floating Wall Shelf Set in Honey Brown",
      "metaDescription": "Aranya Floating Wall Shelf Set in Honey Brown. 80 cm wide × 8 cm high × 22 cm deep. Explore this sample wall shelves listing for furniture catalogue development."
    },
    {
      "name": "Aster Ceramic Vase in Chalk White",
      "slug": "aster-ceramic-vase-in-chalk-white",
      "sku": "AUR-DEMO-058-01",
      "categoryKey": "ceramic-vases",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Ceramic Vases"
      ],
      "description": "Aster Ceramic Vase in Chalk White brings vases into a coordinated minimal interior. A glazed vessel holds fresh stems or dried arrangements. A protective base pad reduces contact marks on furniture.\n\nDesign and construction\nA chalk-white glaze highlights the simple sculptural form. Materials: Glazed ceramic. The 18 cm wide × 32 cm high × 18 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Wipe with a soft cloth and avoid sudden temperature changes.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A glazed vessel holds fresh stems or dried arrangements. Finished in chalk white, with glazed ceramic.",
      "price": 2999,
      "stock": 20,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for ceramic vase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Chalk White"
      ],
      "materials": [
        "Glazed ceramic"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 18,
        "height": 32,
        "depth": 18,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "vases",
        "aster",
        "chalk-white",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Ceramic Vase in Chalk White",
      "metaDescription": "Aster Ceramic Vase in Chalk White. 18 cm wide × 32 cm high × 18 cm deep. Explore this sample vases listing for furniture catalogue development."
    },
    {
      "name": "Niva Ceramic Vase in Sage Green",
      "slug": "niva-ceramic-vase-in-sage-green",
      "sku": "AUR-DEMO-058-02",
      "categoryKey": "ceramic-vases",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Ceramic Vases"
      ],
      "description": "Niva Ceramic Vase in Sage Green brings vases into a coordinated scandinavian interior. A glazed vessel holds fresh stems or dried arrangements. A protective base pad reduces contact marks on furniture.\n\nDesign and construction\nA muted sage glaze gives the stoneware surface an organic appearance. Materials: Glazed stoneware. The 18 cm wide × 32 cm high × 18 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Wash gently by hand and dry the base before returning it to furniture.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A glazed vessel holds fresh stems or dried arrangements. Finished in sage green, with glazed stoneware.",
      "price": 3299,
      "stock": 33,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for ceramic vase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Glazed stoneware"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 18,
        "height": 32,
        "depth": 18,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "vases",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Ceramic Vase in Sage Green",
      "metaDescription": "Niva Ceramic Vase in Sage Green. 18 cm wide × 32 cm high × 18 cm deep. Explore this sample vases listing for furniture catalogue development."
    },
    {
      "name": "Kanso Ceramic Vase in Charcoal",
      "slug": "kanso-ceramic-vase-in-charcoal",
      "sku": "AUR-DEMO-058-03",
      "categoryKey": "ceramic-vases",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Ceramic Vases"
      ],
      "description": "Kanso Ceramic Vase in Charcoal brings vases into a coordinated contemporary interior. A glazed vessel holds fresh stems or dried arrangements. A protective base pad reduces contact marks on furniture.\n\nDesign and construction\nA charcoal matte glaze brings definition to shelves and sideboards. Materials: Matte glazed ceramic. The 18 cm wide × 32 cm high × 18 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Remove dust with a soft brush and avoid abrasive cleaners.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A glazed vessel holds fresh stems or dried arrangements. Finished in charcoal, with matte glazed ceramic.",
      "price": 3799,
      "stock": 46,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for ceramic vase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Matte glazed ceramic"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 18,
        "height": 32,
        "depth": 18,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "vases",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Ceramic Vase in Charcoal",
      "metaDescription": "Kanso Ceramic Vase in Charcoal. 18 cm wide × 32 cm high × 18 cm deep. Explore this sample vases listing for furniture catalogue development."
    },
    {
      "name": "Aranya Ceramic Vase in Terracotta",
      "slug": "aranya-ceramic-vase-in-terracotta",
      "sku": "AUR-DEMO-058-04",
      "categoryKey": "ceramic-vases",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Ceramic Vases"
      ],
      "description": "Aranya Ceramic Vase in Terracotta brings vases into a coordinated bohemian interior. A glazed vessel holds fresh stems or dried arrangements. A protective base pad reduces contact marks on furniture.\n\nDesign and construction\nA warm terracotta glaze complements timber furniture and natural textiles. Materials: Glazed earthenware. The 18 cm wide × 32 cm high × 18 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 2 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Clean with mild soap, rinse gently and allow the base to dry.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A glazed vessel holds fresh stems or dried arrangements. Finished in terracotta, with glazed earthenware.",
      "price": 4299,
      "stock": 18,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for ceramic vase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Glazed earthenware"
      ],
      "style": "bohemian",
      "dimensions": {
        "width": 18,
        "height": 32,
        "depth": 18,
        "unit": "cm"
      },
      "weight": {
        "value": 2,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "vases",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Ceramic Vase in Terracotta",
      "metaDescription": "Aranya Ceramic Vase in Terracotta. 18 cm wide × 32 cm high × 18 cm deep. Explore this sample vases listing for furniture catalogue development.",
      "originalPrice": 4899
    },
    {
      "name": "Aster Abstract Table Sculpture in Chalk White",
      "slug": "aster-abstract-table-sculpture-in-chalk-white",
      "sku": "AUR-DEMO-059-01",
      "categoryKey": "abstract-table-sculptures",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Abstract Table Sculptures"
      ],
      "description": "Aster Abstract Table Sculpture in Chalk White brings sculptures into a coordinated minimal interior. A sculptural silhouette creates a focal point on a shelf. A stable felt-lined base protects the display surface.\n\nDesign and construction\nA chalk-white glaze highlights the simple sculptural form. Materials: Glazed ceramic. The 22 cm wide × 35 cm high × 16 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Wipe with a soft cloth and avoid sudden temperature changes.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A sculptural silhouette creates a focal point on a shelf. Finished in chalk white, with glazed ceramic.",
      "price": 4999,
      "stock": 31,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for abstract table sculpture",
          "isPrimary": true
        }
      ],
      "colors": [
        "Chalk White"
      ],
      "materials": [
        "Glazed ceramic"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 22,
        "height": 35,
        "depth": 16,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "sculptures",
        "aster",
        "chalk-white",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Abstract Table Sculpture in Chalk White",
      "metaDescription": "Aster Abstract Table Sculpture in Chalk White. 22 cm wide × 35 cm high × 16 cm deep. Explore this sample sculptures listing for furniture catalogue development."
    },
    {
      "name": "Niva Abstract Table Sculpture in Sage Green",
      "slug": "niva-abstract-table-sculpture-in-sage-green",
      "sku": "AUR-DEMO-059-02",
      "categoryKey": "abstract-table-sculptures",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Abstract Table Sculptures"
      ],
      "description": "Niva Abstract Table Sculpture in Sage Green brings sculptures into a coordinated scandinavian interior. A sculptural silhouette creates a focal point on a shelf. A stable felt-lined base protects the display surface.\n\nDesign and construction\nA muted sage glaze gives the stoneware surface an organic appearance. Materials: Glazed stoneware. The 22 cm wide × 35 cm high × 16 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Wash gently by hand and dry the base before returning it to furniture.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A sculptural silhouette creates a focal point on a shelf. Finished in sage green, with glazed stoneware.",
      "price": 5599,
      "stock": 44,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for abstract table sculpture",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Glazed stoneware"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 22,
        "height": 35,
        "depth": 16,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "sculptures",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Abstract Table Sculpture in Sage Green",
      "metaDescription": "Niva Abstract Table Sculpture in Sage Green. 22 cm wide × 35 cm high × 16 cm deep. Explore this sample sculptures listing for furniture catalogue development."
    },
    {
      "name": "Kanso Abstract Table Sculpture in Charcoal",
      "slug": "kanso-abstract-table-sculpture-in-charcoal",
      "sku": "AUR-DEMO-059-03",
      "categoryKey": "abstract-table-sculptures",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Abstract Table Sculptures"
      ],
      "description": "Kanso Abstract Table Sculpture in Charcoal brings sculptures into a coordinated contemporary interior. A sculptural silhouette creates a focal point on a shelf. A stable felt-lined base protects the display surface.\n\nDesign and construction\nA charcoal matte glaze brings definition to shelves and sideboards. Materials: Matte glazed ceramic. The 22 cm wide × 35 cm high × 16 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Remove dust with a soft brush and avoid abrasive cleaners.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A sculptural silhouette creates a focal point on a shelf. Finished in charcoal, with matte glazed ceramic.",
      "price": 6299,
      "stock": 16,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for abstract table sculpture",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Matte glazed ceramic"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 22,
        "height": 35,
        "depth": 16,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "sculptures",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Abstract Table Sculpture in Charcoal",
      "metaDescription": "Kanso Abstract Table Sculpture in Charcoal. 22 cm wide × 35 cm high × 16 cm deep. Explore this sample sculptures listing for furniture catalogue development."
    },
    {
      "name": "Aranya Abstract Table Sculpture in Terracotta",
      "slug": "aranya-abstract-table-sculpture-in-terracotta",
      "sku": "AUR-DEMO-059-04",
      "categoryKey": "abstract-table-sculptures",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Abstract Table Sculptures"
      ],
      "description": "Aranya Abstract Table Sculpture in Terracotta brings sculptures into a coordinated bohemian interior. A sculptural silhouette creates a focal point on a shelf. A stable felt-lined base protects the display surface.\n\nDesign and construction\nA warm terracotta glaze complements timber furniture and natural textiles. Materials: Glazed earthenware. The 22 cm wide × 35 cm high × 16 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 3 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Clean with mild soap, rinse gently and allow the base to dry.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A sculptural silhouette creates a focal point on a shelf. Finished in terracotta, with glazed earthenware.",
      "price": 7299,
      "stock": 29,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for abstract table sculpture",
          "isPrimary": true
        }
      ],
      "colors": [
        "Terracotta"
      ],
      "materials": [
        "Glazed earthenware"
      ],
      "style": "bohemian",
      "dimensions": {
        "width": 22,
        "height": 35,
        "depth": 16,
        "unit": "cm"
      },
      "weight": {
        "value": 3,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "sculptures",
        "aranya",
        "terracotta",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Abstract Table Sculpture in Terracotta",
      "metaDescription": "Aranya Abstract Table Sculpture in Terracotta. 22 cm wide × 35 cm high × 16 cm deep. Explore this sample sculptures listing for furniture catalogue development."
    },
    {
      "name": "Aster Decorative Serving Tray in Natural Oak",
      "slug": "aster-decorative-serving-tray-in-natural-oak",
      "sku": "AUR-DEMO-060-01",
      "categoryKey": "decorative-serving-trays",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Decorative Serving Trays"
      ],
      "description": "Aster Decorative Serving Tray in Natural Oak brings decorative trays into a coordinated minimal interior. A shallow tray groups candles or everyday objects. Raised edges make it easier to carry light serving items.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 45 cm wide × 5 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A shallow tray groups candles or everyday objects. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 2999,
      "stock": 42,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for decorative serving tray",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 45,
        "height": 5,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "decorative-trays",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Decorative Serving Tray in Natural Oak",
      "metaDescription": "Aster Decorative Serving Tray in Natural Oak. 45 cm wide × 5 cm high × 30 cm deep. Explore this sample decorative trays listing for furniture catalogue development."
    },
    {
      "name": "Niva Decorative Serving Tray in Walnut",
      "slug": "niva-decorative-serving-tray-in-walnut",
      "sku": "AUR-DEMO-060-02",
      "categoryKey": "decorative-serving-trays",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Decorative Serving Trays"
      ],
      "description": "Niva Decorative Serving Tray in Walnut brings decorative trays into a coordinated scandinavian interior. A shallow tray groups candles or everyday objects. Raised edges make it easier to carry light serving items.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 45 cm wide × 5 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A shallow tray groups candles or everyday objects. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 3299,
      "stock": 14,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for decorative serving tray",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 45,
        "height": 5,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "decorative-trays",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Decorative Serving Tray in Walnut",
      "metaDescription": "Niva Decorative Serving Tray in Walnut. 45 cm wide × 5 cm high × 30 cm deep. Explore this sample decorative trays listing for furniture catalogue development."
    },
    {
      "name": "Kanso Decorative Serving Tray in Charcoal",
      "slug": "kanso-decorative-serving-tray-in-charcoal",
      "sku": "AUR-DEMO-060-03",
      "categoryKey": "decorative-serving-trays",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Decorative Serving Trays"
      ],
      "description": "Kanso Decorative Serving Tray in Charcoal brings decorative trays into a coordinated industrial interior. A shallow tray groups candles or everyday objects. Raised edges make it easier to carry light serving items.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 45 cm wide × 5 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A shallow tray groups candles or everyday objects. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 3799,
      "stock": 27,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for decorative serving tray",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 45,
        "height": 5,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "decorative-trays",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Decorative Serving Tray in Charcoal",
      "metaDescription": "Kanso Decorative Serving Tray in Charcoal. 45 cm wide × 5 cm high × 30 cm deep. Explore this sample decorative trays listing for furniture catalogue development.",
      "originalPrice": 4299
    },
    {
      "name": "Aranya Decorative Serving Tray in Honey Brown",
      "slug": "aranya-decorative-serving-tray-in-honey-brown",
      "sku": "AUR-DEMO-060-04",
      "categoryKey": "decorative-serving-trays",
      "categoryPath": [
        "Decor",
        "Decorative Objects",
        "Decorative Serving Trays"
      ],
      "description": "Aranya Decorative Serving Tray in Honey Brown brings decorative trays into a coordinated classic interior. A shallow tray groups candles or everyday objects. Raised edges make it easier to carry light serving items.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 45 cm wide × 5 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A shallow tray groups candles or everyday objects. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 4299,
      "stock": 40,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for decorative serving tray",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 45,
        "height": 5,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "decorative-objects",
        "decorative-trays",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Decorative Serving Tray in Honey Brown",
      "metaDescription": "Aranya Decorative Serving Tray in Honey Brown. 45 cm wide × 5 cm high × 30 cm deep. Explore this sample decorative trays listing for furniture catalogue development."
    },
    {
      "name": "Aster Woven Area Rug in Warm Ivory",
      "slug": "aster-woven-area-rug-in-warm-ivory",
      "sku": "AUR-DEMO-061-01",
      "categoryKey": "woven-area-rugs",
      "categoryPath": [
        "Decor",
        "Rugs",
        "Woven Area Rugs"
      ],
      "description": "Aster Woven Area Rug in Warm Ivory brings area rugs into a coordinated minimal interior. A 160 by 230 cm rug defines a seating area. Use a separate non-slip underlay on smooth flooring.\n\nDesign and construction\nA low-contrast ivory weave keeps the textile easy to combine with existing furniture. Materials: Woven cotton blend. The 160 cm wide × 1 cm high × 230 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 8 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Follow the sewn-in care label and remove spills promptly without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 160 by 230 cm rug defines a seating area. Finished in warm ivory, with woven cotton blend.",
      "price": 14999,
      "stock": 12,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for woven area rug",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Ivory"
      ],
      "materials": [
        "Woven cotton blend"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 160,
        "height": 1,
        "depth": 230,
        "unit": "cm"
      },
      "weight": {
        "value": 8,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "area-rugs",
        "aster",
        "warm-ivory",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Woven Area Rug in Warm Ivory",
      "metaDescription": "Aster Woven Area Rug in Warm Ivory. 160 cm wide × 1 cm high × 230 cm deep. Explore this sample area rugs listing for furniture catalogue development."
    },
    {
      "name": "Niva Woven Area Rug in Sage Green",
      "slug": "niva-woven-area-rug-in-sage-green",
      "sku": "AUR-DEMO-061-02",
      "categoryKey": "woven-area-rugs",
      "categoryPath": [
        "Decor",
        "Rugs",
        "Woven Area Rugs"
      ],
      "description": "Niva Woven Area Rug in Sage Green brings area rugs into a coordinated scandinavian interior. A 160 by 230 cm rug defines a seating area. Use a separate non-slip underlay on smooth flooring.\n\nDesign and construction\nA sage textured weave adds colour without a strong pattern. Materials: Textured cotton blend. The 160 cm wide × 1 cm high × 230 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 8 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Shake out loose dust and use a gentle care method appropriate to the item size.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 160 by 230 cm rug defines a seating area. Finished in sage green, with textured cotton blend.",
      "price": 16899,
      "stock": 25,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for woven area rug",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Textured cotton blend"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 160,
        "height": 1,
        "depth": 230,
        "unit": "cm"
      },
      "weight": {
        "value": 8,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "area-rugs",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Woven Area Rug in Sage Green",
      "metaDescription": "Niva Woven Area Rug in Sage Green. 160 cm wide × 1 cm high × 230 cm deep. Explore this sample area rugs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Woven Area Rug in Slate Grey",
      "slug": "kanso-woven-area-rug-in-slate-grey",
      "sku": "AUR-DEMO-061-03",
      "categoryKey": "woven-area-rugs",
      "categoryPath": [
        "Decor",
        "Rugs",
        "Woven Area Rugs"
      ],
      "description": "Kanso Woven Area Rug in Slate Grey brings area rugs into a coordinated contemporary interior. A 160 by 230 cm rug defines a seating area. Use a separate non-slip underlay on smooth flooring.\n\nDesign and construction\nA slate synthetic-blend weave gives the textile a practical contemporary finish. Materials: Woven recycled polyester blend. The 160 cm wide × 1 cm high × 230 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 8 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum or brush gently and avoid high heat when cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 160 by 230 cm rug defines a seating area. Finished in slate grey, with woven recycled polyester blend.",
      "price": 19099,
      "stock": 38,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for woven area rug",
          "isPrimary": true
        }
      ],
      "colors": [
        "Slate Grey"
      ],
      "materials": [
        "Woven recycled polyester blend"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 160,
        "height": 1,
        "depth": 230,
        "unit": "cm"
      },
      "weight": {
        "value": 8,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "area-rugs",
        "kanso",
        "slate-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Woven Area Rug in Slate Grey",
      "metaDescription": "Kanso Woven Area Rug in Slate Grey. 160 cm wide × 1 cm high × 230 cm deep. Explore this sample area rugs listing for furniture catalogue development."
    },
    {
      "name": "Aranya Woven Area Rug in Rust",
      "slug": "aranya-woven-area-rug-in-rust",
      "sku": "AUR-DEMO-061-04",
      "categoryKey": "woven-area-rugs",
      "categoryPath": [
        "Decor",
        "Rugs",
        "Woven Area Rugs"
      ],
      "description": "Aranya Woven Area Rug in Rust brings area rugs into a coordinated bohemian interior. A 160 by 230 cm rug defines a seating area. Use a separate non-slip underlay on smooth flooring.\n\nDesign and construction\nA rust-coloured textured weave adds a warm decorative layer. Materials: Textured cotton and viscose blend. The 160 cm wide × 1 cm high × 230 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 8 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Keep away from sharp jewellery and follow the care label for washing or dry cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 160 by 230 cm rug defines a seating area. Finished in rust, with textured cotton and viscose blend.",
      "price": 22099,
      "stock": 10,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for woven area rug",
          "isPrimary": true
        }
      ],
      "colors": [
        "Rust"
      ],
      "materials": [
        "Textured cotton and viscose blend"
      ],
      "style": "bohemian",
      "dimensions": {
        "width": 160,
        "height": 1,
        "depth": 230,
        "unit": "cm"
      },
      "weight": {
        "value": 8,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "area-rugs",
        "aranya",
        "rust",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Woven Area Rug in Rust",
      "metaDescription": "Aranya Woven Area Rug in Rust. 160 cm wide × 1 cm high × 230 cm deep. Explore this sample area rugs listing for furniture catalogue development."
    },
    {
      "name": "Aster Cushion Cover Set in Warm Ivory",
      "slug": "aster-cushion-cover-set-in-warm-ivory",
      "sku": "AUR-DEMO-062-01",
      "categoryKey": "cushion-cover-sets",
      "categoryPath": [
        "Decor",
        "Cushions & Throws",
        "Cushion Cover Sets"
      ],
      "description": "Aster Cushion Cover Set in Warm Ivory brings cushions into a coordinated minimal interior. A pair of 45 cm cushion covers refreshes a sofa or bed. Concealed zips allow the separately purchased inserts to be removed.\n\nDesign and construction\nA low-contrast ivory weave keeps the textile easy to combine with existing furniture. Materials: Woven cotton blend. The 45 cm wide × 1 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Follow the sewn-in care label and remove spills promptly without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A pair of 45 cm cushion covers refreshes a sofa or bed. Finished in warm ivory, with woven cotton blend.",
      "price": 1999,
      "stock": 23,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for cushion cover set",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Ivory"
      ],
      "materials": [
        "Woven cotton blend"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 45,
        "height": 1,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "cushions",
        "aster",
        "warm-ivory",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Cushion Cover Set in Warm Ivory",
      "metaDescription": "Aster Cushion Cover Set in Warm Ivory. 45 cm wide × 1 cm high × 45 cm deep. Explore this sample cushions listing for furniture catalogue development."
    },
    {
      "name": "Niva Cushion Cover Set in Sage Green",
      "slug": "niva-cushion-cover-set-in-sage-green",
      "sku": "AUR-DEMO-062-02",
      "categoryKey": "cushion-cover-sets",
      "categoryPath": [
        "Decor",
        "Cushions & Throws",
        "Cushion Cover Sets"
      ],
      "description": "Niva Cushion Cover Set in Sage Green brings cushions into a coordinated scandinavian interior. A pair of 45 cm cushion covers refreshes a sofa or bed. Concealed zips allow the separately purchased inserts to be removed.\n\nDesign and construction\nA sage textured weave adds colour without a strong pattern. Materials: Textured cotton blend. The 45 cm wide × 1 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Shake out loose dust and use a gentle care method appropriate to the item size.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A pair of 45 cm cushion covers refreshes a sofa or bed. Finished in sage green, with textured cotton blend.",
      "price": 2199,
      "stock": 36,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for cushion cover set",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Textured cotton blend"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 45,
        "height": 1,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "cushions",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Cushion Cover Set in Sage Green",
      "metaDescription": "Niva Cushion Cover Set in Sage Green. 45 cm wide × 1 cm high × 45 cm deep. Explore this sample cushions listing for furniture catalogue development.",
      "originalPrice": 2499
    },
    {
      "name": "Kanso Cushion Cover Set in Slate Grey",
      "slug": "kanso-cushion-cover-set-in-slate-grey",
      "sku": "AUR-DEMO-062-03",
      "categoryKey": "cushion-cover-sets",
      "categoryPath": [
        "Decor",
        "Cushions & Throws",
        "Cushion Cover Sets"
      ],
      "description": "Kanso Cushion Cover Set in Slate Grey brings cushions into a coordinated contemporary interior. A pair of 45 cm cushion covers refreshes a sofa or bed. Concealed zips allow the separately purchased inserts to be removed.\n\nDesign and construction\nA slate synthetic-blend weave gives the textile a practical contemporary finish. Materials: Woven recycled polyester blend. The 45 cm wide × 1 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum or brush gently and avoid high heat when cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A pair of 45 cm cushion covers refreshes a sofa or bed. Finished in slate grey, with woven recycled polyester blend.",
      "price": 2499,
      "stock": 8,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for cushion cover set",
          "isPrimary": true
        }
      ],
      "colors": [
        "Slate Grey"
      ],
      "materials": [
        "Woven recycled polyester blend"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 45,
        "height": 1,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "cushions",
        "kanso",
        "slate-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Cushion Cover Set in Slate Grey",
      "metaDescription": "Kanso Cushion Cover Set in Slate Grey. 45 cm wide × 1 cm high × 45 cm deep. Explore this sample cushions listing for furniture catalogue development."
    },
    {
      "name": "Aranya Cushion Cover Set in Rust",
      "slug": "aranya-cushion-cover-set-in-rust",
      "sku": "AUR-DEMO-062-04",
      "categoryKey": "cushion-cover-sets",
      "categoryPath": [
        "Decor",
        "Cushions & Throws",
        "Cushion Cover Sets"
      ],
      "description": "Aranya Cushion Cover Set in Rust brings cushions into a coordinated bohemian interior. A pair of 45 cm cushion covers refreshes a sofa or bed. Concealed zips allow the separately purchased inserts to be removed.\n\nDesign and construction\nA rust-coloured textured weave adds a warm decorative layer. Materials: Textured cotton and viscose blend. The 45 cm wide × 1 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Keep away from sharp jewellery and follow the care label for washing or dry cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A pair of 45 cm cushion covers refreshes a sofa or bed. Finished in rust, with textured cotton and viscose blend.",
      "price": 2899,
      "stock": 21,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for cushion cover set",
          "isPrimary": true
        }
      ],
      "colors": [
        "Rust"
      ],
      "materials": [
        "Textured cotton and viscose blend"
      ],
      "style": "bohemian",
      "dimensions": {
        "width": 45,
        "height": 1,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "cushions",
        "aranya",
        "rust",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Cushion Cover Set in Rust",
      "metaDescription": "Aranya Cushion Cover Set in Rust. 45 cm wide × 1 cm high × 45 cm deep. Explore this sample cushions listing for furniture catalogue development."
    },
    {
      "name": "Aster Textured Sofa Throw in Warm Ivory",
      "slug": "aster-textured-sofa-throw-in-warm-ivory",
      "sku": "AUR-DEMO-063-01",
      "categoryKey": "textured-sofa-throws",
      "categoryPath": [
        "Decor",
        "Cushions & Throws",
        "Textured Sofa Throws"
      ],
      "description": "Aster Textured Sofa Throw in Warm Ivory brings throws into a coordinated minimal interior. A 130 by 170 cm throw adds a light extra layer. A soft textured weave drapes over a sofa arm or reading chair.\n\nDesign and construction\nA low-contrast ivory weave keeps the textile easy to combine with existing furniture. Materials: Woven cotton blend. The 130 cm wide × 1 cm high × 170 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Follow the sewn-in care label and remove spills promptly without rubbing.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 130 by 170 cm throw adds a light extra layer. Finished in warm ivory, with woven cotton blend.",
      "price": 3999,
      "stock": 34,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for textured sofa throw",
          "isPrimary": true
        }
      ],
      "colors": [
        "Warm Ivory"
      ],
      "materials": [
        "Woven cotton blend"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 130,
        "height": 1,
        "depth": 170,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "throws",
        "aster",
        "warm-ivory",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Textured Sofa Throw in Warm Ivory",
      "metaDescription": "Aster Textured Sofa Throw in Warm Ivory. 130 cm wide × 1 cm high × 170 cm deep. Explore this sample throws listing for furniture catalogue development."
    },
    {
      "name": "Niva Textured Sofa Throw in Sage Green",
      "slug": "niva-textured-sofa-throw-in-sage-green",
      "sku": "AUR-DEMO-063-02",
      "categoryKey": "textured-sofa-throws",
      "categoryPath": [
        "Decor",
        "Cushions & Throws",
        "Textured Sofa Throws"
      ],
      "description": "Niva Textured Sofa Throw in Sage Green brings throws into a coordinated scandinavian interior. A 130 by 170 cm throw adds a light extra layer. A soft textured weave drapes over a sofa arm or reading chair.\n\nDesign and construction\nA sage textured weave adds colour without a strong pattern. Materials: Textured cotton blend. The 130 cm wide × 1 cm high × 170 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Shake out loose dust and use a gentle care method appropriate to the item size.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 130 by 170 cm throw adds a light extra layer. Finished in sage green, with textured cotton blend.",
      "price": 4499,
      "stock": 47,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for textured sofa throw",
          "isPrimary": true
        }
      ],
      "colors": [
        "Sage Green"
      ],
      "materials": [
        "Textured cotton blend"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 130,
        "height": 1,
        "depth": 170,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "throws",
        "niva",
        "sage-green",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Textured Sofa Throw in Sage Green",
      "metaDescription": "Niva Textured Sofa Throw in Sage Green. 130 cm wide × 1 cm high × 170 cm deep. Explore this sample throws listing for furniture catalogue development."
    },
    {
      "name": "Kanso Textured Sofa Throw in Slate Grey",
      "slug": "kanso-textured-sofa-throw-in-slate-grey",
      "sku": "AUR-DEMO-063-03",
      "categoryKey": "textured-sofa-throws",
      "categoryPath": [
        "Decor",
        "Cushions & Throws",
        "Textured Sofa Throws"
      ],
      "description": "Kanso Textured Sofa Throw in Slate Grey brings throws into a coordinated contemporary interior. A 130 by 170 cm throw adds a light extra layer. A soft textured weave drapes over a sofa arm or reading chair.\n\nDesign and construction\nA slate synthetic-blend weave gives the textile a practical contemporary finish. Materials: Woven recycled polyester blend. The 130 cm wide × 1 cm high × 170 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Vacuum or brush gently and avoid high heat when cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 130 by 170 cm throw adds a light extra layer. Finished in slate grey, with woven recycled polyester blend.",
      "price": 4999,
      "stock": 19,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for textured sofa throw",
          "isPrimary": true
        }
      ],
      "colors": [
        "Slate Grey"
      ],
      "materials": [
        "Woven recycled polyester blend"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 130,
        "height": 1,
        "depth": 170,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "throws",
        "kanso",
        "slate-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Textured Sofa Throw in Slate Grey",
      "metaDescription": "Kanso Textured Sofa Throw in Slate Grey. 130 cm wide × 1 cm high × 170 cm deep. Explore this sample throws listing for furniture catalogue development."
    },
    {
      "name": "Aranya Textured Sofa Throw in Rust",
      "slug": "aranya-textured-sofa-throw-in-rust",
      "sku": "AUR-DEMO-063-04",
      "categoryKey": "textured-sofa-throws",
      "categoryPath": [
        "Decor",
        "Cushions & Throws",
        "Textured Sofa Throws"
      ],
      "description": "Aranya Textured Sofa Throw in Rust brings throws into a coordinated bohemian interior. A 130 by 170 cm throw adds a light extra layer. A soft textured weave drapes over a sofa arm or reading chair.\n\nDesign and construction\nA rust-coloured textured weave adds a warm decorative layer. Materials: Textured cotton and viscose blend. The 130 cm wide × 1 cm high × 170 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 1 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nDelivered ready to position; wall-mounted items require suitable wall fixings. Keep away from sharp jewellery and follow the care label for washing or dry cleaning.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A 130 by 170 cm throw adds a light extra layer. Finished in rust, with textured cotton and viscose blend.",
      "price": 5799,
      "stock": 32,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80",
          "alt": "Decor interior reference for textured sofa throw",
          "isPrimary": true
        }
      ],
      "colors": [
        "Rust"
      ],
      "materials": [
        "Textured cotton and viscose blend"
      ],
      "style": "bohemian",
      "dimensions": {
        "width": 130,
        "height": 1,
        "depth": 170,
        "unit": "cm"
      },
      "weight": {
        "value": 1,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "decor",
        "home-textiles",
        "throws",
        "aranya",
        "rust",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Textured Sofa Throw in Rust",
      "metaDescription": "Aranya Textured Sofa Throw in Rust. 130 cm wide × 1 cm high × 170 cm deep. Explore this sample throws listing for furniture catalogue development."
    },
    {
      "name": "Aster Single Kids Bed in Natural Oak",
      "slug": "aster-single-kids-bed-in-natural-oak",
      "sku": "AUR-DEMO-064-01",
      "categoryKey": "single-kids-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Single Kids Beds"
      ],
      "description": "Aster Single Kids Bed in Natural Oak brings single kids beds into a coordinated minimal interior. A low bed frame suits a separately purchased 91 by 190 cm mattress. Rounded external corners reduce sharp edges around the frame.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 99 cm wide × 85 cm high × 200 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 37 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "A low bed frame suits a separately purchased 91 by 190 cm mattress. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 23999,
      "stock": 45,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for single kids bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 99,
        "height": 85,
        "depth": 200,
        "unit": "cm"
      },
      "weight": {
        "value": 37,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "single-kids-beds",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Single Kids Bed in Natural Oak",
      "metaDescription": "Aster Single Kids Bed in Natural Oak. 99 cm wide × 85 cm high × 200 cm deep. Explore this sample single kids beds listing for furniture catalogue development.",
      "originalPrice": 26899
    },
    {
      "name": "Niva Single Kids Bed in Walnut",
      "slug": "niva-single-kids-bed-in-walnut",
      "sku": "AUR-DEMO-064-02",
      "categoryKey": "single-kids-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Single Kids Beds"
      ],
      "description": "Niva Single Kids Bed in Walnut brings single kids beds into a coordinated scandinavian interior. A low bed frame suits a separately purchased 91 by 190 cm mattress. Rounded external corners reduce sharp edges around the frame.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 99 cm wide × 85 cm high × 200 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 37 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "A low bed frame suits a separately purchased 91 by 190 cm mattress. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 27099,
      "stock": 17,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for single kids bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 99,
        "height": 85,
        "depth": 200,
        "unit": "cm"
      },
      "weight": {
        "value": 37,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "single-kids-beds",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Single Kids Bed in Walnut",
      "metaDescription": "Niva Single Kids Bed in Walnut. 99 cm wide × 85 cm high × 200 cm deep. Explore this sample single kids beds listing for furniture catalogue development."
    },
    {
      "name": "Kanso Single Kids Bed in Charcoal",
      "slug": "kanso-single-kids-bed-in-charcoal",
      "sku": "AUR-DEMO-064-03",
      "categoryKey": "single-kids-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Single Kids Beds"
      ],
      "description": "Kanso Single Kids Bed in Charcoal brings single kids beds into a coordinated industrial interior. A low bed frame suits a separately purchased 91 by 190 cm mattress. Rounded external corners reduce sharp edges around the frame.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 99 cm wide × 85 cm high × 200 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 37 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "A low bed frame suits a separately purchased 91 by 190 cm mattress. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 30599,
      "stock": 30,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for single kids bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 99,
        "height": 85,
        "depth": 200,
        "unit": "cm"
      },
      "weight": {
        "value": 37,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "single-kids-beds",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Single Kids Bed in Charcoal",
      "metaDescription": "Kanso Single Kids Bed in Charcoal. 99 cm wide × 85 cm high × 200 cm deep. Explore this sample single kids beds listing for furniture catalogue development."
    },
    {
      "name": "Aranya Single Kids Bed in Honey Brown",
      "slug": "aranya-single-kids-bed-in-honey-brown",
      "sku": "AUR-DEMO-064-04",
      "categoryKey": "single-kids-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Single Kids Beds"
      ],
      "description": "Aranya Single Kids Bed in Honey Brown brings single kids beds into a coordinated classic interior. A low bed frame suits a separately purchased 91 by 190 cm mattress. Rounded external corners reduce sharp edges around the frame.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 99 cm wide × 85 cm high × 200 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 37 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "A low bed frame suits a separately purchased 91 by 190 cm mattress. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 35399,
      "stock": 43,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for single kids bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 99,
        "height": 85,
        "depth": 200,
        "unit": "cm"
      },
      "weight": {
        "value": 37,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "single-kids-beds",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Single Kids Bed in Honey Brown",
      "metaDescription": "Aranya Single Kids Bed in Honey Brown. 99 cm wide × 85 cm high × 200 cm deep. Explore this sample single kids beds listing for furniture catalogue development."
    },
    {
      "name": "Aster Twin Bunk Bed in Natural Oak",
      "slug": "aster-twin-bunk-bed-in-natural-oak",
      "sku": "AUR-DEMO-065-01",
      "categoryKey": "twin-bunk-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Twin Bunk Beds"
      ],
      "description": "Aster Twin Bunk Bed in Natural Oak brings bunk beds into a coordinated minimal interior. Two sleeping levels use separately purchased 91 by 190 cm mattresses. The upper bunk is for children aged six and over and requires the guard rails to remain fitted.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 102 cm wide × 165 cm high × 204 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 76 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Two sleeping levels use separately purchased 91 by 190 cm mattresses. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 54999,
      "stock": 15,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for twin bunk bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 102,
        "height": 165,
        "depth": 204,
        "unit": "cm"
      },
      "weight": {
        "value": 76,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "bunk-beds",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Twin Bunk Bed in Natural Oak",
      "metaDescription": "Aster Twin Bunk Bed in Natural Oak. 102 cm wide × 165 cm high × 204 cm deep. Explore this sample bunk beds listing for furniture catalogue development."
    },
    {
      "name": "Niva Twin Bunk Bed in Walnut",
      "slug": "niva-twin-bunk-bed-in-walnut",
      "sku": "AUR-DEMO-065-02",
      "categoryKey": "twin-bunk-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Twin Bunk Beds"
      ],
      "description": "Niva Twin Bunk Bed in Walnut brings bunk beds into a coordinated scandinavian interior. Two sleeping levels use separately purchased 91 by 190 cm mattresses. The upper bunk is for children aged six and over and requires the guard rails to remain fitted.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 102 cm wide × 165 cm high × 204 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 76 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Two sleeping levels use separately purchased 91 by 190 cm mattresses. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 62099,
      "stock": 28,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for twin bunk bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 102,
        "height": 165,
        "depth": 204,
        "unit": "cm"
      },
      "weight": {
        "value": 76,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "bunk-beds",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Twin Bunk Bed in Walnut",
      "metaDescription": "Niva Twin Bunk Bed in Walnut. 102 cm wide × 165 cm high × 204 cm deep. Explore this sample bunk beds listing for furniture catalogue development."
    },
    {
      "name": "Kanso Twin Bunk Bed in Charcoal",
      "slug": "kanso-twin-bunk-bed-in-charcoal",
      "sku": "AUR-DEMO-065-03",
      "categoryKey": "twin-bunk-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Twin Bunk Beds"
      ],
      "description": "Kanso Twin Bunk Bed in Charcoal brings bunk beds into a coordinated industrial interior. Two sleeping levels use separately purchased 91 by 190 cm mattresses. The upper bunk is for children aged six and over and requires the guard rails to remain fitted.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 102 cm wide × 165 cm high × 204 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 76 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Two sleeping levels use separately purchased 91 by 190 cm mattresses. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 70299,
      "stock": 41,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for twin bunk bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 102,
        "height": 165,
        "depth": 204,
        "unit": "cm"
      },
      "weight": {
        "value": 76,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "bunk-beds",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Twin Bunk Bed in Charcoal",
      "metaDescription": "Kanso Twin Bunk Bed in Charcoal. 102 cm wide × 165 cm high × 204 cm deep. Explore this sample bunk beds listing for furniture catalogue development."
    },
    {
      "name": "Aranya Twin Bunk Bed in Honey Brown",
      "slug": "aranya-twin-bunk-bed-in-honey-brown",
      "sku": "AUR-DEMO-065-04",
      "categoryKey": "twin-bunk-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Twin Bunk Beds"
      ],
      "description": "Aranya Twin Bunk Bed in Honey Brown brings bunk beds into a coordinated classic interior. Two sleeping levels use separately purchased 91 by 190 cm mattresses. The upper bunk is for children aged six and over and requires the guard rails to remain fitted.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 102 cm wide × 165 cm high × 204 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 76 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "Two sleeping levels use separately purchased 91 by 190 cm mattresses. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 81299,
      "stock": 0,
      "status": "out_of_stock",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for twin bunk bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 102,
        "height": 165,
        "depth": 204,
        "unit": "cm"
      },
      "weight": {
        "value": 76,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "bunk-beds",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Twin Bunk Bed in Honey Brown",
      "metaDescription": "Aranya Twin Bunk Bed in Honey Brown. 102 cm wide × 165 cm high × 204 cm deep. Explore this sample bunk beds listing for furniture catalogue development.",
      "originalPrice": 91099
    },
    {
      "name": "Aster Single Trundle Bed in Natural Oak",
      "slug": "aster-single-trundle-bed-in-natural-oak",
      "sku": "AUR-DEMO-066-01",
      "categoryKey": "single-trundle-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Single Trundle Beds"
      ],
      "description": "Aster Single Trundle Bed in Natural Oak brings trundle beds into a coordinated minimal interior. A pull-out lower bed provides an occasional extra sleeping place. Mattresses are sold separately and must fit the stated platform sizes.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 102 cm wide × 91 cm high × 203 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 58 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "A pull-out lower bed provides an occasional extra sleeping place. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 35999,
      "stock": 26,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for single trundle bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 102,
        "height": 91,
        "depth": 203,
        "unit": "cm"
      },
      "weight": {
        "value": 58,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "trundle-beds",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Single Trundle Bed in Natural Oak",
      "metaDescription": "Aster Single Trundle Bed in Natural Oak. 102 cm wide × 91 cm high × 203 cm deep. Explore this sample trundle beds listing for furniture catalogue development."
    },
    {
      "name": "Niva Single Trundle Bed in Walnut",
      "slug": "niva-single-trundle-bed-in-walnut",
      "sku": "AUR-DEMO-066-02",
      "categoryKey": "single-trundle-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Single Trundle Beds"
      ],
      "description": "Niva Single Trundle Bed in Walnut brings trundle beds into a coordinated scandinavian interior. A pull-out lower bed provides an occasional extra sleeping place. Mattresses are sold separately and must fit the stated platform sizes.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 102 cm wide × 91 cm high × 203 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 58 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "A pull-out lower bed provides an occasional extra sleeping place. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 40599,
      "stock": 39,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for single trundle bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 102,
        "height": 91,
        "depth": 203,
        "unit": "cm"
      },
      "weight": {
        "value": 58,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "trundle-beds",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Single Trundle Bed in Walnut",
      "metaDescription": "Niva Single Trundle Bed in Walnut. 102 cm wide × 91 cm high × 203 cm deep. Explore this sample trundle beds listing for furniture catalogue development."
    },
    {
      "name": "Kanso Single Trundle Bed in Charcoal",
      "slug": "kanso-single-trundle-bed-in-charcoal",
      "sku": "AUR-DEMO-066-03",
      "categoryKey": "single-trundle-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Single Trundle Beds"
      ],
      "description": "Kanso Single Trundle Bed in Charcoal brings trundle beds into a coordinated industrial interior. A pull-out lower bed provides an occasional extra sleeping place. Mattresses are sold separately and must fit the stated platform sizes.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 102 cm wide × 91 cm high × 203 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 58 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "A pull-out lower bed provides an occasional extra sleeping place. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 45999,
      "stock": 11,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for single trundle bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 102,
        "height": 91,
        "depth": 203,
        "unit": "cm"
      },
      "weight": {
        "value": 58,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "trundle-beds",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Single Trundle Bed in Charcoal",
      "metaDescription": "Kanso Single Trundle Bed in Charcoal. 102 cm wide × 91 cm high × 203 cm deep. Explore this sample trundle beds listing for furniture catalogue development."
    },
    {
      "name": "Aranya Single Trundle Bed in Honey Brown",
      "slug": "aranya-single-trundle-bed-in-honey-brown",
      "sku": "AUR-DEMO-066-04",
      "categoryKey": "single-trundle-beds",
      "categoryPath": [
        "Kids Room",
        "Kids Beds",
        "Single Trundle Beds"
      ],
      "description": "Aranya Single Trundle Bed in Honey Brown brings trundle beds into a coordinated classic interior. A pull-out lower bed provides an occasional extra sleeping place. Mattresses are sold separately and must fit the stated platform sizes.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 102 cm wide × 91 cm high × 203 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 58 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Mattress and bedding are sold separately.",
      "shortDescription": "A pull-out lower bed provides an occasional extra sleeping place. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 53199,
      "stock": 24,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for single trundle bed",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 102,
        "height": 91,
        "depth": 203,
        "unit": "cm"
      },
      "weight": {
        "value": 58,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-beds",
        "trundle-beds",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Single Trundle Bed in Honey Brown",
      "metaDescription": "Aranya Single Trundle Bed in Honey Brown. 102 cm wide × 91 cm high × 203 cm deep. Explore this sample trundle beds listing for furniture catalogue development."
    },
    {
      "name": "Aster Kids Study Desk in Natural Oak",
      "slug": "aster-kids-study-desk-in-natural-oak",
      "sku": "AUR-DEMO-067-01",
      "categoryKey": "kids-study-desks",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Study Desks"
      ],
      "description": "Aster Kids Study Desk in Natural Oak brings kids desks into a coordinated minimal interior. A compact desktop provides space for reading and homework. A built-in drawer organises pencils and exercise books.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 100 cm wide × 72 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact desktop provides space for reading and homework. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 11999,
      "stock": 37,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids study desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 100,
        "height": 72,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "kids-desks",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Kids Study Desk in Natural Oak",
      "metaDescription": "Aster Kids Study Desk in Natural Oak. 100 cm wide × 72 cm high × 50 cm deep. Explore this sample kids desks listing for furniture catalogue development."
    },
    {
      "name": "Niva Kids Study Desk in Walnut",
      "slug": "niva-kids-study-desk-in-walnut",
      "sku": "AUR-DEMO-067-02",
      "categoryKey": "kids-study-desks",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Study Desks"
      ],
      "description": "Niva Kids Study Desk in Walnut brings kids desks into a coordinated scandinavian interior. A compact desktop provides space for reading and homework. A built-in drawer organises pencils and exercise books.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 100 cm wide × 72 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact desktop provides space for reading and homework. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 13499,
      "stock": 9,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids study desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 100,
        "height": 72,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "kids-desks",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Kids Study Desk in Walnut",
      "metaDescription": "Niva Kids Study Desk in Walnut. 100 cm wide × 72 cm high × 50 cm deep. Explore this sample kids desks listing for furniture catalogue development."
    },
    {
      "name": "Kanso Kids Study Desk in Charcoal",
      "slug": "kanso-kids-study-desk-in-charcoal",
      "sku": "AUR-DEMO-067-03",
      "categoryKey": "kids-study-desks",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Study Desks"
      ],
      "description": "Kanso Kids Study Desk in Charcoal brings kids desks into a coordinated industrial interior. A compact desktop provides space for reading and homework. A built-in drawer organises pencils and exercise books.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 100 cm wide × 72 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact desktop provides space for reading and homework. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 15299,
      "stock": 22,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids study desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 100,
        "height": 72,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "kids-desks",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Kids Study Desk in Charcoal",
      "metaDescription": "Kanso Kids Study Desk in Charcoal. 100 cm wide × 72 cm high × 50 cm deep. Explore this sample kids desks listing for furniture catalogue development.",
      "originalPrice": 17199
    },
    {
      "name": "Aranya Kids Study Desk in Honey Brown",
      "slug": "aranya-kids-study-desk-in-honey-brown",
      "sku": "AUR-DEMO-067-04",
      "categoryKey": "kids-study-desks",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Study Desks"
      ],
      "description": "Aranya Kids Study Desk in Honey Brown brings kids desks into a coordinated classic interior. A compact desktop provides space for reading and homework. A built-in drawer organises pencils and exercise books.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 100 cm wide × 72 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 16 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A compact desktop provides space for reading and homework. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 17699,
      "stock": 35,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids study desk",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 100,
        "height": 72,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 16,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "kids-desks",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Kids Study Desk in Honey Brown",
      "metaDescription": "Aranya Kids Study Desk in Honey Brown. 100 cm wide × 72 cm high × 50 cm deep. Explore this sample kids desks listing for furniture catalogue development."
    },
    {
      "name": "Aster Kids Study Chair in Black",
      "slug": "aster-kids-study-chair-in-black",
      "sku": "AUR-DEMO-068-01",
      "categoryKey": "kids-study-chairs",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Study Chairs"
      ],
      "description": "Aster Kids Study Chair in Black brings kids chairs into a coordinated modern interior. A smaller seat suits a child's study desk. Adjustable seat height helps keep feet supported as the user grows.\n\nDesign and construction\nA breathable mesh surface and durable five-point base suit everyday desk work. Materials: Polyester mesh, Nylon base, Foam seat. The 43 cm wide × 82 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Vacuum the seat and wipe the frame with mild soapy water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A smaller seat suits a child's study desk. Finished in black, with polyester mesh, nylon base.",
      "price": 6999,
      "stock": 48,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids study chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Black"
      ],
      "materials": [
        "Polyester mesh",
        "Nylon base",
        "Foam seat"
      ],
      "style": "modern",
      "dimensions": {
        "width": 43,
        "height": 82,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "kids-chairs",
        "aster",
        "black",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Kids Study Chair in Black",
      "metaDescription": "Aster Kids Study Chair in Black. 43 cm wide × 82 cm high × 45 cm deep. Explore this sample kids chairs listing for furniture catalogue development."
    },
    {
      "name": "Niva Kids Study Chair in Light Grey",
      "slug": "niva-kids-study-chair-in-light-grey",
      "sku": "AUR-DEMO-068-02",
      "categoryKey": "kids-study-chairs",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Study Chairs"
      ],
      "description": "Niva Kids Study Chair in Light Grey brings kids chairs into a coordinated scandinavian interior. A smaller seat suits a child's study desk. Adjustable seat height helps keep feet supported as the user grows.\n\nDesign and construction\nA light grey fabric seat gives the workspace a softer appearance. Materials: Woven fabric, Steel base, Foam seat. The 43 cm wide × 82 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Spot-clean the upholstery and keep castors free of hair and dust.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A smaller seat suits a child's study desk. Finished in light grey, with woven fabric, steel base.",
      "price": 7799,
      "stock": 20,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids study chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Light Grey"
      ],
      "materials": [
        "Woven fabric",
        "Steel base",
        "Foam seat"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 43,
        "height": 82,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "kids-chairs",
        "niva",
        "light-grey",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Kids Study Chair in Light Grey",
      "metaDescription": "Niva Kids Study Chair in Light Grey. 43 cm wide × 82 cm high × 45 cm deep. Explore this sample kids chairs listing for furniture catalogue development."
    },
    {
      "name": "Kanso Kids Study Chair in Graphite",
      "slug": "kanso-kids-study-chair-in-graphite",
      "sku": "AUR-DEMO-068-03",
      "categoryKey": "kids-study-chairs",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Study Chairs"
      ],
      "description": "Kanso Kids Study Chair in Graphite brings kids chairs into a coordinated contemporary interior. A smaller seat suits a child's study desk. Adjustable seat height helps keep feet supported as the user grows.\n\nDesign and construction\nGraphite mesh and shaped foam padding combine a restrained look with adjustable support. Materials: Polyester mesh, Steel base, Moulded foam. The 43 cm wide × 82 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe accessible mechanisms clean and inspect fasteners periodically.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A smaller seat suits a child's study desk. Finished in graphite, with polyester mesh, steel base.",
      "price": 8899,
      "stock": 33,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids study chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Graphite"
      ],
      "materials": [
        "Polyester mesh",
        "Steel base",
        "Moulded foam"
      ],
      "style": "contemporary",
      "dimensions": {
        "width": 43,
        "height": 82,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "kids-chairs",
        "kanso",
        "graphite",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Kids Study Chair in Graphite",
      "metaDescription": "Kanso Kids Study Chair in Graphite. 43 cm wide × 82 cm high × 45 cm deep. Explore this sample kids chairs listing for furniture catalogue development."
    },
    {
      "name": "Aranya Kids Study Chair in Cognac",
      "slug": "aranya-kids-study-chair-in-cognac",
      "sku": "AUR-DEMO-068-04",
      "categoryKey": "kids-study-chairs",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Study Chairs"
      ],
      "description": "Aranya Kids Study Chair in Cognac brings kids chairs into a coordinated classic interior. A smaller seat suits a child's study desk. Adjustable seat height helps keep feet supported as the user grows.\n\nDesign and construction\nCognac upholstery provides a warmer traditional finish without changing the compact office footprint. Materials: PU upholstery, Steel base, Layered foam. The 43 cm wide × 82 cm high × 45 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 6 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe PU surfaces with a soft damp cloth. Avoid alcohol and solvent-based cleaners.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 12-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A smaller seat suits a child's study desk. Finished in cognac, with pu upholstery, steel base.",
      "price": 10299,
      "stock": 46,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids study chair",
          "isPrimary": true
        }
      ],
      "colors": [
        "Cognac"
      ],
      "materials": [
        "PU upholstery",
        "Steel base",
        "Layered foam"
      ],
      "style": "classic",
      "dimensions": {
        "width": 43,
        "height": 82,
        "depth": 45,
        "unit": "cm"
      },
      "weight": {
        "value": 6,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "kids-chairs",
        "aranya",
        "cognac",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Kids Study Chair in Cognac",
      "metaDescription": "Aranya Kids Study Chair in Cognac. 43 cm wide × 82 cm high × 45 cm deep. Explore this sample kids chairs listing for furniture catalogue development."
    },
    {
      "name": "Aster Kids Play Table in Natural Oak",
      "slug": "aster-kids-play-table-in-natural-oak",
      "sku": "AUR-DEMO-069-01",
      "categoryKey": "kids-play-tables",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Play Tables"
      ],
      "description": "Aster Kids Play Table in Natural Oak brings play tables into a coordinated minimal interior. A low tabletop provides a shared activity surface. Rounded corners and an easy-wipe top suit supervised play.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 80 cm wide × 52 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A low tabletop provides a shared activity surface. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 7999,
      "stock": 18,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids play table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 80,
        "height": 52,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "play-tables",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Kids Play Table in Natural Oak",
      "metaDescription": "Aster Kids Play Table in Natural Oak. 80 cm wide × 52 cm high × 60 cm deep. Explore this sample play tables listing for furniture catalogue development."
    },
    {
      "name": "Niva Kids Play Table in Walnut",
      "slug": "niva-kids-play-table-in-walnut",
      "sku": "AUR-DEMO-069-02",
      "categoryKey": "kids-play-tables",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Play Tables"
      ],
      "description": "Niva Kids Play Table in Walnut brings play tables into a coordinated scandinavian interior. A low tabletop provides a shared activity surface. Rounded corners and an easy-wipe top suit supervised play.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 80 cm wide × 52 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A low tabletop provides a shared activity surface. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 8999,
      "stock": 31,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids play table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 80,
        "height": 52,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "play-tables",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Kids Play Table in Walnut",
      "metaDescription": "Niva Kids Play Table in Walnut. 80 cm wide × 52 cm high × 60 cm deep. Explore this sample play tables listing for furniture catalogue development.",
      "originalPrice": 10099
    },
    {
      "name": "Kanso Kids Play Table in Charcoal",
      "slug": "kanso-kids-play-table-in-charcoal",
      "sku": "AUR-DEMO-069-03",
      "categoryKey": "kids-play-tables",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Play Tables"
      ],
      "description": "Kanso Kids Play Table in Charcoal brings play tables into a coordinated industrial interior. A low tabletop provides a shared activity surface. Rounded corners and an easy-wipe top suit supervised play.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 80 cm wide × 52 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A low tabletop provides a shared activity surface. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 10199,
      "stock": 44,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids play table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 80,
        "height": 52,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "play-tables",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Kids Play Table in Charcoal",
      "metaDescription": "Kanso Kids Play Table in Charcoal. 80 cm wide × 52 cm high × 60 cm deep. Explore this sample play tables listing for furniture catalogue development."
    },
    {
      "name": "Aranya Kids Play Table in Honey Brown",
      "slug": "aranya-kids-play-table-in-honey-brown",
      "sku": "AUR-DEMO-069-04",
      "categoryKey": "kids-play-tables",
      "categoryPath": [
        "Kids Room",
        "Study and Play",
        "Kids Play Tables"
      ],
      "description": "Aranya Kids Play Table in Honey Brown brings play tables into a coordinated classic interior. A low tabletop provides a shared activity surface. Rounded corners and an easy-wipe top suit supervised play.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 80 cm wide × 52 cm high × 60 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 10 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A low tabletop provides a shared activity surface. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 11699,
      "stock": 16,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for kids play table",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 80,
        "height": 52,
        "depth": 60,
        "unit": "cm"
      },
      "weight": {
        "value": 10,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "study-and-play",
        "play-tables",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Kids Play Table in Honey Brown",
      "metaDescription": "Aranya Kids Play Table in Honey Brown. 80 cm wide × 52 cm high × 60 cm deep. Explore this sample play tables listing for furniture catalogue development."
    },
    {
      "name": "Aster Toy Storage Organiser in Natural Oak",
      "slug": "aster-toy-storage-organiser-in-natural-oak",
      "sku": "AUR-DEMO-070-01",
      "categoryKey": "toy-storage-organisers",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Toy Storage Organisers"
      ],
      "description": "Aster Toy Storage Organiser in Natural Oak brings toy storage into a coordinated minimal interior. Open compartments make toys visible and easy to return. Fit the anti-tip bracket to a suitable wall before use.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 90 cm wide × 80 cm high × 35 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Open compartments make toys visible and easy to return. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 11999,
      "stock": 29,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for toy storage organiser",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 90,
        "height": 80,
        "depth": 35,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "toy-storage",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Toy Storage Organiser in Natural Oak",
      "metaDescription": "Aster Toy Storage Organiser in Natural Oak. 90 cm wide × 80 cm high × 35 cm deep. Explore this sample toy storage listing for furniture catalogue development."
    },
    {
      "name": "Niva Toy Storage Organiser in Walnut",
      "slug": "niva-toy-storage-organiser-in-walnut",
      "sku": "AUR-DEMO-070-02",
      "categoryKey": "toy-storage-organisers",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Toy Storage Organisers"
      ],
      "description": "Niva Toy Storage Organiser in Walnut brings toy storage into a coordinated scandinavian interior. Open compartments make toys visible and easy to return. Fit the anti-tip bracket to a suitable wall before use.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 90 cm wide × 80 cm high × 35 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Open compartments make toys visible and easy to return. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 13499,
      "stock": 42,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for toy storage organiser",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 90,
        "height": 80,
        "depth": 35,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "toy-storage",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Toy Storage Organiser in Walnut",
      "metaDescription": "Niva Toy Storage Organiser in Walnut. 90 cm wide × 80 cm high × 35 cm deep. Explore this sample toy storage listing for furniture catalogue development."
    },
    {
      "name": "Kanso Toy Storage Organiser in Charcoal",
      "slug": "kanso-toy-storage-organiser-in-charcoal",
      "sku": "AUR-DEMO-070-03",
      "categoryKey": "toy-storage-organisers",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Toy Storage Organisers"
      ],
      "description": "Kanso Toy Storage Organiser in Charcoal brings toy storage into a coordinated industrial interior. Open compartments make toys visible and easy to return. Fit the anti-tip bracket to a suitable wall before use.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 90 cm wide × 80 cm high × 35 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Open compartments make toys visible and easy to return. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 15299,
      "stock": 14,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for toy storage organiser",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 90,
        "height": 80,
        "depth": 35,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "toy-storage",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Toy Storage Organiser in Charcoal",
      "metaDescription": "Kanso Toy Storage Organiser in Charcoal. 90 cm wide × 80 cm high × 35 cm deep. Explore this sample toy storage listing for furniture catalogue development."
    },
    {
      "name": "Aranya Toy Storage Organiser in Honey Brown",
      "slug": "aranya-toy-storage-organiser-in-honey-brown",
      "sku": "AUR-DEMO-070-04",
      "categoryKey": "toy-storage-organisers",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Toy Storage Organisers"
      ],
      "description": "Aranya Toy Storage Organiser in Honey Brown brings toy storage into a coordinated classic interior. Open compartments make toys visible and easy to return. Fit the anti-tip bracket to a suitable wall before use.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 90 cm wide × 80 cm high × 35 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 17 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Open compartments make toys visible and easy to return. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 17699,
      "stock": 27,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for toy storage organiser",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 90,
        "height": 80,
        "depth": 35,
        "unit": "cm"
      },
      "weight": {
        "value": 17,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": true,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "toy-storage",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Toy Storage Organiser in Honey Brown",
      "metaDescription": "Aranya Toy Storage Organiser in Honey Brown. 90 cm wide × 80 cm high × 35 cm deep. Explore this sample toy storage listing for furniture catalogue development."
    },
    {
      "name": "Aster Low Kids Bookcase in Natural Oak",
      "slug": "aster-low-kids-bookcase-in-natural-oak",
      "sku": "AUR-DEMO-071-01",
      "categoryKey": "low-kids-bookcases",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Low Kids Bookcases"
      ],
      "description": "Aster Low Kids Bookcase in Natural Oak brings kids bookcases into a coordinated minimal interior. Low open shelves keep books within easy reach. An anti-tip bracket secures the unit to the wall.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 80 cm wide × 95 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 15 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Low open shelves keep books within easy reach. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 9999,
      "stock": 40,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for low kids bookcase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 80,
        "height": 95,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 15,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "kids-bookcases",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Low Kids Bookcase in Natural Oak",
      "metaDescription": "Aster Low Kids Bookcase in Natural Oak. 80 cm wide × 95 cm high × 30 cm deep. Explore this sample kids bookcases listing for furniture catalogue development.",
      "originalPrice": 11199
    },
    {
      "name": "Niva Low Kids Bookcase in Walnut",
      "slug": "niva-low-kids-bookcase-in-walnut",
      "sku": "AUR-DEMO-071-02",
      "categoryKey": "low-kids-bookcases",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Low Kids Bookcases"
      ],
      "description": "Niva Low Kids Bookcase in Walnut brings kids bookcases into a coordinated scandinavian interior. Low open shelves keep books within easy reach. An anti-tip bracket secures the unit to the wall.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 80 cm wide × 95 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 15 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Low open shelves keep books within easy reach. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 11199,
      "stock": 12,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for low kids bookcase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 80,
        "height": 95,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 15,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "kids-bookcases",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Low Kids Bookcase in Walnut",
      "metaDescription": "Niva Low Kids Bookcase in Walnut. 80 cm wide × 95 cm high × 30 cm deep. Explore this sample kids bookcases listing for furniture catalogue development."
    },
    {
      "name": "Kanso Low Kids Bookcase in Charcoal",
      "slug": "kanso-low-kids-bookcase-in-charcoal",
      "sku": "AUR-DEMO-071-03",
      "categoryKey": "low-kids-bookcases",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Low Kids Bookcases"
      ],
      "description": "Kanso Low Kids Bookcase in Charcoal brings kids bookcases into a coordinated industrial interior. Low open shelves keep books within easy reach. An anti-tip bracket secures the unit to the wall.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 80 cm wide × 95 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 15 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Low open shelves keep books within easy reach. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 12699,
      "stock": 25,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for low kids bookcase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 80,
        "height": 95,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 15,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "kids-bookcases",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Low Kids Bookcase in Charcoal",
      "metaDescription": "Kanso Low Kids Bookcase in Charcoal. 80 cm wide × 95 cm high × 30 cm deep. Explore this sample kids bookcases listing for furniture catalogue development."
    },
    {
      "name": "Aranya Low Kids Bookcase in Honey Brown",
      "slug": "aranya-low-kids-bookcase-in-honey-brown",
      "sku": "AUR-DEMO-071-04",
      "categoryKey": "low-kids-bookcases",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Low Kids Bookcases"
      ],
      "description": "Aranya Low Kids Bookcase in Honey Brown brings kids bookcases into a coordinated classic interior. Low open shelves keep books within easy reach. An anti-tip bracket secures the unit to the wall.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 80 cm wide × 95 cm high × 30 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 15 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "Low open shelves keep books within easy reach. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 14699,
      "stock": 38,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for low kids bookcase",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 80,
        "height": 95,
        "depth": 30,
        "unit": "cm"
      },
      "weight": {
        "value": 15,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "kids-bookcases",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Low Kids Bookcase in Honey Brown",
      "metaDescription": "Aranya Low Kids Bookcase in Honey Brown. 80 cm wide × 95 cm high × 30 cm deep. Explore this sample kids bookcases listing for furniture catalogue development."
    },
    {
      "name": "Aster Two Door Kids Wardrobe in Natural Oak",
      "slug": "aster-two-door-kids-wardrobe-in-natural-oak",
      "sku": "AUR-DEMO-072-01",
      "categoryKey": "two-door-kids-wardrobes",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Two Door Kids Wardrobes"
      ],
      "description": "Aster Two Door Kids Wardrobe in Natural Oak brings kids wardrobes into a coordinated minimal interior. A lower hanging rail and shelves organise smaller clothing. An anti-tip bracket must be fitted before use.\n\nDesign and construction\nFlat-front proportions and a pale oak finish give the piece a restrained appearance. Materials: Oak veneer, Engineered wood. The 90 cm wide × 170 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 49 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust with a soft dry cloth and wipe spills promptly. Avoid abrasive cleaners and standing water.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A lower hanging rail and shelves organise smaller clothing. Finished in natural oak, with oak veneer, engineered wood.",
      "price": 29999,
      "stock": 10,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for two door kids wardrobe",
          "isPrimary": true
        }
      ],
      "colors": [
        "Natural Oak"
      ],
      "materials": [
        "Oak veneer",
        "Engineered wood"
      ],
      "style": "minimal",
      "dimensions": {
        "width": 90,
        "height": 170,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 49,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "kids-wardrobes",
        "aster",
        "natural-oak",
        "demo-catalogue"
      ],
      "metaTitle": "Aster Two Door Kids Wardrobe in Natural Oak",
      "metaDescription": "Aster Two Door Kids Wardrobe in Natural Oak. 90 cm wide × 170 cm high × 50 cm deep. Explore this sample kids wardrobes listing for furniture catalogue development."
    },
    {
      "name": "Niva Two Door Kids Wardrobe in Walnut",
      "slug": "niva-two-door-kids-wardrobe-in-walnut",
      "sku": "AUR-DEMO-072-02",
      "categoryKey": "two-door-kids-wardrobes",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Two Door Kids Wardrobes"
      ],
      "description": "Niva Two Door Kids Wardrobe in Walnut brings kids wardrobes into a coordinated scandinavian interior. A lower hanging rail and shelves organise smaller clothing. An anti-tip bracket must be fitted before use.\n\nDesign and construction\nTapered supports and a warm walnut finish create a lighter Scandinavian-inspired silhouette. Materials: Rubberwood, Walnut veneer. The 90 cm wide × 170 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 49 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Clean with a lightly damp cloth, then dry the surface. Use mats beneath hot or wet objects.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A lower hanging rail and shelves organise smaller clothing. Finished in walnut, with rubberwood, walnut veneer.",
      "price": 33799,
      "stock": 23,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for two door kids wardrobe",
          "isPrimary": true
        }
      ],
      "colors": [
        "Walnut"
      ],
      "materials": [
        "Rubberwood",
        "Walnut veneer"
      ],
      "style": "scandinavian",
      "dimensions": {
        "width": 90,
        "height": 170,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 49,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "kids-wardrobes",
        "niva",
        "walnut",
        "demo-catalogue"
      ],
      "metaTitle": "Niva Two Door Kids Wardrobe in Walnut",
      "metaDescription": "Niva Two Door Kids Wardrobe in Walnut. 90 cm wide × 170 cm high × 50 cm deep. Explore this sample kids wardrobes listing for furniture catalogue development."
    },
    {
      "name": "Kanso Two Door Kids Wardrobe in Charcoal",
      "slug": "kanso-two-door-kids-wardrobe-in-charcoal",
      "sku": "AUR-DEMO-072-03",
      "categoryKey": "two-door-kids-wardrobes",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Two Door Kids Wardrobes"
      ],
      "description": "Kanso Two Door Kids Wardrobe in Charcoal brings kids wardrobes into a coordinated industrial interior. A lower hanging rail and shelves organise smaller clothing. An anti-tip bracket must be fitted before use.\n\nDesign and construction\nA charcoal finish and contrasting steel details introduce an industrial character. Materials: Engineered wood, Powder-coated steel. The 90 cm wide × 170 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 49 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Wipe with a soft cloth. Keep the edges dry and avoid solvent-based cleaning products.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A lower hanging rail and shelves organise smaller clothing. Finished in charcoal, with engineered wood, powder-coated steel.",
      "price": 38299,
      "stock": 36,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for two door kids wardrobe",
          "isPrimary": true
        }
      ],
      "colors": [
        "Charcoal"
      ],
      "materials": [
        "Engineered wood",
        "Powder-coated steel"
      ],
      "style": "industrial",
      "dimensions": {
        "width": 90,
        "height": 170,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 49,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": true,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "kids-wardrobes",
        "kanso",
        "charcoal",
        "demo-catalogue"
      ],
      "metaTitle": "Kanso Two Door Kids Wardrobe in Charcoal",
      "metaDescription": "Kanso Two Door Kids Wardrobe in Charcoal. 90 cm wide × 170 cm high × 50 cm deep. Explore this sample kids wardrobes listing for furniture catalogue development."
    },
    {
      "name": "Aranya Two Door Kids Wardrobe in Honey Brown",
      "slug": "aranya-two-door-kids-wardrobe-in-honey-brown",
      "sku": "AUR-DEMO-072-04",
      "categoryKey": "two-door-kids-wardrobes",
      "categoryPath": [
        "Kids Room",
        "Kids Storage",
        "Two Door Kids Wardrobes"
      ],
      "description": "Aranya Two Door Kids Wardrobe in Honey Brown brings kids wardrobes into a coordinated classic interior. A lower hanging rail and shelves organise smaller clothing. An anti-tip bracket must be fitted before use.\n\nDesign and construction\nVisible timber grain and a honey finish emphasise the natural character of the sheesham construction. Materials: Solid sheesham wood, Clear protective finish. The 90 cm wide × 170 cm high × 50 cm deep footprint helps you plan circulation and placement before ordering. Approximate product weight is 49 kg.\n\nWhat to check before purchase\nMeasure doorways, lifts and stair turns as well as the final placement area. Sizes describe the assembled item and may vary slightly between production batches. Screen colours and natural material grain can differ from the finished item.\n\nAssembly and care\nBasic self-assembly; fixings and an illustrated guide are included. Dust regularly, protect from prolonged direct sun and use coasters on finished surfaces.\n\nDelivery and support\nEstimated lead time: 5–10 working days within Kathmandu Valley; delivery outside the valley is quoted separately. Warranty: 24-month manufacturing-defect coverage; accidental damage, misuse and normal wear are excluded. Decorative accessories in the reference photograph are not included.",
      "shortDescription": "A lower hanging rail and shelves organise smaller clothing. Finished in honey brown, with solid sheesham wood, clear protective finish.",
      "price": 44299,
      "stock": 8,
      "status": "active",
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          "alt": "Kids Room interior reference for two door kids wardrobe",
          "isPrimary": true
        }
      ],
      "colors": [
        "Honey Brown"
      ],
      "materials": [
        "Solid sheesham wood",
        "Clear protective finish"
      ],
      "style": "classic",
      "dimensions": {
        "width": 90,
        "height": 170,
        "depth": 50,
        "unit": "cm"
      },
      "weight": {
        "value": 49,
        "unit": "kg"
      },
      "rating": {
        "average": 0,
        "count": 0
      },
      "isFeatured": false,
      "isNewArrival": false,
      "arAvailable": false,
      "modelFiles": [],
      "tags": [
        "kids-room",
        "kids-storage",
        "kids-wardrobes",
        "aranya",
        "honey-brown",
        "demo-catalogue"
      ],
      "metaTitle": "Aranya Two Door Kids Wardrobe in Honey Brown",
      "metaDescription": "Aranya Two Door Kids Wardrobe in Honey Brown. 90 cm wide × 170 cm high × 50 cm deep. Explore this sample kids wardrobes listing for furniture catalogue development.",
      "originalPrice": 49699
    }
  ]
};

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function configurationError(message) {
  const error = new Error(message);
  error.code = "SEED_CONFIGURATION";
  return error;
}

function validateCatalogue(catalogue = data) {
  const keys = new Map();
  const names = new Set();
  for (const category of catalogue.categories) {
    if (!category.key || keys.has(category.key) || names.has(category.name)) throw configurationError("Category keys and names must be unique");
    if (category.name.length > 100 || category.description.length > 500 || category.slug !== slugify(category.name)) throw configurationError("Invalid category metadata");
    if (category.parentKey && !keys.has(category.parentKey)) throw configurationError("Category parents must precede their children");
    if (category.parentKey && category.depth !== keys.get(category.parentKey).depth + 1) throw configurationError("Invalid category depth");
    keys.set(category.key, category); names.add(category.name);
  }
  const skus = new Set();
  const productNames = new Set();
  const slugs = new Set();
  const used = new Map();
  const parents = new Set(catalogue.categories.map((category) => category.parentKey).filter(Boolean));
  const styles = new Set(["modern", "contemporary", "classic", "minimal", "cozy", "industrial", "scandinavian", "bohemian"]);
  for (const product of catalogue.products) {
    if (!product.sku.startsWith("AUR-DEMO-") || skus.has(product.sku) || productNames.has(product.name) || slugs.has(product.slug)) throw configurationError("Product identifiers must be unique demo identifiers");
    if (!keys.has(product.categoryKey) || parents.has(product.categoryKey)) throw configurationError("Products must belong to a leaf category");
    if (product.name.length > 200 || product.description.length < 500 || product.description.length > 5000 || product.shortDescription.length > 500 || product.metaTitle.length > 100 || product.metaDescription.length > 300) throw configurationError("Product text exceeds schema limits");
    if (!Number.isFinite(product.price) || product.price < 0 || !Number.isSafeInteger(product.stock) || product.stock < 0 || (product.originalPrice != null && product.originalPrice < product.price)) throw configurationError("Invalid product price or stock");
    if (!styles.has(product.style) || (product.stock === 0) !== (product.status === "out_of_stock")) throw configurationError("Invalid product style or stock status");
    if (![product.dimensions.width, product.dimensions.height, product.dimensions.depth, product.weight.value].every((value) => Number.isFinite(value) && value > 0)) throw configurationError("Invalid product measurements");
    if (product.images.filter((image) => image.isPrimary).length !== 1 || product.images.some((image) => !image.url.startsWith("https://images.unsplash.com/"))) throw configurationError("Invalid reference images");
    if (product.arAvailable || product.modelFiles.length || product.rating.count || product.rating.average) throw configurationError("Do not fabricate AR assets or customer reviews");
    skus.add(product.sku); productNames.add(product.name); slugs.add(product.slug);
    used.set(product.categoryKey, (used.get(product.categoryKey) || 0) + 1);
  }
  for (const category of catalogue.categories) if (!parents.has(category.key) && !used.has(category.key)) throw configurationError("Every leaf must contain products");
  return {
    currency: catalogue.currency,
    mainCategories: catalogue.categories.filter((category) => category.depth === 0).length,
    subcategories: catalogue.categories.filter((category) => category.depth === 1).length,
    deepCategories: catalogue.categories.filter((category) => category.depth >= 2).length,
    byDepth: catalogue.categories.reduce((acc, category) => { acc[category.depth] = (acc[category.depth] || 0) + 1; return acc; }, {}),
    maxDepth: catalogue.categories.reduce((max, category) => Math.max(max, category.depth), 0),
    categories: catalogue.categories.length,
    products: catalogue.products.length,
    outOfStock: catalogue.products.filter((product) => product.stock === 0).length,
  };
}

// Multi-depth v2: product type per depth-2 leaf slug, set only where
// the registry (config/catalogRegistryData.js) has exactly one
// matching kind. null = deliberately untyped (no registry kind, or
// the kind would be a guess — lighting/decor stay untyped per the
// open Phase 1 D-3 decision). An explicit entry, including null,
// wins over the type inherited from an ancestor category, so e.g.
// headboards never inherit "mattress" from Sleep Essentials.
const DEEP_LEAF_TYPES = {
  "two-seater-sofas": "sofa",
  "three-seater-sofas": "sofa",
  "corner-sofas": "sofa",
  "lounge-chairs": "chair",
  "armchairs": "chair",
  "manual-recliners": "chair",
  "coffee-tables": "coffee-table",
  "side-tables": "side-table",
  "living-room-consoles": "console-table",
  "queen-bed-frames": "bed",
  "king-bed-frames": "bed",
  "queen-storage-beds": "bed",
  "three-door-wardrobes": "wardrobe",
  "six-drawer-dressers": "dresser",
  "two-drawer-nightstands": null,
  "queen-pocket-spring-mattresses": "mattress",
  "queen-upholstered-headboards": null,
  "upholstered-bedroom-benches": "bench",
  "four-seater-dining-tables": "dining-table",
  "six-seater-dining-tables": "dining-table",
  "eight-seater-dining-tables": "dining-table",
  "upholstered-dining-chairs": "chair",
  "dining-benches": "bench",
  "counter-height-stools": "bar-stool",
  "three-door-sideboards": "sideboard",
  "glass-front-crockery-cabinets": "cabinet",
  "two-tier-bar-trolleys": null,
  "writing-desks": "desk",
  "computer-desks": "desk",
  "electric-standing-desks": "desk",
  "ergonomic-mesh-chairs": "office_chair",
  "compact-task-chairs": "office_chair",
  "high-back-office-chairs": "office_chair",
  "five-shelf-bookcases": "shelving",
  "two-drawer-filing-cabinets": "cabinet",
  "three-drawer-desk-pedestals": null,
  "patio-lounge-chairs": "outdoor_seating",
  "outdoor-two-seater-sofas": "outdoor_seating",
  "freestanding-hanging-chairs": "outdoor_seating",
  "round-bistro-tables": "outdoor-table",
  "patio-dining-tables": "outdoor-table",
  "folding-balcony-tables": "outdoor-table",
  "adjustable-sun-loungers": "outdoor_seating",
  "two-seater-garden-benches": "outdoor_seating",
  "three-tier-planter-stands": null,
  "single-pendant-lights": null,
  "six-arm-chandeliers": null,
  "flush-ceiling-lights": null,
  "adjustable-floor-lamps": null,
  "bedside-table-lamps": null,
  "adjustable-desk-lamps": null,
  "wall-sconces": null,
  "adjustable-picture-lights": null,
  "swing-arm-wall-lights": null,
  "round-wall-mirrors": null,
  "framed-abstract-prints": null,
  "floating-wall-shelf-sets": null,
  "ceramic-vases": null,
  "abstract-table-sculptures": null,
  "decorative-serving-trays": null,
  "woven-area-rugs": null,
  "cushion-cover-sets": null,
  "textured-sofa-throws": null,
  "single-kids-beds": "bed",
  "twin-bunk-beds": "bunk-bed",
  "single-trundle-beds": "bed",
  "kids-study-desks": "desk",
  "kids-study-chairs": "chair",
  "kids-play-tables": "table",
  "toy-storage-organisers": null,
  "low-kids-bookcases": "shelving",
  "two-door-kids-wardrobes": "wardrobe"
};

async function seedCatalogue({ Category, Product, catalogue = data }) {
  validateCatalogue(catalogue);
  // Phase 8 (catalog): the VOCABULARY §3 wiring (config/
  // catalogSeedWiring.js) is applied at write time — the data
  // literal above stays the owner's dataset untouched. productType
  // is set only where §3 pins exactly one kind; roomSlugs only
  // where §3 pins rooms; products inherit their leaf category's
  // pinned rooms. Nothing is invented here: unpinned aspects stay
  // unset (see the wiring module for the flagged rows).
  const { categoryWiring } = require("../config/catalogSeedWiring");
  const slugByKey = new Map(catalogue.categories.map((category) => [category.key, category.slug]));
  // Multi-depth v2: the wiring table is keyed by the department and
  // subcategory slugs. A depth-2 leaf has no row of its own, so its
  // wiring resolves through its nearest wired ancestor — rooms are a
  // department-level pin and carry down the tree; the type falls
  // back the same way unless DEEP_LEAF_TYPES pins the leaf itself.
  const categoryByKey = new Map(catalogue.categories.map((category) => [category.key, category]));
  const wiringFor = (category) => {
    let current = category;
    while (current) {
      const wiring = categoryWiring[current.slug];
      if (wiring) return wiring;
      current = current.parentKey ? categoryByKey.get(current.parentKey) : null;
    }
    return null;
  };
  const categoryIds = new Map();
  const counts = { categoriesCreated: 0, categoriesUpdated: 0, productsCreated: 0, productsUpdated: 0 };
  const wiringCounts = { categoriesTyped: 0, categoriesWithRooms: 0, productsWithRooms: 0 };
  for (const category of catalogue.categories) {
    let document = await Category.findOne({ $or: [{ slug: category.slug }, { name: category.name }] });
    const payload = {
      name: category.name, description: category.description, image: category.image,
      status: category.status, sortOrder: category.sortOrder,
      parent: category.parentKey ? categoryIds.get(category.parentKey) : null,
    };
    const wiring = wiringFor(category);
    // Type resolution (v3, variable depth): the nearest
    // DEEP_LEAF_TYPES entry on this category or any ancestor wins —
    // finish/colour bucket leaves inherit the kind of the type node
    // above them; an explicit null stops the walk (untyped on
    // purpose). Otherwise fall back to the wired ancestor's type.
    let resolvedType;
    let typeCursor = category;
    while (typeCursor) {
      if (Object.prototype.hasOwnProperty.call(DEEP_LEAF_TYPES, typeCursor.slug)) { resolvedType = DEEP_LEAF_TYPES[typeCursor.slug]; break; }
      typeCursor = typeCursor.parentKey ? categoryByKey.get(typeCursor.parentKey) : null;
    }
    const typeToApply = resolvedType !== undefined ? resolvedType : (wiring && wiring.type);
    if (typeToApply) { payload.productType = typeToApply; wiringCounts.categoriesTyped += 1; }
    if (wiring && wiring.roomsPinned && wiring.rooms.length > 0) { payload.roomSlugs = [...wiring.rooms]; wiringCounts.categoriesWithRooms += 1; }
    if (document) {
      Object.assign(document, payload);
      counts.categoriesUpdated += 1;
    } else {
      document = new Category({ ...payload, slug: category.slug });
      counts.categoriesCreated += 1;
    }
    await seedStep(`saving category ${category.key}`, () => document.save());
    categoryIds.set(category.key, document._id);
  }
  for (const product of catalogue.products) {
    const categoryKey = product.categoryKey;
    const fields = { ...product };
    delete fields.categoryKey;
    delete fields.categoryPath;
    let document = await Product.findOne({ sku: product.sku });
    const payload = { ...fields, category: categoryIds.get(categoryKey) };
    const productWiring = wiringFor(categoryByKey.get(categoryKey));
    if (productWiring && productWiring.roomsPinned && productWiring.rooms.length > 0) {
      payload.roomSlugs = [...productWiring.rooms];
      wiringCounts.productsWithRooms += 1;
    }
    if (document) {
      // Preserve a model-generated slug and identity across repeat runs.
      const existingSlug = document.slug;
      Object.assign(document, payload);
      if (existingSlug) document.slug = existingSlug;
      counts.productsUpdated += 1;
    } else {
      document = new Product(payload);
      counts.productsCreated += 1;
    }
    // save(), rather than insertMany(), runs this app's slug and status hooks.
    await seedStep(`saving product ${product.sku}`, () => document.save());
  }
  return { ...validateCatalogue(catalogue), ...counts, wiring: wiringCounts };
}

async function ensureSeedUsers({ User, credentials, customerPassword }) {
  if (typeof customerPassword !== "string" || customerPassword.length < 12) throw configurationError("SEED_CUSTOMER_PASSWORD must contain at least 12 characters");
  let admin = await User.findOne({ email: credentials.email });
  if (!admin) {
    admin = new User({ firstName: "Demo", lastName: "Administrator", email: credentials.email, password: credentials.password, role: "admin", phone: "9800000000", isEmailVerified: true, isActive: true });
    await admin.save();
  }
  const customerEmail = "customer@example.invalid";
  let customer = await User.findOne({ email: customerEmail });
  if (!customer) {
    customer = new User({ firstName: "Demo", lastName: "Customer", email: customerEmail, password: customerPassword, role: "customer", phone: "9800000001", isEmailVerified: true, isActive: true });
    await customer.save();
  }
  return { admin, customer };
}


async function seedStep(stage, operation) {
  try { return await operation(); }
  catch (error) {
    if (error && typeof error === "object" && !error.seedStage) error.seedStage = stage;
    throw error;
  }
}

function formatSeedError(error) {
  const stage = error?.seedStage || "startup";
  const safeCredentialMessages = new Set([
    "A valid ADMIN_EMAIL is required for admin provisioning",
    "ADMIN_PASSWORD must be an explicit strong secret of 16–128 characters, not a placeholder",
  ]);
  let detail;
  if (error?.code === "SEED_CONFIGURATION" || safeCredentialMessages.has(error?.message)) detail = error.message;
  else if (error?.code === 11000) detail = `Duplicate database key. Fields: ${Object.keys(error.keyPattern || {}).filter((key) => /^[a-zA-Z0-9_.-]+$/.test(key)).join(", ") || "not specified"}. Check for conflicting existing records or indexes.`;
  else if (error?.name === "ValidationError") detail = `Schema validation failed. Fields: ${Object.keys(error.errors || {}).filter((key) => /^[a-zA-Z0-9_.-]+$/.test(key)).join(", ") || "not specified"}. No rejected values are printed.`;
  else if (error?.code === 18 || error?.codeName === "AuthenticationFailed") detail = "MongoDB authentication failed. Check the configured database credentials and authSource.";
  else if (error?.code === "MODULE_NOT_FOUND") detail = "A backend module or dependency is missing. Place this file in scripts/seed.js inside the existing backend and install that backend's dependencies.";
  else if (["MongooseServerSelectionError", "MongoServerSelectionError", "MongoNetworkError"].includes(error?.name)) detail = "Cannot reach MongoDB. Check that the database is running and that its host, port, access rules and connection options are correct.";
  else if (error?.name === "TypeError" && error.message === "next is not a function") detail = "A backend model hook called next() without receiving a callback. Check its pre-save middleware against the installed Mongoose version.";
  else if (error?.name === "TypeError") detail = "A required backend function has an incompatible interface. Check that the script is inside the matching backend project and its model/configuration helpers are present.";
  else if (error?.name === "CastError") detail = "A model field could not be converted to its required type. Check category references and existing seed records.";
  else detail = "The operation failed. Check the backend model/configuration used at this stage. Connection strings and rejected values are intentionally omitted.";
  return `Seed failed at [${stage}]: ${detail}`;
}

function checkSeedEnvironment(env) {
  const checks = {
    NODE_ENV: env.NODE_ENV === "development" ? "valid" : "must be development",
    SEED_DEMO_DATA: env.SEED_DEMO_DATA === "true" ? "valid" : "must be true",
    MONGO_URI: typeof env.MONGO_URI === "string" && !!env.MONGO_URI.trim() ? "set" : "missing",
    ADMIN_EMAIL: /^\S+@\S+\.\S+$/.test(env.ADMIN_EMAIL || "") && env.ADMIN_EMAIL.length <= 254 ? "valid format" : "missing or invalid format",
    ADMIN_PASSWORD: typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length >= 16 && env.ADMIN_PASSWORD.length <= 128 && !/^(password|admin|changeme|replace|example)/i.test(env.ADMIN_PASSWORD) ? "valid format" : "missing or invalid; use an explicit 16–128 character secret, not a placeholder",
    SEED_CUSTOMER_PASSWORD: typeof env.SEED_CUSTOMER_PASSWORD === "string" && env.SEED_CUSTOMER_PASSWORD.length >= 12 ? "valid format" : "missing or fewer than 12 characters",
    SEED_MODE: [undefined, "", "upsert", "replace"].includes(env.SEED_MODE) ? "valid" : "must be upsert or replace",
  };
  if (env.SEED_MODE === "replace") checks.ALLOW_DESTRUCTIVE_DEMO_SEED = env.ALLOW_DESTRUCTIVE_DEMO_SEED === "true" ? "explicitly enabled" : "replace mode is blocked";
  return checks;
}

async function runSeeder(options = {}) {
  const env = options.env || process.env;
  const argv = options.argv || process.argv.slice(2);
  const log = options.log || console.log;
  if (argv.includes("--check-env")) {
    const checks = checkSeedEnvironment(env);
    log(JSON.stringify(checks, null, 2));
    return checks;
  }
  const summary = validateCatalogue(data);
  if (argv.includes("--dry-run")) { log(JSON.stringify(summary, null, 2)); return summary; }
  if (env.NODE_ENV !== "development" || env.SEED_DEMO_DATA !== "true") throw configurationError("Seeding requires NODE_ENV=development and SEED_DEMO_DATA=true");
  const mode = env.SEED_MODE || "upsert";
  if (!["upsert", "replace"].includes(mode)) throw configurationError("SEED_MODE must be upsert or replace");
  if (mode === "replace" && env.ALLOW_DESTRUCTIVE_DEMO_SEED !== "true") throw configurationError("Replace mode deletes categories, products and orders; explicit ALLOW_DESTRUCTIVE_DEMO_SEED=true is required");
  if (!env.MONGO_URI) throw configurationError("MONGO_URI must be configured");
  if (!env.SEED_CUSTOMER_PASSWORD || env.SEED_CUSTOMER_PASSWORD.length < 12) throw configurationError("SEED_CUSTOMER_PASSWORD must contain at least 12 characters");
  const credentials = await seedStep("checking administrator credentials", () => options.getAdminCredentials ? options.getAdminCredentials() : require("../utils/adminCredentials").getAdminCredentials());
  const mongoose = await seedStep("loading Mongoose", () => options.mongoose || require("mongoose"));
  const Category = await seedStep("loading category model", () => options.Category || require("../models/category.model"));
  const Product = await seedStep("loading product model", () => options.Product || require("../models/product.model"));
  const User = await seedStep("loading user model", () => options.User || require("../models/user.model"));
  let operationFailed = false;
  try {
    const connectionOptions = { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, socketTimeoutMS: 45000 };
    connectionOptions.dbName = await seedStep("reading database configuration", () => env.MONGO_DB_NAME || require("../config/appConfig").getString("MONGO_DB_NAME"));
    await seedStep("connecting to MongoDB", () => mongoose.connect(env.MONGO_URI, connectionOptions));
    // Ensure unique indexes before seeding stable SKUs and category slugs.
    await seedStep("initializing category indexes", () => Category.init());
    await seedStep("initializing product indexes", () => Product.init());
    await seedStep("initializing user indexes", () => User.init());
    const existing = {
      categories: await seedStep("counting categories", () => Category.countDocuments({})), products: await seedStep("counting products", () => Product.countDocuments({})),
    };
    log(JSON.stringify({ mode, existing, intended: summary }));
    await seedStep("creating or checking seed accounts", () => ensureSeedUsers({ User, credentials, customerPassword: env.SEED_CUSTOMER_PASSWORD }));
    if (mode === "replace") {
      const Order = options.Order || require("../models/order.model");
      await Order.deleteMany({});
      await Product.deleteMany({});
      await Category.deleteMany({});
    }
    // Phase 8 (catalog): ONE canonical seed path. The registries
    // (product types, rooms, collections, attribute definitions)
    // are ensured BEFORE the catalogue that references them —
    // $setOnInsert only, so an existing database's registry edits
    // are never clobbered — and the category ancestry index is
    // rebuilt after the writes (seed writes go through the models
    // directly, not the hierarchy-maintaining controllers).
    const registry = await seedStep("ensuring catalog registry", () => require("../services/catalogBootstrap.service").ensureCatalogRegistry());
    log(JSON.stringify({ registry }));
    const result = await seedStep("writing catalogue", () => seedCatalogue({ Category, Product }));
    await seedStep("rebuilding category ancestors", () => require("../services/categoryHierarchy.service").rebuildAllAncestors());
    log(JSON.stringify({ mode, result }));
    return result;
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try { await seedStep("disconnecting from MongoDB", () => mongoose.disconnect()); }
    catch (error) { if (!operationFailed) throw error; }
  }
}

if (require.main === module) {
  Promise.resolve().then(async () => {
    if (!process.argv.includes("--dry-run")) {
      await seedStep("loading environment configuration", () => require("../config/appConfig").loadEnv());
    }
    return runSeeder();
  }).catch((error) => {
    console.error(formatSeedError(error));
    process.exitCode = 1;
  });
}

module.exports = { runSeeder, data, validateCatalogue, seedCatalogue, ensureSeedUsers, formatSeedError, checkSeedEnvironment };