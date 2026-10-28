// AR-33: pure application assembly.
//
// createApp() builds the Express app - middleware, routes, health probes,
// 404 + error handling - and NOTHING else. Importing this module (or
// calling createApp()) must NOT:
//   - validate env or exit (config/appConfig loadEnv/validateEnv stay in
//     the bootstrap entry point, server.js),
//   - start timers, intervals, schedulers, or background jobs
//     (services/jobWiring.js, owned by the bootstrap),
//   - listen on any port or open any connection.
//
// The bootstrap (server.js) calls createApp() exactly once and owns all
// lifecycle: DB connect, job wiring, gateway construction, listen,
// shutdown. Tests can import createApp() to exercise assembly in
// isolation (see tests/platform/createapp-purity.test.js).
const { getString, buildAllowedOrigins } = require("./config/appConfig");

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const compression = require("compression");
const mongoose = require("mongoose");
const passport = require("./config/passport");
const os = require("os");

const globalErrorHandler = require("./middleware/error.middleware");
const AppError = require("./utils/AppError");
const runtimeContext = require("./services/runtimeContext");

function createApp() {
  const NODE_ENV = (getString("NODE_ENV") || "development")
    .trim()
    .toLowerCase(); // normalized (A-11 class)
  const APP_VERSION = process.env.npm_package_version || "1.0.0";

  const app = express();

  // FA-62: proxy trust is an explicit deployment decision. Default stays
  // Express's (no proxy trust). Set TRUST_PROXY to a hop count ("1"), "true"
  // (trust all - only behind a known proxy), or a subnet/name Express
  // accepts, when the app runs behind a trusted reverse proxy; rate-limit
  // keys and req.ip then reflect the real client. A Redis limiter store is
  // an owner decision (see OWNER_DECISIONS.md).
  if (process.env.TRUST_PROXY !== undefined) {
    const tp = process.env.TRUST_PROXY;
    app.set(
      "trust proxy",
      tp === "true" ? true : /^\d+$/.test(tp) ? Number(tp) : tp,
    );
  }

  // OA-1: env only (FRONTEND_URL + ADMIN_URL + CORS_EXTRA_ORIGINS);
  // the builder trims, strips trailing slashes (B-16) and drops empties.
  const allowedOrigins = buildAllowedOrigins();

  // FA-08/FA-74: strict origin verification for cookie-authenticated
  // mutations (see middleware/csrfOrigin.js). The Authorization-header
  // bypass is gone.
  app.use(require("./middleware/csrfOrigin").createOriginCheck(allowedOrigins));

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
          // Deny by omitting CORS headers, not by throwing (B-16): an
          // exception here landed in the error handler as a 500 for a
          // request the API would otherwise simply not CORS-enable.
          return callback(null, false);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
      exposedHeaders: [
        "Server-Timing",
        "X-Wishlist-Timing",
        "X-Wishlist-Version",
      ],
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // B-14: this server speaks JSON only, so a deny-all document CSP
      // costs nothing and blunts any future HTML-serving mistake.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
    }),
  );

  // Permissions-Policy (B-14): the API needs no browser features.
  app.use((req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    next();
  });

  // Enable response compression (gzip/deflate — the `compression`
  // package does not negotiate brotli) for all responses.
  // Reduces typical JSON payload by 5-8x (15KB → 3KB)
  app.use(compression({ level: 6, threshold: 1024 }));

  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" })); // explicit limit (this equals Express 5's default; stated so it is a decision, not an accident)
  app.use(require("./middleware/nosqlSanitize.middleware")); // C-14: reject Mongo-operator keys in bodies/queries
  // Log paths only: query strings can carry bearer credentials.
  morgan.token("safe-path", (req) => req.path);
  app.use(morgan(":method :safe-path :status :response-time ms"));
  app.use(passport.initialize());

  // --------------------------------------------------------------------------
  // Root & health check routes
  // These are intentionally registered before the versioned API routes and are
  // excluded from auth/rate-limiting middleware so load balancers, uptime
  // monitors, and orchestrators (e.g. Docker, Kubernetes, Render, Railway) can
  // reach them without credentials.
  // --------------------------------------------------------------------------

  app.get("/", (req, res) => {
    // FA-40: the public root stays minimal - no version or environment
    // disclosure to unauthenticated callers.
    res.status(200).json({
      success: true,
      message: "API is running",
      docs: "/api/v1",
    });
  });

  // Lightweight liveness probe: confirms the process is up and responding.
  // Should stay fast and dependency-free so orchestrators don't restart the
  // pod/container due to a slow downstream dependency.
  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Deeper readiness probe: confirms the app and its critical dependencies
  // (e.g. database) are actually ready to serve traffic.
  app.get("/health/ready", async (req, res) => {
    const dbStateMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    const dbState = dbStateMap[mongoose.connection.readyState] || "unknown";
    const isDbReady = mongoose.connection.readyState === 1;

    // FA-40: unauthenticated callers get a bare ok/degraded status only.
    // The detailed payload (hostname, memory, dependency states) is an
    // internal operator view: it is served only when HEALTH_DETAIL_TOKEN
    // is configured AND the caller presents it in the x-health-token
    // header (constant-time comparison).
    const health = {
      success: isDbReady,
      status: isDbReady ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
    };
    const detailToken = process.env.HEALTH_DETAIL_TOKEN || "";
    const presented = String(req.headers["x-health-token"] || "");
    const detailAuthorized =
      detailToken.length >= 16 &&
      presented.length === detailToken.length &&
      require("crypto").timingSafeEqual(
        Buffer.from(presented),
        Buffer.from(detailToken),
      );
    if (detailAuthorized) {
      Object.assign(health, {
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: APP_VERSION,
        host: os.hostname(),
        dependencies: {
          database: dbState,
          notificationGateway: runtimeContext.getNotificationGateway()
            ? "up"
            : "down", // AR-33: registry, not global.notificationGateway
        },
        memory: {
          rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      });
    }

    res.status(isDbReady ? 200 : 503).json(health);
  });

  app.use("/api/v1/users", require("./routes/user.routes"));
  app.use("/api/v1/auth", require("./routes/auth.routes"));
  app.use("/api/v1/addresses", require("./routes/address.routes"));
  app.use("/api/v1/profile", require("./routes/profile.routes"));
  app.use("/api/v1/catalog", require("./routes/catalog.routes"));
  app.use("/api/v1/categories", require("./routes/category.routes"));
  app.use("/api/v1/products", require("./routes/product.routes"));
  app.use("/api/v1/wishlist", require("./routes/wishlist.routes"));
  app.use("/api/v1/cart", require("./routes/cart.routes"));
  app.use("/api/v1/discounts", require("./routes/discount.routes"));
  app.use("/api/v1/orders", require("./routes/order.routes"));
  app.use("/api/v1/notifications", require("./routes/notification.routes"));
  app.use("/api/v1/promotions", require("./routes/promotion.routes"));
  app.use("/api/v1/reviews", require("./routes/admin.review.routes"));
  app.use("/api/v1/announcements", require("./routes/announcement.routes"));
  app.use("/api/v1/chats", require("./routes/chat.routes"));
  app.use("/api/v1/documents", require("./routes/document.routes"));
  app.use("/api/v1/blogs", require("./routes/blog.routes"));
  app.use("/api/v1/contacts", require("./routes/contact.routes"));
  app.use("/api/v1/analytics", require("./routes/analytics.routes"));
  app.use("/api/v1/newsletter", require("./routes/newsletter.routes"));
  app.use("/api/v1/system", require("./routes/system.routes"));
  app.use("/api/v1/jobs", require("./routes/job.routes"));

  app.use((req, res, next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
  });

  app.use(globalErrorHandler);

  return app;
}

module.exports = { createApp };
