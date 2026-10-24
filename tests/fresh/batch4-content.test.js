// Batch 4 (FRESH remediation): FA-03, FA-11, FA-12, FA-71, FA-73, FA-57, FA-85.
// FA-03 tests are the converted fresh-audit PoC-02.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};

const BAD_URLS = ["javascript:alert(document.domain)", "JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>",
                  "vbscript:msgbox(1)", "//evil.example/x", "http:evil.example", "java\tscript:alert(1)"];
const GOOD_URLS = ["https://example.com/x", "http://example.com/a?b=1", "/shop", "/promotions/summer-sale"];

test("FA-03 (PoC-02): announcement validators reject dangerous URL schemes", () => {
  const v = require(path.join(repo, "validators/announcement.validator.js"));
  const schema = v.createAnnouncementSchema;
  const base = { title: "t", content: "c" };
  for (const url of BAD_URLS) {
    assert.ok(schema.validate({ ...base, actionUrl: url }).error, `create actionUrl must reject ${url}`);
    assert.ok(schema.validate({ ...base, imageUrl: url }).error, `create imageUrl must reject ${url}`);
  }
  for (const url of GOOD_URLS) {
    assert.equal(schema.validate({ ...base, actionUrl: url }).error, undefined, `create actionUrl must accept ${url}`);
  }
  const upd = v.updateAnnouncementSchema;
  for (const url of BAD_URLS) assert.ok(upd.validate({ actionUrl: url }).error, `update must reject ${url}`);
});

test("FA-03: promotion validators reject dangerous URL schemes", () => {
  const v = require(path.join(repo, "validators/promotion.validator.js"));
  const create = v.createPromotionSchema;
  const base = { title: "t", description: "d" };
  for (const url of BAD_URLS) {
    assert.ok(create.validate({ ...base, actionUrl: url }).error, `create actionUrl must reject ${url}`);
    assert.ok(create.validate({ ...base, imageUrl: url }).error, `create imageUrl must reject ${url}`);
  }
  for (const url of GOOD_URLS) assert.equal(create.validate({ ...base, actionUrl: url }).error, undefined);
  const upd = v.updatePromotionSchema;
  for (const url of BAD_URLS) assert.ok(upd.validate({ actionUrl: url }).error, `update must reject ${url}`);
});

test("FA-71: ctaButton enforces a safe href and escapes the label itself", () => {
  const email = require(path.join(repo, "services/email.service.js"));
  const evil = email.ctaButton("javascript:alert(1)", "<img src=x onerror=alert(1)>");
  assert.ok(!evil.includes("javascript:"), "href neutralized");
  assert.ok(!evil.includes("<img"), "label escaped");
  const good = email.ctaButton("https://aurainteriors.live/shop", "Browse");
  assert.ok(good.includes('href="https://aurainteriors.live/shop"'));
});

test("FA-73: NotificationService stores only safe actionUrls", async () => {
  let created = null;
  stub("models/notification.model.js", { create: async (p) => { created = p; return p; }, findOne: async () => null });
  stub("models/user.model.js", {});
  const svc = require(path.join(repo, "services/notificationService.js"));
  const instance = svc.createNotification ? svc : svc.default;
  const call = instance.createNotification.bind(instance);
  await call({ recipient: "u1", type: "system", title: "t", message: "m", actionUrl: "javascript:alert(1)" });
  assert.equal(created.actionUrl, null);
  await call({ recipient: "u1", type: "system", title: "t", message: "m", actionUrl: "/orders/123" });
  assert.equal(created.actionUrl, "/orders/123");
});

test("FA-11: contact submissions are stored as plain text (tags stripped)", async () => {
  let saved = null;
  stub("models/contact.model.js", { create: async (doc) => { saved = doc; return { _id: "c1", ...doc }; } });
  stub("services/email.service.js", { sendContactResponseEmail: () => {} });
  stub("services/notificationEventEmitter.js", { emit: () => {} });
  const controller = require(path.join(repo, "controllers/contact.controller.js"));
  const req = { body: { name: "Eve <script>alert(1)</script>", email: "eve@example.com", subject: "Hi <b>there</b>", message: "line <img src=x onerror=alert(1)> end" } };
  const res = { status: () => ({ json: () => {} }) };
  await controller.submitContact(req, res, (e) => { throw e; });
  assert.ok(!/<[a-z/]/i.test(saved.name), `name stripped: ${saved.name}`);
  assert.ok(!/<[a-z/]/i.test(saved.subject));
  assert.ok(!/<[a-z/]/i.test(saved.message));
  assert.ok(saved.message.includes("line") && saved.message.includes("end"), "text content preserved");
});

test("FA-85: contact model email uses real validation with a 254 cap", async () => {
  delete require.cache[path.join(repo, "models/contact.model.js")]; // FA-11 test stubbed it
  const Contact = require(path.join(repo, "models/contact.model.js"));
  const bad = new Contact({ name: "A", email: "not-an-email", subject: "s", message: "m" });
  await assert.rejects(() => bad.validate(), /valid email/i);
  const long = new Contact({ name: "A", email: "a".repeat(250) + "@example.com", subject: "s", message: "m" });
  await assert.rejects(() => long.validate(), /254/);
  const ok = new Contact({ name: "A", email: "user@example.com", subject: "s", message: "m" });
  await ok.validate();
});
