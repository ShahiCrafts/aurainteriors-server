// CHAT_REASONING_EFFORT: an operator opt-in that asks Groq's
// gpt-oss reasoning models to reason briefly (the hidden reasoning
// tokens are the largest single contributor to bot reply latency).
// Unset/invalid values must send nothing, and the field must only
// ever go to Groq so failovers never see an unknown parameter.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loadChatConfig,
  reasoningEffort,
} = require("../../services/chatV2/config/chatConfig");
const LlmGateway = require("../../services/chatV2/providers/llmGateway");

test("config: reasoning effort parses only low|medium|high", () => {
  assert.equal(reasoningEffort({ CHAT_REASONING_EFFORT: "low" }), "low");
  assert.equal(reasoningEffort({ CHAT_REASONING_EFFORT: " High " }), "high");
  assert.equal(reasoningEffort({ CHAT_REASONING_EFFORT: "max" }), null);
  assert.equal(reasoningEffort({}), null);
  const config = loadChatConfig({
    GROQ_API_KEY: "k",
    CHAT_REASONING_EFFORT: "low",
  });
  assert.equal(config.reasoningEffort, "low");
});

function streamOnce(gateway, provider) {
  const originalFetch = global.fetch;
  const encoder = new TextEncoder();
  let captured;
  global.fetch = async (_url, init) => {
    captured = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      body: new ReadableStream({
        start(c) {
          c.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":"hi"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
            ),
          );
          c.close();
        },
      }),
    };
  };
  return gateway
    .complete({
      messages: [{ role: "user", content: "hello" }],
      tools: [],
      onToken: null,
    })
    .then(() => captured)
    .finally(() => {
      global.fetch = originalFetch;
    });
}

const baseConfig = (reasoning) => ({
  providers: [],
  temperature: 0.2,
  maxTokens: 64,
  reasoningEffort: reasoning,
});

test("gateway: reasoning_effort is sent to Groq only when configured", async () => {
  const groq = { name: "groq", model: "openai/gpt-oss-120b", apiKey: "k", baseUrl: "https://example.test/v1" };
  const withEffort = new LlmGateway({ ...baseConfig("low"), providers: [groq] });
  const body = await streamOnce(withEffort, groq);
  assert.equal(body.reasoning_effort, "low");

  const without = new LlmGateway({ ...baseConfig(null), providers: [groq] });
  const plainBody = await streamOnce(without, groq);
  assert.equal("reasoning_effort" in plainBody, false);
});

test("gateway: reasoning_effort is never sent to other providers", async () => {
  const mistral = { name: "mistral", model: "mistral-small-latest", apiKey: "k", baseUrl: "https://example.test/v1" };
  const gateway = new LlmGateway({ ...baseConfig("low"), providers: [mistral] });
  const body = await streamOnce(gateway, mistral);
  assert.equal("reasoning_effort" in body, false);
});
