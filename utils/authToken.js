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
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (await RevokedToken.exists({ _id: hash(token) })) throw new Error("Session revoked");
  return decoded;
};
module.exports = { hash, extract, verify };
