// FA-03 / FA-73 (FRESH): one rule for user- or admin-supplied URLs that
// will be rendered as links: only http/https absolute URLs and
// site-relative paths are allowed. javascript:, data:, vbscript:,
// protocol-relative (//host) and backslash tricks are rejected.
// Joi's .uri() accepts any scheme, which is how javascript: URLs passed
// validation before.
function isSafeUrlValue(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > 2048) return false;
  if (/[\u0000-\u0020\u007f]/.test(v)) return false; // no whitespace/control characters anywhere
  if (/^https?:\/\//i.test(v)) {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }
  // Site-relative: exactly one leading slash (not // or /\), no backslash.
  if (/^\/(?![/\\])/.test(v) && !v.includes("\\")) return true;
  return false;
}

// Sanitize-or-null for stored link fields (notifications, announcements).
function sanitizeActionUrl(value) {
  if (value === null || value === undefined || value === "") return null;
  return isSafeUrlValue(value) ? value : null;
}

// Joi schema fragment with the same rule (keeps each validator's own
// .optional()/.allow() chain intact at the call site).
function joiSafeUrl(Joi, maxLen = 500) {
  return Joi.string()
    .max(maxLen)
    .custom((value, helpers) => {
      return isSafeUrlValue(value) ? value : helpers.error("string.uri");
    })
    .messages({
      "string.uri": "URL must be an http(s) URL or a site-relative path",
    });
}

module.exports = { isSafeUrlValue, sanitizeActionUrl, joiSafeUrl };
