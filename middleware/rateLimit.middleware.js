const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// AR-02 (D-A, D1): RATE_LIMIT_STORE=mongo swaps every limiter below
// from the default per-process MemoryStore to the shared MongoDB
// store (middleware/mongoRateLimitStore.js), so limits hold across N
// instances instead of multiplying by N. Read once when this module
// loads, like RATE_LIMIT_WINDOW_MS below. Each limiter gets its OWN
// store instance with a unique prefix: with MemoryStore each limiter
// instance has its own bucket space, and factory limiters must not
// merge buckets across call sites — the prefix preserves that
// isolation exactly. store: undefined leaves the default MemoryStore.
// The store (and its model) are required lazily so the default path
// never touches them.
const RATE_LIMIT_STORE_MONGO =
  (process.env.RATE_LIMIT_STORE || "").trim().toLowerCase() === "mongo";
let rateLimitStoreSeq = 0;
const storeFor = (base) => {
  if (!RATE_LIMIT_STORE_MONGO) return undefined;
  const MongoRateLimitStore = require("./mongoRateLimitStore");
  return new MongoRateLimitStore(`${base}-${++rateLimitStoreSeq}`);
};

/**
 * Rate limiting middleware for chat endpoints
 * Differentiates between authenticated and guest requests:
 * - Authenticated users: Higher limit per userId (100 requests / 15 minutes)
 * - Guest users: Lower limit per IP (30 requests / 15 minutes)
 */

// Key generator: uses userId for authenticated requests, IP for guests
// Note: This runs AFTER protectOptional, so req.user and req.isAuthenticated should be set
const keyGenerator = (req, res) => {
  try {
    if (req.user && req.user._id) {
      return `auth_${req.user._id}`;
    }
  } catch (error) {
    console.error("Error in rate limit keyGenerator:", error.message);
  }
  // Use ipKeyGenerator helper for IPv6 compatibility
  return `guest_${ipKeyGenerator(req.ip || req.socket?.remoteAddress || "unknown")}`;
};

// Rate limiter for chat endpoints
exports.chatRateLimit = rateLimit({
  store: storeFor("chat"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req, res) => {
    // Authenticated users get higher limit
    try {
      if (req.user) {
        return 100; // 100 requests per 15 minutes for authenticated
      }
    } catch (error) {
      console.error("Error in rate limit max function:", error.message);
    }
    return 30; // 30 requests per 15 minutes for guests
  },
  keyGenerator: keyGenerator,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req, res) => {
    // Don't rate limit admin operations
    try {
      return req.user && req.user.role === "admin";
    } catch (error) {
      return false;
    }
  },
  handler: (req, res, next, options) => {
    try {
      // Calculate seconds remaining until reset (not the absolute reset timestamp)
      const now = Date.now();
      const resetTime = req.rateLimit ? req.rateLimit.resetTime : now + 900000;
      const secondsRemaining = Math.max(0, Math.ceil((resetTime - now) / 1000));
      
      return res.status(429).json({
        status: "error",
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        retryAfter: secondsRemaining,
      });
    } catch (error) {
      console.error("Error in rate limit handler:", error.message);
      return next(error);
    }
  },
});

/**
 * Stricter rate limiter for message sending (POST /messages)
 * - Authenticated: 50 per 15 minutes
 * - Guest: 15 per 15 minutes
 */
exports.sendMessageRateLimit = rateLimit({
  store: storeFor("sendMessage"),
  windowMs: 15 * 60 * 1000,
  max: (req, res) => {
    try {
      if (req.user) {
        return 50;
      }
    } catch (error) {
      console.error("Error in sendMessage rate limit:", error.message);
    }
    return 15;
  },
  keyGenerator: keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    try {
      return req.user && req.user.role === "admin";
    } catch (error) {
      return false;
    }
  },
  handler: (req, res, next, options) => {
    try {
      // Calculate seconds remaining until reset
      const now = Date.now();
      const resetTime = req.rateLimit ? req.rateLimit.resetTime : now + 900000;
      const secondsRemaining = Math.max(0, Math.ceil((resetTime - now) / 1000));
      
      return res.status(429).json({
        status: "error",
        code: "RATE_LIMIT_EXCEEDED",
        message: "Message rate limit exceeded. Please slow down.",
        retryAfter: secondsRemaining,
      });
    } catch (error) {
      console.error("Error in sendMessage rate limit handler:", error.message);
      return next(error);
    }
  },
});

/**
 * Stricter rate limiter for chat initiation (POST /)
 * - Authenticated: 20 per 15 minutes
 * - Guest: 5 per 15 minutes
 */
exports.startChatRateLimit = rateLimit({
  store: storeFor("startChat"),
  windowMs: 15 * 60 * 1000,
  max: (req, res) => {
    try {
      if (req.user) {
        return 20;
      }
    } catch (error) {
      console.error("Error in startChat rate limit:", error.message);
    }
    return 5;
  },
  keyGenerator: keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    try {
      return req.user && req.user.role === "admin";
    } catch (error) {
      return false;
    }
  },
  handler: (req, res, next, options) => {
    try {
      // Calculate seconds remaining until reset
      const now = Date.now();
      const resetTime = req.rateLimit ? req.rateLimit.resetTime : now + 900000;
      const secondsRemaining = Math.max(0, Math.ceil((resetTime - now) / 1000));
      
      return res.status(429).json({
        status: "error",
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many chat sessions started. Please try again later.",
        retryAfter: secondsRemaining,
      });
    } catch (error) {
      console.error("Error in startChat rate limit handler:", error.message);
      return next(error);
    }
  },
});

/**
 * Per-endpoint limiter for public, unauthenticated abuse targets
 * (B-13): order tracking (order-id enumeration), guest checkout and
 * the eSewa return (order creation / payment-flow abuse), and the
 * public blog like counter. Keyed by IP via ipKeyGenerator.
 * NOTE: req.ip is the proxy's address until the trust-proxy decision
 * (ND-4) is made; budgets are set generously so a shared proxy bucket
 * cannot throttle ordinary traffic, while still capping floods.
 */
exports.publicEndpointRateLimit = (max, message = "Too many requests. Please try again later.") =>
  rateLimit({
    store: storeFor("public"),
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || "unknown"),
    handler: (req, res) => {
      const resetTime = req.rateLimit ? req.rateLimit.resetTime : Date.now() + 900000;
      const secondsRemaining = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
      return res.status(429).json({
        status: "error",
        code: "RATE_LIMIT_EXCEEDED",
        message,
        retryAfter: secondsRemaining,
      });
    },
  });

/**
 * Per-user limiter for authenticated endpoints (falls back to IP for
 * anonymous requests). Used on POST /promotions/track (C-09) so one
 * account cannot inflate engagement metrics unboundedly.
 */
exports.userRateLimit = (max, message = "Too many requests. Please try again later.") =>
  rateLimit({
    store: storeFor("user"),
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.user?._id ? `user_${req.user._id}` : ipKeyGenerator(req.ip || req.socket?.remoteAddress || "unknown"),
    handler: (req, res) => {
      const resetTime = req.rateLimit ? req.rateLimit.resetTime : Date.now() + 900000;
      const secondsRemaining = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
      return res.status(429).json({
        status: "error",
        code: "RATE_LIMIT_EXCEEDED",
        message,
        retryAfter: secondsRemaining,
      });
    },
  });

// ---------------------------------------------------------------------------
// Tiered router limiters (CodeQL class H, alerts #46-#191).
// Applied with router.use(...) at the top of every router so each
// route sits behind a recognized limiter. The read limiter skips
// non-GET requests and vice versa, so the two counters stay
// independent. Generous defaults sized for real clients (chat and
// notification polling fit comfortably); abusive volumes get a 429
// in the standard error shape. eSewa callback/return paths are
// exempt - a payment return must never be throttled. The key is the
// client IP (see ND-4: trust proxy is an owner decision; on Render
// the counters are per-instance in memory - a Redis store is listed
// as an option under ND-4 in AUDIT_STATE.md).
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const isReadMethod = (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method);
const isEsewaPath = (req) => req.path.startsWith("/esewa");

const makeTierLimiter = (max, skip) => rateLimit({
  store: storeFor("tier"),
  windowMs: RATE_LIMIT_WINDOW_MS,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: (req, res) => {
    res.status(429).json({
      status: "fail",
      message: "Too many requests. Please try again later.",
    });
  },
});

exports.standardReadLimiter = makeTierLimiter(
  Number(process.env.RATE_LIMIT_READ_MAX) || 900,
  (req) => !isReadMethod(req) || isEsewaPath(req),
);
exports.standardWriteLimiter = makeTierLimiter(
  Number(process.env.RATE_LIMIT_WRITE_MAX) || 300,
  (req) => isReadMethod(req) || isEsewaPath(req),
);
exports.adminReadLimiter = makeTierLimiter(
  Number(process.env.RATE_LIMIT_ADMIN_MAX) || 900,
  (req) => !isReadMethod(req) || isEsewaPath(req),
);
exports.adminWriteLimiter = makeTierLimiter(
  Number(process.env.RATE_LIMIT_ADMIN_MAX) || 300,
  (req) => isReadMethod(req) || isEsewaPath(req),
);
