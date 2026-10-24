const db = () => require('../../dbTools');

// FA-31, ported from the legacy orchestrator by AR-30 per D-B: the model
// must never supply identity, and tool arguments are validated against a
// per-tool schema before execution; any key not in the schema (userId,
// operators, extras) is stripped, wrong-typed values reject the call, and
// strings/numbers are capped. Identity is attached afterwards by the
// handlers, from server-side session context (ctx) only. The seven legacy
// rules are verbatim; handoffToHuman and retrieveKnowledge are v2-only
// tools, ruled here with the caps the v2 call sites already used
// (handoff reason sliced to 500 in chatService; knowledge query 1000).
const TOOL_ARG_RULES = {
  searchProducts: { query: { type: "string", max: 200 }, categoryName: { type: "string", max: 80 }, limit: { type: "number", min: 1, max: 10 } },
  getProductDetails: { productId: { type: "string", max: 64 }, sku: { type: "string", max: 64 } },
  getOrderStatus: { orderId: { type: "string", max: 64 }, email: { type: "string", max: 254 } },
  getOrderHistory: {},
  getDefaultAddress: {},
  getSavedAddresses: {},
  getProfileInfo: {},
  handoffToHuman: { reason: { type: "string", max: 500 } },
  retrieveKnowledge: { query: { type: "string", max: 1000 } },
};

function sanitizeToolArgs(name, raw) {
  const rules = TOOL_ARG_RULES[name];
  if (!rules) return { args: {} };
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const args = {};
  for (const [key, rule] of Object.entries(rules)) {
    const value = input[key];
    if (value === undefined || value === null) continue;
    if (rule.type === "string") {
      if (typeof value !== "string") return { error: `Invalid argument type for ${key}` };
      args[key] = value.slice(0, rule.max);
    } else if (rule.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) return { error: `Invalid argument type for ${key}` };
      args[key] = Math.min(Math.max(value, rule.min), rule.max);
    }
  }
  return { args };
}

const definitions = [
  { name: 'searchProducts', description: 'Search the active Aura Interiors catalog. Use for product discovery, comparisons, recommendations, category requests, or when a product reference cannot be resolved from structured state.', identity: false, handler: (a, c) => db().searchProducts(a, { maxTimeMS: c.maxTimeMS }) },
  { name: 'getProductDetails', description: 'Get authoritative details for one Aura product. Use productId or SKU from structured conversation state/tool results whenever available.', identity: false, handler: (a, c) => db().getProductDetails(a, { maxTimeMS: c.maxTimeMS }) },
  { name: 'getOrderStatus', description: 'Get authoritative order status. Account identity is server supplied for signed-in customers.', identity: true, handler: (a, c) => db().getOrderStatus({ ...a, userId: c.userId || undefined, email: c.userId ? undefined : a.email, lookupKey: c.userId ? `user:${c.userId}` : `guest:${c.guestSessionId || c.chatId || "anon"}` }, { maxTimeMS: c.maxTimeMS }) },
  { name: 'getOrderHistory', description: 'Get signed-in customer order history.', identity: true, handler: (_a, c) => db().getOrderHistory({ userId: c.userId }, { maxTimeMS: c.maxTimeMS }) },
  { name: 'getDefaultAddress', description: 'Get signed-in customer default address.', identity: true, handler: (_a, c) => db().getDefaultAddress({ userId: c.userId }, { maxTimeMS: c.maxTimeMS }) },
  { name: 'getSavedAddresses', description: 'Get signed-in customer saved addresses.', identity: true, handler: (_a, c) => db().getSavedAddresses({ userId: c.userId }, { maxTimeMS: c.maxTimeMS }) },
  { name: 'getProfileInfo', description: 'Get signed-in customer profile.', identity: true, handler: (_a, c) => db().getProfileInfo({ userId: c.userId }, { maxTimeMS: c.maxTimeMS }) },
  { name: 'handoffToHuman', description: 'Request a human agent. Use only when explicitly requested or staff intervention is necessary.', identity: false, handler: async (a, c) => c.handoff(a.reason || 'Customer requested human assistance') },
  { name: 'retrieveKnowledge', description: 'Retrieve authoritative Aura policy, delivery, warranty, returns, care or design knowledge when the answer requires company-specific knowledge.', identity: false, handler: async (a, c) => c.retrieve(a.query) },
];
const byName = new Map(definitions.map(x => [x.name, x]));

const objectSchema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
function parametersFor(name) {
  if (name === 'searchProducts') return objectSchema({ query: { type: 'string', description: 'Natural-language product/category search query.' }, categoryName: { type: 'string' }, limit: { type: 'number', minimum: 1, maximum: 10 } }, ['query']);
  if (name === 'getProductDetails') return objectSchema({ productId: { type: 'string', description: 'Aura product ID from structured state or a previous tool result.' }, sku: { type: 'string' } });
  if (name === 'getOrderStatus') return objectSchema({ orderId: { type: 'string' }, email: { type: 'string' } });
  if (name === 'handoffToHuman') return objectSchema({ reason: { type: 'string' } }, ['reason']);
  if (name === 'retrieveKnowledge') return objectSchema({ query: { type: 'string' } }, ['query']);
  return objectSchema({});
}
function schemas() {
  return definitions.map(x => ({ type: 'function', function: { name: x.name, description: x.description, parameters: parametersFor(x.name) } }));
}
async function execute(name, args, ctx, { timeoutMs = 1500 } = {}) {
  const t = byName.get(name);
  if (!t) throw new Error(`Unknown tool: ${name}`);
  if (t.identity && ['getOrderHistory', 'getDefaultAddress', 'getSavedAddresses', 'getProfileInfo'].includes(name) && !ctx.userId) return { error: 'Authentication required' };
  // FA-31 (ported by AR-30): sanitize AFTER the identity check above.
  // The ordering is safe either way: the tools the guest check guards
  // have empty rule sets ({}), so sanitizeToolArgs can never error ahead of
  // the guest check and mask the Authentication-required result.
  // Sanitization replaces the old `delete safe.userId` construction:
  // userId is in no tool's rules table, so it is stripped here along
  // with every other unlisted key.
  const { args: safe, error: argError } = sanitizeToolArgs(name, args);
  if (argError) return { error: "Invalid tool arguments" };
  // FA-37: handlers receive an AbortSignal via ctx; on timeout the signal
  // fires so a timed-out handler can actually stop, not just lose the race.
  // AR-37: the ctx ALSO carries the tool's time budget as maxTimeMS
  // (the configured per-tool timeout; elapsed time at handler start is
  // ~0, so the full timeoutMs is the honest remaining budget). dbTools
  // handlers pass it to Mongoose as maxTimeMS, so MongoDB cancels the
  // query server-side when the budget expires instead of the work
  // running to completion after the race has been lost.
  const controller = new AbortController();
  const toolCtx = { ...ctx, signal: controller.signal, timeoutMs, maxTimeMS: timeoutMs };
  let timer;
  try {
    return await Promise.race([
      t.handler(safe, toolCtx),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error(`Tool timeout: ${name}`)); }, timeoutMs); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
module.exports = { definitions, schemas, execute, byName, parametersFor, TOOL_ARG_RULES, sanitizeToolArgs };
