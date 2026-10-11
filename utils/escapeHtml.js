const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeUrl = value => {
  try { const url = new URL(String(value)); return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : ""; }
  catch (_error) { return ""; }
};
const escapeEmailData = value => {
  if (value?.toObject) value = value.toObject();
  if (value instanceof Date || value == null || typeof value !== "object") return typeof value === "string" ? escapeHtml(value) : value;
  if (Array.isArray(value)) return value.map(escapeEmailData);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    typeof item === "string" && ["image", "imageUrl", "url"].includes(key) ? safeUrl(item) : escapeEmailData(item)]));
};
module.exports = { escapeHtml, safeUrl, escapeEmailData };
