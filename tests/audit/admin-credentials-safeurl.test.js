// Phase 3 (testing programme): direct unit batteries for two
// zero-coverage helpers —
//   utils/adminCredentials.js (auth: operator credential gate) and
//   utils/safeUrl.js          (SSRF/XSS-adjacent URL rule, FA-03/73).
// Dummy values only, assembled at runtime; no real env is read
// (each test sets and restores the two ADMIN_* keys itself).
const test = require("node:test");
const assert = require("node:assert/strict");

const { getAdminCredentials } = require("../../utils/adminCredentials");
const {
  isSafeUrlValue,
  sanitizeActionUrl,
  joiSafeUrl,
} = require("../../utils/safeUrl");

// ---------- adminCredentials ----------

const EMAIL_KEY = ["ADMIN", "EMAIL"].join("_");
const PASSWORD_KEY = ["ADMIN", "PASSWORD"].join("_");
const strongSecret = ["correct", "horse", "battery", "staple", "42"].join("-");

function withAdminEnv(email, password, fn) {
  const prevEmail = process.env[EMAIL_KEY];
  const prevPassword = process.env[PASSWORD_KEY];
  if (email === undefined) delete process.env[EMAIL_KEY];
  else process.env[EMAIL_KEY] = email;
  if (password === undefined) delete process.env[PASSWORD_KEY];
  else process.env[PASSWORD_KEY] = password;
  try {
    return fn();
  } finally {
    if (prevEmail === undefined) delete process.env[EMAIL_KEY];
    else process.env[EMAIL_KEY] = prevEmail;
    if (prevPassword === undefined) delete process.env[PASSWORD_KEY];
    else process.env[PASSWORD_KEY] = prevPassword;
  }
}

test("should return the credentials when email is valid and the secret is strong", () => {
  withAdminEnv("Admin@Example.com", strongSecret, () => {
    const creds = getAdminCredentials();
    assert.equal(creds.email, "admin@example.com", "email is normalised");
    assert.equal(creds.password, strongSecret);
  });
});

test("should trim and lowercase the email when it has surrounding whitespace and capitals", () => {
  withAdminEnv("  Ops@Example.COM  ", strongSecret, () => {
    assert.equal(getAdminCredentials().email, "ops@example.com");
  });
});

test("should throw when the admin email is missing or malformed", () => {
  for (const email of [undefined, "", "not-an-email", "a@b", "a b@c.com"]) {
    withAdminEnv(email, strongSecret, () => {
      assert.throws(
        () => getAdminCredentials(),
        /valid ADMIN_EMAIL is required/,
        `email ${JSON.stringify(email)} must be rejected`,
      );
    });
  }
});

test("should throw when the secret is missing, too short, or too long", () => {
  for (const password of [undefined, "", "short", "x".repeat(15), "y".repeat(129)]) {
    withAdminEnv("admin@example.com", password, () => {
      assert.throws(
        () => getAdminCredentials(),
        /ADMIN_PASSWORD must be an explicit strong secret/,
        `secret of length ${password ? password.length : "missing"} must be rejected`,
      );
    });
  }
});

test("should accept secrets at the 16 and 128 character boundaries", () => {
  for (const password of ["z".repeat(16), "z".repeat(128)]) {
    withAdminEnv("admin@example.com", password, () => {
      assert.equal(getAdminCredentials().password.length, password.length);
    });
  }
});

test("should throw when the secret is a well-known placeholder prefix", () => {
  for (const password of [
    ["password", "1234567890"].join(""),
    ["admin", "123456789012"].join(""),
    ["changeme", "12345678"].join(""),
    ["Replace", "WithRealOne1"].join(""),
    ["example", "secret-value-1"].join("-"),
  ]) {
    withAdminEnv("admin@example.com", password, () => {
      assert.throws(() => getAdminCredentials(), /not a placeholder/);
    });
  }
});

// ---------- safeUrl ----------

test("should accept absolute http and https URLs", () => {
  for (const url of [
    "https://example.com/path?q=1",
    "http://example.com",
    "HTTPS://EXAMPLE.COM/Upper",
  ]) {
    assert.equal(isSafeUrlValue(url), true, url);
  }
});

test("should accept site-relative paths with exactly one leading slash", () => {
  for (const url of ["/orders/123", "/", "/shop?categories=sofas"]) {
    assert.equal(isSafeUrlValue(url), true, url);
  }
});

test("should reject dangerous schemes and scheme tricks", () => {
  for (const url of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "ftp://example.com/x",
    "//evil.example.com/phish",
    "/\\evil.example.com",
    "\\\\evil.example.com",
    "https:example.com",
    "example.com/no-scheme",
  ]) {
    assert.equal(isSafeUrlValue(url), false, url);
  }
});

test("should reject internal whitespace, control characters and backslashes in the value", () => {
  for (const url of [
    "https://example.com/a b",
    "https://example.com/\tpath",
    "https://example.com/pa\nth",
    "/path\\with\\backslashes",
    "",
    "   ",
  ]) {
    assert.equal(isSafeUrlValue(url), false, JSON.stringify(url));
  }
});

test("should trim surrounding whitespace before applying the rule", () => {
  // The value is trimmed first, so a padded but otherwise valid URL
  // is accepted (and sanitizeActionUrl returns the original string).
  assert.equal(isSafeUrlValue("  https://example.com/x  "), true);
  assert.equal(isSafeUrlValue("  /orders  "), true);
});

test("should reject non-string values and over-length strings", () => {
  for (const value of [undefined, null, 42, {}, [], { $ne: "" }]) {
    assert.equal(isSafeUrlValue(value), false, String(value));
  }
  assert.equal(isSafeUrlValue("https://example.com/" + "a".repeat(2048)), false);
  assert.equal(isSafeUrlValue("/" + "a".repeat(100)), true);
});

test("sanitizeActionUrl should pass safe values through and null out unsafe or empty ones", () => {
  assert.equal(sanitizeActionUrl("https://example.com/x"), "https://example.com/x");
  assert.equal(sanitizeActionUrl("/orders"), "/orders");
  assert.equal(sanitizeActionUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeActionUrl("//evil.example.com"), null);
  assert.equal(sanitizeActionUrl(""), null);
  assert.equal(sanitizeActionUrl(null), null);
  assert.equal(sanitizeActionUrl(undefined), null);
  assert.equal(sanitizeActionUrl({ $ne: "" }), null);
});

test("joiSafeUrl should validate through Joi with the same rule and enforce max length", () => {
  const Joi = require("joi");
  const schema = Joi.object({ url: joiSafeUrl(Joi) });
  assert.equal(schema.validate({ url: "https://example.com" }).error, undefined);
  assert.equal(schema.validate({ url: "/relative" }).error, undefined);
  const bad = schema.validate({ url: "javascript:alert(1)" });
  assert.ok(bad.error, "dangerous scheme must fail Joi validation");
  assert.match(bad.error.message, /http\(s\) URL or a site-relative path/);
  const long = schema.validate({ url: "/" + "a".repeat(501) });
  assert.ok(long.error, "default 500-char cap must apply");
});
