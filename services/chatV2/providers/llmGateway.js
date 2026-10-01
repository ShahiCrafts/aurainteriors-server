const CircuitBreaker=require('./circuitBreaker');
const breaker=new CircuitBreaker();
function timeoutSignal(ms){const c=new AbortController();const id=setTimeout(()=>c.abort(new Error('timeout')),Math.max(1,ms));return{controller:c,signal:c.signal,clear:()=>clearTimeout(id)}}

function accumulateToolCall(calls, tc){
 const index=Number.isInteger(tc.index)?tc.index:calls.size;
 const key=`index:${index}`;
 const x=calls.get(key)||{id:tc.id||key,type:'function',function:{name:'',arguments:''}};
 if(tc.id)x.id=tc.id;
 if(tc.function?.name)x.function.name+=tc.function.name;
 if(tc.function?.arguments)x.function.arguments+=tc.function.arguments;
 calls.set(key,x);
}
function parseSse(buffer,onEvent){let match;while((match=/\r?\n\r?\n/.exec(buffer))){const raw=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);for(const line of raw.split(/\r?\n/)){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data&&data!=='[DONE]')onEvent(JSON.parse(data));}}return buffer}
class LlmGateway{
 constructor(config){this.config=config}
 async complete({messages,tools,onToken}){
  let last;
  for(const p of this.config.providers){
   const key=`${p.name}:${p.model}`;if(!breaker.canTry(key))continue;
   try{
    const out=await this._stream(p,key,{messages,tools,onToken});
    const hasText=typeof out?.message?.content==='string'&&out.message.content.trim().length>0;
    const hasTools=Array.isArray(out?.message?.tool_calls)&&out.message.tool_calls.length>0;
    // An assistant turn may legitimately contain no text when it requests a
    // tool. Empty text with no tool call is not a usable completion: fail over
    // to the next configured provider instead of surfacing a generic reply.
    if(!hasText&&!hasTools){
      // Some OpenAI-compatible gateways occasionally terminate an SSE stream
      // without yielding the assistant payload even though the request itself
      // succeeded. Retry the same provider once as a normal JSON completion;
      // this is a transport recovery, not an AI response timeout/retry loop.
      console.warn('chat_llm_empty_stream_recovery',{provider:p.name,model:p.model,finishReason:out?.finishReason||null});
      const recovered=await this._completeJson(p,key,{messages,tools});
      const recoveredText=typeof recovered?.message?.content==='string'&&recovered.message.content.trim().length>0;
      const recoveredTools=Array.isArray(recovered?.message?.tool_calls)&&recovered.message.tool_calls.length>0;
      if(recoveredText||recoveredTools)return recovered;
      const e=new Error(`${p.name} returned an empty completion`);e.code='EMPTY_COMPLETION';throw e
    }
    return out;
   }
   catch(e){last=e;console.warn('chat_llm_provider_failed',{provider:p.name,model:p.model,code:e?.code||null,error:e?.message});if(!e.breakerRecorded)breaker.failure(key)}
  }
  throw last||new Error('No healthy AI provider available');
 }

 async _completeJson(p,key,{messages,tools}){
  const res=await fetch(`${p.baseUrl}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${p.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:p.model,messages,tools,tool_choice:'auto',temperature:this.config.temperature,max_tokens:this.config.maxTokens,stream:false})});
  if(res.status===401||res.status===403){breaker.failure(key,{fatal:true});const e=new Error(`${p.name} authentication failed`);e.breakerRecorded=true;throw e}
  if(res.status===429){const seconds=Number(res.headers.get('retry-after'));breaker.failure(key,{retryAfterMs:Number.isFinite(seconds)?seconds*1000:0});const e=new Error(`${p.name} rate limited`);e.breakerRecorded=true;throw e}
  if(!res.ok)throw new Error(`${p.name} HTTP ${res.status}`);
  const body=await res.json();
  const choice=body?.choices?.[0]||{};
  const message=choice.message||{};
  return{provider:p.name,model:p.model,message:{role:'assistant',content:typeof message.content==='string'?message.content:'',tool_calls:Array.isArray(message.tool_calls)&&message.tool_calls.length?message.tool_calls:undefined},usage:body?.usage||null,finishReason:choice.finish_reason||null};
 }

 async _stream(p,key,{messages,tools,onToken}){
  let res;
  // Deliberately no application response deadline/AbortController here. A valid
  // model turn is allowed to finish naturally; UI communicates progress via
  // ai:thinking_start/stop rather than converting normal model latency to errors.
  try{res=await fetch(`${p.baseUrl}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${p.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:p.model,messages,tools,tool_choice:'auto',temperature:this.config.temperature,max_tokens:this.config.maxTokens,stream:true,stream_options:{include_usage:true}})})}catch(e){throw e}
  if(res.status===401||res.status===403){breaker.failure(key,{fatal:true});const e=new Error(`${p.name} authentication failed`);e.breakerRecorded=true;throw e}
  if(res.status===429){const seconds=Number(res.headers.get('retry-after'));breaker.failure(key,{retryAfterMs:Number.isFinite(seconds)?seconds*1000:0});const e=new Error(`${p.name} rate limited`);e.breakerRecorded=true;throw e}
  if(!res.ok)throw new Error(`${p.name} HTTP ${res.status}`)
  const reader=res.body?.getReader();if(!reader)throw new Error(`${p.name} missing stream body`)
  const decoder=new TextDecoder();let buf='',content='',usage=null,finishReason=null;const calls=new Map();
  const event=chunk=>{usage=chunk.usage||usage;const choice=chunk.choices?.[0];if(!choice)return;finishReason=choice.finish_reason||finishReason;const d=choice.delta||{};if(d.content){content+=d.content;onToken?.(d.content)}for(const tc of d.tool_calls||[])accumulateToolCall(calls,tc)};
  while(true){const {done,value}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});buf=parseSse(buf,event)}
  buf+=decoder.decode();
  buf=parseSse(buf,event);
  // Some compatible providers close the stream without a final blank line.
  // Parse the remaining complete data line rather than silently discarding it.
  if(buf.trim()){for(const line of buf.split(/\r?\n/)){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data&&data!=='[DONE]')event(JSON.parse(data));}}
  breaker.success(key);return{provider:p.name,model:p.model,message:{role:'assistant',content,tool_calls:calls.size?[...calls.values()]:undefined},usage,finishReason};
 }
}
async function validateConfiguredModels(config,{timeoutMs=900}={}){const results=[];await Promise.all(config.providers.map(async p=>{try{const t=timeoutSignal(timeoutMs);const r=await fetch(`${p.baseUrl}/models`,{signal:t.signal,headers:{Authorization:`Bearer ${p.apiKey}`}});t.clear();if(!r.ok){results.push({provider:p.name,ok:false,status:r.status});return}const body=await r.json();const ids=new Set((body.data||[]).map(x=>x.id));results.push({provider:p.name,ok:ids.has(p.model),model:p.model})}catch(e){results.push({provider:p.name,ok:false,error:e.name})}}));return results}
module.exports=LlmGateway;module.exports.validateConfiguredModels=validateConfiguredModels;module.exports._parseSse=parseSse;module.exports._accumulateToolCall=accumulateToolCall;
