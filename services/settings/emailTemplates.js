"use strict";

// Batch 4: transactional email templates (notifications.templates).
//
// The defaults in services/settings/defaults.js are the CURRENT
// email copy distilled into {subject, heading, body}; an admin can
// override any of them in Store Settings → Store Operations. This
// service resolves the effective templates (settings first, defaults
// as fallback — identical output until an admin edits one) and
// renders the placeholder legend:
//   {store_name} {customer_name} {order_id} {total} {tracking_info}
//
// Resolution follows the Batch 2 consumer pattern (DB-gated, cached,
// silent fallback): an email send must never fail because settings
// could not be read.

const { DEFAULT_SETTINGS } = require("./defaults");

const TEMPLATE_KEYS = [
  "orderConfirmation",
  "shippingNotification",
  "accountWelcome",
  "magicLink",
  "lowStockAlert",
];

function renderTemplateText(text, vars = {}) {
  let out = String(text == null ? "" : text);
  // A greeting like "Welcome, {customer_name}!" must collapse to
  // "Welcome!" when there is no name — the current welcome email
  // renders exactly that when firstName is absent.
  if (!vars.customer_name) {
    out = out.split(", {customer_name}").join("");
  }
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(value == null ? "" : String(value));
  }
  return out;
}

const CACHE_MS = 30_000;
let cache = { value: null, at: 0 };

async function resolveEmailTemplates() {
  const now = Date.now();
  if (cache.value && now - cache.at < CACHE_MS) return cache.value;
  let value = {
    templates: structuredClone(DEFAULT_SETTINGS.notifications.templates),
    storeName: DEFAULT_SETTINGS.identity.storeName,
  };
  try {
    const settingsService = require("./settingsService");
    if (settingsService.isDbReady()) {
      const settings = await settingsService.getSettings();
      if (settings) {
        if (
          settings.notifications &&
          settings.notifications.templates
        ) {
          value = {
            templates: settings.notifications.templates,
            storeName:
              (settings.identity && settings.identity.storeName) ||
              value.storeName,
          };
        }
      }
    }
  } catch {
    // Defaults already in `value`.
  }
  cache = { value, at: now };
  return value;
}

// Sample data for the admin "Send a Test Email" action — renders any
// template with plausible values so the admin sees a realistic mail.
function sampleVars(storeName) {
  return {
    store_name: storeName,
    customer_name: "Alex Sharma",
    order_id: "AUMOCK12345",
    total: "NRs. 38,299",
    tracking_info:
      "Your parcel is with the courier — you can track it any time from the store's Track Order page.",
  };
}

module.exports = {
  TEMPLATE_KEYS,
  renderTemplateText,
  resolveEmailTemplates,
  sampleVars,
  _resetCache: () => {
    cache = { value: null, at: 0 };
  },
};
