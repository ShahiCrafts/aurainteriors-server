// B-20 — getEsewaConfig must not fall back to the published eSewa SANDBOX
// credentials outside development. Before the fix, any NODE_ENV other than
// "production" (staging, preview, test, CI) silently signed and verified
// payments with a publicly known key/merchant.
// NOTE: this test never contains the sandbox secret value — it only checks
// behavior (throws vs returns, and which merchant id comes back).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const servicePath = path.join(
  __dirname,
  "..",
  "..",
  "services",
  "esewaVerification.service.js",
);
const ENV_KEYS = [
  "NODE_ENV",
  "ESEWA_MERCHANT_ID",
  "ESEWA_SECRET_KEY",
  "ESEWA_ENV",
];

function loadConfig(env) {
  // Apply `env`, load a fresh copy of the service, restore the process env,
  // and return a getter that re-applies `env` for the duration of the call
  // (getEsewaConfig reads process.env when called, not only at load time).
  const saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
  }
  const apply = (e) => {
    for (const k of ENV_KEYS) delete process.env[k];
    Object.assign(process.env, e);
  };
  const restore = () => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  };
  let svc;
  try {
    apply(env);
    delete require.cache[servicePath];
    svc = require(servicePath);
  } finally {
    restore();
  }
  return () => {
    try {
      apply(env);
      return svc.getEsewaConfig();
    } finally {
      restore();
    }
  };
}

test("B-20: staging without env credentials refuses to use sandbox credentials", () => {
  const get = loadConfig({ NODE_ENV: "staging" });
  assert.throws(() => get(), /eSewa/i);
});

test("B-20: NODE_ENV=test without env credentials refuses too", () => {
  const get = loadConfig({ NODE_ENV: "test" });
  assert.throws(() => get(), /eSewa/i);
});

test("B-20: staging with real env credentials uses them", () => {
  const get = loadConfig({
    NODE_ENV: "staging",
    ESEWA_MERCHANT_ID: "staging-merchant",
    ESEWA_SECRET_KEY: "dummy-staging-secret",
  });
  const cfg = get();
  assert.equal(cfg.merchantId, "staging-merchant");
  assert.equal(cfg.secretKey, "dummy-staging-secret");
});

test("FA-19: development without env credentials refuses (no source-held fallback remains)", () => {
  const get = loadConfig({ NODE_ENV: "development" });
  assert.throws(() => get(), /eSewa/i);
});

test("FA-19: sandbox endpoints only for ESEWA_ENV=sandbox or NODE_ENV=test", () => {
  const devSandbox = loadConfig({
    NODE_ENV: "development",
    ESEWA_ENV: "sandbox",
    ESEWA_MERCHANT_ID: "EPAYTEST",
    ESEWA_SECRET_KEY: "dummy-sandbox-secret",
  });
  assert.match(devSandbox().paymentUrl, /rc-epay/);
  const devPlain = loadConfig({
    NODE_ENV: "development",
    ESEWA_MERCHANT_ID: "dev-merchant",
    ESEWA_SECRET_KEY: "dummy-dev-secret",
  });
  assert.match(devPlain().paymentUrl, /epay\.esewa\.com\.np/);
  assert.doesNotMatch(devPlain().paymentUrl, /rc-epay/);
  const testEnv = loadConfig({
    NODE_ENV: "test",
    ESEWA_MERCHANT_ID: "EPAYTEST",
    ESEWA_SECRET_KEY: "dummy-test-secret",
  });
  assert.match(testEnv().paymentUrl, /rc-epay/);
});

test("characterization: production rejects the sandbox merchant and missing credentials", () => {
  const getSandbox = loadConfig({
    NODE_ENV: "production",
    ESEWA_MERCHANT_ID: "EPAYTEST",
    ESEWA_SECRET_KEY: "dummy-prod-secret",
  });
  assert.throws(() => getSandbox(), /production eSewa/i);
  const getMissing = loadConfig({ NODE_ENV: "production" });
  assert.throws(() => getMissing(), /eSewa/i);
});
