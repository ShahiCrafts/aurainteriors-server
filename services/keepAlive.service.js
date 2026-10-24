/**
 * Keep-Alive Service
 * 
 * Prevents Render (or other hosting platforms) from spinning down the server
 * during periods of inactivity. Pings the health endpoint periodically.
 * 
 * Usage:
 *   - Development: Disabled by default
 *   - Production: Enabled automatically when NODE_ENV=production
 * 
 * Configuration:
 *   - KEEPALIVE_ENABLED: AR-44 gate — when set to a non-empty value it decides
 *     enablement (true/1/on/yes or false/0/off/no, case-insensitive); this is
 *     the only way to disable keep-alive in production. Unset/empty or an
 *     unparseable value falls back to the legacy rule below.
 *   - KEEP_ALIVE_ENABLED: Legacy — set to 'true' to enable (auto-enabled in production)
 *   - KEEP_ALIVE_INTERVAL: Interval in minutes between pings (default: 14 minutes)
 *   - BACKEND_URL: Base URL to ping (required for external pinging)
 */

const axios = require("axios");

class KeepAliveService {
  constructor(options = {}) {
    // Legacy rule (unchanged): auto-enable in production, or when the
    // legacy KEEP_ALIVE_ENABLED is exactly "true".
    const isProduction = process.env.NODE_ENV === "production";
    const legacyEnabled =
      (process.env.KEEP_ALIVE_ENABLED === "true") || isProduction;

    // AR-44 (D-E): KEEPALIVE_ENABLED, when set to a non-empty value,
    // overrides the legacy rule. Parsed case-insensitively after trim:
    // true/1/on/yes -> enabled, false/0/off/no -> disabled. Any other
    // value warns once and falls back to the legacy rule. Unset/empty
    // keeps the legacy rule exactly (including the production
    // auto-enable quirk).
    this.enabled = legacyEnabled;
    const gateRaw = process.env.KEEPALIVE_ENABLED;
    if (typeof gateRaw === "string" && gateRaw.trim() !== "") {
      const gateValue = gateRaw.trim().toLowerCase();
      if (["true", "1", "on", "yes"].includes(gateValue)) {
        this.enabled = true;
      } else if (["false", "0", "off", "no"].includes(gateValue)) {
        this.enabled = false;
      } else {
        console.warn(
          `[KeepAlive] Ignoring unrecognized KEEPALIVE_ENABLED value "${gateRaw}"; falling back to legacy enablement rule`,
        );
      }
    }

    // Default: ping every 14 minutes (Render has a 15-minute idle timeout on free tier)
    this.intervalMinutes =
      parseInt(process.env.KEEP_ALIVE_INTERVAL) || 14;

    // OA-1: the localhost last resort is REMOVED. RENDER_EXTERNAL_URL
    // is retained as a middle fallback ONLY because it is a
    // platform-provided value (Render injects it; it is not an app
    // default). If neither is set, backendUrl stays null and ping()
    // fails loudly naming BACKEND_URL - never a silent wrong URL.
    this.backendUrl =
      process.env.BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      null;

    this.intervalId = null;
    this.requestCount = 0;
    this.lastPingTime = null;
    this.failureCount = 0;
    this.maxConsecutiveFailures = 5;

    if (this.enabled) {
      console.log(
        `[KeepAlive] Service initialized (interval: ${this.intervalMinutes}m)`,
      );
    }
  }

  /**
   * Start the keep-alive service
   */
  start() {
    if (!this.enabled) {
      console.log("[KeepAlive] Service is disabled");
      return;
    }

    if (this.intervalId) {
      console.log("[KeepAlive] Service is already running");
      return;
    }

    // Ping immediately on startup (after a short delay)
    setTimeout(() => {
      this.ping();
    }, 5000);

    // Then set up recurring pings
    const intervalMs = this.intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.ping();
    }, intervalMs);

    console.log(`[KeepAlive] ✓ Service started (pinging every ${this.intervalMinutes}m)`);
  }

  /**
   * Stop the keep-alive service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[KeepAlive] ✓ Service stopped");
    }
  }

  /**
   * Perform a health check ping
   */
  async ping() {
    if (!this.backendUrl) {
      const error = "BACKEND_URL is not configured: set BACKEND_URL (or run on a platform that provides RENDER_EXTERNAL_URL) before using keep-alive";
      console.error(`[KeepAlive] \u2717 ${error}`);
      return { success: false, duration: 0, error, timestamp: new Date() };
    }
    const startTime = Date.now();

    try {
      const url = `${this.backendUrl}/health`;
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
      });

      const duration = Date.now() - startTime;
      this.requestCount++;
      this.lastPingTime = new Date();
      this.failureCount = 0; // Reset failure counter on success

      console.log(
        `[KeepAlive] ✓ Ping #${this.requestCount} succeeded (${duration}ms)`,
      );

      return {
        success: true,
        duration,
        timestamp: this.lastPingTime,
        status: response.status,
      };
    } catch (error) {
      this.failureCount++;
      const duration = Date.now() - startTime;

      console.error(
        `[KeepAlive] ✗ Ping failed (attempt ${this.failureCount}/${this.maxConsecutiveFailures}): ${error.message}`,
      );

      // If too many consecutive failures, log a warning
      if (this.failureCount >= this.maxConsecutiveFailures) {
        console.error(
          `[KeepAlive] ⚠ ${this.failureCount} consecutive failures - check backend connectivity`,
        );
      }

      return {
        success: false,
        duration,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      running: this.intervalId !== null,
      backendUrl: this.backendUrl,
      intervalMinutes: this.intervalMinutes,
      requestCount: this.requestCount,
      lastPingTime: this.lastPingTime,
      failureCount: this.failureCount,
      environment: process.env.NODE_ENV,
    };
  }
}

module.exports = KeepAliveService;
