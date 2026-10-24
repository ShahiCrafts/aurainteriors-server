const crypto = require("crypto");
// FA-28: newsletter tokens use a dedicated NEWSLETTER_TOKEN_SECRET so the
// two token families rotate independently. JWT_SECRET remains as a
// migration fallback only (set NEWSLETTER_TOKEN_SECRET in production -
// see SETUP_NOTES.md); tokens issued under one key do not verify under
// the other, so set the new key before the next mailing.
const secret = () => {
  const key = process.env.NEWSLETTER_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!key) throw new Error("Newsletter signing key is missing");
  return key;
};
exports.issueNewsletterToken = (email, purpose, nonce, ttlMs) => {
  const payload = Buffer.from(JSON.stringify({ email, purpose, nonce, expiresAt: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret()).update(payload).digest("base64url")}`;
};
exports.verifyNewsletterToken = (token, purpose) => {
  if (typeof token !== "string" || token.length > 2048 || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(token)) throw new Error("Invalid newsletter link");
  const [payload, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error("Invalid newsletter link");
  const value = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (value.purpose !== purpose || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= Date.now() ||
      typeof value.email !== "string" || typeof value.nonce !== "string") throw new Error("Invalid newsletter link");
  return value;
};
