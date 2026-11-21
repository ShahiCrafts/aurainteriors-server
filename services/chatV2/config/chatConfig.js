const PROVIDER_DEFAULTS = {
  groq: {
    model: "openai/gpt-oss-120b",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  mistral: {
    model: "mistral-small-latest",
    baseUrl: "https://api.mistral.ai/v1",
  },
  openrouter: {
    model: "meta-llama/llama-3.3-70b-instruct",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  // Batch 2: providers that only exist via admin Settings (Batch 1
  // defaults). gemini/openai have no Batch-1 default model (""), so
  // they stay inert until an admin sets a model. anthropic talks to
  // its OpenAI-compatible endpoint with x-api-key auth (see
  // llmGateway.providerHeaders).
  gemini: {
    model: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    authStyle: "bearer",
  },
  openai: {
    model: "",
    baseUrl: "https://api.openai.com/v1",
    authStyle: "bearer",
  },
  anthropic: {
    model: "",
    baseUrl: "https://api.anthropic.com/v1",
    authStyle: "x-api-key",
  },
};
function int(name, fallback, min, max, env = process.env) {
  const n = Number(env[name] || fallback);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new Error(`Invalid ${name}`);
  return n;
}

// FA-83: LLM provider base URLs steer API keys + prompts. In production an
// env override is honored only when it is https AND custom base URLs are
// explicitly allowed (CHAT_ALLOW_CUSTOM_LLM_BASE_URLS=1); otherwise the
// provider default is used. Non-https overrides are refused in every env.
function safeBaseUrl(name, override, env) {
  const fallback = PROVIDER_DEFAULTS[name].baseUrl;
  if (!override || override === fallback) return fallback;
  let parsed;
  try {
    parsed = new URL(override);
  } catch {
    return fallback;
  }
  if (parsed.protocol !== "https:") return fallback;
  if (
    env.NODE_ENV === "production" &&
    env.CHAT_ALLOW_CUSTOM_LLM_BASE_URLS !== "1"
  ) {
    console.warn(`chat_config_custom_base_url_ignored:${name}`);
    return fallback;
  }
  return override;
}
// Reasoning effort (CHAT_REASONING_EFFORT=low|medium|high): the
// default Groq model (openai/gpt-oss-120b) is a reasoning model — it
// spends hidden reasoning tokens before every answer and tool call,
// which is the largest single contributor to bot reply latency.
// Setting this to "low" asks the provider to reason briefly; the
// gateway forwards it ONLY to Groq (the gpt-oss family understands
// it) so Mistral/OpenRouter failovers never see an unknown field.
// Unset (the default) sends nothing — behavior is exactly as before.
function reasoningEffort(env = process.env) {
  const value = String(env.CHAT_REASONING_EFFORT || "")
    .trim()
    .toLowerCase();
  return ["low", "medium", "high"].includes(value) ? value : null;
}
// AR-13: maxConcurrentTurns (CHAT_MAX_CONCURRENT_TURNS) bounds global
// in-flight chat turns via a semaphore in the pipeline. Unset/0 means
// UNBOUNDED — the pre-AR-13 behavior — so the bound only exists when an
// operator deliberately sets a positive value. See FLAGS.md.
// AR-30 (D-B): the legacy pipeline switch is gone — loadChatConfig no
// longer reads CHAT_PIPELINE / CHAT_PIPELINE_SHADOW. `enabled` stays in
// the returned shape, always true; the `shadow` field is dropped (it
// never had a consumer).
function loadChatConfig(env = process.env) {
  return {
    enabled: true,
    providers: [
      ["groq", "GROQ"],
      ["mistral", "MISTRAL"],
      ["openrouter", "OPENROUTER"],
    ]
      .map(([name, p]) => ({
        name,
        apiKey: env[`${p}_API_KEY`],
        model: env[`${p}_CHAT_MODEL`] || PROVIDER_DEFAULTS[name].model,
        baseUrl: safeBaseUrl(name, env[`${p}_BASE_URL`], env),
      }))
      .filter((x) => x.apiKey),
    toolMs: int("CHAT_TOOL_TIMEOUT_MS", 1500, 100, 5000, env),
    maxTokens: int("CHAT_MAX_TOKENS", 700, 64, 2000, env),
    temperature: Number(env.CHAT_TEMPERATURE || 0.2),
    maxToolRounds: int("CHAT_MAX_TOOL_ROUNDS", 3, 1, 5, env),
    maxConcurrentTurns: int("CHAT_MAX_CONCURRENT_TURNS", 0, 0, 10000, env),
    reasoningEffort: reasoningEffort(env),
  };
}
// ---------------------------------------------------------------------------
// Batch 2: settings-backed (async) chat config.
//
// Precedence choice (documented per task): in the ASYNC path the admin
// Settings values WIN for provider model/baseUrl and for
// temperature/maxTokens. The env <P>_CHAT_MODEL / <P>_BASE_URL overrides
// are honoured ONLY in the pure-env fallback path (sync loadChatConfig),
// which is also what the async loader returns verbatim whenever the
// settings read fails or yields no usable provider — so with nothing
// saved in admin AND no DB, behaviour is byte-identical to before.
// API keys come from secretsService.getResolvedSecret (admin-encrypted
// value, else env), never from the settings document itself.
// ---------------------------------------------------------------------------

// Gemini's OpenAI-compatible chat surface lives under {baseUrl}/openai;
// the gateway appends /chat/completions, so a baseUrl ending in /v1beta
// must gain the /openai segment here.
function effectiveBaseUrl(name, baseUrl) {
  if (name === "gemini" && typeof baseUrl === "string") {
    const trimmed = baseUrl.replace(/\/+$/, "");
    if (trimmed.endsWith("/v1beta")) return `${trimmed}/openai`;
  }
  return baseUrl;
}

// Pure builder (unit-tested): integrations = settings.integrations,
// resolvedKeys = { [providerName]: apiKey|null }.
function buildProvidersFromSettings(integrations, resolvedKeys = {}) {
  const ai = integrations && integrations.ai;
  if (!ai || typeof ai !== "object") return [];
  const providers = ai.providers || {};
  const order = [];
  const seen = new Set();
  for (const name of Array.isArray(ai.fallbackOrder) ? ai.fallbackOrder : []) {
    if (providers[name] && !seen.has(name)) {
      seen.add(name);
      order.push(name);
    }
  }
  for (const name of Object.keys(providers)) {
    if (!seen.has(name)) {
      seen.add(name);
      order.push(name);
    }
  }
  const built = [];
  for (const name of order) {
    const p = providers[name] || {};
    if (p.enabled !== true) continue;
    const apiKey = resolvedKeys[name];
    if (!apiKey) continue;
    const model = typeof p.model === "string" ? p.model.trim() : "";
    if (!model) continue;
    const defaults = PROVIDER_DEFAULTS[name] || {};
    const rawBase =
      typeof p.baseUrl === "string" && p.baseUrl ? p.baseUrl : defaults.baseUrl;
    if (!rawBase) continue;
    // FA-83 guard applies to settings baseUrls too; safeBaseUrl needs a
    // PROVIDER_DEFAULTS entry, which every known provider now has.
    const guarded = defaults.baseUrl
      ? safeBaseUrl(name, rawBase, process.env)
      : rawBase;
    built.push({
      name,
      apiKey,
      model,
      baseUrl: effectiveBaseUrl(name, guarded),
      authStyle: defaults.authStyle || "bearer",
    });
  }
  // featureProviders.chat: promote the named provider to the front.
  const preferred = ai.featureProviders && ai.featureProviders.chat;
  if (preferred) {
    const idx = built.findIndex((p) => p.name === preferred);
    if (idx > 0) built.unshift(built.splice(idx, 1)[0]);
  }
  return built;
}

async function loadChatConfigAsync(env = process.env) {
  const fallback = () => loadChatConfig(env);
  try {
    const settingsService = require("../../settings/settingsService");
    const secretsService = require("../../settings/secretsService");
    // Parity gate: the settings path engages ONLY when an admin has
    // actually saved the integrations section (getSettings() merges
    // Batch-1 defaults, which would otherwise shadow env model/baseUrl
    // overrides even when nothing was ever saved). No DB connection
    // (tests/boot) also short-circuits to the env path — a settings
    // read must never hang on mongoose buffering or break chat.
    if (
      typeof settingsService.isDbReady === "function" &&
      !settingsService.isDbReady()
    ) {
      return fallback();
    }
    const raw =
      typeof settingsService.getRawStoredData === "function"
        ? await settingsService.getRawStoredData()
        : null;
    if (!raw || !raw.integrations || !raw.integrations.ai) return fallback();
    const settings = await settingsService.getSettings();
    const integrations = settings && settings.integrations;
    const ai = integrations && integrations.ai;
    if (!ai || !ai.providers) return fallback();
    const resolvedKeys = {};
    await Promise.all(
      Object.keys(ai.providers).map(async (name) => {
        try {
          resolvedKeys[name] = await secretsService.getResolvedSecret(
            `ai.${name}`,
            env,
          );
        } catch {
          resolvedKeys[name] = null;
        }
      }),
    );
    const providers = buildProvidersFromSettings(integrations, resolvedKeys);
    if (!providers.length) return fallback();
    const base = fallback();
    const chat = ai.chat || {};
    return {
      ...base,
      providers,
      temperature:
        typeof chat.temperature === "number" && Number.isFinite(chat.temperature)
          ? chat.temperature
          : base.temperature,
      maxTokens:
        Number.isInteger(chat.maxTokens) && chat.maxTokens > 0
          ? chat.maxTokens
          : base.maxTokens,
    };
  } catch {
    return fallback();
  }
}

module.exports = {
  loadChatConfig,
  loadChatConfigAsync,
  buildProvidersFromSettings,
  PROVIDER_DEFAULTS,
  reasoningEffort,
};
