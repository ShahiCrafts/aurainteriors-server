// A-15 — the recipient email was interpolated unescaped into the
// magic-link email HTML ("Hi ${email}"), while the rest of the module
// escapes user data. An address containing HTML metacharacters could
// inject markup into a transactional email.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

let sentBodies;
stubModule("axios", {
  create: () => ({
    post: async (url, body) => {
      sentBodies.push(body);
      return { data: { messageId: "stub-1" } };
    },
  }),
});
process.env.EMAIL_FROM =
  process.env.EMAIL_FROM || '"Aura Interiors <noreply@example.com>"'; // OA-1: no fallback remains - tests set it explicitly
process.env.EMAIL_LOGO_URL =
  process.env.EMAIL_LOGO_URL || "https://example.test/aura-logo.png"; // lead review item 3: logo has no hardcoded fallback either
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "https://example.test";
const emailService = require("../../services/email.service");

test("A-15: the magic-link email escapes the recipient address in HTML", async () => {
  sentBodies = [];
  await emailService.sendMagicLinkEmail(
    "a<b>@x.io",
    "https://example.test/auth/verify?token=abc123",
  );
  assert.equal(sentBodies.length, 1);
  const html = sentBodies[0].htmlContent;
  assert.ok(
    !html.includes("Hi a<b>@x.io"),
    "raw HTML metacharacters from the address must not reach the email",
  );
  assert.ok(
    html.includes("a&lt;b&gt;@x.io"),
    "the address should appear HTML-escaped",
  );
});
