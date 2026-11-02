// Google Merchant Center product feed (RSS 2.0 + Google namespace).
// Pure builder: takes plain product objects, returns XML text. The
// controller (controllers/feed.controller.js) supplies live products.
// Feed URL once deployed: GET /api/v1/feeds/google.xml
//
// NOTE: Merchant Center free-listing eligibility for Nepal could not be
// confirmed from public sources (2026-11-02 research) — the account
// owner must verify it inside Merchant Center. The feed is correct and
// harmless either way; product structured data on the PDPs carries the
// same facts for Google Search regardless.
const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripHtml = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `${n.toFixed(2)} NPR` : null;
};

function productItem(product, siteUrl) {
  const price = money(product.priceFrom ?? product.price);
  if (!price || !product.slug || !product.name) return null;
  const salePrice =
    Number(product.originalPrice) > Number(product.priceFrom ?? product.price)
      ? money(product.price)
      : null;
  const image = (product.images || [])
    .map((img) => (typeof img === "string" ? { url: img } : img))
    .find((img) => img && img.url);
  const lines = [
    `    <g:id>${xmlEscape(product.sku || String(product._id))}</g:id>`,
    `    <title>${xmlEscape(product.name)}</title>`,
    `    <description>${xmlEscape(stripHtml(product.description || product.shortDescription || product.name).slice(0, 5000))}</description>`,
    `    <link>${xmlEscape(`${siteUrl}/product/${product.slug}`)}</link>`,
    image ? `    <g:image_link>${xmlEscape(image.url)}</g:image_link>` : null,
    `    <g:availability>${Number(product.stock) > 0 ? "in_stock" : "out_of_stock"}</g:availability>`,
    `    <g:price>${xmlEscape(salePrice ? money(product.originalPrice) : price)}</g:price>`,
    salePrice ? `    <g:sale_price>${xmlEscape(salePrice)}</g:sale_price>` : null,
    `    <g:brand>Aura Interiors</g:brand>`,
    `    <g:condition>new</g:condition>`,
    product.sku ? `    <g:mpn>${xmlEscape(product.sku)}</g:mpn>` : null,
    `    <g:identifier_exists>${product.sku ? "yes" : "no"}</g:identifier_exists>`,
    product.category?.name
      ? `    <g:product_type>${xmlEscape(product.category.name)}</g:product_type>`
      : null,
  ].filter(Boolean);
  return `  <item>\n${lines.join("\n")}\n  </item>`;
}

function buildGoogleFeed(products, { siteUrl = "https://aurainteriors.live", now = new Date() } = {}) {
  const items = (products || [])
    .map((p) => productItem(p, siteUrl))
    .filter(Boolean);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Aura Interiors – Products</title>
  <link>${xmlEscape(siteUrl)}</link>
  <description>Furniture and home décor from Aura Interiors, Lalitpur, Nepal.</description>
  <lastBuildDate>${now.toUTCString()}</lastBuildDate>
${items.join("\n")}
</channel>
</rss>
`;
}

module.exports = { buildGoogleFeed, xmlEscape, stripHtml };
