const { boundedLimit, boundedPage, literalRegex, escapeRegex } = require("../utils/listQuery");
const Blog = require("../models/blog.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { fetchAllFeeds, getFeedSources, updateFeaturedArticles } = require("../services/rssFeedService");

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

  // Build filter
  const filter = {};

  if (category && category !== "all") {
    filter.category = category;
  }

  if (tag) {
    filter.tags = { $in: [literalRegex(tag)] };
  }

  if (source) {
    filter["source.name"] = literalRegex(source);
  }

  if (featured === "true") {
    filter.isFeatured = true;
  }

  if (search) {
    filter.$or = [
      { title: literalRegex(search) },
      { excerpt: literalRegex(search) },
      { tags: { $in: [literalRegex(search)] } },
    ];
  }

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-content"), // Exclude full content in list view
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

  // Increment views (don't await to not slow down response)
  blog.incrementViews().catch(console.error);

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
    "styling": "Styling",
    "sustainability": "Sustainability",
    "small-spaces": "Small Spaces",
    "trends": "Trends",
    "guides": "Guides",
    "news": "News",
    "inspiration": "Inspiration",
  };

  const formattedCategories = categories.map((cat) => ({
    slug: cat._id,
    name: categoryNames[cat._id] || cat._id,
    count: cat.count,
  }));

  // Add total count
  const totalCount = formattedCategories.reduce((sum, cat) => sum + cat.count, 0);

  res.status(200).json({
    status: "success",
    data: {
      categories: [
        { slug: "all", name: "All", count: totalCount },
        ...formattedCategories,
      ],
    },
  });
});

// Get feed sources
exports.getFeedSources = catchAsync(async (req, res, next) => {
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

  res.status(200).json({
    status: "success",
    data: {
      sources: sourcesWithCounts,
    },
  });
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
    .select("-content");

  res.status(200).json({
    status: "success",
    results: relatedBlogs.length,
    data: {
      blogs: relatedBlogs,
    },
  });
});

// Like a blog (simple increment, no user tracking)
exports.likeBlog = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return next(new AppError("Blog post not found", 404));
  }

  blog.likes += 1;
  await blog.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: {
      likes: blog.likes,
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
  const [totalBlogs, totalViews, categoryCounts, sourceCounts] = await Promise.all([
    Blog.countDocuments(),
    Blog.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
    Blog.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    Blog.aggregate([{ $group: { _id: "$source.name", count: { $sum: 1 } } }]),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      totalBlogs,
      totalViews: totalViews[0]?.total || 0,
      categoryCounts,
      sourceCounts,
    },
  });
});
