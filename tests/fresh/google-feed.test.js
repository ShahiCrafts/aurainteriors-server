// @ts-nocheck
/* eslint-disable */
// Pure builder tests for the Merchant Center feed (utils/googleFeed.js).
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildGoogleFeed, stripHtml } = require("../../utils/googleFeed");

const sample = {
  _id: "abc123",
  sku: "AUR-001",
  name: "Kanso Sofa & Chair <Set>",
  description: "<p>A <b>solid</b> sheesham sofa.</p>",
  slug: "kanso-sofa",
  price: 50000,
  originalPrice: 60000,
  stock: 3,
  images: [{ url: "https://res.cloudinary.com/x/sofa.webp" }],
  category: { name: "Sofas" },
};

describe("googleFeed", () => {
  test("emits valid channel + item with NPR prices and sale price", () => {
    const xml = buildGoogleFeed([sample], { now: new Date("2026-11-02T00:00:00Z") });
    assert.match(xml, /<rss version="2.0" xmlns:g=/);
    assert.match(xml, /<g:id>AUR-001<\/g:id>/);
    assert.match(xml, /<g:price>60000.00 NPR<\/g:price>/);
    assert.match(xml, /<g:sale_price>50000.00 NPR<\/g:sale_price>/);
    assert.match(xml, /<g:availability>in_stock<\/g:availability>/);
    assert.match(xml, /aurainteriors\.live\/product\/kanso-sofa/);
  });

  test("escapes XML and strips HTML from descriptions", () => {
    const xml = buildGoogleFeed([sample]);
    assert.match(xml, /Kanso Sofa &amp; Chair &lt;Set&gt;/);
    assert.match(xml, /A solid sheesham sofa\./);
    assert.doesNotMatch(xml, /<b>solid<\/b>/);
    assert.equal(stripHtml("<p>x</p>  y"), "x y");
  });

  test("out-of-stock + no-price products are handled", () => {
    const xml = buildGoogleFeed([
      { ...sample, stock: 0 },
      { _id: "x", name: "No price", slug: "no-price" },
    ]);
    assert.match(xml, /<g:availability>out_of_stock<\/g:availability>/);
    assert.doesNotMatch(xml, /no-price/);
  });
});
