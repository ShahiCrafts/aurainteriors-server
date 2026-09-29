const db=()=>require('../../dbTools');
const definitions=[
{name:'searchProducts',description:'Search active Aura products.',identity:false,handler:a=>db().searchProducts(a)},
{name:'getProductDetails',description:'Get an Aura product by SKU or product ID.',identity:false,handler:a=>db().getProductDetails(a)},
{name:'getOrderStatus',description:'Get order status. Account identity is server supplied.',identity:true,handler:(a,c)=>db().getOrderStatus({...a,userId:c.userId||undefined,email:c.userId?undefined:a.email})},
{name:'getOrderHistory',description:'Get signed-in customer order history.',identity:true,handler:(_a,c)=>db().getOrderHistory({userId:c.userId})},
{name:'getDefaultAddress',description:'Get signed-in customer default address.',identity:true,handler:(_a,c)=>db().getDefaultAddress({userId:c.userId})},
{name:'getSavedAddresses',description:'Get signed-in customer saved addresses.',identity:true,handler:(_a,c)=>db().getSavedAddresses({userId:c.userId})},
{name:'getProfileInfo',description:'Get signed-in customer profile.',identity:true,handler:(_a,c)=>db().getProfileInfo({userId:c.userId})},
{name:'handoffToHuman',description:'Request a human agent with a short reason.',identity:false,handler:async(a,c)=>c.handoff(a.reason||'Customer requested human assistance')},
{name:'retrieveKnowledge',description:'Retrieve Aura policy or design knowledge when needed.',identity:false,handler:async(a,c)=>c.retrieve(a.query)}];
const byName=new Map(definitions.map(x=>[x.name,x]));
function schemas(){return definitions.map(x=>({type:'function',function:{name:x.name,description:x.description,parameters:{type:'object',properties:x.name==='handoffToHuman'?{reason:{type:'string'}}:x.name==='retrieveKnowledge'?{query:{type:'string'}}:{query:{type:'string'},sku:{type:'string'},productId:{type:'string'},orderId:{type:'string'},email:{type:'string'},categoryName:{type:'string'},limit:{type:'number'}}}}}))}
async function execute(name,args,ctx,{timeoutMs=1200}={}){const t=byName.get(name);if(!t)throw new Error(`Unknown tool: ${name}`);if(t.identity&&['getOrderHistory','getDefaultAddress','getSavedAddresses','getProfileInfo'].includes(name)&&!ctx.userId)return{error:'Authentication required'};const safe={...args};delete safe.userId;return Promise.race([t.handler(safe,ctx),new Promise((_,r)=>setTimeout(()=>r(new Error(`Tool timeout: ${name}`)),timeoutMs))])}
module.exports={definitions,schemas,execute,byName};
