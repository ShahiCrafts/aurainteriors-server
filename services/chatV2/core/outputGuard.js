// OA-1: allowed origins derive from the shared env builder
// (FRONTEND_URL + ADMIN_URL + CORS_EXTRA_ORIGINS) at call time - the
// hardcoded DEFAULT_ORIGINS list is removed. Callers may still pass an
// explicit `origins` list (tests, tool URLs).
// FA-82 (restored - the draft dropped this comment): assistant output
// is PLAIN TEXT by contract. The client renders it as text/markdown,
// never as HTML; the guard therefore strips any HTML tags a model
// emits (defense in depth if a future client renders markup), in
// addition to the URL allowlist below. The client must keep treating
// model output as untrusted text.
function guard(text,{toolUrls=[],origins}={}){const allowed=new Set(toolUrls);const allowedOrigins=origins||require('../../../config/appConfig').buildAllowedOrigins();return String(text||'').replace(/https?:\/\/[^\s)\]}]+/g,u=>{try{const x=new URL(u);return allowedOrigins.includes(x.origin)||allowed.has(u)?u:'[link removed]'}catch{return '[link removed]'}}).replace(/<\/?function[^>]*>/gi,'').replace(/<[^>]*>/g,'').trim()}
module.exports={guard};
