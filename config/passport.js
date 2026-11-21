const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user.model");

let googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
let googleCallbackURL = null;
if (googleConfigured) {
  try {
    googleCallbackURL = `${require("./appConfig").requireAtUse("BACKEND_URL")}/api/v1/auth/google/callback`;
  } catch {
    googleConfigured = false;
    console.warn(
      "[Auth] Google OAuth disabled: BACKEND_URL is not configured - set BACKEND_URL in the environment (see .env.example) to enable Google login.",
    );
  }
}
if (!googleConfigured && !googleCallbackURL) {
  // (the BACKEND_URL branch above already logged its specific reason)
  if (!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)) {
    console.warn(
      "[Auth] Google OAuth disabled: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET not set - Google login routes will return an error until both are configured.",
    );
  }
}

// Batch 2: the verify callback is a named function so the strategy
// can be (re)registered after the DB connects with admin-Settings
// credentials (see initGoogleOAuthFromSettings below). Behaviour of
// the callback itself is unchanged.
async function googleVerifyCallback(accessToken, refreshToken, profile, done) {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            if (user.role === "admin") {
              return done(
                new Error(
                  "Admins are not allowed to log in via Google OAuth. Please use the Admin Portal.",
                ),
                null,
              );
            }
            await user.updateLoginActivity();
            return done(null, user);
          }

          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false, {
              message:
                "Google did not provide an email address for this account.",
            });
          }
          const emailVerified =
            profile._json?.email_verified === true ||
            profile._json?.email_verified === "true";
          if (!emailVerified) {
            return done(null, false, {
              message: "Google has not verified this email address.",
            });
          }

          user = await User.findOne({ email });

          if (user) {
            if (user.role === "admin") {
              return done(
                new Error(
                  "Admins are not allowed to log in via Google OAuth. Please use the Admin Portal.",
                ),
                null,
              );
            }
            user.googleId = profile.id;
            user.isEmailVerified = true;
            await user.save({ validateBeforeSave: false });
            await user.updateLoginActivity();
            return done(null, user);
          }

          const displayNameParts =
            typeof profile.displayName === "string"
              ? profile.displayName.split(" ")
              : [];
          user = await User.create({
            googleId: profile.id,
            email,
            firstName: profile.name?.givenName || displayNameParts[0] || "",
            lastName: profile.name?.familyName || displayNameParts[1] || "",
            avatar: profile.photos?.[0]?.value || null,
            isEmailVerified: true,
          });

          await user.updateLoginActivity();

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
}

let googleRegisteredSignature = null;
function registerGoogleStrategy(clientID, clientSecret, callbackURL) {
  const signature = `${clientID}|${callbackURL}`;
  if (signature === googleRegisteredSignature) return false;
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        proxy: true,
      },
      googleVerifyCallback,
    ),
  );
  googleRegisteredSignature = signature;
  return true;
}

if (googleConfigured) {
  registerGoogleStrategy(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackURL,
  );
}

// Batch 2: settings-backed Google OAuth registration.
//
// Boot order (server.js): config/passport is required (via ./app)
// BEFORE mongoose connects, but startServer() awaits
// connectDatabase() before listen() — so this async init, called
// from startServer() after the DB connects, can still register the
// strategy before any request arrives. passport.use() with the same
// strategy name replaces the env-registered one. Resolution:
// clientId from the RAW stored settings doc (integrations.google)
// else env; secret via getResolvedSecret('auth.googleSecret')
// (admin else env). Any failure leaves the env registration (or the
// disabled state) exactly as at load. NOTE: this runs once at boot —
// changing Google credentials in admin afterwards still requires a
// server restart to take effect.
async function initGoogleOAuthFromSettings() {
  try {
    const settingsService = require("../services/settings/settingsService");
    if (!settingsService.isDbReady()) return false;
    const raw = await settingsService.getRawStoredData();
    const savedClientId =
      raw &&
      raw.integrations &&
      raw.integrations.google &&
      typeof raw.integrations.google.clientId === "string" &&
      raw.integrations.google.clientId.trim()
        ? raw.integrations.google.clientId.trim()
        : null;
    const clientID = savedClientId || process.env.GOOGLE_CLIENT_ID;
    const secretsService = require("../services/settings/secretsService");
    const clientSecret = await secretsService
      .getResolvedSecret("auth.googleSecret")
      .catch(() => null);
    if (!clientID || !clientSecret) return false;
    let callbackURL = googleCallbackURL;
    if (!callbackURL) {
      try {
        callbackURL = `${require("./appConfig").requireAtUse("BACKEND_URL")}/api/v1/auth/google/callback`;
      } catch {
        return false;
      }
    }
    const changed = registerGoogleStrategy(clientID, clientSecret, callbackURL);
    if (changed) {
      googleConfigured = true;
      googleCallbackURL = callbackURL;
      console.log(
        "[Auth] Google OAuth strategy registered from admin Settings/env resolution.",
      );
    }
    return changed;
  } catch {
    return false;
  }
}

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
module.exports.initGoogleOAuthFromSettings = initGoogleOAuthFromSettings;
module.exports._registerGoogleStrategy = registerGoogleStrategy;
