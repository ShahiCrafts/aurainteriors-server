const {
  loadChatConfig,
  loadChatConfigAsync,
} = require("./config/chatConfig");
const Pipeline = require("./core/pipeline");
const KeyedTurnQueue = require("./queue/keyedTurnQueue");

// Boot config is the SYNC env-based config, exactly as before Batch 2:
// requiring this module never touches the DB, so boot/test behaviour is
// unchanged. The settings-backed config is resolved lazily by
// refreshConfig() (called from the async chat entry point in
// chatService) and swapped in only when it actually differs; the swap
// is cached for REFRESH_TTL_MS (success AND failure alike, so a down
// DB costs one attempt per minute, not one per message).
const REFRESH_TTL_MS = 60_000;
let config = loadChatConfig();
let pipeline = new Pipeline(config);
const queue = new KeyedTurnQueue();
let lastRefreshAt = 0;
let refreshInFlight = null;

function providersSignature(providers) {
  return (providers || [])
    .map((p) => `${p.name}|${p.model}|${p.baseUrl}|${p.authStyle || ""}`)
    .join(";");
}

async function refreshConfig() {
  const now = Date.now();
  if (now - lastRefreshAt < REFRESH_TTL_MS) return pipeline;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const next = await loadChatConfigAsync();
      lastRefreshAt = Date.now();
      if (
        providersSignature(next.providers) !==
          providersSignature(config.providers) ||
        next.temperature !== config.temperature ||
        next.maxTokens !== config.maxTokens
      ) {
        config = next;
        pipeline = new Pipeline(config);
      }
    } catch {
      lastRefreshAt = Date.now();
    } finally {
      refreshInFlight = null;
    }
    return pipeline;
  })();
  return refreshInFlight;
}

module.exports = {
  get config() {
    return config;
  },
  get pipeline() {
    return pipeline;
  },
  queue,
  refreshConfig,
};
