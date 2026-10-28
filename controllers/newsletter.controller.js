const { boundedPage, boundedLimit } = require("../utils/listQuery");
const Newsletter = require("../models/newsletter.model");
const crypto = require("crypto");
const {
  issueNewsletterToken,
  verifyNewsletterToken,
} = require("../services/newsletterToken.service");
const {
  sendNewsletterConfirmationEmail,
  sendNewsletterBroadcast,
} = require("../services/email.service");

/**
 * Subscribe to newsletter
 * @route POST /api/newsletter/subscribe
 * @access Public
 */
exports.subscribe = async (req, res) => {
  try {
    const { email, source = "footer" } = req.body;
    let subscriber = await Newsletter.findOne({ email });
    if (!subscriber?.isActive) {
      // FA-60: a still-valid pending confirmation is NOT re-issued or
      // re-sent inside the resend cooldown - duplicate subscribes
      // cannot be used to mail-bomb an address or churn its token.
      const stillValid =
        subscriber?.confirmationExpiresAt &&
        subscriber.confirmationExpiresAt > new Date();
      const inCooldown =
        subscriber?.confirmationSentAt &&
        Date.now() - new Date(subscriber.confirmationSentAt).getTime() <
          5 * 60 * 1000;
      if (!(stillValid && inCooldown)) {
        const nonce = crypto.randomBytes(24).toString("hex");
        const token = issueNewsletterToken(
          email,
          "subscribe",
          nonce,
          24 * 60 * 60 * 1000,
        );
        // FA-54: source attribution is set at creation only; a
        // re-subscribe never overwrites the original source.
        if (!subscriber)
          subscriber = new Newsletter({ email, source, isActive: false });
        subscriber.confirmationTokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");
        subscriber.confirmationExpiresAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        );
        subscriber.confirmationSentAt = new Date();
        await subscriber.save();
        await sendNewsletterConfirmationEmail(email, token);
      }
    }
    res
      .status(200)
      .json({
        success: true,
        message:
          "If confirmation is needed, check your email to complete your subscription.",
      });
  } catch (_error) {
    res
      .status(503)
      .json({
        success: false,
        message:
          "Newsletter confirmation is temporarily unavailable. Please try again.",
      });
  }
};

exports.confirmSubscription = async (req, res) => {
  try {
    const { email } = verifyNewsletterToken(req.body.token, "subscribe");
    const hash = crypto
      .createHash("sha256")
      .update(req.body.token)
      .digest("hex");
    const subscriber = await Newsletter.findOneAndUpdate(
      {
        email,
        confirmationTokenHash: hash,
        confirmationExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          isActive: true,
          subscribedAt: new Date(),
          unsubscribeNonce: crypto.randomBytes(24).toString("hex"),
        },
        $unset: {
          confirmationTokenHash: 1,
          confirmationExpiresAt: 1,
          unsubscribedAt: 1,
        },
      },
      { new: true },
    );
    if (!subscriber)
      return res
        .status(400)
        .json({
          success: false,
          message: "This confirmation link is invalid or expired.",
        });
    // AR-20: the welcome email goes through the outbox dispatcher
    // in both modes (fire-and-forget here - response timing is
    // unchanged; in outbox mode the queued row is drained with
    // retries, in direct mode the outcome is recorded).
    require("../services/emailOutbox.service")
      .dispatchEmail({
        kind: "newsletter-welcome",
        to: email,
        payload: { email, nonce: subscriber.unsubscribeNonce },
      })
      .catch(() => console.error("Newsletter welcome email unavailable"));
    res
      .status(200)
      .json({
        success: true,
        message: "Your newsletter subscription is confirmed.",
      });
  } catch (_error) {
    res
      .status(400)
      .json({
        success: false,
        message: "This confirmation link is invalid or expired.",
      });
  }
};

/**
 * Get all subscribers (Admin only)
 * @route GET /api/newsletter/subscribers
 * @access Private/Admin
 */
exports.getSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 50, isActive } = req.query;

    const pageNum = boundedPage(page);
    const limitNum = boundedLimit(limit, 50);
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === true || isActive === "true";
    }

    // PERF-B-09: page + count in parallel, lean read. lean() is
    // applied only when the query object supports it (real
    // Mongoose queries always do).
    const subscribersQuery = Newsletter.find(query)
      .sort({ subscribedAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .select("-__v -unsubscribeNonce -confirmationTokenHash");
    if (typeof subscribersQuery.lean === "function") subscribersQuery.lean();

    const [subscribers, total] = await Promise.all([
      subscribersQuery,
      Newsletter.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        subscribers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalSubscribers: total,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Send trend email to all active subscribers (Admin only)
 * @route POST /api/newsletter/send-trend
 * @access Private/Admin
 */
exports.sendTrend = async (req, res) => {
  try {
    const { subject, htmlContent, textContent } = req.body;

    if (!subject || !htmlContent || !textContent) {
      return res.status(400).json({
        success: false,
        message: "Subject, htmlContent, and textContent are required",
      });
    }

    // AR-04: BROADCAST_MODE=queue enqueues the broadcast; the
    // worker handler loads subscribers fresh, ensures nonces and
    // sends in resumable slices. Inline (default) is unchanged.
    const broadcastJobs = require("../services/broadcastJobs.service");
    if (broadcastJobs.isQueueMode()) {
      const job = await broadcastJobs.enqueueNewsletter({
        subject,
        htmlContent,
        textContent,
      });
      return res.status(202).json({
        success: true,
        message: "Trend emails queued",
        data: { jobId: job._id, queued: true },
      });
    }

    // Get all active subscribers
    const subscribers = await Newsletter.find({ isActive: true }).select(
      "email unsubscribeNonce",
    );
    // Existing active subscriptions need a nonce before their next email.
    await broadcastJobs.ensureSubscriberNonces(subscribers);

    if (subscribers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active subscribers found",
      });
    }

    // Send emails
    const result = await sendNewsletterBroadcast(
      subscribers,
      subject,
      htmlContent,
    );

    res.status(200).json({
      success: true,
      message: "Trend emails sent successfully",
      data: result,
    });
  } catch (error) {
    console.error("Send trend email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send trend emails",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Unsubscribe from newsletter
 * @route POST /api/newsletter/unsubscribe
 * @access Public
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { email, nonce } = verifyNewsletterToken(
      req.body.token,
      "unsubscribe",
    );
    // FA-05: the nonce ROTATES on use, so a used unsubscribe link can
    // never be replayed; and a non-matching nonce is an error, not a
    // silent "success".
    const result = await Newsletter.updateOne(
      { email, unsubscribeNonce: nonce },
      {
        $set: {
          isActive: false,
          unsubscribedAt: new Date(),
          unsubscribeNonce: crypto.randomBytes(24).toString("hex"),
        },
        $unset: { confirmationTokenHash: 1, confirmationExpiresAt: 1 },
      },
    );
    if (!result.matchedCount)
      return res
        .status(400)
        .json({
          success: false,
          message: "This unsubscribe link is invalid or expired.",
        });
    res
      .status(200)
      .json({
        success: true,
        message: "Your unsubscribe request has been processed.",
      });
  } catch (_error) {
    res
      .status(400)
      .json({
        success: false,
        message: "This unsubscribe link is invalid or expired.",
      });
  }
};

/**
 * Get newsletter statistics (Admin only)
 * @route GET /api/newsletter/stats
 * @access Private/Admin
 */
exports.getStats = async (req, res) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments();
    const activeSubscribers = await Newsletter.countDocuments({
      isActive: true,
    });
    const inactiveSubscribers = await Newsletter.countDocuments({
      isActive: false,
    });

    const sourceStats = await Newsletter.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]);

    // Get recent subscribers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSubscribers = await Newsletter.countDocuments({
      subscribedAt: { $gte: thirtyDaysAgo },
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalSubscribers,
        active: activeSubscribers,
        inactive: inactiveSubscribers,
        bySource: sourceStats,
        recentSubscribers,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
