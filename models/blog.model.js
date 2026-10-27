const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [1000, "Excerpt cannot exceed 1000 characters"],
    },
    content: {
      type: String,
    },
    featuredImage: {
      type: String,
    },
    category: {
      type: String,
      enum: [
        "design-tips",
        "styling",
        "sustainability",
        "small-spaces",
        "trends",
        "guides",
        "news",
        "inspiration",
      ],
      default: "inspiration",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    // RSS Feed source information
    source: {
      name: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      feedUrl: {
        type: String,
      },
      logo: {
        type: String,
      },
    },
    // Original article link
    originalUrl: {
      type: String,
      required: true,
      unique: true,
    },
    // Author from RSS feed
    author: {
      name: {
        type: String,
        default: "Editorial Team",
      },
      avatar: {
        type: String,
      },
    },
    readTime: {
      type: Number,
      default: 5,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
blogSchema.index({ category: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ isFeatured: 1, publishedAt: -1 });
blogSchema.index({ "source.name": 1 });
blogSchema.index({ tags: 1 });
// AR-28: scoped text index (was { "$**": "text" } — a wildcard over
// every string field incl. full article HTML). Only the fields blog
// search reads are indexed. Production keeps its existing wildcard
// index until the owner runs MIGRATIONS.md M-4 (never auto-run).
blogSchema.index(
  { title: "text", excerpt: "text", tags: "text" },
  { name: "blog_search_text", weights: { title: 10, excerpt: 5, tags: 3 } }
);

// Generate slug from title
blogSchema.pre("save", function () {
  if (this.isModified("title") || !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 100);

    // Add timestamp to ensure uniqueness
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  // Calculate read time based on content length (avg 200 words per minute)
  if (this.isModified("content") && this.content) {
    const wordCount = this.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }
});

// Virtual for formatted category name
blogSchema.virtual("categoryName").get(function () {
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
  return categoryNames[this.category] || this.category;
});

// Static method to get popular blogs
// AR-47: lean. PERF-B-08 (remediation): getPopular now also selects
// -content like the blog LIST — the popular-blogs widget never
// renders the body. This supersedes the AR-47 "pending client
// decision" note: the remediation tasking directs the change, and
// tests/perf/blog-model-scope.test.js pins the new shape.
blogSchema.statics.getPopular = async function (limit = 5) {
  return this.find()
    .sort({ views: -1, likes: -1, publishedAt: -1 })
    .limit(limit)
    // PERF-B-08: the popular-blogs widget never renders the body;
    // stop transferring full article content for it.
    .select("-content")
    .lean();
};

// Static method to get featured blogs
blogSchema.statics.getFeatured = async function (limit = 3) {
  return this.find({ isFeatured: true }).sort({ publishedAt: -1 }).limit(limit).lean();
};

// Instance method to increment views
blogSchema.methods.incrementViews = async function () {
  // Atomic increment (B-28): the read-modify-write save() lost
  // concurrent view counts and could clobber unrelated edits.
  return this.updateOne({ $inc: { views: 1 } });
};

const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;
