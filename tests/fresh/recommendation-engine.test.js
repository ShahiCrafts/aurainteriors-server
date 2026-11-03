"use strict";

// Recommendation Engine (utils/recommendationEngine.js): weighted,
// explainable scoring for GET /products/:id/related. Pure-function
// tests — no DB, no server boot.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  WEIGHTS,
  scoreCandidate,
  rankRecommendations,
  splitRecommendations,
  isEligible,
} = require(path.join(__dirname, "../../utils/recommendationEngine.js"));

const source = {
  _id: "src",
  price: 44299,
  category: "cat-wardrobe",
  productType: "wardrobe",
  style: "industrial",
  roomSlugs: ["kids-room"],
  collectionSlugs: ["kanso"],
  tags: ["kids", "storage"],
  materials: ["engineered wood"],
  colors: ["charcoal"],
  rating: { average: 4.5, count: 20 },
};

const twin = {
  _id: "twin",
  price: 46000,
  category: "cat-wardrobe",
  productType: "wardrobe",
  style: "industrial",
  roomSlugs: ["kids-room"],
  collectionSlugs: ["kanso"],
  tags: ["kids", "storage"],
  materials: ["engineered wood"],
  colors: ["charcoal"],
  rating: { average: 4.8, count: 40 },
  stock: 5,
  status: "active",
};

test("category is the single strongest signal", () => {
  assert.equal(scoreCandidate(source, twin).breakdown.category, WEIGHTS.category);
  const cross = { ...twin, _id: "x", category: "cat-other" };
  assert.equal(scoreCandidate(source, cross).breakdown.category, 0);
});

test("populated and raw category shapes both match", () => {
  const populated = {
    ...twin,
    _id: "pop",
    category: { _id: "cat-wardrobe", slug: "kids-wardrobes" },
  };
  const populatedSource = {
    ...source,
    category: { _id: "cat-wardrobe", slug: "kids-wardrobes" },
  };
  assert.equal(scoreCandidate(populatedSource, populated).breakdown.category, WEIGHTS.category);
});

test("ranking orders twin > complement > unrelated and dedupes/excludes", () => {
  const complement = {
    _id: "comp", price: 18000, category: "cat-desk", style: "industrial",
    roomSlugs: ["kids-room"], tags: ["kids"], rating: { average: 4.2, count: 9 },
    stock: 3, status: "active",
  };
  const unrelated = {
    _id: "unrel", price: 90000, category: "cat-outdoor", style: "bohemian",
    roomSlugs: ["garden"], tags: ["outdoor"], rating: { average: 3.5, count: 2 },
    stock: 2, status: "active",
  };
  const ranked = rankRecommendations(source, [unrelated, source, twin, twin, complement]);
  assert.deepEqual(ranked.map((r) => r.product._id), ["twin", "comp", "unrel"]);
  const { similar, complements } = splitRecommendations(ranked);
  assert.deepEqual(similar.map((r) => r.product._id), ["twin"]);
  assert.deepEqual(complements.map((r) => r.product._id), ["comp"]);
});

test("out-of-stock, deleted and inactive candidates are ineligible", () => {
  assert.equal(isEligible(source, { ...twin, _id: "a", stock: 0 }), false);
  assert.equal(isEligible(source, { ...twin, _id: "b", deletedAt: new Date() }), false);
  assert.equal(isEligible(source, { ...twin, _id: "c", status: "inactive" }), false);
  // Variant products carry stock on variants, not the parent row.
  assert.equal(isEligible(source, { ...twin, _id: "d", stock: 0, hasVariants: true }), true);
});

test("every scored pick carries at most 3 human reasons", () => {
  const { reasons } = scoreCandidate(source, twin);
  assert.ok(reasons.length >= 1 && reasons.length <= 3);
  assert.ok(reasons.includes("Same category"));
});
