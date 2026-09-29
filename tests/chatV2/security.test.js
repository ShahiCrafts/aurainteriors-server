const test=require('node:test');const assert=require('node:assert/strict');const {execute}=require('../../services/chatV2/tools/registry');
test('account tools reject guests generically',async()=>{assert.deepEqual(await execute('getProfileInfo',{userId:'attacker'},{userId:null},{timeoutMs:50}),{error:'Authentication required'})});
test('model supplied identity is stripped before handoff tools',async()=>{let reason;await execute('handoffToHuman',{reason:'help',userId:'attacker'},{handoff:async r=>(reason=r,{ok:true}),retrieve:async()=>{}},{timeoutMs:50});assert.equal(reason,'help')});
