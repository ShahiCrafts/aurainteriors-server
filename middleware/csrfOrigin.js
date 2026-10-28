// FA-08 / FA-74 (FRESH): strict Origin verification for cookie-authenticated
// state-changing requests. The session cookie is SameSite=None in
// production, so this check is the CSRF defense for cookie auth.
//
// Rules:
// - Safe methods (GET/HEAD/OPTIONS) pass.
// - Requests WITHOUT a jwt cookie pass (they are not cookie-authenticated;
//   Bearer-token clients are not CSRF-able in the same way).
// - A cookie-authenticated non-safe request must carry an Origin (or
//   Referer) whose origin is allowlisted. FA-74: an Authorization header
//   no longer skips the check - the browser attaches the cookie alongside
//   any header, so the old bypass voided the defense whenever a client
//   sent both.
// - Server-to-server endpoints (payment/provider callbacks) must NOT be
//   added here lightly; today there are no POST server-to-server routes
//   (the eSewa returns are GETs). EXEMPT_PREFIXES stays empty until one
//   exists, and any addition needs its own signature verification.
const EXEMPT_PREFIXES = [];

function originOf(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function createOriginCheck(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const cookieHeader = req.headers.cookie || "";
    if (!/(?:^|;\s*)jwt=/.test(cookieHeader)) return next();
    if (EXEMPT_PREFIXES.some((prefix) => req.path?.startsWith(prefix)))
      return next();
    const origin =
      originOf(req.headers.origin) || originOf(req.headers.referer);
    if (!origin || !allowed.has(origin)) {
      return res
        .status(403)
        .json({
          status: "fail",
          message: "Trusted origin required for cookie authentication.",
        });
    }
    return next();
  };
}

module.exports = { createOriginCheck, EXEMPT_PREFIXES };
