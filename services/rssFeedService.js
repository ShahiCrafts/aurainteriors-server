const Parser = require("rss-parser");
const Blog = require("../models/blog.model");
const axios = require("axios");

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; AuraInteriors/1.0)",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["enclosure", "enclosure"],
      ["content:encoded", "contentEncoded"],
      ["dc:creator", "creator"],
    ],
  },
});

// Interior design RSS feeds
const RSS_FEEDS = [
  {
    name: "Dezeen",
    url: "https://www.dezeen.com",
    feedUrl: "https://www.dezeen.com/interiors/feed/",
    logo: "https://static.dezeen.com/uploads/2020/07/dezeen-logo-1.png",
    category: "inspiration",
  },
  {
    name: "Architectural Digest",
    url: "https://www.architecturaldigest.com",
    feedUrl: "https://www.architecturaldigest.com/feed/rss",
    logo: "https://www.architecturaldigest.com/verso/static/ad/assets/logo.svg",
    category: "design-tips",
  },
  {
    name: "Design Milk",
    url: "https://design-milk.com",
    feedUrl: "https://design-milk.com/feed/",
    logo: "https://design-milk.com/images/design-milk-logo.svg",
    category: "trends",
  },
  {
    name: "Apartment Therapy",
    url: "https://www.apartmenttherapy.com",
    feedUrl: "https://www.apartmenttherapy.com/main.rss",
    logo: "https://www.apartmenttherapy.com/static/images/at-logo.svg",
    category: "small-spaces",
  },
  {
    name: "Freshome",
    url: "https://freshome.com",
    feedUrl: "https://freshome.com/feed/",
    logo: "https://freshome.com/wp-content/uploads/2019/05/freshome-logo.png",
    category: "inspiration",
  },
  {
    name: "Dwell",
    url: "https://www.dwell.com",
    feedUrl: "https://www.dwell.com/feed",
    logo: "https://www.dwell.com/assets/dwell-logo.svg",
    category: "styling",
  },
  {
    name: "Interior Design Magazine",
    url: "https://www.interiordesign.net",
    feedUrl: "https://www.interiordesign.net/rss/",
    logo: "https://www.interiordesign.net/images/id-logo.svg",
    category: "news",
  },
  {
    name: "Houzz",
    url: "https://www.houzz.com",
    feedUrl: "https://www.houzz.com/ideabooks/rss/",
    logo: "https://st.hzcdn.com/static/images/logo/hz-logo.svg",
    category: "guides",
  },
];

/**
 * Extract image URL from RSS item
 */
function extractImageUrl(item) {
  // Try various image sources
  if (item.mediaContent?.$ ?.url) {
    return item.mediaContent.$.url;
  }
  if (item.mediaThumbnail?.$ ?.url) {
    return item.mediaThumbnail.$.url;
  }
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image")) {
    return item.enclosure.url;
  }

  // Try to extract from content
  const content = item.contentEncoded || item.content || item.contentSnippet || "";
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) {
    return imgMatch[1];
  }

  // Default placeholder
  return null;
}

/**
 * Extract excerpt from content
 */
function extractExcerpt(item, maxLength = 300) {
  let text = item.contentSnippet || item.description || item.content || "";

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Decode common encoded entities before generating a readable excerpt.
  text = text.replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
  text = text.replace(/\s+/g, " ").replace(/\bREAD MORE(?:\.{2,}|…)?\s*$/i, "").trim();

  // Truncate to max length
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + "...";
  }

  return text;
}

/**
 * Determine category based on content keywords
 */
function determineCategory(item, defaultCategory) {
  const text = `${item.title} ${item.contentSnippet || ""} ${item.categories?.join(" ") || ""}`.toLowerCase();

  if (text.match(/small\s*space|apartment|compact|studio/)) {
    return "small-spaces";
  }
  if (text.match(/sustainable|eco|green|recycl/)) {
    return "sustainability";
  }
  if (text.match(/trend|new|2024|2025|latest/)) {
    return "trends";
  }
  if (text.match(/how\s*to|guide|tips|diy/)) {
    return "guides";
  }
  if (text.match(/style|color|decor|decorat/)) {
    return "styling";
  }
  if (text.match(/design\s*tip|rule|principle/)) {
    return "design-tips";
  }
  if (text.match(/news|announce|launch|open/)) {
    return "news";
  }

  return defaultCategory;
}

/**
 * Extract tags from item
 */
function extractTags(item) {
  const tags = [];

  // Add RSS categories as tags
  if (item.categories) {
    tags.push(...item.categories.slice(0, 5));
  }

  // Extract keywords from title
  const titleWords = item.title
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 4 && !["about", "these", "their", "would", "could", "should"].includes(word))
    .slice(0, 3);

  tags.push(...titleWords);

  // Remove duplicates and limit
  return [...new Set(tags)].slice(0, 8);
}

/** Extract readable article HTML when the publisher provides an accessible article body.
 * The publisher remains the source of record; never bypass paywalls or access controls.
 * This conservative extractor deliberately falls back to RSS for unsupported layouts.
 */
function cleanArticleHtml(html) {
  return String(html || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|iframe|form|nav|aside|footer|header|button|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<([a-z][\w:-]*)\b[^>]*\b(?:class|id)=["'][^"']*(?:newsletter|subscribe|advert|promo|social|related|recommend|signup|paywall)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/\s(on\w+|style|srcdoc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*(?:javascript:|data:)[\s\S]*?\2/gi, "")
    .trim();
}
function readableLength(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().length;
}
async function fetchArticleBody(url, publisherUrl) {
  const target = new URL(url);
  const publisher = new URL(publisherUrl);
  if (target.protocol !== "https:" || target.hostname !== publisher.hostname && !target.hostname.endsWith(`.${publisher.hostname}`)) return "";
  const response = await axios.get(target.href, {
    timeout: 8000, maxRedirects: 0, responseType: "text",
    maxContentLength: 2 * 1024 * 1024,
    headers: { "User-Agent": "AuraInteriorsRSSReader/1.0", Accept: "text/html" },
    validateStatus: status => status === 200,
  });
  if (!String(response.headers["content-type"] || "").includes("text/html")) return "";
  const page = String(response.data || "");
  // Only extract an explicitly identified article body; avoid publishing full page chrome.
  const candidates = [
    /<div\b[^>]*data-testid=["']article-body["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    /<div\b[^>]*class=["'][^"']*(?:article-body|article-content|post-content|entry-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
  ];
  for (const pattern of candidates) {
    const match = page.match(pattern);
    if (!match) continue;
    const cleaned = cleanArticleHtml(match[1]);
    if (readableLength(cleaned) >= 500 && /<p\b/i.test(cleaned)) return cleaned;
  }
  return "";
}

/**
 * Fetch and parse a single RSS feed
 */
async function fetchFeed(feedConfig) {
  try {
    console.log(`Fetching feed: ${feedConfig.name}`);
    const feed = await parser.parseURL(feedConfig.feedUrl);

    const articles = [];

    for (const item of feed.items.slice(0, 10)) {
      // Skip if no title or link
      if (!item.title || !item.link) continue;

      const rssContent = cleanArticleHtml(item.contentEncoded || item["content:encoded"] || item.content || item.description || "");
      let content = rssContent;
      // Feed descriptions are often teasers. Prefer a verified longer publisher body.
      if (readableLength(rssContent) < 1200) {
        try {
          const fullBody = await fetchArticleBody(item.link, feedConfig.url);
          if (readableLength(fullBody) > readableLength(content) * 1.5) content = fullBody;
        } catch (error) {
          console.warn(`Article extraction skipped (${feedConfig.name}): ${error.message}`);
        }
      }
      const article = {
        title: item.title.trim(),
        excerpt: extractExcerpt(item),
        // content:encoded carries the full HTML when the publisher provides it.
        // A summary-only feed must not be presented as a complete scraped article.
        content,
        featuredImage: extractImageUrl(item),
        category: determineCategory(item, feedConfig.category),
        tags: extractTags(item),
        source: {
          name: feedConfig.name,
          url: feedConfig.url,
          feedUrl: feedConfig.feedUrl,
          logo: feedConfig.logo,
        },
        originalUrl: item.link,
        author: {
          name: item.creator || item.author || `${feedConfig.name} Editorial`,
        },
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      };

      articles.push(article);
    }

    return articles;
  } catch (error) {
    console.error(`Error fetching feed ${feedConfig.name}:`, error.message);
    return [];
  }
}

/**
 * Fetch all RSS feeds and save to database
 */
async function fetchAllFeeds() {
  console.log("Starting RSS feed fetch...");

  let totalNew = 0;
  let totalErrors = 0;

  for (const feedConfig of RSS_FEEDS) {
    try {
      const articles = await fetchFeed(feedConfig);

      if (articles.length) {
        const result = await Blog.bulkWrite(articles.map(article => ({
          updateOne: {
            filter: { originalUrl: article.originalUrl },
            update: {
              $setOnInsert: article,
              // Refresh content on ingestion, including previously imported summary-only rows.
              // Never replace a longer existing article with a shorter teaser.
            },
            upsert: true,
          },
        })), { ordered: false });
        totalNew += result.upsertedCount || 0;
        // Conditional upgrades avoid clobbering complete existing content.
        for (const article of articles) {
          if (readableLength(article.content) < 500) continue;
          const current = await Blog.findOne({ originalUrl: article.originalUrl }, { content: 1 }).lean();
          if (current && readableLength(article.content) > readableLength(current.content) * 1.5) {
            await Blog.updateOne({ _id: current._id, content: current.content }, { $set: { content: article.content, excerpt: article.excerpt } });
          }
        }
      }

      // Small delay between feeds to be respectful
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing feed ${feedConfig.name}:`, error.message);
      totalErrors++;
    }
  }

  console.log(`RSS feed fetch complete. New articles: ${totalNew}, Errors: ${totalErrors}`);

  return { newArticles: totalNew, errors: totalErrors };
}

/**
 * Get available feed sources
 */
function getFeedSources() {
  return RSS_FEEDS.map((feed) => ({
    name: feed.name,
    url: feed.url,
    logo: feed.logo,
    category: feed.category,
  }));
}

/**
 * Mark random articles as featured (for variety)
 */
async function updateFeaturedArticles(count = 5) {
  // Unfeature all
  await Blog.updateMany({}, { isFeatured: false });

  // Feature random recent articles
  const recentArticles = await Blog.find({}, { _id: 1 })
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();

  if (recentArticles.length === 0) return;

  // Shuffle and pick
  const shuffled = recentArticles.sort(() => 0.5 - Math.random());
  const featured = shuffled.slice(0, Math.min(count, shuffled.length));

  await Blog.updateMany(
    { _id: { $in: featured.map((article) => article._id) } },
    { $set: { isFeatured: true } },
  );

  console.log(`Updated ${featured.length} featured articles`);
}

module.exports = {
  fetchAllFeeds,
  fetchFeed,
  getFeedSources,
  updateFeaturedArticles,
  RSS_FEEDS,
};
