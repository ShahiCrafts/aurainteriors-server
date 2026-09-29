const DEFAULT_ORIGINS=['https://aurainteriors.live','https://www.aurainteriors.live'];
function guard(text,{toolUrls=[],origins=DEFAULT_ORIGINS}={}){const allowed=new Set(toolUrls);return String(text||'').replace(/https?:\/\/[^\s)\]}]+/g,u=>{try{const x=new URL(u);return origins.includes(x.origin)||allowed.has(u)?u:'[link removed]'}catch{return '[link removed]'}}).replace(/<\/?function[^>]*>/gi,'').trim()}
module.exports={guard};
