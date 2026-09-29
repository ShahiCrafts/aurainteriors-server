const TRIVIAL=[[/^(hi|hello|hey|good (morning|afternoon|evening))[!. ]*$/i,"Hello! Welcome to Aura Interiors. How can I help with your home or order today?"],[/^(thanks|thank you|thx)[!. ]*$/i,"You're welcome! Is there anything else I can help with?"]];
function route(text){const s=String(text||'').trim();for(const [re,reply] of TRIVIAL)if(re.test(s))return{kind:'static',reply};return{kind:'llm'};}
module.exports={route};
