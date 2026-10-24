// Allowlist HTML sanitizer for article bodies stored from RSS feeds
// and publisher pages (B-22). The previous cleaner was a denylist of
// regexes: it missed entity-encoded and whitespace-obfuscated
// javascript: URLs, MathML/SVG vectors, <object>/<embed>/<base>,
// meta-refresh and several attribute forms - and the result is stored
// and rendered to readers, i.e. a stored-XSS surface.
//
// This sanitizer keeps a small set of article tags and attributes and
// rebuilds them from scratch; everything else is dropped or
// unwrapped. URLs are entity-decoded and stripped of control
// characters before the scheme check, matching how browsers parse
// them.

const DROP_WITH_CONTENTS = new Set([
  "script", "style", "iframe", "object", "form", "noscript",
  "svg", "math", "template", "title", "textarea", "button", "nav",
  "aside", "footer", "header", "select", "frameset", "applet", "xmp",
  "noembed", "noframes",
]);

// Void elements with no contents to swallow: drop the tag alone
// (waiting for a closing tag would eat the rest of the document).
const DROP_TAG_ONLY = new Set(["embed", "input", "link", "meta", "base", "frame"]);

const ALLOWED_TAGS = new Set([
  "p", "a", "img", "ul", "ol", "li", "strong", "em", "b", "i", "u", "s",
  "h2", "h3", "h4", "h5", "h6", "blockquote", "figure", "figcaption",
  "br", "hr", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "span", "div", "pre", "code", "small", "sub", "sup", "caption",
]);

const VOID_TAGS = new Set(["img", "br", "hr"]);

const ALLOWED_ATTRS = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  th: new Set(["colspan", "rowspan"]),
  td: new Set(["colspan", "rowspan"]),
};

// FA-52: out-of-range code points made String.fromCodePoint throw - a
// single crafted &#xFFFFFFFF; in an attribute crashed feed ingestion.
const fromCodePointClamped = (cp, literal) =>
  Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : literal;
const decodeEntities = (value) =>
  String(value)
    .replace(/&#x([0-9a-fA-F]+);?/g, (m, hex) => fromCodePointClamped(parseInt(hex, 16), m))
    .replace(/&#(\d+);?/g, (m, dec) => fromCodePointClamped(parseInt(dec, 10), m))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const escapeAttr = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sanitizeUrl(rawValue, { image = false } = {}) {
  if (typeof rawValue !== "string") return null;
  // Browsers strip ASCII whitespace/control characters from URLs
  // before scheme parsing ("java\tscript:" is a javascript: URL), so
  // do the same before judging the scheme.
  const value = decodeEntities(rawValue).replace(/[\u0000-\u0020\u007f]+/g, "");
  if (/^https?:\/\//i.test(value)) return value;
  if (!image && value.startsWith("#")) return value; // in-page anchor
  return null;
}

function parseAttrs(attrText) {
  const attrs = {};
  const pattern = /([a-zA-Z][a-zA-Z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(attrText)) !== null) {
    const name = match[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function sanitizeArticleHtml(html) {
  const input = String(html || "").replace(/<!--[\s\S]*?-->/g, "");
  const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)/g;
  let out = "";
  let match;
  let dropDepth = 0; // inside a DROP_WITH_CONTENTS element
  let dropTag = null;
  let dropStart = 0;

  while ((match = tagPattern.exec(input)) !== null) {
    const [, closingSlash, rawTag, attrText, text] = match;
    if (text !== undefined) {
      if (!dropDepth) out += text;
      continue;
    }
    const tag = rawTag.toLowerCase();
    const isClosing = closingSlash === "/";

    if (dropDepth) {
      // FA-53 recovery: an unclosed drop element must not swallow the
      // rest of the article - abandon the drop after 100k chars and
      // resume normal (still allowlist-filtered) processing.
      if (match.index - dropStart > 100000) { dropDepth = 0; dropTag = null; }
      else {
        if (tag === dropTag) dropDepth += isClosing ? -1 : 1;
        continue;
      }
    }
    if (DROP_TAG_ONLY.has(tag)) continue;
    if (DROP_WITH_CONTENTS.has(tag)) {
      // FA-53: a self-closing drop tag (<script ... />) opens nothing.
      const selfClosing = /\/\s*$/.test(attrText || "");
      if (!isClosing && !selfClosing) { dropDepth = 1; dropTag = tag; dropStart = match.index; }
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) continue; // unwrap: drop the tag, keep contents
    if (isClosing) {
      if (!VOID_TAGS.has(tag)) out += `</${tag}>`;
      continue;
    }
    let attrOut = "";
    const allowed = ALLOWED_ATTRS[tag];
    if (allowed) {
      const attrs = parseAttrs(attrText || "");
      for (const name of allowed) {
        if (!(name in attrs)) continue;
        if (name === "href") {
          const url = sanitizeUrl(attrs[name]);
          if (url) attrOut += ` href="${escapeAttr(url)}"`;
        } else if (name === "src") {
          const url = sanitizeUrl(attrs[name], { image: true });
          if (url) attrOut += ` src="${escapeAttr(url)}"`;
        } else if (name === "colspan" || name === "rowspan" || name === "width" || name === "height") {
          if (/^\d{1,3}$/.test(attrs[name])) attrOut += ` ${name}="${attrs[name]}"`;
        } else {
          attrOut += ` ${name}="${escapeAttr(decodeEntities(attrs[name]))}"`;
        }
      }
    }
    out += `<${tag}${attrOut}>`;
  }
  return out.trim();
}

module.exports = { sanitizeArticleHtml };
