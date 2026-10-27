"use strict";
// PERF-B-01: anonymous public caching for catalog/category/product
// GET responses. These endpoints serve identical payloads to every
// anonymous visitor, so a shared cache (browser or CDN) may reuse a
// response for 60s and revalidate in the background for up to 300s.
// The header is set ONLY when the request carries no credential at
// all — no Authorization header and no jwt cookie — so a response
// rendered for a signed-in user (e.g. an admin's ?includeInactive or
// draft-status view via protectOptional) is never marked public.
// ETag: Express enables ETag generation by default and app.js does
// not disable it, so conditional requests (If-None-Match -> 304) are
// handled by Express without extra code here.
module.exports = function publicCache(req, res, next) {
  if (req.method !== "GET") return next();
  const hasAuthorization = Boolean(req.headers && req.headers.authorization);
  const cookieHeader = (req.headers && req.headers.cookie) || "";
  const hasJwtCookie = /(?:^|;\s*)jwt=/.test(cookieHeader);
  if (!hasAuthorization && !hasJwtCookie) {
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    );
  }
  return next();
};
