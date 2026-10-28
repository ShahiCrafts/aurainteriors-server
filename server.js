const {
  loadEnv,
  validateEnv,
  getInt,
  getString,
} = require("./config/appConfig");
loadEnv();
{
  const { errors, warnings } = validateEnv();
  for (const w of warnings) console.warn(`[config] warning: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`[config] error: ${e}`);
    process.exit(1);
  }
}

// AR-33 import-order fix: ./app (and everything it transitively requires,
// e.g. config/passport which reads process.env at import time) must be
// required AFTER loadEnv(), exactly as in the pre-extraction server.js
// where every require sat below the loadEnv/validateEnv block.
const { createApp } = require("./app");

const mongoose = require("mongoose");
const http = require("http");

const { connectDatabase } = require("./config/database");
const { assertReplicaSetTopology } = require("./config/topology");
const NotificationGateway = require("./services/notificationGateway");
const { initializeDatabaseIfEmpty } = require("./services/databaseSeeder");
const {
  startScheduledJobs,
  stopScheduledJobs,
} = require("./services/jobWiring");
const runtimeContext = require("./services/runtimeContext");
const KeepAliveService = require("./services/keepAlive.service");

const PORT = getInt("PORT");
const NODE_ENV = (getString("NODE_ENV") || "development").trim().toLowerCase(); // normalized (A-11 class)

// Verify email configuration at startup
console.log("[startup] Email config verification:");
console.log(
  "[startup] BREVO_API_KEY:",
  process.env.BREVO_API_KEY ? "✓ SET" : "✗ MISSING",
);
console.log(
  "[startup] EMAIL_FROM:",
  process.env.EMAIL_FROM ? "✓ SET" : "✗ MISSING",
);

// Test email service at startup
const { verifyEmailConfig } = require("./services/email.service");
verifyEmailConfig()
  .then((isValid) => {
    if (isValid) {
      console.log("[startup] ✓ Email service verified successfully");
    } else {
      console.error(
        "[startup] ✗ Email service verification failed - check Brevo credentials",
      );
    }
  })
  .catch((err) => {
    console.error("[startup] ✗ Email service error:", err.message);
  });

const startTime = Date.now();

const app = createApp();

const httpServer = http.createServer(app);
// Socket timeouts (B-13): without them, slow clients can hold
// connections open indefinitely.
httpServer.requestTimeout = 120000;
httpServer.headersTimeout = 60000;

let notificationGateway;
let keepAliveService;

const startServer = async () => {
  try {
    // Connect before any initialization that needs the database and
    // before listening: the previous top-level fire-and-forget call
    // raced startup, so the server could accept traffic with no DB
    // (B-18). connectDatabase exits(1) itself on failure.
    await connectDatabase();
    // AR-06: fail fast when the connected MongoDB cannot transact -
    // checkouts run in transactions, which a standalone mongod
    // cannot commit. Exits(1) with a fatal line on a standalone;
    // skipped silently when the DB is stubbed (test preload).
    await assertReplicaSetTopology();
    console.log("Starting server initialization...");

    // Demo data is opt-in and is never inserted during production startup.
    if (
      process.env.NODE_ENV === "development" &&
      process.env.SEED_DEMO_DATA === "true"
    ) {
      await initializeDatabaseIfEmpty();
    }

    console.log("Initializing notification gateway...");
    notificationGateway = new NotificationGateway(httpServer);
    console.log("✓ Notification gateway initialized");

    // AR-33: periodic/background work is wired in services/jobWiring.js;
    // startServer only holds the returned handles for shutdown. The
    // gateway is constructed before the wiring (previously the
    // background tasks ran first) - the intervals are periodic and
    // nothing consumes the gateway before it exists, so the reorder
    // is behavior-neutral.
    const jobHandles = startScheduledJobs({ notificationGateway });

    // Initialize Keep-Alive Service (prevents idle shutdown on Render)
    keepAliveService = new KeepAliveService();
    keepAliveService.start();

    // AR-33: explicit runtime registry replaces the mutable
    // globals. Populated once, here, after construction. (The old
    // global.notificationGateway / .notificationEventEmitter /
    // .keepAliveService writes are gone; nothing in the repo reads
    // them anymore.)
    runtimeContext.setNotificationGateway(notificationGateway);
    runtimeContext.setKeepAliveService(keepAliveService);

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`✓ Server running on PORT ${PORT} [${NODE_ENV}]`);
      console.log(
        `✓ Active users: ${notificationGateway.getActiveUserCount()}`,
      );
      console.log(
        `✓ Boot time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      );
    });

    // AR-45: in-flight request accounting, used by the drain report
    // below. A second 'request' listener is additive - the Express
    // app remains the primary handler.
    let inFlightRequests = 0;
    httpServer.on("request", (req, res) => {
      inFlightRequests += 1;
      res.on("close", () => {
        inFlightRequests -= 1;
      });
    });

    // AR-45: shutdown runs EXACTLY once. A second signal (or an
    // uncaughtException / unhandledRejection arriving mid-shutdown)
    // is logged and ignored instead of re-running the teardown
    // concurrently (double closes, racing exits).
    let shuttingDown = false;
    const shutdown = async (trigger) => {
      if (shuttingDown) {
        console.log(
          `Shutdown already in progress; ignoring trigger: ${trigger}`,
        );
        return;
      }
      shuttingDown = true;
      console.log("\nShutting down gracefully...");
      try {
        keepAliveService?.stop();
      } catch {
        /* already stopped */
      }
      // AR-33: clears the heartbeat/cleanup/RSS intervals and the
      // initial-RSS timer, then stops background tasks and the
      // in-process job worker (the same teardown as before, one call).
      stopScheduledJobs(jobHandles);
      // AR-45: the gateway close is time-bounded. io.close() also
      // initiates the attached HTTP server's close and can wait
      // indefinitely on a stuck connection - unbounded, it defeats
      // the drain cap below (observed intermittently: shutdown wedged
      // past 30 s behind one hung request while background tasks kept
      // firing against the closing process).
      try {
        await Promise.race([
          notificationGateway?.close() ?? Promise.resolve(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch {
        /* already closed */
      }
      // Close the HTTP server and the database before exiting so
      // in-flight requests are not truncated by process.exit (B-18);
      // the wait is capped so a hung connection cannot block shutdown.
      // AR-45: when the cap expires with work still in flight, REPORT
      // what was truncated (the B-18 race previously moved on
      // silently). SHUTDOWN_DRAIN_TIMEOUT_MS overrides the cap
      // (default 10000, the pre-AR-45 value).
      const drainTimeoutMs = (() => {
        const n = Number(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS);
        return Number.isFinite(n) && n > 0 ? n : 10000;
      })();
      let drained = false;
      await Promise.race([
        new Promise((resolve) =>
          httpServer.close(() => {
            drained = true;
            resolve();
          }),
        ),
        new Promise((resolve) => setTimeout(resolve, drainTimeoutMs)),
      ]);
      if (!drained) {
        const openConnections = await new Promise((resolve) => {
          httpServer.getConnections((err, count) => resolve(err ? -1 : count));
        });
        console.error(
          JSON.stringify({
            level: "error",
            event: "shutdown_drain_timeout",
            trigger,
            drainTimeoutMs,
            openConnections,
            inFlightRequests,
          }),
        );
        // Force-close whatever survived the cap so a stuck socket
        // cannot hold the process open past the report.
        try {
          httpServer.closeAllConnections?.();
        } catch {
          /* ignore */
        }
      }
      try {
        await mongoose.connection.close();
      } catch {
        /* ignore */
      }
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    // Log process-level failures instead of dying silently (B-18).
    // ADR-0001 (docs/adr/): an unhandled rejection leaves the process
    // in an unknown state, so it takes the SAME graceful-shutdown
    // path as an uncaught exception (previously it was log-only and
    // the process limped on).
    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled promise rejection:", reason);
      shutdown("unhandledRejection");
    });
    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception:", error);
      shutdown("uncaughtException");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
