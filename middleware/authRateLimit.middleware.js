const crypto = require("crypto");
const AuthAttempt = require("../models/authAttempt.model");

// Fixed windows share counters across processes. Expired TTL cleanup is not
// required for correctness because the window forms part of the primary key.
exports.createAuthLimiter =
  (scope, accountLimit, ipLimit, windowMs = 15 * 60 * 1000) =>
  async (req, res, next) => {
    const now = Date.now();
    const bucket = Math.floor(now / windowMs);
    const expiresAt = new Date((bucket + 1) * windowMs);
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const keys = [
      ["ip", req.ip || req.socket?.remoteAddress || "unknown", ipLimit],
    ];
    if (email) keys.push(["account", email, accountLimit]);
    try {
      for (const [kind, value, limit] of keys) {
        const digest = crypto.createHash("sha256").update(value).digest("hex");
        const _id = `${scope}:${kind}:${digest}:${bucket}`;
        let attempt;
        try {
          attempt = await AuthAttempt.findOneAndUpdate(
            { _id },
            {
              $inc: { count: 1 },
              $setOnInsert: { expiresAt },
            },
            { upsert: true, returnDocument: "after" },
          );
        } catch (error) {
          if (error.code !== 11000) throw error;
          attempt = await AuthAttempt.findOneAndUpdate(
            { _id },
            { $inc: { count: 1 } },
            { returnDocument: "after" },
          );
        }
        if (!attempt || attempt.count > limit) {
          res.set(
            "Retry-After",
            String(Math.ceil((expiresAt.getTime() - now) / 1000)),
          );
          return res
            .status(429)
            .json({
              status: "fail",
              message:
                "Too many authentication attempts. Please try again later.",
            });
        }
      }
      return next();
    } catch (_error) {
      // Authentication must not bypass protection during a store outage.
      return res
        .status(503)
        .json({
          status: "error",
          message:
            "Authentication temporarily unavailable. Please try again later.",
        });
    }
  };
