const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user.model");

// AR-14: Google OAuth is an OPTIONAL login provider. Constructing the
// strategy unconditionally made the whole API fail to boot whenever
// GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET were absent. Register it only
// when both are configured; otherwise log one clear line and boot
// without Google login.
let googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
// OA-1 fix (AR-32 completion): BACKEND_URL has no fallback any more, but
// requireAtUse must NOT be called unguarded at import time - the draft
// did, so importing this module with Google configured and BACKEND_URL
// unset THREW (breaking tests/audit/oauth-passport.test.js at require
// time and violating appConfig's no-import-time-throw rule). Mirror the
// AR-14 pattern instead: Google is disabled with a loud log line naming
// the missing variable; in production server.js validateEnv() has
// already exited(1) naming BACKEND_URL before this module is reached.
let googleCallbackURL = null;
if (googleConfigured) {
  try {
    googleCallbackURL = `${require("./appConfig").requireAtUse("BACKEND_URL")}/api/v1/auth/google/callback`;
  } catch {
    googleConfigured = false;
    console.warn("[Auth] Google OAuth disabled: BACKEND_URL is not configured - set BACKEND_URL in the environment (see .env.example) to enable Google login.");
  }
}
if (!googleConfigured && !googleCallbackURL) {
  // (the BACKEND_URL branch above already logged its specific reason)
  if (!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)) {
    console.warn("[Auth] Google OAuth disabled: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET not set - Google login routes will return an error until both are configured.");
  }
}

if (googleConfigured) passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: googleCallbackURL,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          if (user.role === "admin") {
            return done(new Error("Admins are not allowed to log in via Google OAuth. Please use the Admin Portal."), null);
          }
          // AR-23: updateLoginActivity persists atomically itself;
          // no whole-document save() for login bookkeeping.
          await user.updateLoginActivity();
          return done(null, user);
        }

        // Beyond this point the account is matched (or created) by EMAIL,
        // which is only safe when Google has verified that the user owns
        // the address. Linking on an unverified email claim allowed anyone
        // able to assert a victim's address to take over the victim's
        // existing account (A-02). Profiles may also omit email/name
        // entirely; dereferencing them unguarded crashed the callback
        // with a TypeError (A-13).
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(null, false, { message: "Google did not provide an email address for this account." });
        }
        const emailVerified = profile._json?.email_verified === true || profile._json?.email_verified === "true";
        if (!emailVerified) {
          return done(null, false, { message: "Google has not verified this email address." });
        }

        user = await User.findOne({ email });

        if (user) {
          if (user.role === "admin") {
            return done(new Error("Admins are not allowed to log in via Google OAuth. Please use the Admin Portal."), null);
          }
          user.googleId = profile.id;
          user.isEmailVerified = true;
          await user.save({ validateBeforeSave: false });
          // AR-23: login bookkeeping persists atomically on its own.
          await user.updateLoginActivity();
          return done(null, user);
        }

        const displayNameParts = typeof profile.displayName === "string" ? profile.displayName.split(" ") : [];
        user = await User.create({
          googleId: profile.id,
          email,
          firstName:
            profile.name?.givenName || displayNameParts[0] || "",
          lastName:
            profile.name?.familyName || displayNameParts[1] || "",
          avatar: profile.photos?.[0]?.value || null,
          isEmailVerified: true,
        });

        // AR-23: create() already persisted the user; login
        // bookkeeping now persists atomically on its own.
        await user.updateLoginActivity();

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
