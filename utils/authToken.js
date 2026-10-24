const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/revokedToken.model");
const hash = token => crypto.createHash("sha256").update(token).digest("hex");
const extract = req => {
  const bearer = req.headers?.authorization;
  if (typeof bearer === "string" && bearer.startsWith("Bearer ")) return bearer.slice(7);
  if (req.cookies?.jwt) return req.cookies.jwt;
  const cookie = req.headers?.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith("jwt="));
  try { return cookie ? decodeURIComponent(cookie.slice(4)) : null; } catch { return null; }
};
const verify = async token => {
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
  if (await RevokedToken.exists({ _id: hash(token) })) throw new Error("Session revoked");
  return decoded;
};
module.exports = { hash, extract, verify };
