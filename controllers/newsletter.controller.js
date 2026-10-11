const { boundedPage, boundedLimit } = require("../utils/listQuery");
const Newsletter = require('../models/newsletter.model');
const crypto = require('crypto');
const { issueNewsletterToken, verifyNewsletterToken } = require('../services/newsletterToken.service');
const { sendNewsletterConfirmationEmail, sendNewsletterWelcomeEmail, sendNewsletterBroadcast } = require('../services/email.service');

/**
 * Subscribe to newsletter
 * @route POST /api/newsletter/subscribe
 * @access Public
 */
exports.subscribe = async (req, res) => {
    try {
        const { email, source = 'footer' } = req.body;
        let subscriber = await Newsletter.findOne({ email });
        if (!subscriber?.isActive) {
            const nonce = crypto.randomBytes(24).toString('hex');
            const token = issueNewsletterToken(email, 'subscribe', nonce, 24 * 60 * 60 * 1000);
            if (!subscriber) subscriber = new Newsletter({ email, source, isActive: false });
            subscriber.source = source;
            subscriber.confirmationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
            subscriber.confirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await subscriber.save();
            await sendNewsletterConfirmationEmail(email, token);
        }
        res.status(200).json({ success: true, message: 'If confirmation is needed, check your email to complete your subscription.' });
    } catch (_error) {
        res.status(503).json({ success: false, message: 'Newsletter confirmation is temporarily unavailable. Please try again.' });
    }
};

exports.confirmSubscription = async (req, res) => {
    try {
        const { email } = verifyNewsletterToken(req.body.token, 'subscribe');
        const hash = crypto.createHash('sha256').update(req.body.token).digest('hex');
        const subscriber = await Newsletter.findOneAndUpdate({ email, confirmationTokenHash: hash,
            confirmationExpiresAt: { $gt: new Date() } }, {
            $set: { isActive: true, subscribedAt: new Date(), unsubscribeNonce: crypto.randomBytes(24).toString('hex') },
            $unset: { confirmationTokenHash: 1, confirmationExpiresAt: 1, unsubscribedAt: 1 },
        }, { new: true });
        if (!subscriber) return res.status(400).json({ success: false, message: 'This confirmation link is invalid or expired.' });
        sendNewsletterWelcomeEmail(email, subscriber.unsubscribeNonce).catch(() => console.error('Newsletter welcome email unavailable'));
        res.status(200).json({ success: true, message: 'Your newsletter subscription is confirmed.' });
    } catch (_error) { res.status(400).json({ success: false, message: 'This confirmation link is invalid or expired.' }); }
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
            query.isActive = isActive === true || isActive === 'true';
        }

        const subscribers = await Newsletter.find(query)
            .sort({ subscribedAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .select('-__v');

        const total = await Newsletter.countDocuments(query);

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
        console.error('Get subscribers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscribers',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
                message: 'Subject, htmlContent, and textContent are required',
            });
        }

        // Get all active subscribers
        const subscribers = await Newsletter.find({ isActive: true }).select('email unsubscribeNonce');
        // Existing active subscriptions need a nonce before their next email.
        for (const subscriber of subscribers) {
            if (!subscriber.unsubscribeNonce) {
                const nonce = crypto.randomBytes(24).toString('hex');
                const updated = await Newsletter.findOneAndUpdate({ _id: subscriber._id, unsubscribeNonce: null },
                    { $set: { unsubscribeNonce: nonce } }, { new: true });
                const current = updated || await Newsletter.findById(subscriber._id);
                subscriber.unsubscribeNonce = current.unsubscribeNonce;
            }
        }

        if (subscribers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active subscribers found',
            });
        }

        // Send emails
        const result = await sendNewsletterBroadcast(subscribers, subject, htmlContent);

        res.status(200).json({
            success: true,
            message: 'Trend emails sent successfully',
            data: result,
        });
    } catch (error) {
        console.error('Send trend email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send trend emails',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
        const { email, nonce } = verifyNewsletterToken(req.body.token, 'unsubscribe');
        await Newsletter.updateOne({ email, unsubscribeNonce: nonce }, {
            $set: { isActive: false, unsubscribedAt: new Date() },
            $unset: { confirmationTokenHash: 1, confirmationExpiresAt: 1 },
        });
        res.status(200).json({ success: true, message: 'Your unsubscribe request has been processed.' });
    } catch (_error) { res.status(400).json({ success: false, message: 'This unsubscribe link is invalid or expired.' }); }
};

/**
 * Get newsletter statistics (Admin only)
 * @route GET /api/newsletter/stats
 * @access Private/Admin
 */
exports.getStats = async (req, res) => {
    try {
        const totalSubscribers = await Newsletter.countDocuments();
        const activeSubscribers = await Newsletter.countDocuments({ isActive: true });
        const inactiveSubscribers = await Newsletter.countDocuments({ isActive: false });

        const sourceStats = await Newsletter.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$source', count: { $sum: 1 } } },
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
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
