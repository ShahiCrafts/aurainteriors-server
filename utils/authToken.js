const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/revokedToken.model");
const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Session surface scoping lives in utils/authSurface.js (kept
// dependency-light for isolated test harnesses); extraction below is
// surface-aware through it: each app only ever presents its own
// surface's cookie ("jwt" storefront, "jwt_admin" admin).
const {
  COOKIE_BY_SURFACE,
  surfaceOf,
  cookieNameForSurface,
  cookieNameForRequest,
} = require("./authSurface");

const extract = (req) => {
  const bearer = req.headers?.authorization;
  if (typeof bearer === "string" && bearer.startsWith("Bearer "))
    return bearer.slice(7);
  const name = cookieNameForRequest(req);
  if (req.cookies?.[name]) return req.cookies[name];
  const cookie = req.headers?.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`));
  try {
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
};
const verify = async (token) => {
  // Pin the algorithm: tokens are issued HS256-only (see signToken).
  // Without this, verification accepts any algorithm the library
  // supports for the key type (A-10).
  // FA-18: issuer/audience are issued on all new tokens and are
  // ENFORCED by default (owner-approved 2026-10-23). Tokens minted
  // before the claims existed therefore stop verifying - one forced
  // re-login. JWT_REQUIRE_ISS_AUD=0 restores the migration-window
  // behavior if it is ever needed as an escape hatch.
  const options = { algorithms: ["HS256"] };
  if (require("../config/appConfig").getString("JWT_REQUIRE_ISS_AUD") !== "0") {
    options.issuer = "aura-interiors";
    options.audience = "aura-interiors-api";
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET, options);
  if (await RevokedToken.exists({ _id: hash(token) }))
    throw new Error("Session revoked");
  return decoded;
};
module.exports = {
  hash,
  extract,
  verify,
  surfaceOf,
  cookieNameForSurface,
  cookieNameForRequest,
  COOKIE_BY_SURFACE,
};
