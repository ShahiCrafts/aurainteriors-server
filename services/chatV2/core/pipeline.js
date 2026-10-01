const { route } = require('./router');
const { build } = require('./contextBuilder');
const { schemas, execute } = require('../tools/registry');
const { guard } = require('./outputGuard');
const LlmGateway = require('../providers/llmGateway');

function collectProductOptions(toolName, value) {
  const rows = toolName === 'searchProducts' && Array.isArray(value) ? value : toolName === 'getProductDetails' && value && !value.error ? [value] : [];
  return rows.slice(0, 8).map((p, index) => ({
    id: p?.id || p?._id || p?.productId || null,
    productId: p?.id || p?._id || p?.productId || null,
    position: index + 1,
    name: p?.name || null,
    sku: p?.sku || null,
    price: p?.price ?? null,
    url: p?.url || null,
  })).filter(p => p.id || p.sku || p.name);
}

class Pipeline {
  constructor(config) { this.config = config; this.llm = new LlmGateway(config); }

  async run(turn) {
    const started = Date.now();
    const r = route(turn.text);
    if (r.kind === 'empty') return { text: r.reply, metrics: { totalMs: Date.now() - started, route: 'empty' } };

    try {
      let messages = await build({
        chatId: turn.chatId,
        userText: turn.text,
        summary: turn.summary,
        productOptions: turn.productOptions || [],
      });
      const toolUrls = [];
      let latestProductOptions = Array.isArray(turn.productOptions) ? turn.productOptions : [];
      let lastProvider = null;
      let lastModel = null;
      let lastUsage = null;

      // maxToolRounds limits tool-execution cycles, not LLM calls. Allow one
      // additional model call after the final tool result so the assistant can
      // synthesize the user-facing answer.
      for (let round = 0; round <= this.config.maxToolRounds; round += 1) {
        const out = await this.llm.complete({ messages, tools: schemas(), onToken: null });
        lastProvider = out.provider; lastModel = out.model; lastUsage = out.usage;
        const m = out.message || {};
        if (!m.tool_calls?.length) {
          const text = guard(m.content, { toolUrls });
          if (!text?.trim()) throw new Error('AI returned an empty final response');
          return { text, productOptions: latestProductOptions, provider: lastProvider, model: lastModel, usage: lastUsage, metrics: { totalMs: Date.now() - started, route: 'llm' } };
        }

        if (round === this.config.maxToolRounds) {
          throw new Error('AI exceeded the maximum tool-call rounds without producing a final response');
        }

        messages.push({ role: 'assistant', content: m.content || '', tool_calls: m.tool_calls });
        const results = await Promise.all(m.tool_calls.map(async tc => {
          let args;
          try { args = JSON.parse(tc.function.arguments || '{}'); }
          catch { return { role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: 'Invalid tool arguments' }) }; }
          try {
            const value = await execute(tc.function.name, args, turn.context, { timeoutMs: this.config.toolMs });
            const products = collectProductOptions(tc.function.name, value);
            // A fresh search establishes a new ordinal/reference set. Looking up
            // one product must not erase the list, otherwise a later "the second one"
            // can no longer resolve against the recommendation turn.
            if (tc.function.name === 'searchProducts' && products.length) latestProductOptions = products;
            else if (!latestProductOptions.length && products.length) latestProductOptions = products;
            const collectUrls = v => { if (v && typeof v === 'object') { if (typeof v.url === 'string') toolUrls.push(v.url); Object.values(v).forEach(collectUrls); } };
            collectUrls(value);
            return { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(value).slice(0, 12000) };
          } catch (error) {
            console.error('chat_v2_tool_failed', { chatId: String(turn.chatId), tool: tc.function.name, error: error?.message });
            return { role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: 'Tool temporarily unavailable', tool: tc.function.name }) };
          }
        }));
        messages.push(...results);
      }
      throw new Error('AI orchestration ended unexpectedly');
    } catch (error) {
      console.error('chat_v2_pipeline_failed', { chatId: String(turn.chatId), error: error?.message, elapsedMs: Date.now() - started });
      return { text: 'I’m having trouble completing that request right now. Please try again.', degraded: true, metrics: { totalMs: Date.now() - started, route: 'pipeline_degraded', error: error?.message } };
    }
  }
}
module.exports = Pipeline;
module.exports.collectProductOptions = collectProductOptions;
