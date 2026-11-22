// Batch 4 (Store Operations) — server tests:
//   (1) commerce/chat/notifications defaults mirror today's behaviour
//       (free shipping, no VAT, no minimum, order prefix "", low-stock
//       threshold 10, template subjects = the current email subjects).
//   (2) commerce validation (closed sets, VAT cap, zone rules).
//   (3) public projection carries the display fields and keeps
//       orderPrefix / lowStockThreshold / templates admin-side.
//   (4) commerceTotals: zone matching, delivery fee, VAT.
//   (5) emailTemplates rendering + email.service composition parity
//       (subjects + key strings identical at default templates).
//   (6) POST /admin/settings/test-email route (401/403/200/400/502).
//
// Style follows tests/settings/batch3d.test.js: models/services are
// stubbed through require.cache, no mongod needed.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const repo = path.resolve(__dirname, "../..");
const abs = (rel) => path.join(repo, rel);

process.env.SETTINGS_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env["JWT_" + "SECRET"] = "test-only-" + "jwt-" + "secret";
process.env.EMAIL_FROM = "Aura Interiors <noreply@example.test>";
process.env.FRONTEND_URL = "https://frontend.example.test";

function leanable(value) {
  return {
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
}

function makeSettingsModel() {
  let doc = null;
  return {
    _reset: () => {
      doc = null;
    },
    _doc: () => doc,
    findOne: () => leanable(doc),
    create: async (obj) => {
      doc = {
        ...obj,
        async save() {
          return this;
        },
      };
      return doc;
    },
  };
}

const settingsModel = makeSettingsModel();
const auditCalls = [];

function stub(rel, exports) {
  const p = abs(rel);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
}

stub("models/siteSettings.model.js", settingsModel);
stub("models/integrationSecret.model.js", {
  findOne: () => leanable(null),
  find: () => leanable([]),
});
stub("services/auditLog.service.js", {
  record: async (entry) => {
    auditCalls.push(entry);
    return entry;
  },
  redact: (x) => x,
});
// settingsService.isDbReady() reads mongoose.connection.readyState —
// present a connected mongoose so resolvers take the settings path.
require.cache[require.resolve("mongoose")] = {
  id: "mongoose",
  filename: "mongoose",
  loaded: true,
  exports: { connection: { readyState: 1 } },
};

const { DEFAULT_SETTINGS } = require(abs("services/settings/defaults"));
const settingsService = require(abs("services/settings/settingsService"));
const commerceTotals = require(abs("services/commerceTotals.service"));
const emailTemplates = require(abs("services/settings/emailTemplates"));
const AppError = require(abs("utils/AppError"));

function resetAll() {
  settingsModel._reset();
  auditCalls.length = 0;
  emailTemplates._resetCache();
}

const ADMIN = { _id: "admin1" };

// ---------- (1) defaults mirror today ----------

test("defaults: commerce mirrors today's free-shipping / no-VAT / NPR behaviour", () => {
  const c = DEFAULT_SETTINGS.commerce;
  assert.equal(c.currency, "NPR");
  assert.equal(c.currencySymbol, "NPR");
  assert.equal(c.symbolPosition, "before");
  assert.equal(c.numberFormat, "en-NP");
  assert.equal(c.dateFormat, "M/D/YYYY");
  assert.equal(c.timezone, "Asia/Kathmandu");
  assert.equal(c.freeShippingThreshold, 5000);
  assert.equal(c.shipping.enabled, true);
  assert.deepEqual(
    c.shipping.zones.map((z) => [z.name, z.rate, z.enabled]),
    [
      ["Kathmandu Valley", 0, true],
      ["Other Nepal", 0, true],
      ["International", 0, false],
    ],
  );
  assert.equal(c.shipping.defaultZone, "Other Nepal");
  assert.equal(c.tax.vatEnabled, false);
  assert.equal(c.tax.vatRate, 13);
  assert.equal(c.orders.orderPrefix, "");
  assert.equal(c.orders.lowStockThreshold, 10);
  assert.equal(c.orders.minimumOrderAmount, 0);
});

test("defaults: chat additions start empty (widget unchanged)", () => {
  assert.equal(DEFAULT_SETTINGS.chat.offlineMessage, "");
  assert.equal(DEFAULT_SETTINGS.chat.businessHours, "");
});

test("defaults: template subjects render to the CURRENT email subjects", () => {
  const t = DEFAULT_SETTINGS.notifications.templates;
  const vars = { store_name: "Aura Interiors" };
  assert.equal(
    emailTemplates.renderTemplateText(t.orderConfirmation.subject, vars),
    "Your Aura Interiors Order Has Been Confirmed! 🎉",
  );
  assert.equal(
    emailTemplates.renderTemplateText(t.accountWelcome.subject, vars),
    "Welcome to Aura Interiors",
  );
  assert.equal(
    emailTemplates.renderTemplateText(t.magicLink.subject, vars),
    "Your sign-in link for Aura Interiors",
  );
  // Bodies carry the current copy's key sentences.
  assert.ok(t.orderConfirmation.body.includes("Thank you for shopping with"));
  assert.ok(t.accountWelcome.body.includes("Your account is ready."));
  assert.ok(t.magicLink.body.includes("expires in 15 minutes"));
});

// ---------- (2) commerce validation ----------

test("commerce: full Store Operations payload round-trips", async () => {
  resetAll();
  const updated = await settingsService.updateSection(
    "commerce",
    {
      currency: "USD",
      currencySymbol: "$",
      symbolPosition: "after",
      numberFormat: "de-DE",
      dateFormat: "DD/MM/YYYY",
      timezone: "Europe/London",
      shipping: {
        enabled: true,
        deliveryEstimateText: "Usually delivered in 2-5 business days.",
        zones: [
          { name: "Kathmandu Valley", rate: 150, enabled: true },
          { name: "Other Nepal", rate: 300, enabled: true },
        ],
        defaultZone: "Other Nepal",
      },
      tax: { vatEnabled: true, vatRate: 13 },
      orders: { orderPrefix: "#GUC", lowStockThreshold: 5, minimumOrderAmount: 500 },
    },
    ADMIN,
    "127.0.0.1",
  );
  assert.equal(updated.currency, "USD");
  assert.equal(updated.shipping.zones[0].rate, 150);
  assert.equal(updated.tax.vatEnabled, true);
  assert.equal(updated.orders.orderPrefix, "#GUC");
  // Untouched fields keep their defaults through the merge.
  assert.equal(updated.freeShippingThreshold, 5000);
});

test("commerce: closed sets and ranges are enforced", async () => {
  resetAll();
  const bad = [
    { currency: "BTC" },
    { symbolPosition: "middle" },
    { numberFormat: "fr-FR" },
    { dateFormat: "YYYY/MM/DD" },
    { timezone: "Mars/Olympus" },
    { tax: { vatRate: 101 } },
    { shipping: { zones: [{ name: "", rate: 0, enabled: true }] } },
    {
      shipping: {
        zones: [
          { name: "A", rate: 0, enabled: true },
          { name: "A", rate: 1, enabled: true },
        ],
      },
    },
    {
      shipping: {
        zones: [{ name: "A", rate: 0, enabled: true }],
        defaultZone: "Missing",
      },
    },
    { shipping: { zones: [{ name: "A", rate: -5, enabled: true }] } },
  ];
  for (const patch of bad) {
    await assert.rejects(
      settingsService.updateSection("commerce", patch, ADMIN, "127.0.0.1"),
      (err) => err instanceof AppError && err.statusCode === 400,
      `expected 400 for ${JSON.stringify(patch)}`,
    );
  }
});

// ---------- (3) public projection ----------

test("public projection: commerce display fields in, internals out", async () => {
  resetAll();
  const pub = await settingsService.getPublicSettings();
  assert.equal(pub.commerce.currency, "NPR");
  assert.equal(pub.commerce.shipping.defaultZone, "Other Nepal");
  assert.equal(pub.commerce.shipping.zones.length, 3);
  assert.equal(pub.commerce.tax.vatRate, 13);
  assert.equal(pub.commerce.orders.minimumOrderAmount, 0);
  assert.equal(pub.commerce.orders.orderPrefix, undefined);
  assert.equal(pub.commerce.orders.lowStockThreshold, undefined);
  assert.equal(pub.chat.offlineMessage, "");
  assert.equal(pub.chat.businessHours, "");
  assert.equal(pub.notifications, undefined);
});

// ---------- (4) commerceTotals ----------

const commerceWith = (overrides = {}) => {
  const base = structuredClone(DEFAULT_SETTINGS.commerce);
  return {
    ...base,
    ...overrides,
    shipping: { ...base.shipping, ...(overrides.shipping || {}) },
    tax: { ...base.tax, ...(overrides.tax || {}) },
    orders: { ...base.orders, ...(overrides.orders || {}) },
  };
};

const pricedCommerce = () =>
  commerceWith({
    shipping: {
      zones: [
        { name: "Kathmandu Valley", rate: 150, enabled: true },
        { name: "Other Nepal", rate: 300, enabled: true },
        { name: "International", rate: 1000, enabled: true },
      ],
    },
  });

test("zones: valley matches by city and by Bagmati state; others use default zone", () => {
  const c = pricedCommerce();
  assert.equal(
    commerceTotals.matchShippingZone(c, { city: "Kathmandu", state: "" }).name,
    "Kathmandu Valley",
  );
  assert.equal(
    commerceTotals.matchShippingZone(c, { city: "Lalitpur" }).name,
    "Kathmandu Valley",
  );
  assert.equal(
    commerceTotals.matchShippingZone(c, { city: "Banepa", state: "Bagmati" }).name,
    "Kathmandu Valley",
  );
  assert.equal(
    commerceTotals.matchShippingZone(c, { city: "Pokhara", state: "Gandaki" }).name,
    "Other Nepal",
  );
  assert.equal(
    commerceTotals.matchShippingZone(c, { city: "Delhi", country: "India" }).name,
    "International",
  );
  // Disabled International zone falls back to the default zone.
  const noIntl = commerceWith({
    shipping: {
      zones: [
        { name: "Kathmandu Valley", rate: 150, enabled: true },
        { name: "Other Nepal", rate: 300, enabled: true },
        { name: "International", rate: 1000, enabled: false },
      ],
    },
  });
  assert.equal(
    commerceTotals.matchShippingZone(noIntl, { city: "Delhi", country: "India" }).name,
    "Other Nepal",
  );
});

test("delivery fee: defaults are 0 everywhere; threshold boundary is free", () => {
  const address = { city: "Kathmandu", state: "Bagmati", country: "Nepal" };
  assert.equal(
    commerceTotals.computeDeliveryFee(DEFAULT_SETTINGS.commerce, address, 100),
    0,
  );
  const c = pricedCommerce();
  assert.equal(commerceTotals.computeDeliveryFee(c, address, 2000), 150);
  // Boundary: goods == threshold ships free; one rupee below pays.
  assert.equal(commerceTotals.computeDeliveryFee(c, address, 5000), 0);
  assert.equal(commerceTotals.computeDeliveryFee(c, address, 4999), 150);
  // Shipping disabled → no fee even with priced zones.
  const off = commerceWith({
    shipping: { enabled: false, zones: pricedCommerce().shipping.zones },
  });
  assert.equal(commerceTotals.computeDeliveryFee(off, address, 100), 0);
});

test("VAT: off by default; on adds rate% of goods, paisa-rounded", () => {
  assert.equal(commerceTotals.computeVat(DEFAULT_SETTINGS.commerce, 1000), 0);
  const on = commerceWith({ tax: { vatEnabled: true, vatRate: 13 } });
  assert.equal(commerceTotals.computeVat(on, 1000), 130);
  assert.equal(commerceTotals.computeVat(on, 999), 129.87);
});

test("resolveCommerceSettings: stored overrides win, empty store = defaults", async () => {
  resetAll();
  const fromDefaults = await commerceTotals.resolveCommerceSettings();
  assert.equal(fromDefaults.currency, "NPR");
  assert.equal(fromDefaults.tax.vatEnabled, false);

  await settingsService.updateSection(
    "commerce",
    { tax: { vatEnabled: true, vatRate: 13 } },
    ADMIN,
    "127.0.0.1",
  );
  const fromStore = await commerceTotals.resolveCommerceSettings();
  assert.equal(fromStore.tax.vatEnabled, true);
  assert.equal(fromStore.shipping.defaultZone, "Other Nepal");
});

// ---------- (5) template rendering + email composition ----------

test("renderTemplateText: substitution and the empty-name greeting collapse", () => {
  assert.equal(
    emailTemplates.renderTemplateText("Welcome, {customer_name}!", {
      customer_name: "Sita",
    }),
    "Welcome, Sita!",
  );
  assert.equal(
    emailTemplates.renderTemplateText("Welcome, {customer_name}!", {
      customer_name: "",
    }),
    "Welcome!",
  );
  assert.equal(
    emailTemplates.renderTemplateText("Order {order_id} total {total}", {
      order_id: "AU1",
      total: "NRs. 5",
    }),
    "Order AU1 total NRs. 5",
  );
  // Unknown placeholders are left visible rather than swallowed.
  assert.equal(
    emailTemplates.renderTemplateText("Hi {nickname}", {}),
    "Hi {nickname}",
  );
});

// Capture what email.service hands to Brevo.
const sentEmails = [];
const axiosPath = require.resolve("axios", { paths: [repo] });
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: {
    create: () => ({
      post: async (url, body) => {
        sentEmails.push({ url, body });
        return { data: { messageId: "test-message-id" } };
      },
      get: async () => ({ data: {} }),
      interceptors: { request: { use: () => {} } },
    }),
  },
};
delete require.cache[abs("services/email.service.js")];
const emailService = require(abs("services/email.service.js"));

test("email parity: welcome email subject + heading + body at default templates", async () => {
  resetAll();
  sentEmails.length = 0;
  await emailService.sendWelcomeEmail("sita@example.test", "Sita");
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].body.subject, "Welcome to Aura Interiors");
  assert.ok(sentEmails[0].body.htmlContent.includes("Welcome, Sita!"));
  assert.ok(
    sentEmails[0].body.htmlContent.includes(
      "Your account is ready. Explore our curated collections",
    ),
  );

  sentEmails.length = 0;
  await emailService.sendWelcomeEmail("noname@example.test", "");
  assert.ok(sentEmails[0].body.htmlContent.includes("Welcome!"));
  assert.ok(!sentEmails[0].body.htmlContent.includes("Welcome, !"));
});

test("email parity: magic link subject + heading + greeting at default templates", async () => {
  resetAll();
  sentEmails.length = 0;
  await emailService.sendMagicLinkEmail(
    "buyer@example.test",
    "https://frontend.example.test/auth/verify?token=x",
    "Buyer",
  );
  assert.equal(
    sentEmails[0].body.subject,
    "Your sign-in link for Aura Interiors",
  );
  const html = sentEmails[0].body.htmlContent;
  assert.ok(html.includes("Sign in to Aura Interiors"));
  assert.ok(
    html.includes(
      "Hi buyer@example.test — click the button below to sign in. This link is secure and expires in",
    ),
  );
  assert.ok(html.includes("<strong") && html.includes("15 minutes"));
});

test("email parity: order confirmation subject + intro at default templates", async () => {
  resetAll();
  sentEmails.length = 0;
  const order = {
    orderId: "AUTEST1234",
    guestInfo: { email: "sita@example.test", firstName: "Sita" },
    items: [
      { name: "Calmora Bed Frame", price: 19999, quantity: 1, variant: {} },
    ],
    shippingAddress: {
      fullName: "Sita Sharma",
      addressLine1: "Hattiban",
      city: "Lalitpur",
      state: "Bagmati",
      country: "Nepal",
    },
    paymentMethod: "cod",
    paymentStatus: "pending",
    orderedAt: new Date("2026-11-03T10:00:00Z"),
    total: 19999,
  };
  await emailService.sendOrderConfirmationEmail(order);
  assert.equal(sentEmails.length, 1);
  assert.equal(
    sentEmails[0].body.subject,
    "Your Aura Interiors Order Has Been Confirmed! 🎉",
  );
  const html = sentEmails[0].body.htmlContent;
  assert.ok(html.includes("Your Aura Interiors Order Has Been Confirmed! 🎉"));
  assert.ok(html.includes("Hi Sita,"));
  assert.ok(html.includes("Thank you for shopping with Aura Interiors."));
  assert.ok(
    html.includes("We've received your order and are preparing it for processing."),
  );
});

test("email templates: an admin edit changes the rendered email", async () => {
  resetAll();
  await settingsService.updateSection(
    "notifications",
    {
      templates: {
        accountWelcome: {
          subject: "Namaste from {store_name}",
          heading: "Namaste, {customer_name}!",
          body: "Custom welcome body.",
        },
      },
    },
    ADMIN,
    "127.0.0.1",
  );
  emailTemplates._resetCache();
  sentEmails.length = 0;
  await emailService.sendWelcomeEmail("sita@example.test", "Sita");
  assert.equal(sentEmails[0].body.subject, "Namaste from Aura Interiors");
  assert.ok(sentEmails[0].body.htmlContent.includes("Custom welcome body."));
});

test("test email: renders sample data; unknown template / bad recipient are 400s", async () => {
  resetAll();
  sentEmails.length = 0;
  await emailService.sendTemplateTestEmail(
    "shippingNotification",
    "admin@example.test",
  );
  assert.equal(sentEmails.length, 1);
  assert.equal(
    sentEmails[0].body.subject,
    "Your Aura Interiors order has been shipped",
  );
  assert.ok(sentEmails[0].body.htmlContent.includes("AUMOCK12345"));

  await assert.rejects(
    emailService.sendTemplateTestEmail("nope", "admin@example.test"),
    (err) => err.statusCode === 400,
  );
  await assert.rejects(
    emailService.sendTemplateTestEmail("magicLink", "not-an-email"),
    (err) => err.statusCode === 400,
  );
});

// ---------- (6) test-email route ----------

function buildRouteApp(emailStub) {
  stub("middleware/auth.middleware.js", {
    protect: (req, res, next) => {
      const role = req.headers["x-test-role"];
      if (!role) {
        return next(
          new AppError("You are not logged in. Please log in to get access.", 401),
        );
      }
      req.user = { _id: "u1", id: "u1", role, email: "admin@example.test" };
      return next();
    },
    restrictTo:
      (...roles) =>
      (req, res, next) =>
        roles.includes(req.user.role)
          ? next()
          : next(
              new AppError(
                "You do not have permission to perform this action.",
                403,
              ),
            ),
  });
  const passthrough = (req, res, next) => next();
  stub("middleware/rateLimit.middleware.js", {
    standardReadLimiter: passthrough,
    standardWriteLimiter: passthrough,
    adminReadLimiter: passthrough,
    adminWriteLimiter: passthrough,
  });
  stub("middleware/upload.middleware.js", {
    uploadCategoryImage: passthrough,
    resizeCategoryImage: passthrough,
  });
  stub("models/document.model.js", {
    find: () => ({ select: () => Promise.resolve([]) }),
  });
  stub("services/backgroundTasks.js", { runDocumentIngestion: () => {} });
  stub("services/email.service.js", emailStub);
  for (const rel of [
    "routes/adminSettings.routes.js",
    "controllers/settings.controller.js",
    "controllers/integrations.controller.js",
    "controllers/knowledge.controller.js",
  ]) {
    delete require.cache[abs(rel)];
  }
  const express = require(abs("node_modules/express"));
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin", require(abs("routes/adminSettings.routes")));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res
      .status(err.statusCode || 500)
      .json({ status: err.status || "error", message: err.message });
  });
  return app;
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test("test-email route: 401 anonymous, 403 non-admin, 200 admin, 400 unknown, 502 delivery failure", async () => {
  const calls = [];
  const app = buildRouteApp({
    sendTemplateTestEmail: async (template, to) => {
      calls.push({ template, to });
      if (template === "nope") throw new AppError("Unknown email template 'nope'", 400);
      if (template === "boom") throw new Error("Brevo is down");
      return { messageId: "x" };
    },
  });
  await withServer(app, async (base) => {
    const post = (headers, body) =>
      fetch(`${base}/api/v1/admin/settings/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });

    assert.equal((await post({}, { template: "magicLink" })).status, 401);
    assert.equal(
      (await post({ "x-test-role": "customer" }, { template: "magicLink" })).status,
      403,
    );

    const ok = await post(
      { "x-test-role": "admin" },
      { template: "magicLink", to: "owner@example.test" },
    );
    assert.equal(ok.status, 200);
    assert.deepEqual(calls.at(-1), {
      template: "magicLink",
      to: "owner@example.test",
    });

    // No recipient → defaults to the logged-in admin's email.
    const defaulted = await post(
      { "x-test-role": "admin" },
      { template: "accountWelcome" },
    );
    assert.equal(defaulted.status, 200);
    assert.equal(calls.at(-1).to, "admin@example.test");

    assert.equal(
      (await post({ "x-test-role": "admin" }, { template: "nope" })).status,
      400,
    );
    assert.equal(
      (await post({ "x-test-role": "admin" }, { template: "boom" })).status,
      502,
    );
  });
});
