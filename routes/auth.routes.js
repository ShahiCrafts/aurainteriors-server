const { standardReadLimiter, standardWriteLimiter } = require("../middleware/rateLimit.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
const passport = require("passport");
const authController = require("../controllers/auth.controller");
const { createAuthLimiter } = require("../middleware/authRateLimit.middleware");
const { protect } = require("../middleware/auth.middleware");
const { issueOauthState, verifyOauthState } = require("../utils/oauthState");

// Magic Link Authentication
router.post("/send-magic-link", createAuthLimiter("sendMagicLink", 3, 20), authController.sendMagicLink);
router.post("/verify-magic-link", createAuthLimiter("verifyMagicLink", 20, 60), authController.verifyMagicLink);

// Admin Email + Password + OTP Authentication
router.post("/admin/login", createAuthLimiter("adminLogin", 10, 50), authController.adminLogin);
router.post("/admin/verify-otp", createAuthLimiter("adminVerifyOtp", 25, 100), authController.adminVerifyOtp);

router.get("/me", protect, authController.getMe);
router.post("/logout", authController.logout);

router.get("/google", (req, res, next) => {
  // Bind this sign-in attempt to the browser with a random state value
  // (A-01); verifyOauthState checks it on the callback before passport
  // exchanges the code.
  const state = issueOauthState(res);
  passport.authenticate("google", { scope: ["profile", "email"], state })(req, res, next);
});

router.get(
  "/google/callback",
  verifyOauthState,
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  authController.googleCallback,
);

module.exports = router;
