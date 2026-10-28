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

if (googleConfigured)
  passport.use(
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
      },
    ),
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
