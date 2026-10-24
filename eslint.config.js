// ESLint flat config (AR-43 lint gate).
// Gate semantics: no-undef is an ERROR (an undeclared identifier is a
// runtime ReferenceError waiting for its code path — see AR-01);
// no-unused-vars is a WARNING (reported, not blocking).
// Globals are declared inline (Node.js CommonJS runtime) so the config
// needs no extra dependency.
const nodeGlobals = {
  require: "readonly",
  module: "writable",
  exports: "writable",
  __dirname: "readonly",
  __filename: "readonly",
  process: "readonly",
  console: "readonly",
  Buffer: "readonly",
  global: "writable",
  globalThis: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  setImmediate: "readonly",
  clearImmediate: "readonly",
  queueMicrotask: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  TextEncoder: "readonly",
  TextDecoder: "readonly",
  fetch: "readonly",
  AbortController: "readonly",
  AbortSignal: "readonly",
  FormData: "readonly",
  Blob: "readonly",
  File: "readonly",
  Headers: "readonly",
  Request: "readonly",
  Response: "readonly",
  structuredClone: "readonly",
  ReadableStream: "readonly",
  WritableStream: "readonly",
  TransformStream: "readonly",
};

module.exports = [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
    },
  },
];
