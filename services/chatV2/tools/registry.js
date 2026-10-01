const db = () => require('../../dbTools');

const definitions = [
  { name: 'searchProducts', description: 'Search the active Aura Interiors catalog. Use for product discovery, comparisons, recommendations, category requests, or when a product reference cannot be resolved from structured state.', identity: false, handler: a => db().searchProducts(a) },
  { name: 'getProductDetails', description: 'Get authoritative details for one Aura product. Use productId or SKU from structured conversation state/tool results whenever available.', identity: false, handler: a => db().getProductDetails(a) },
  { name: 'getOrderStatus', description: 'Get authoritative order status. Account identity is server supplied for signed-in customers.', identity: true, handler: (a, c) => db().getOrderStatus({ ...a, userId: c.userId || undefined, email: c.userId ? undefined : a.email }) },
  { name: 'getOrderHistory', description: 'Get signed-in customer order history.', identity: true, handler: (_a, c) => db().getOrderHistory({ userId: c.userId }) },
  { name: 'getDefaultAddress', description: 'Get signed-in customer default address.', identity: true, handler: (_a, c) => db().getDefaultAddress({ userId: c.userId }) },
  { name: 'getSavedAddresses', description: 'Get signed-in customer saved addresses.', identity: true, handler: (_a, c) => db().getSavedAddresses({ userId: c.userId }) },
  { name: 'getProfileInfo', description: 'Get signed-in customer profile.', identity: true, handler: (_a, c) => db().getProfileInfo({ userId: c.userId }) },
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
  const safe = { ...(args || {}) }; delete safe.userId;
  let timer;
  try {
    return await Promise.race([
      t.handler(safe, ctx),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Tool timeout: ${name}`)), timeoutMs); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
module.exports = { definitions, schemas, execute, byName, parametersFor };
