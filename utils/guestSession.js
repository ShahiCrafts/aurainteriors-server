// Guest-session credential handling (VULN-001 / VULN-009 remediation).
//
// ONE extraction policy for the guest-session bearer credential, shared
// by every chat path (chat.controller handlers AND the chat-upload
// authoriser in middleware/chatUpload.middleware.js). Previously the
// upload authoriser read req.query.guestSessionId directly, bypassing
// the FA-33 gate below.
//
// FA-33: bearer credentials do not belong in URLs (they leak into logs,
// history and Referer headers). Owner-approved 2026-10-23: the
// query-string source is OFF by default and accepted only when
// GUEST_SESSION_ALLOW_QUERY=1 (a legacy escape hatch for a client that
// provably needs it). Header/cookie/body are always accepted and take
// precedence. See OWNER_DECISIONS.md (D-3, decided).
const getGuestSessionId = (req) => {
  const fromQuery = require("../config/appConfig").getString("GUEST_SESSION_ALLOW_QUERY") === "1" ? req.query?.guestSessionId : undefined;
  return req.headers?.['x-guest-session-id'] || req.cookies?.guestSessionId || req.body?.guestSessionId || fromQuery;
};

// Production check, normalised exactly like auth.controller's
// isProduction() ("Production" / " production " still mean production).
const isProduction = () => (process.env.NODE_ENV || "").trim().toLowerCase() === "production";

// VULN-009: the server — not page script — sets the guest-session
// cookie, so the credential is httpOnly (unreadable by any script on
// the origin), Secure in production, and SameSite=Lax. The 24h maxAge
// matches the lifetime the web client previously used for its
// script-set cookie. The public key itself is still returned in the
// startChat response body for header use during the page session.
const GUEST_SESSION_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const setGuestSessionCookie = (res, sessionId) => {
  if (!res || typeof res.cookie !== "function" || typeof sessionId !== "string" || !sessionId) return;
  res.cookie("guestSessionId", sessionId, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_SESSION_COOKIE_MAX_AGE_MS,
  });
};

module.exports = { getGuestSessionId, setGuestSessionCookie, isProduction };
