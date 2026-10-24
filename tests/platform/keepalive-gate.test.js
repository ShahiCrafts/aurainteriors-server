// AR-44 (D-E) — keep-alive enablement gate.
//
// Characterization: pins the CURRENT truth table of
// services/keepAlive.service.js. The legacy rule is
//   enabled = (process.env.KEEP_ALIVE_ENABLED === "true")
//             || (process.env.NODE_ENV === "production")
// Note the quirk it pins: in production the service is enabled even when
// KEEP_ALIVE_ENABLED is set to a non-"true" value — there is currently
// NO way to disable keep-alive in production via the legacy variable.
//
// The constructor reads env only; tests assert on service.enabled /
// getStatus().enabled and never call start().
const test = require("node:test");
const assert = require("node:assert/strict");

const KeepAliveService = require("../../services/keepAlive.service");

const ENV_KEYS = ["NODE_ENV", "KEEP_ALIVE_ENABLED", "KEEPALIVE_ENABLED"];

function buildService(env) {
  const saved = {};
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  const warnings = [];
  const origLog = console.log;
  const origWarn = console.warn;
  console.log = () => {};
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) process.env[key] = value;
    }
    const service = new KeepAliveService();
    return { service, warnings };
  } finally {
    console.log = origLog;
    console.warn = origWarn;
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

// ---------------------------------------------------------------------
// Characterization of the legacy rule (must hold before AND after AR-44
// whenever KEEPALIVE_ENABLED is unset).
// ---------------------------------------------------------------------

test("characterization: (dev, nothing set) -> disabled", () => {
  const { service } = buildService({ NODE_ENV: "development" });
  assert.equal(service.enabled, false);
  assert.equal(service.getStatus().enabled, false);
});

test("characterization: (production, nothing set) -> enabled", () => {
  const { service } = buildService({ NODE_ENV: "production" });
  assert.equal(service.enabled, true);
  assert.equal(service.getStatus().enabled, true);
});

test("characterization: (dev, KEEP_ALIVE_ENABLED=true) -> enabled", () => {
  const { service } = buildService({
    NODE_ENV: "development",
    KEEP_ALIVE_ENABLED: "true",
  });
  assert.equal(service.enabled, true);
});

test("characterization: (production, KEEP_ALIVE_ENABLED=false) -> enabled (quirk: no way to disable in production)", () => {
  const { service } = buildService({
    NODE_ENV: "production",
    KEEP_ALIVE_ENABLED: "false",
  });
  assert.equal(service.enabled, true);
});

test("characterization: (test env, nothing set) -> disabled", () => {
  const { service } = buildService({ NODE_ENV: "test" });
  assert.equal(service.enabled, false);
});

test("characterization: (dev, KEEP_ALIVE_ENABLED=TRUE) -> disabled (legacy comparison is case-sensitive 'true')", () => {
  const { service } = buildService({
    NODE_ENV: "development",
    KEEP_ALIVE_ENABLED: "TRUE",
  });
  assert.equal(service.enabled, false);
});

// ---------------------------------------------------------------------
// AR-44: KEEPALIVE_ENABLED gate (owner decision D-E).
// When KEEPALIVE_ENABLED is set to a non-empty (after trim) value it
// decides enablement, parsed case-insensitively:
//   true/1/on/yes -> enabled; false/0/off/no -> disabled.
// Any other value logs one console.warn naming the variable and falls
// back to the legacy rule. When unset/empty, the legacy rule applies
// EXACTLY as before (including the production auto-enable quirk).
// This is the first flag that lets an operator DISABLE keep-alive in
// production.
// ---------------------------------------------------------------------

test("AR-44: (production, KEEPALIVE_ENABLED=false) -> disabled (first way to turn keep-alive off in production)", () => {
  const { service } = buildService({
    NODE_ENV: "production",
    KEEPALIVE_ENABLED: "false",
  });
  assert.equal(service.enabled, false);
});

test("AR-44: (dev, KEEPALIVE_ENABLED=true, no legacy var) -> enabled", () => {
  const { service } = buildService({
    NODE_ENV: "development",
    KEEPALIVE_ENABLED: "true",
  });
  assert.equal(service.enabled, true);
});

test("AR-44: KEEPALIVE_ENABLED overrides the legacy variable", () => {
  const off = buildService({
    NODE_ENV: "development",
    KEEP_ALIVE_ENABLED: "true",
    KEEPALIVE_ENABLED: "off",
  });
  assert.equal(off.service.enabled, false);
  const on = buildService({
    NODE_ENV: "production",
    KEEP_ALIVE_ENABLED: "false",
    KEEPALIVE_ENABLED: "1",
  });
  assert.equal(on.service.enabled, true);
});

test("AR-44: truthy spellings are case-insensitive (TRUE / On / YES / 1)", () => {
  for (const value of ["TRUE", "On", "YES", "1"]) {
    const { service } = buildService({
      NODE_ENV: "development",
      KEEPALIVE_ENABLED: value,
    });
    assert.equal(service.enabled, true, `KEEPALIVE_ENABLED=${value}`);
  }
});

test("AR-44: falsy spellings are case-insensitive (FALSE / Off / NO / 0)", () => {
  for (const value of ["FALSE", "Off", "NO", "0"]) {
    const { service } = buildService({
      NODE_ENV: "production",
      KEEPALIVE_ENABLED: value,
    });
    assert.equal(service.enabled, false, `KEEPALIVE_ENABLED=${value}`);
  }
});

test("AR-44: value is trimmed before parsing", () => {
  const { service } = buildService({
    NODE_ENV: "production",
    KEEPALIVE_ENABLED: "  false  ",
  });
  assert.equal(service.enabled, false);
});

test("AR-44: unparseable value warns once naming the variable and falls back to the legacy rule", () => {
  const dev = buildService({
    NODE_ENV: "development",
    KEEPALIVE_ENABLED: "sometimes",
  });
  assert.equal(dev.service.enabled, false);
  assert.equal(dev.warnings.length, 1);
  assert.match(dev.warnings[0], /KEEPALIVE_ENABLED/);

  const prod = buildService({
    NODE_ENV: "production",
    KEEPALIVE_ENABLED: "sometimes",
  });
  assert.equal(prod.service.enabled, true);
  assert.equal(prod.warnings.length, 1);
  assert.match(prod.warnings[0], /KEEPALIVE_ENABLED/);
});

test("AR-44: empty / whitespace-only KEEPALIVE_ENABLED counts as unset (legacy rule, no warning)", () => {
  const empty = buildService({
    NODE_ENV: "production",
    KEEPALIVE_ENABLED: "",
  });
  assert.equal(empty.service.enabled, true);
  assert.equal(empty.warnings.length, 0);

  const blank = buildService({
    NODE_ENV: "development",
    KEEPALIVE_ENABLED: "   ",
  });
  assert.equal(blank.service.enabled, false);
  assert.equal(blank.warnings.length, 0);
});
