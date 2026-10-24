// AR-13 — chatV2 concurrency / circuit-breaker hardening:
//   1. The breaker's half-open state admits exactly ONE probe (a
//      single-probe gate); a failed probe re-opens, a successful probe
//      closes.
//   2. A success on the JSON-recovery path in llmGateway records
//      breaker.success() (previously only _stream did), so failure
//      counts do not stick after a recovered completion.
//   3. A global turn concurrency bound (CHAT_MAX_CONCURRENT_TURNS)
//      caps in-flight turns; unset/0 preserves the previous unbounded
//      behavior.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery } = require("../audit/helpers");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// contextBuilder loads history through ChatMessage.find — stub it empty.
stubModule("models/chatMessage.model", { find: () => makeQuery([]) });

const CircuitBreaker = require("../../services/chatV2/providers/circuitBreaker");
const { loadChatConfig } = require("../../services/chatV2/config/chatConfig");
const Pipeline = require("../../services/chatV2/core/pipeline");

// ---------------------------------------------------------------- breaker
test("AR-13: half-open admits exactly one probe under concurrency", async () => {
  const b = new CircuitBreaker({ threshold: 3, cooldownMs: 40 });
  b.failure("k"); b.failure("k"); b.failure("k");
  assert.equal(b.canTry("k"), false, "open breaker blocks all attempts");
  await sleep(60); // cooldown elapses -> half-open
  const admitted = await Promise.all(Array.from({ length: 10 }, async () => b.canTry("k")));
  assert.equal(admitted.filter(Boolean).length, 1, "exactly one half-open probe may be admitted");
  b.success("k");
  assert.equal(b.canTry("k"), true, "probe success closes the breaker");
  assert.equal(b.canTry("k"), true, "a closed breaker admits freely");
});

test("AR-13: a failed half-open probe re-opens the breaker and the next window admits one fresh probe", async () => {
  const b = new CircuitBreaker({ threshold: 2, cooldownMs: 40 });
  b.failure("k"); b.failure("k");
  await sleep(60);
  assert.equal(b.canTry("k"), true, "first probe admitted");
  assert.equal(b.canTry("k"), false, "no second probe while one is in flight");
  b.failure("k");
  assert.equal(b.canTry("k"), false, "failed probe re-opens the breaker");
  await sleep(60);
  assert.equal(b.canTry("k"), true, "the next cooldown window admits a probe");
  assert.equal(b.canTry("k"), false, "still exactly one");
  b.success("k");
});

// ------------------------------------------------- recovery-path success
test("AR-13: JSON-recovery success clears the breaker's failure count", async () => {
  const LlmGateway = require("../../services/chatV2/providers/llmGateway");
  const originalFetch = global.fetch;
  const encoder = new TextEncoder();
  const streamWith = (payload) => ({
    ok: true, status: 200, headers: new Headers(),
    body: new ReadableStream({ start(c) { c.enqueue(encoder.encode(payload)); c.close(); } }),
  });
  const streamEmpty = () => streamWith('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n');
  const streamText = (t) => streamWith(`data: {"choices":[{"delta":{"content":"${t}"},"finish_reason":"stop"}]}\n\n`);
  let mode = "fail";
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (mode === "fail") throw new Error("provider down");
    if (mode === "recover") {
      if (body.stream) return streamEmpty();
      return { ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { role: "assistant", content: "Recovered" }, finish_reason: "stop" }] }) };
    }
    return streamText("Healthy");
  };
  try {
    const gateway = new LlmGateway({
      providers: [{ name: "ar13recovery", model: "m-ar13", baseUrl: "https://ar13.invalid", apiKey: "x" }],
      temperature: 0, maxTokens: 100,
    });
    const turn = { messages: [{ role: "user", content: "hi" }], tools: [], onToken: null };
    mode = "fail";
    await assert.rejects(() => gateway.complete(turn), "failure 1 recorded");
    await assert.rejects(() => gateway.complete(turn), "failure 2 recorded (threshold is 3, still closed)");
    // The integrated empty-stream flow reaches _completeJson only AFTER
    // _stream has already recorded success, which masks the gap. Call
    // the recovery method directly (mirroring complete()'s recovery
    // call) so the assertion isolates _completeJson's own contract: a
    // successful JSON completion must record breaker success, exactly
    // like _stream does.
    mode = "recover";
    const recovered = await gateway._completeJson(
      { name: "ar13recovery", model: "m-ar13", baseUrl: "https://ar13.invalid", apiKey: "x" },
      "ar13recovery:m-ar13",
      { messages: turn.messages, tools: [] });
    assert.equal(recovered.message.content, "Recovered", "the JSON recovery returns the completion");
    mode = "fail";
    await assert.rejects(() => gateway.complete(turn), "one more failure after recovery");
    mode = "ok";
    const healthy = await gateway.complete(turn);
    assert.equal(healthy.message.content, "Healthy",
      "breaker must still be closed: if the recovery success had not been recorded, this failure would have been #3 and opened it");
    // Integrated contract (passes before and after): an empty stream
    // still recovers end-to-end via the JSON path.
    mode = "recover";
    const integrated = await gateway.complete(turn);
    assert.equal(integrated.message.content, "Recovered", "empty stream recovers via the JSON path end-to-end");
  } finally {
    global.fetch = originalFetch;
  }
});

// ------------------------------------------------------- turn semaphore
function instrumentedPipeline(config) {
  const pipeline = new Pipeline(config);
  const state = { inFlight: 0, maxInFlight: 0 };
  pipeline.llm = {
    complete: async () => {
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      await sleep(25);
      state.inFlight -= 1;
      return { provider: "fake", model: "fake", message: { role: "assistant", content: "Answer" }, usage: null, finishReason: "stop" };
    },
  };
  return { pipeline, state };
}

test("AR-13: CHAT_MAX_CONCURRENT_TURNS is parsed by loadChatConfig (unset = 0 = unbounded)", () => {
  assert.equal(loadChatConfig({}).maxConcurrentTurns, 0, "unset preserves the current unbounded behavior");
  assert.equal(loadChatConfig({ CHAT_MAX_CONCURRENT_TURNS: "0" }).maxConcurrentTurns, 0);
  assert.equal(loadChatConfig({ CHAT_MAX_CONCURRENT_TURNS: "5" }).maxConcurrentTurns, 5);
});

test("AR-13: with the bound set to 5, 50 concurrent turns never exceed 5 in-flight LLM calls", async () => {
  const config = { ...loadChatConfig({ CHAT_MAX_CONCURRENT_TURNS: "5" }) };
  const { pipeline, state } = instrumentedPipeline(config);
  const results = await Promise.all(Array.from({ length: 50 }, (_, i) =>
    pipeline.run({ chatId: `chat-${i}`, text: "hello", context: {}, productOptions: [] })));
  assert.ok(results.every((r) => r.text === "Answer"), "all 50 turns complete successfully through the bound");
  assert.equal(state.maxInFlight, 5, `in-flight LLM calls must be capped at 5 (saw ${state.maxInFlight})`);
});

test("AR-13: with the bound unset, turn concurrency is unchanged (unbounded)", async () => {
  const config = { ...loadChatConfig({}) };
  const { pipeline, state } = instrumentedPipeline(config);
  const results = await Promise.all(Array.from({ length: 50 }, (_, i) =>
    pipeline.run({ chatId: `chat-u-${i}`, text: "hello", context: {}, productOptions: [] })));
  assert.ok(results.every((r) => r.text === "Answer"));
  assert.equal(state.maxInFlight, 50, `unbounded behavior preserved: all 50 turns in flight at once (saw ${state.maxInFlight})`);
});
