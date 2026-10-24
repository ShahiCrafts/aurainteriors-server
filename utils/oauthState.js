const crypto = require("crypto");

// OAuth `state` for the Google sign-in flow (A-01).
//
// The app has no session middleware (the OAuth callback runs with
// session:false), so passport's session-backed state store cannot be
// used. Instead the state value is bound to the browser with a
// short-lived HttpOnly cookie and verified by middleware before the
// callback reaches passport: passport-oauth2 forwards a string `state`
// option to Google as-is, and its NullStateStore accepts any returned
// state, so the check here is the actual CSRF enforcement. Without it,
// an attacker could capture a callback URL for their own Google
// account and trick a victim's browser into completing it (login CSRF).
const OAUTH_STATE_COOKIE = "oauth_state";
const COOKIE_PATH = "/api/v1/auth";
const MAX_AGE_MS = 10 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: (process.env.NODE_ENV || "").trim().toLowerCase() === "production",
  // Lax (not Strict): the cookie must survive the cross-site top-level
  // GET redirect back from Google. None would also work but would
  // weaken CSRF posture for no benefit here.
  sameSite: "lax",
  path: COOKIE_PATH,
});

exports.issueOauthState = (res) => {
  const state = crypto.randomBytes(32).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, { ...cookieOptions(), maxAge: MAX_AGE_MS });
  return state;
};

exports.verifyOauthState = (req, res, next) => {
  const expected = req.cookies?.[OAUTH_STATE_COOKIE];
  const provided = typeof req.query?.state === "string" ? req.query.state : "";
  // Single-use: clear before checking so a captured callback cannot replay.
  res.clearCookie(OAUTH_STATE_COOKIE, cookieOptions());
  const ok =
    typeof expected === "string" &&
    expected.length > 0 &&
    provided.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!ok) {
    return res.status(403).json({
      status: "fail",
      message: "Invalid OAuth state. Please restart sign-in.",
    });
  }
  return next();
};

exports.OAUTH_STATE_COOKIE = OAUTH_STATE_COOKIE;
