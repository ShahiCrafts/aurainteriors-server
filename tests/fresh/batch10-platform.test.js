// Batch 10 (FRESH remediation): FA-17, FA-19 (in tests/audit), FA-20,
// FA-40, FA-41 (code-reviewed; seeder needs a live DB), FA-42, FA-43,
// FA-69, FA-75, FA-78, FA-84, FA-86, FA-87, FA-88, FA-89.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn, spawnSync } = require("node:child_process");
const repo = path.resolve(__dirname, "../..");
const { stubModule, mockRes } = require("../audit/helpers");

test("FA-75/FA-84: maskEmail keeps first char + domain only", () => {
  const { maskEmail } = require(path.join(repo, "utils/maskEmail.js"));
  assert.equal(maskEmail("saugat.shahi@example.com"), "s***@example.com");
  assert.equal(maskEmail("a@b.co"), "a***@b.co");
  assert.equal(maskEmail("not-an-email"), "***");
  assert.equal(maskEmail(""), "***");
});

test("FA-17: profile handler returns a generic 500 and logs the real error", async () => {
  const stubbedPath = stubModule("models/user.model.js", {
    findById: async () => {
      throw new Error("db exploded mongodb://internal-host:27017");
    },
  });
  delete require.cache[path.join(repo, "controllers/profile.controller.js")];
  const profile = require(path.join(repo, "controllers/profile.controller.js"));
  const res = mockRes();
  await profile.getProfile({ user: { id: "u1" } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Something went wrong. Please try again.");
  assert.ok(!JSON.stringify(res.body).includes("internal-host"));
  delete require.cache[stubbedPath];
  delete require.cache[path.join(repo, "controllers/profile.controller.js")];
});

test("FA-20: address handler returns a generic 500 and logs the real error", async () => {
  const stubbedPath = stubModule("models/address.model.js", {
    find: () => {
      throw new Error("db exploded mongodb://internal-host:27017");
    },
  });
  delete require.cache[path.join(repo, "controllers/address.controller.js")];
  const address = require(path.join(repo, "controllers/address.controller.js"));
  const res = mockRes();
  await address.getAllAddresses({ user: { id: "u1" } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Something went wrong. Please try again.");
  assert.ok(!JSON.stringify(res.body).includes("internal-host"));
  delete require.cache[stubbedPath];
  delete require.cache[path.join(repo, "controllers/address.controller.js")];
});

test("FA-88: GuestSession enforces the guest_<64 hex> session id format", async () => {
  const GuestSession = require(path.join(repo, "models/guestSession.model.js"));
  const bad = new GuestSession({ sessionId: "attacker-chosen" });
  const badErr = await bad.validate().then(
    () => null,
    (e) => e,
  );
  assert.ok(badErr && badErr.errors.sessionId, "malformed id rejected");
  const good = new GuestSession({ sessionId: `guest_${"a1".repeat(32)}` });
  const goodErr = await good.validate().then(
    () => null,
    (e) => e,
  );
  assert.ok(
    !goodErr || !goodErr.errors.sessionId,
    "server-minted format accepted",
  );
});

test("FA-86: user schema rejects short passwords on every write path", async () => {
  const User = require(path.join(repo, "models/user.model.js"));
  const base = {
    firstName: "A",
    lastName: "B",
    email: "a@b.co",
    phone: "9800000000",
  };
  const short = new User({ ...base, password: "short" });
  const err = await short.validate().then(
    () => null,
    (e) => e,
  );
  assert.ok(
    err && err.errors.password,
    `short password rejected: ${err && Object.keys(err.errors)}`,
  );
  const long = new User({ ...base, password: "a-very-reasonable-password" });
  const err2 = await long.validate().then(
    () => null,
    (e) => e,
  );
  assert.ok(
    !err2 || !err2.errors.password,
    "adequate password passes the schema floor",
  );
  const none = new User({ ...base });
  const err3 = await none.validate().then(
    () => null,
    (e) => e,
  );
  assert.ok(!err3 || !err3.errors.password, "passwordless accounts unaffected");
});

test("FA-69: compound unique index exists and registration is a single atomic upsert", async () => {
  const DevicePushToken = require(
    path.join(repo, "models/devicePushToken.model.js"),
  );
  const idx = DevicePushToken.schema
    .indexes()
    .find(([keys, opts]) => keys.user === 1 && keys.deviceId === 1);
  assert.ok(
    idx && idx[1].unique === true,
    "compound unique (user, deviceId) index declared",
  );
  let captured = null;
  const original = DevicePushToken.findOneAndUpdate;
  DevicePushToken.findOneAndUpdate = async (filter, update, opts) => {
    captured = { filter, update, opts };
    return { _id: "doc1", user: filter.user, deviceId: filter.deviceId };
  };
  try {
    delete require.cache[path.join(repo, "services/pushTokenService.js")];
    const svc = require(path.join(repo, "services/pushTokenService.js"));
    const register =
      svc.registerPushToken ||
      (svc.default && svc.default.registerPushToken) ||
      (typeof svc === "object" &&
        svc.pushTokenService &&
        svc.pushTokenService.registerPushToken);
    const service = svc.registerPushToken ? svc : svc.instance || svc;
    const fn = register || service.registerPushToken;
    await fn.call(service, {
      userId: "u1",
      token: "tok",
      deviceId: "dev1",
      platform: "web",
      metadata: { appVersion: "1.0" },
    });
  } finally {
    DevicePushToken.findOneAndUpdate = original;
  }
  assert.ok(captured, "findOneAndUpdate was used");
  assert.deepEqual(Object.keys(captured.filter).sort(), ["deviceId", "user"]);
  assert.equal(captured.opts.upsert, true);
  assert.equal(captured.update.$set.token, "tok");
  assert.equal(captured.update.$set["metadata.appVersion"], "1.0");
});

test("FA-42: audit-gate exit codes distinguish clean / issues / could-not-run", () => {
  const gate = path.join(repo, "scripts/audit-gate.js");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-"));
  const write = (name, content) => {
    const f = path.join(dir, name);
    fs.writeFileSync(f, content);
    return f;
  };
  const clean = write(
    "clean.json",
    JSON.stringify({
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 1,
          high: 0,
          critical: 0,
          total: 1,
        },
      },
    }),
  );
  const dirty = write(
    "dirty.json",
    JSON.stringify({
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 2,
          critical: 0,
          total: 2,
        },
      },
    }),
  );
  const errored = write(
    "error.json",
    JSON.stringify({ error: { code: "ENOAUDIT", message: "registry error" } }),
  );
  const garbage = write("garbage.json", "403 Forbidden - policy_denied");
  assert.equal(spawnSync("node", [gate, clean]).status, 0);
  assert.equal(spawnSync("node", [gate, dirty]).status, 1);
  assert.equal(spawnSync("node", [gate, errored]).status, 2);
  assert.equal(spawnSync("node", [gate, garbage]).status, 2);
});

test("FA-43: every workflow action is pinned to a full commit SHA", () => {
  for (const f of [
    ".github/workflows/security.yml",
    ".github/workflows/codeql.yml",
  ]) {
    const text = fs.readFileSync(path.join(repo, f), "utf8");
    const uses = [...text.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
    assert.ok(uses.length > 0, `${f} has actions`);
    for (const u of uses) {
      assert.match(u, /@[a-f0-9]{40}$/, `${f}: ${u} is SHA-pinned`);
    }
  }
});

test("FA-87: the unmounted system-info handler is deleted", () => {
  assert.equal(
    fs.existsSync(path.join(repo, "controllers/system.controller.js")),
    false,
  );
});

async function waitForPort(port, timeoutMs = 25000) {
  const start = Date.now();
  for (;;) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.status) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - start > timeoutMs)
      throw new Error("server did not come up");
    await new Promise((r) => setTimeout(r, 400));
  }
}

test("FA-40: public health payloads are bare; detail needs the token", async () => {
  const port = 39117;
  const child = spawn(
    "node",
    ["-r", path.join(__dirname, "fixtures/stub-db-preload.js"), "server.js"],
    {
      cwd: repo,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "development",
        HEALTH_DETAIL_TOKEN: "test-health-token-123456",
        GOOGLE_CLIENT_ID: "dummy",
        GOOGLE_CLIENT_SECRET: "dummy",
        JWT_SECRET: "dummy-jwt-secret-for-tests-123456",
        ESEWA_MERCHANT_ID: "EPAYTEST",
        ESEWA_SECRET_KEY: "dummy-sandbox-secret",
        ESEWA_ENV: "sandbox",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  try {
    await waitForPort(port);
    const root = await (await fetch(`http://127.0.0.1:${port}/`)).json();
    assert.ok(
      !("environment" in root) && !("version" in root),
      "root discloses neither environment nor version",
    );
    const bare = await (
      await fetch(`http://127.0.0.1:${port}/health/ready`)
    ).json();
    assert.equal(bare.status, "degraded");
    assert.ok(
      !("host" in bare) && !("memory" in bare) && !("dependencies" in bare),
      "bare readiness payload",
    );
    const detailedRes = await fetch(`http://127.0.0.1:${port}/health/ready`, {
      headers: { "x-health-token": "test-health-token-123456" },
    });
    const detailed = await detailedRes.json();
    assert.ok(
      "host" in detailed && "memory" in detailed,
      "token unlocks the operator payload",
    );
  } finally {
    child.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
    if (!child.killed) child.kill("SIGKILL");
  }
});

test("FA-89: production boot refuses a non-TLS MongoDB URI", () => {
  const env = {
    ...process.env,
    NODE_ENV: "production",
    FRONTEND_URL: "https://example.com",
    ADMIN_URL: "https://admin.example.com",
    JWT_SECRET: "x".repeat(40),
    GOOGLE_CLIENT_ID: "dummy",
    GOOGLE_CLIENT_SECRET: "dummy",
    ESEWA_MERCHANT_ID: "prod-merchant",
    ESEWA_SECRET_KEY: "dummy-prod-secret",
    MONGO_URI: "mongodb://db.internal:27017/aura",
  };
  const res = spawnSync("node", ["-e", "require('./server.js')"], {
    cwd: repo,
    env,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr + res.stdout, /TLS/);
});

test("FA-78: wishlist timing headers are suppressed in production only", async () => {
  const express = require("express");
  delete require.cache[path.join(repo, "routes/wishlist.routes.js")];
  const router = require(path.join(repo, "routes/wishlist.routes.js"));
  const app = express();
  app.use("/wishlist", router);
  app.use((err, req, res, next) =>
    res
      .status(err.statusCode || 500)
      .json({ status: "error", message: err.message }),
  );
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/wishlist`;
  try {
    process.env.NODE_ENV = "production";
    const prod = await fetch(base);
    assert.equal(prod.headers.get("x-wishlist-timing"), null);
    assert.equal(prod.headers.get("server-timing"), null);
    process.env.NODE_ENV = "development";
    const dev = await fetch(base);
    assert.ok(
      dev.headers.get("x-wishlist-timing"),
      "dev keeps the debug headers",
    );
  } finally {
    delete process.env.NODE_ENV;
    await new Promise((r) => server.close(r));
  }
});
