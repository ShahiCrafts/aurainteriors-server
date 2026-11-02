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
    .toLowerCase();
  const APP_VERSION = process.env.npm_package_version || "1.0.0";

  const app = express();

  if (process.env.TRUST_PROXY !== undefined) {
    const tp = process.env.TRUST_PROXY;
    app.set(
      "trust proxy",
      tp === "true" ? true : /^\d+$/.test(tp) ? Number(tp) : tp,
    );
  }

  const allowedOrigins = buildAllowedOrigins();

  app.use(require("./middleware/csrfOrigin").createOriginCheck(allowedOrigins));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
          return callback(null, false);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-guest-session-id"],
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

  app.use((req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    next();
  });

  app.use(compression({ level: 6, threshold: 1024 }));

  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use(require("./middleware/nosqlSanitize.middleware"));
  morgan.token("safe-path", (req) => req.path);
  app.use(morgan(":method :safe-path :status :response-time ms"));
  app.use(passport.initialize());

  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "API is running",
      docs: "/api/v1",
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health/ready", async (req, res) => {
    const dbStateMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    const dbState = dbStateMap[mongoose.connection.readyState] || "unknown";
    const isDbReady = mongoose.connection.readyState === 1;

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
  app.use("/api/v1/feeds", require("./routes/feed.routes"));
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
