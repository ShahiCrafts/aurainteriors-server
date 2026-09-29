const CircuitBreaker=require('./circuitBreaker');
const breaker=new CircuitBreaker();
function timeoutSignal(ms){const c=new AbortController();const id=setTimeout(()=>c.abort(new Error('timeout')),Math.max(1,ms));return{controller:c,signal:c.signal,clear:()=>clearTimeout(id)}}
function parseSse(buffer,onEvent){let i;while((i=buffer.indexOf('\n\n'))>=0){const raw=buffer.slice(0,i);buffer=buffer.slice(i+2);for(const line of raw.split('\n')){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data&&data!=='[DONE]')onEvent(JSON.parse(data));}}return buffer}
class LlmGateway{
 constructor(config){this.config=config}
 async complete({messages,tools,onToken,deadlineAt}){
  let last;
  for(const p of this.config.providers){
   const remaining=deadlineAt?deadlineAt-Date.now():this.config.totalMs;
   if(remaining<=25)break;
   const key=`${p.name}:${p.model}`;if(!breaker.canTry(key))continue;
   try{return await this._stream(p,key,{messages,tools,onToken,budgetMs:Math.min(this.config.totalMs,remaining)})}
   catch(e){last=e;if(!e.breakerRecorded)breaker.failure(key)}
  }
  throw last||new Error('No healthy AI provider within turn budget');
 }
 async _stream(p,key,{messages,tools,onToken,budgetMs}){
  const total=timeoutSignal(budgetMs);let res;
  try{res=await fetch(`${p.baseUrl}/chat/completions`,{method:'POST',signal:total.signal,headers:{Authorization:`Bearer ${p.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:p.model,messages,tools,tool_choice:'auto',temperature:this.config.temperature,max_tokens:this.config.maxTokens,stream:true,stream_options:{include_usage:true}})})}catch(e){total.clear();throw e}
  if(res.status===401||res.status===403){total.clear();breaker.failure(key,{fatal:true});const e=new Error(`${p.name} authentication failed`);e.breakerRecorded=true;throw e}
  if(res.status===429){total.clear();const seconds=Number(res.headers.get('retry-after'));breaker.failure(key,{retryAfterMs:Number.isFinite(seconds)?seconds*1000:0});const e=new Error(`${p.name} rate limited`);e.breakerRecorded=true;throw e}
  if(!res.ok){total.clear();throw new Error(`${p.name} HTTP ${res.status}`)}
  const reader=res.body?.getReader();if(!reader){total.clear();throw new Error(`${p.name} missing stream body`)}
  const decoder=new TextDecoder();let buf='',content='',usage=null,finishReason=null;const calls=new Map();let first=false;
  const ttftId=setTimeout(()=>{if(!first)total.controller.abort(new Error(`${p.name} TTFT timeout`))},Math.min(this.config.ttftMs,budgetMs));
  const event=chunk=>{usage=chunk.usage||usage;const choice=chunk.choices?.[0];if(!choice)return;finishReason=choice.finish_reason||finishReason;const d=choice.delta||{};if(d.content){if(!first){first=true;clearTimeout(ttftId)}content+=d.content;onToken?.(d.content)}for(const tc of d.tool_calls||[]){const id=tc.id||`index:${tc.index}`;const x=calls.get(id)||{id:tc.id||id,type:'function',function:{name:'',arguments:''}};if(tc.id)x.id=tc.id;if(tc.function?.name)x.function.name+=tc.function.name;if(tc.function?.arguments)x.function.arguments+=tc.function.arguments;calls.set(id,x)}};
  try{while(true){const {done,value}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');buf=parseSse(buf,event)}}finally{clearTimeout(ttftId);total.clear()}
  breaker.success(key);return{provider:p.name,model:p.model,message:{role:'assistant',content,tool_calls:calls.size?[...calls.values()]:undefined},usage,finishReason};
 }
}
async function validateConfiguredModels(config,{timeoutMs=900}={}){const results=[];await Promise.all(config.providers.map(async p=>{try{const t=timeoutSignal(timeoutMs);const r=await fetch(`${p.baseUrl}/models`,{signal:t.signal,headers:{Authorization:`Bearer ${p.apiKey}`}});t.clear();if(!r.ok){results.push({provider:p.name,ok:false,status:r.status});return}const body=await r.json();const ids=new Set((body.data||[]).map(x=>x.id));results.push({provider:p.name,ok:ids.has(p.model),model:p.model})}catch(e){results.push({provider:p.name,ok:false,error:e.name})}}));return results}
module.exports=LlmGateway;module.exports.validateConfiguredModels=validateConfiguredModels;module.exports._parseSse=parseSse;
