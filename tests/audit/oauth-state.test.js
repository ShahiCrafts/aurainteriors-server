// A-01 — Google OAuth must carry an unguessable `state` bound to the
// initiating browser, verified on the callback (login CSRF). The route
// previously passed no state at all and accepted any callback.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { issueOauthState, verifyOauthState, OAUTH_STATE_COOKIE } = require("../../utils/oauthState");

function mockRes() {
  return {
    cookiesSet: {}, cookiesCleared: [], statusCode: undefined, body: undefined,
    cookie(name, value, options) { this.cookiesSet[name] = { value, options }; return this; },
    clearCookie(name) { this.cookiesCleared.push(name); return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}
function runVerify(req) {
  const res = mockRes();
  let nextCalled = false;
  verifyOauthState(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

test("A-01: issued state is a 64-hex random value stored in an HttpOnly cookie", () => {
  const res = mockRes();
  const state = issueOauthState(res);
  assert.match(state, /^[a-f0-9]{64}$/);
  const stored = res.cookiesSet[OAUTH_STATE_COOKIE];
  assert.equal(stored.value, state);
  assert.equal(stored.options.httpOnly, true);
  assert.equal(stored.options.path, "/api/v1/auth");
  const res2 = mockRes();
  assert.notEqual(issueOauthState(res2), state, "states must be random per flow");
});

test("A-01: callback with the matching state proceeds", () => {
  const res = mockRes();
  const state = issueOauthState(res);
  const { nextCalled } = runVerify({ cookies: { [OAUTH_STATE_COOKIE]: state }, query: { state } });
  assert.equal(nextCalled, true);
});

test("A-01: callback with a mismatched state is rejected 403 (login CSRF)", () => {
  const res = mockRes();
  const victimState = issueOauthState(res);
  const attackerState = "a".repeat(64);
  const { res: cbRes, nextCalled } = runVerify({
    cookies: { [OAUTH_STATE_COOKIE]: victimState },
    query: { state: attackerState },
  });
  assert.equal(nextCalled, false);
  assert.equal(cbRes.statusCode, 403);
});

test("A-01: callback with no state cookie or no state param is rejected", () => {
  const state = "b".repeat(64);
  assert.equal(runVerify({ cookies: {}, query: { state } }).nextCalled, false);
  assert.equal(runVerify({ cookies: { [OAUTH_STATE_COOKIE]: state }, query: {} }).nextCalled, false);
  assert.equal(runVerify({ cookies: { [OAUTH_STATE_COOKIE]: state }, query: { state: "" } }).nextCalled, false);
});

test("A-01: state is single-use (cookie cleared during verification)", () => {
  const res = mockRes();
  const state = issueOauthState(res);
  const { res: cbRes } = runVerify({ cookies: { [OAUTH_STATE_COOKIE]: state }, query: { state } });
  assert.deepEqual(cbRes.cookiesCleared, [OAUTH_STATE_COOKIE]);
});
