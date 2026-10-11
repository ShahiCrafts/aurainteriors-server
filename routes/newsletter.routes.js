const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletter.controller');
const { subscribeSchema, unsubscribeSchema, confirmSubscriptionSchema, sendTrendSchema } = require('../validators/newsletter.validator');
const { createAuthLimiter } = require('../middleware/authRateLimit.middleware');
const validate = require('../middleware/validate.middleware');
const { protect, restrictTo } = require('../middleware/auth.middleware');

/**
 * @route   POST /api/newsletter/subscribe
 * @desc    Subscribe to newsletter
 * @access  Public
 */
router.post(
    '/subscribe',
    createAuthLimiter('newsletterSubscribe', 3, 20),
    validate(subscribeSchema),
    newsletterController.subscribe
);

/**
 * @route   POST /api/newsletter/unsubscribe
 * @desc    Unsubscribe from newsletter
 * @access  Public
 */
router.post(
    '/unsubscribe',
    createAuthLimiter('newsletterUnsubscribe', 20, 60),
    validate(unsubscribeSchema),
    newsletterController.unsubscribe
);

/**
 * @route   GET /api/newsletter/subscribers
 * @desc    Get all subscribers (with pagination)
 * @access  Private/Admin
 */
router.post('/confirm', createAuthLimiter('newsletterConfirm', 20, 60), validate(confirmSubscriptionSchema), newsletterController.confirmSubscription);

router.get(
    '/subscribers',
    protect,
    restrictTo('admin'),
    newsletterController.getSubscribers
);

/**
 * @route   POST /api/newsletter/send-trend
 * @desc    Send trend/update email to all active subscribers
 * @access  Private/Admin
 */
router.post(
    '/send-trend',
    protect,
    restrictTo('admin'),
    validate(sendTrendSchema),
    newsletterController.sendTrend
);

/**
 * @route   GET /api/newsletter/stats
 * @desc    Get newsletter statistics
 * @access  Private/Admin
 */
router.get(
    '/stats',
    protect,
    restrictTo('admin'),
    newsletterController.getStats
);

module.exports = router;
