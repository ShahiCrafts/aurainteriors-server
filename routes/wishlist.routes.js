const { performance } = require("node:perf_hooks");
const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlist.controller");
const { protect } = require("../middleware/auth.middleware");

router.use((req, res, next) => {
  const start = performance.now();
  req.wishlistTimings = [];
  const json = res.json;
  res.json = function (body) {
    const timings = [...req.wishlistTimings,
      `total;dur=${(performance.now() - start).toFixed(1)}`].join(", ");
    this.setHeader("Server-Timing", timings);
    this.setHeader("X-Wishlist-Timing", timings);
    this.setHeader("X-Wishlist-Version", "2");
    return json.call(this, body);
  };
  res.once("finish", () => {
    console.info(JSON.stringify({ event: "wishlist_request", method: req.method,
      status: res.statusCode, timings: res.getHeader("X-Wishlist-Timing") ||
        `total;dur=${(performance.now() - start).toFixed(1)}` }));
  });
  req.wishlistAuthStart = start;
  next();
});
router.use(protect);
router.use((req, res, next) => {
  req.wishlistTimings.push(`auth;dur=${(performance.now() - req.wishlistAuthStart).toFixed(1)}`);
  next();
});

router.get("/", wishlistController.getWishlist);
router.post("/", wishlistController.addToWishlist);
router.get("/check/:productId", wishlistController.checkWishlist);
router.delete("/:productId", wishlistController.removeFromWishlist);
router.delete("/", wishlistController.clearWishlist);

module.exports = router;
