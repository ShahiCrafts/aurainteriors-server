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
    this.setHeader("Server-Timing", [...req.wishlistTimings,
      `total;dur=${(performance.now() - start).toFixed(1)}`].join(", "));
    return json.call(this, body);
  };
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
