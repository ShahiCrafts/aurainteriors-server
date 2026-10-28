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
  };
}
module.exports = { loadChatConfig, PROVIDER_DEFAULTS };
