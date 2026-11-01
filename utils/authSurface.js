// Session surface scoping (2026-11-01).
//
// The storefront (aurainteriors.live) and the admin panel
// (admin.aurainteriors.live) are separate apps served by this one
// API, and browser cookies are keyed by THIS host — not by the
// calling app. A single shared "jwt" cookie therefore made the two
// sessions overwrite each other in the same browser: completing the
// admin sign-in replaced the customer session, so the storefront
// suddenly showed the admin account (and an admin logout killed the
// customer session too). Each surface now owns a cookie name — the
// storefront keeps the historical "jwt" (existing customer sessions
// are untouched); the admin surface uses "jwt_admin" — so both
// sessions coexist and each app only ever reads and clears its own.
//
// The surface of a request is resolved from its Origin header
// (Referer as fallback), which browsers always send on cross-origin
// API calls and socket handshakes and cannot spoof: "admin" when the
// origin equals the configured ADMIN_URL or its host is an "admin."
// subdomain. Every other request — including origin-less ones (curl,
// server-to-server, tests) — is the customer surface, exactly the
// pre-scoping behaviour.
//
// This module is deliberately dependency-light (appConfig only): it
// is loaded by controllers in isolation by test harnesses that stub
// the heavier authToken module (which pulls in mongoose models).
const appConfig = require("../config/appConfig");

const COOKIE_BY_SURFACE = { customer: "jwt", admin: "jwt_admin" };

const originOf = (value) => {
  if (typeof value !== "string" || !value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const surfaceOf = (req) => {
  const headers = req?.headers || {};
  const origin = originOf(headers.origin) || originOf(headers.referer);
  if (!origin) return "customer";
  const adminOrigin = originOf(appConfig.getString("ADMIN_URL"));
  if (adminOrigin && origin === adminOrigin) return "admin";
  try {
    if (new URL(origin).hostname.startsWith("admin.")) return "admin";
  } catch {
    // origin was produced by originOf above, so this cannot throw;
    // the guard only keeps a hostile header from ever crashing auth.
  }
  return "customer";
};

const cookieNameForSurface = (surface) =>
  COOKIE_BY_SURFACE[surface] || COOKIE_BY_SURFACE.customer;
const cookieNameForRequest = (req) => cookieNameForSurface(surfaceOf(req));

module.exports = {
  COOKIE_BY_SURFACE,
  originOf,
  surfaceOf,
  cookieNameForSurface,
  cookieNameForRequest,
};
