const { boundedLimit, boundedPage, safeSort } = require("../utils/listQuery");
const { escapeRegExp, literalRegExp } = require("../utils/escapeRegex");
const Blog = require("../models/blog.model");
const BlogEngagement = require("../models/blogEngagement.model");
const { actorFor } = require("../utils/anonActor");
const { asString, asEnum } = require("../utils/params");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const {
  fetchAllFeeds,
  getFeedSources,
  updateFeaturedArticles,
} = require("../services/rssFeedService");
const { getCached, setCached } = require("../utils/ttlCache");
const blogCacheKey = (name, req) =>
  `blog:${name}:${JSON.stringify(req.query || {})}`;

// Get all blogs with pagination and filtering
exports.getAllBlogs = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    category,
    tag,
    search,
    source,
    featured,
    sort = "-publishedAt",
  } = req.query;

  const pageNum = boundedPage(page);
  const limitNum = boundedLimit(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  const categoryValue = asEnum(category, [
    "design-tips",
    "styling",
    "sustainability",
    "small-spaces",
    "trends",
    "guides",
    "news",
    "inspiration",
  ]);
  if (categoryValue && category !== "all") {
    filter.category = categoryValue;
  }

  const tagValue = asString(tag, 50);
  if (tagValue) {
    filter.tags = { $in: [new RegExp(`^${escapeRegExp(tagValue)}$`, "i")] };
  }

  const sourceValue = asString(source, 100);
  if (sourceValue) {
    filter["source.name"] = literalRegExp(sourceValue);
  }

  if (featured === "true") {
    filter.isFeatured = true;
  }

  const searchValue = asString(search, 200);
  const textMode =
    require("../config/appConfig").getString("BLOG_SEARCH_MODE") === "text" &&
    !!searchValue;
  if (search) {
    if (textMode) {
      filter.$text = { $search: searchValue };
    } else {
      filter.$or = [
        { title: literalRegExp(search) },
        { excerpt: literalRegExp(search) },
        { tags: { $in: [literalRegExp(search)] } },
      ];
    }
  }

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .sort(
        textMode && req.query.sort === undefined
          ? { score: { $meta: "textScore" } }
          : safeSort(
              sort,
              ["createdAt", "publishedAt", "title", "views", "likes"],
              "-publishedAt",
            ),
      )
      .skip(skip)
      .limit(limitNum)
      .select("-content") // Exclude full content in list view
      .lean(),
    Blog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: blogs.length,
    data: {
      blogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// Get single blog by ID or slug
exports.getBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if it's an ObjectId or slug
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id } : { slug: id };

  const blog = await Blog.findOne(query);

  if (!blog) {
    return next(new AppError("Blog post not found", 404));
  }

  const viewActor = actorFor(req, res);
  (async () => {
    try {
      await BlogEngagement.create({
        blog: blog._id,
        actor: viewActor,
        kind: "view",
      });
      await blog.incrementViews();
    } catch (error) {
      if (error?.code !== 11000) console.error(error);
    }
  })();

  res.status(200).json({
    status: "success",
    data: {
      blog,
    },
  });
});

// Get popular blogs
exports.getPopularBlogs = catchAsync(async (req, res, next) => {
  const { limit = 5 } = req.query;

  const blogs = await Blog.getPopular(boundedLimit(limit));

  res.status(200).json({
    status: "success",
    results: blogs.length,
    data: {
      blogs,
    },
  });
});

// Get featured blogs
exports.getFeaturedBlogs = catchAsync(async (req, res, next) => {
  const { limit = 3 } = req.query;

  const blogs = await Blog.getFeatured(boundedLimit(limit));

  res.status(200).json({
    status: "success",
    results: blogs.length,
    data: {
      blogs,
    },
  });
});

// Get blog categories with counts
exports.getBlogCategories = catchAsync(async (req, res, next) => {
  const hit = getCached(blogCacheKey("categories", req));
  if (hit !== undefined) return res.status(200).json(hit);
  const categories = await Blog.aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const categoryNames = {
    "design-tips": "Design Tips",
    styling: "Styling",
    sustainability: "Sustainability",
    "small-spaces": "Small Spaces",
    trends: "Trends",
    guides: "Guides",
    news: "News",
    inspiration: "Inspiration",
  };

  const formattedCategories = categories.map((cat) => ({
    slug: cat._id,
    name: categoryNames[cat._id] || cat._id,
    count: cat.count,
  }));

  // Add total count
  const totalCount = formattedCategories.reduce(
    (sum, cat) => sum + cat.count,
    0,
  );

  const body = {
    status: "success",
    data: {
      categories: [
        { slug: "all", name: "All", count: totalCount },
        ...formattedCategories,
      ],
    },
  };
  setCached(blogCacheKey("categories", req), body);
  res.status(200).json(body);
});

// Get feed sources
exports.getFeedSources = catchAsync(async (req, res, next) => {
  const hit = getCached(blogCacheKey("sources", req));
  if (hit !== undefined) return res.status(200).json(hit);
  const sources = getFeedSources();

  // Get article counts per source
  const sourceCounts = await Blog.aggregate([
    {
      $group: {
        _id: "$source.name",
        count: { $sum: 1 },
      },
    },
  ]);

  const countsMap = sourceCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const sourcesWithCounts = sources.map((source) => ({
    ...source,
    articleCount: countsMap[source.name] || 0,
  }));

  const body = {
    status: "success",
    data: {
      sources: sourcesWithCounts,
    },
  };
  setCached(blogCacheKey("sources", req), body);
  res.status(200).json(body);
});

// Get related blogs
exports.getRelatedBlogs = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { limit = 3 } = req.query;

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? { _id: id } : { slug: id };

  const blog = await Blog.findOne(query);
  if (!blog) {
    return next(new AppError("Blog post not found", 404));
  }

  const relatedBlogs = await Blog.find({
    _id: { $ne: blog._id },
    $or: [
      { category: blog.category },
      { tags: { $in: blog.tags } },
      { "source.name": blog.source.name },
    ],
  })
    .sort({ publishedAt: -1 })
    .limit(boundedLimit(limit))
    .select("-content")
    .lean();

  res.status(200).json({
    status: "success",
    results: relatedBlogs.length,
    data: {
      blogs: relatedBlogs,
    },
  });
});

exports.likeBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const blog = await Blog.findOne(isObjectId ? { _id: id } : { slug: id });

  if (!blog) {
    return next(new AppError("Blog post not found", 404));
  }

  const actor = actorFor(req, res);
  let inserted = false;
  try {
    await BlogEngagement.create({ blog: blog._id, actor, kind: "like" });
    inserted = true;
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  const updated = inserted
    ? await Blog.findByIdAndUpdate(
        blog._id,
        { $inc: { likes: 1 } },
        { returnDocument: "after", runValidators: false },
      )
    : blog;

  res.status(200).json({
    status: "success",
    data: {
      likes: updated.likes,
    },
  });
});

// Refresh feeds (admin only - triggered manually or by cron)
exports.refreshFeeds = catchAsync(async (req, res, next) => {
  const result = await fetchAllFeeds();

  // Update featured articles
  await updateFeaturedArticles(5);

  res.status(200).json({
    status: "success",
    message: `Feed refresh complete. Added ${result.newArticles} new articles.`,
    data: result,
  });
});

// Get blog stats
exports.getBlogStats = catchAsync(async (req, res, next) => {
  const hit = getCached(blogCacheKey("stats", req));
  if (hit !== undefined) return res.status(200).json(hit);
  const [totalBlogs, totalViews, categoryCounts, sourceCounts] =
    await Promise.all([
      Blog.countDocuments(),
      Blog.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
      Blog.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
      Blog.aggregate([{ $group: { _id: "$source.name", count: { $sum: 1 } } }]),
    ]);

  const body = {
    status: "success",
    data: {
      totalBlogs,
      totalViews: totalViews[0]?.total || 0,
      categoryCounts,
      sourceCounts,
    },
  };
  setCached(blogCacheKey("stats", req), body);
  res.status(200).json(body);
});
