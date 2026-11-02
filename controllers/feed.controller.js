const Product = require("../models/product.model");
const { buildGoogleFeed } = require("../utils/googleFeed");

// GET /api/v1/feeds/google.xml – public Merchant Center feed of active
// products. Cached briefly at the edge via Cache-Control.
exports.googleFeed = async (req, res, next) => {
  try {
    const products = await Product.find({ status: "active" })
      .select("name slug description shortDescription price priceFrom originalPrice stock sku images category status")
      .populate("category", "name slug")
      .lean();
    const siteUrl = process.env.SITE_URL || "https://aurainteriors.live";
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(buildGoogleFeed(products, { siteUrl }));
  } catch (error) {
    next(error);
  }
};
