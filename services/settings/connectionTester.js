"use strict";

// Batch 1 (Settings + Secrets backend): connection tests for
// integration secrets, used by POST /admin/integrations/:service/test.
//
// Each probe is deliberately lightweight (one GET, 5s timeout) and
// individually mockable: the fetch implementation is read from
// globalThis.fetch AT CALL TIME, so tests can substitute it.
// SECURITY: key values are never logged and never interpolated into
// result messages — messages carry only the service name and the HTTP
// status. (Gemini's probe puts the key in the request URL per
// Google's API design; that URL is never copied into the result.)
//
// Services with no safe read-only probe (Google OAuth secret, eSewa,
// Khalti, SMS, FCM) return a "format-only" result: ok:null means
// "not verified live" — the admin UI pairs this with its
// save-anyway confirmation flow.

const TIMEOUT_MS = 5000;

const FORMAT_ONLY = {
  "auth.googleSecret":
    "Google does not offer a probe for an OAuth client secret; the value was format-checked only. It is verified when a real Google sign-in completes.",
  "payments.esewaSecret":
    "eSewa offers no credential probe; the value was format-checked only. It is verified by the first sandbox/live payment verification.",
  "payments.khalti":
    "Khalti offers no safe read-only credential probe; the value was format-checked only.",
  "sms.token":
    "No SMS gateway is wired yet, so there is nothing to probe; the value was format-checked only.",
  "push.fcm":
    "Firebase does not offer a lightweight server-key probe; the value was format-checked only.",
};

function base(result, started) {
  return { latencyMs: Date.now() - started, ...result };
}

async function probe(url, headers) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await globalThis.fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    if (res.ok) {
      return base(
        { ok: true, status: "ok", message: `Connection succeeded (HTTP ${res.status}).` },
        started,
      );
    }
    return base(
      {
        ok: false,
        status: "rejected",
        message: `Provider rejected the credential (HTTP ${res.status}). Check that the key is correct and active.`,
      },
      started,
    );
  } catch (error) {
    const timedOut = error && error.name === "AbortError";
    return base(
      {
        ok: false,
        status: timedOut ? "timeout" : "unreachable",
        message: timedOut
          ? `Provider did not respond within ${TIMEOUT_MS / 1000}s.`
          : "Could not reach the provider. Check network access and the configured base URL.",
      },
      started,
    );
  } finally {
    clearTimeout(timer);
  }
}

function formatOnly(service, key) {
  const started = Date.now();
  if (!key || !String(key).trim()) {
    return base({ ok: false, status: "missing", message: "No value is configured to test." }, started);
  }
  if (String(key).trim().length < 6) {
    return base(
      { ok: false, status: "invalid-format", message: "The value looks too short to be a valid credential." },
      started,
    );
  }
  return base({ ok: null, status: "format-only", message: FORMAT_ONLY[service] }, started);
}

const AI_DEFAULT_BASE = {
  "ai.groq": "https://api.groq.com/openai/v1",
  "ai.mistral": "https://api.mistral.ai/v1",
  "ai.openrouter": "https://openrouter.ai/api/v1",
  "ai.openai": "https://api.openai.com/v1",
  "ai.anthropic": "https://api.anthropic.com/v1",
};

async function testService(service, { key, config = {} } = {}) {
  const started = Date.now();
  if (Object.prototype.hasOwnProperty.call(FORMAT_ONLY, service)) {
    return formatOnly(service, key);
  }
  if (!key || !String(key).trim()) {
    return base(
      { ok: false, status: "missing", message: "No value is configured to test." },
      started,
    );
  }
  const value = String(key).trim();
  switch (service) {
    case "ai.groq":
    case "ai.mistral":
    case "ai.openrouter":
    case "ai.openai": {
      const baseUrl = (config.baseUrl || AI_DEFAULT_BASE[service]).replace(/\/$/, "");
      return probe(`${baseUrl}/models`, { Authorization: `Bearer ${value}` });
    }
    case "ai.anthropic": {
      const baseUrl = (config.baseUrl || AI_DEFAULT_BASE[service]).replace(/\/$/, "");
      return probe(`${baseUrl}/models`, {
        "x-api-key": value,
        "anthropic-version": "2023-06-01",
      });
    }
    case "ai.gemini": {
      return probe(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(value)}`,
        {},
      );
    }
    case "embeddings.nvidia": {
      return probe("https://integrate.api.nvidia.com/v1/models", {
        Authorization: `Bearer ${value}`,
      });
    }
    case "email.brevo": {
      const baseUrl = (config.baseUrl || "https://api.brevo.com/v3").replace(/\/$/, "");
      return probe(`${baseUrl}/account`, { "api-key": value, accept: "application/json" });
    }
    case "media.cloudinarySecret": {
      if (!config.cloudName || !config.apiKey) {
        return base(
          {
            ok: false,
            status: "missing-config",
            message:
              "Cloudinary testing also needs the cloud name and API key (Integrations → cloudinary config).",
          },
          started,
        );
      }
      const auth = Buffer.from(`${config.apiKey}:${value}`).toString("base64");
      return probe(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/ping`,
        { Authorization: `Basic ${auth}` },
      );
    }
    case "vector.qdrant": {
      const baseUrl = (config.url || "http://localhost:6333").replace(/\/$/, "");
      return probe(`${baseUrl}/collections`, { "api-key": value });
    }
    default:
      return base(
        { ok: false, status: "unknown-service", message: `No connection test exists for '${service}'.` },
        started,
      );
  }
}

module.exports = { testService, FORMAT_ONLY, TIMEOUT_MS };
