const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { standardReadLimiter } = require("../middleware/rateLimit.middleware");
const runtimeContext = require("../services/runtimeContext"); // AR-33: explicit registry, not globals

// VULN-005: this router previously had no tier limiter, unlike every
// other router. It is GET-only, so the read tier applies.
router.use(standardReadLimiter);

// System health and monitoring endpoints.
// keep-alive-status exposes internal service state, so it is
// admin-only (C-11). The keep-alive service itself pings /health,
// not this endpoint, so gating it breaks nothing.
router.get("/keep-alive-status", protect, restrictTo("admin"), (req, res) => {
  try {
    if (!runtimeContext.getKeepAliveService()) { // AR-33: registry, not global.keepAliveService
      return res.status(503).json({
        success: false,
        error: "Keep-Alive service not initialized",
      });
    }

    const status = runtimeContext.getKeepAliveService().getStatus();
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("[system:keep-alive-status]", error);
    res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  }
});

module.exports = router;
