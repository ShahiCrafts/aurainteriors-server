class KeyedTurnQueue{
 constructor(){this.tails=new Map();this.cancelled=new Set()}
 // FA-59: the cancelled set is capped (FIFO eviction) so a long-lived
 // process cannot grow it without bound via cancelled chat keys.
 cancel(key){this.cancelled.add(String(key));if(this.cancelled.size>1000){const oldest=this.cancelled.values().next().value;this.cancelled.delete(oldest)}}
 resume(key){this.cancelled.delete(String(key))}
 enqueue(key,job){
  key=String(key);
  const prior=this.tails.get(key)||Promise.resolve();
  const run=prior.catch(()=>{}).then(()=>this.cancelled.has(key)?{cancelled:true}:job());
  const cleanup=()=>{if(this.tails.get(key)===tail)this.tails.delete(key)};
  // Internal tail always settles successfully; the caller still receives run rejection.
  const tail=run.then(cleanup,cleanup);
  this.tails.set(key,tail);
  return run;
 }
}
module.exports=KeyedTurnQueue;
