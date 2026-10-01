// The LLM is the semantic authority. Keep this router deliberately minimal:
// infrastructure/safety shortcuts may live here, but natural-language intent,
// references and tool selection belong to the model with structured context.
function route(text) {
  const value = String(text || '').trim();
  if (!value) return { kind: 'empty', reply: 'Please send a message and I’ll help.' };
  return { kind: 'llm' };
}
module.exports = { route };
