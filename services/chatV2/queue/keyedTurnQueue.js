class KeyedTurnQueue{
 constructor(){this.tails=new Map();this.cancelled=new Set()}
 cancel(key){this.cancelled.add(String(key))}
 resume(key){this.cancelled.delete(String(key))}
 enqueue(key,job){
  key=String(key);
  const prior=this.tails.get(key)||Promise.resolve();
  const run=prior.catch(()=>{}).then(()=>this.cancelled.has(key)?{cancelled:true}:job());
  const tail=run.finally(()=>{if(this.tails.get(key)===tail)this.tails.delete(key)});
  this.tails.set(key,tail);
  return run;
 }
}
module.exports=KeyedTurnQueue;
