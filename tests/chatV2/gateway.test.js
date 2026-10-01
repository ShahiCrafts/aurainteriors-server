const test=require('node:test');const assert=require('node:assert/strict');const {_parseSse}=require('../../services/chatV2/providers/llmGateway');
test('SSE parser assembles provider events without leaking framing',()=>{const got=[];let rest=_parseSse('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\n',x=>got.push(x));assert.equal(rest,'');assert.equal(got.length,2);assert.equal(got[0].choices[0].delta.content,'Hel')});

test('streamed tool-call deltas are reassembled by index across chunks', () => {
  const { _accumulateToolCall } = require('../../services/chatV2/providers/llmGateway');
  const calls = new Map();
  _accumulateToolCall(calls, { index: 0, id: 'call_1', function: { name: 'getProductDetails', arguments: '{"product' } });
  _accumulateToolCall(calls, { index: 0, function: { arguments: 'Id":"abc123"}' } });
  const [call] = [...calls.values()];
  assert.equal(calls.size, 1);
  assert.equal(call.id, 'call_1');
  assert.equal(call.function.name, 'getProductDetails');
  assert.deepEqual(JSON.parse(call.function.arguments), { productId: 'abc123' });
});

test('SSE parser accepts CRLF framing',()=>{const got=[];const rest=_parseSse('data: {"choices":[{"delta":{"content":"ok"}}]}\r\n\r\n',x=>got.push(x));assert.equal(rest,'');assert.equal(got.length,1);assert.equal(got[0].choices[0].delta.content,'ok')});

test('gateway recovers an empty SSE completion with a JSON completion on the same provider', async () => {
  const LlmGateway = require('../../services/chatV2/providers/llmGateway');
  const originalFetch = global.fetch;
  const encoder = new TextEncoder();
  const streamResponse = payload => ({ ok:true,status:200,headers:new Headers(),body:new ReadableStream({start(c){c.enqueue(encoder.encode(payload));c.close();}}) });
  let calls=0;
  global.fetch=async (_url, options)=>{calls+=1; if(JSON.parse(options.body).stream) return streamResponse('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'); return {ok:true,status:200,headers:new Headers(),json:async()=>({choices:[{message:{role:'assistant',content:'Recovered'},finish_reason:'stop'}]})};};
  try{
    const gateway=new LlmGateway({providers:[{name:'provider',model:'m1',baseUrl:'https://one.invalid',apiKey:'x'}],temperature:0,maxTokens:100});
    const out=await gateway.complete({messages:[{role:'user',content:'hi'}],tools:[],onToken:null});
    assert.equal(calls,2); assert.equal(out.provider,'provider'); assert.equal(out.message.content,'Recovered');
  } finally {global.fetch=originalFetch;}
});

test('gateway fails over only after both stream and JSON recovery are empty', async () => {
  const LlmGateway = require('../../services/chatV2/providers/llmGateway');
  const originalFetch=global.fetch; const encoder=new TextEncoder(); let calls=0;
  const streamResponse=payload=>({ok:true,status:200,headers:new Headers(),body:new ReadableStream({start(c){c.enqueue(encoder.encode(payload));c.close();}})});
  global.fetch=async (url,options)=>{calls+=1; const body=JSON.parse(options.body); if(url.includes('one.invalid')){if(body.stream)return streamResponse('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n');return {ok:true,status:200,headers:new Headers(),json:async()=>({choices:[{message:{role:'assistant',content:''},finish_reason:'stop'}]})};} return streamResponse('data: {"choices":[{"delta":{"content":"Fallback provider"},"finish_reason":"stop"}]}\n\n');};
  try{
    const gateway=new LlmGateway({providers:[{name:'empty',model:'m1',baseUrl:'https://one.invalid',apiKey:'x'},{name:'healthy',model:'m2',baseUrl:'https://two.invalid',apiKey:'y'}],temperature:0,maxTokens:100});
    const out=await gateway.complete({messages:[{role:'user',content:'hi'}],tools:[],onToken:null});
    assert.equal(calls,3); assert.equal(out.provider,'healthy'); assert.equal(out.message.content,'Fallback provider');
  } finally {global.fetch=originalFetch;}
});
