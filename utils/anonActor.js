// FA-25 (FRESH): a stable anonymous actor identity for engagement
// deduplication. The id is random; the cookie carries an HMAC signature
// (keyed with the session secret, domain-separated) so clients cannot
// mint fresh identities at will to inflate counters - rotating or
// forging the cookie just fails verification and a new id is issued.
const crypto = require("crypto");
const appConfig = require("../config/appConfig");

const COOKIE = "aura_anon";
// Lead review item 2 (2026-10-24): the || "dev-anon-key" fallback signed the
// FA-25 guest-dedup cookie with a PUBLIC constant whenever JWT_SECRET was
// unset - anyone knowing the constant could mint valid aura_anon cookies and
// inflate blog view/engagement counters at will. Per the owner's
// no-silent-fallbacks directive the secret now routes through the validated
// registry; a missing JWT_SECRET fails LOUDLY, naming the variable, at the
// first signing/verification attempt (boot already refuses production
// without it via requiredProd). No import-time throw: requiring this module
// never touches the secret, so test harnesses and library-style imports
// keep working.
const sign = (id) =>
  crypto
    .createHmac("sha256", appConfig.requireAtUse("JWT_SECRET"))
    .update(`anon:${id}`)
    .digest("base64url");

function actorFor(req, res) {
  if (req.user?._id) return `user:${req.user._id}`;
  const raw = req.cookies?.[COOKIE];
  if (typeof raw === "string") {
    const [id, sig] = raw.split(".");
    const expected = id ? sign(id) : "";
    if (
      /^[a-f0-9]{32}$/.test(id || "") &&
      sig &&
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return `anon:${id}`;
    }
  }
  const id = crypto.randomBytes(16).toString("hex");
  if (res?.cookie) {
    res.cookie(COOKIE, `${id}.${sign(id)}`, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        (process.env.NODE_ENV || "").trim().toLowerCase() === "production",
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }
  return `anon:${id}`;
}

module.exports = { actorFor };
