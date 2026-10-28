// AR-34 — the timing-equalization dummy hash must NOT be computed
// with bcrypt.hashSync on the request path (a ~430 ms event-loop
// block, MEASURED in audit/arch/bench/raw/micro-bench.txt). It is
// precomputed at module load with ASYNC bcrypt.hash at the SAME cost
// (12) as before; the compare path awaits the precomputed value.
// The dummy value is not a secret.
//
// Harness mirrors tests/fresh/batch6-auth-session.test.js (require
// cache stubs for the models, real bcrypt so the spies observe the
// genuine module object the controller calls through).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};
process.env.JWT_SECRET = "<redacted>";

// Configurable User stub: findOne(...).select(...) resolves to
// `nextUser` (null = unknown email).
let nextUser = null;
stub("models/user.model.js", {
  findOne: () => ({ select: async () => nextUser }),
});
stub("models/revokedToken.model.js", {});
stub("services/email.service.js", { sendMagicLinkEmail: () => {} });

const bcrypt = require(path.join(repo, "node_modules/bcrypt"));
const auth = require(path.join(repo, "controllers/auth.controller.js"));

// Spies are installed AFTER the controller is required: module load
// is boot, not the request path. Any hashSync call from here on can
// only come from a request handler.
let hashSyncCalls = 0;
const realHashSync = bcrypt.hashSync;
bcrypt.hashSync = (...args) => {
  hashSyncCalls += 1;
  return realHashSync(...args);
};
const compareCalls = [];
const realCompare = bcrypt.compare;
bcrypt.compare = async (candidate, hash) => {
  compareCalls.push({ candidate, hash });
  return realCompare(candidate, hash);
};

const runAdminLogin = async (email, password) => {
  const res = {
    code: null,
    body: null,
    status(c) {
      this.code = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
  await auth.adminLogin({ body: { email, password }, headers: {} }, res);
  return res;
};

test("AR-34 (a): unknown-email admin login never calls hashSync on the request path and compares against the precomputed dummy", async () => {
  nextUser = null;
  hashSyncCalls = 0;
  compareCalls.length = 0;
  const res = await runAdminLogin("nobody@example.com", "some-password-123");
  assert.equal(
    res.code,
    401,
    `unknown admin email must 401; got ${res.code} ${JSON.stringify(res.body)}`,
  );
  assert.equal(
    hashSyncCalls,
    0,
    "bcrypt.hashSync must not run on the request path (it blocks the event loop for ~430 ms)",
  );
  assert.equal(compareCalls.length, 1, "exactly one (dummy) compare must run");
  const dummy = await auth._getDummyPasswordHash();
  assert.equal(
    compareCalls[0].hash,
    dummy,
    "the compare must use the precomputed dummy hash",
  );
});

test("AR-34 (b): timing equalization is preserved - the dummy compare still runs for unknown and non-admin users", async () => {
  // Unknown user.
  nextUser = null;
  compareCalls.length = 0;
  await runAdminLogin("ghost@example.com", "whatever-123");
  assert.equal(
    compareCalls.length,
    1,
    "unknown user must still burn one bcrypt compare",
  );

  // Known user who is not an admin (has a real password hash): the
  // controller must still take the dummy branch, never the real hash.
  nextUser = {
    role: "customer",
    isActive: true,
    password: await bcrypt.hash("real-password-123", 4),
  };
  compareCalls.length = 0;
  const res = await runAdminLogin("customer@example.com", "real-password-123");
  assert.equal(
    res.code,
    401,
    "non-admin must 401 even with the correct password",
  );
  assert.equal(compareCalls.length, 1, "non-admin must still burn one compare");
  const dummy = await auth._getDummyPasswordHash();
  assert.equal(
    compareCalls[0].hash,
    dummy,
    "non-admin compare must use the dummy, not the user's real hash",
  );
});

test("AR-34: the precomputed dummy is a cost-12 bcrypt hash (cost parameters unchanged)", async () => {
  const dummy = await auth._getDummyPasswordHash();
  assert.match(
    dummy,
    /^\$2[aby]\$12\$/,
    `dummy must be a bcrypt hash at cost 12; got: ${dummy.slice(0, 7)}...`,
  );
  assert.equal(
    await bcrypt.compare("timing-equalization-dummy", dummy),
    true,
    "dummy must be a hash of the same dummy plaintext as before",
  );
});
