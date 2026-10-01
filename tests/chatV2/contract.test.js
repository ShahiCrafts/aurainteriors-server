const test=require('node:test');const assert=require('node:assert/strict');const {definitions,schemas,byName}=require('../../services/chatV2/tools/registry');const {route}=require('../../services/chatV2/core/router');const {guard}=require('../../services/chatV2/core/outputGuard');const KeyedTurnQueue=require('../../services/chatV2/queue/keyedTurnQueue');
test('every declared tool has exactly one handler',()=>{const names=schemas().map(x=>x.function.name);assert.equal(new Set(names).size,names.length);for(const n of names)assert.equal(typeof byName.get(n)?.handler,'function')});
test('identity is not model-controlled',()=>{for(const s of schemas())assert.equal(Object.hasOwn(s.function.parameters.properties,'userId'),false)});
test('router delegates natural language to semantic orchestrator',()=>{assert.equal(route('hello').kind,'llm');assert.equal(route('I said hello to the agent yesterday').kind,'llm')});
test('guard removes foreign URLs',()=>assert.equal(guard('see https://evil.test/x and https://aurainteriors.live/shop'),'see [link removed] and https://aurainteriors.live/shop'));
test('queue serializes a conversation',async()=>{const q=new KeyedTurnQueue();const order=[];await Promise.all([q.enqueue('a',async()=>{await new Promise(r=>setTimeout(r,15));order.push(1)}),q.enqueue('a',async()=>order.push(2))]);assert.deepEqual(order,[1,2])});

test('queue releases completed conversation tails', async () => {
  const KeyedTurnQueue = require('../../services/chatV2/queue/keyedTurnQueue');
  const q = new KeyedTurnQueue();
  await q.enqueue('cleanup-chat', async () => 'ok');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(q.tails.size, 0);
});


test('semantic router delegates contextual language to the LLM', () => {
  for (const text of ['the first one', 'the cheaper one', 'add the second one', 'that sofa', 'show me sofas', 'how are you?']) {
    assert.equal(route(text).kind, 'llm', `${text} must be interpreted by the LLM orchestrator`);
  }
});

test('tool schemas expose strict task-specific arguments', () => {
  const tools = new Map(schemas().map(x => [x.function.name, x.function.parameters]));
  assert.deepEqual(tools.get('searchProducts').required, ['query']);
  assert.equal(tools.get('searchProducts').additionalProperties, false);
  assert.equal(Object.hasOwn(tools.get('getProductDetails').properties, 'productId'), true);
});
