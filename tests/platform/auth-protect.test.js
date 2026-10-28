// AR-10 — protect must stop fully hydrating the user document on
// every authenticated request: lean + a select set built from the
// fields consumers actually read (audit: _id, id, role, firstName,
// lastName, email, phone, isActive, deletedAt across controllers /
// services / middleware; signToken(req.user) reads _id/email/role;
// profile deleteAccount reads req.user.iat, a token claim protect now
// attaches from the decoded token). NO consumer calls a document
// method (.save/.comparePassword/...) on protect's req.user, so no
// protectFull variant is needed.
//
// Child-process probe (real mongod via mongodb-memory-server,
// disk-backed dbPath) - see fixtures/auth-protect-probe.js. The probe
// counts DB operations via driver command monitoring (monitorCommands).
//
// Named security checks that must survive the lean/select change:
//   (a) a revoked token is still rejected by protect: authToken.verify
//       throws Error("Session revoked") (inside verify, before the user
//       lookup), protect forwards it to next() and never sets req.user.
//       The token used is otherwise fully valid (same user/shape as
//       the passing happy path), so this test fails if the revocation
//       lookup is deleted. NOTE on status: that plain Error carries no
//       statusCode, so the app's global error handler currently maps
//       it to HTTP 500, not 401 - pre-existing behavior of the verify
//       layer, unchanged by AR-10 (protect's own rejections ARE
//       AppError 401s, see (b)). Recorded as a side observation.
//   (b) a deactivated account is still rejected 401 (AppError)
//   (d) a valid token still loads req.user with every consumer field
// Check (c) from the finding brief - "token issued before a password
// change is rejected" - is NOT APPLICABLE to this codebase: grep over
// the whole repo finds no passwordChangedAt field, no iat-vs-change
// comparison, and no password-change endpoint at all (passwords exist
// only for admin login; users authenticate by magic link / Google).
// There is no such check to preserve; inventing one is out of scope
// for AR-10 and would itself need an owner decision. Recorded here so
// the gap is explicit rather than silently skipped.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const path = require("node:path");

function runProbe() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, "fixtures", "auth-protect-probe.js")],
      { timeout: 180000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return reject(err);
        resolve(String(stdout));
      },
    );
  });
}

let cached;
async function probe() {
  if (!cached) cached = runProbe();
  return cached;
}
const line = async (prefix) => {
  const out = await probe();
  const l = out.split("\n").find((x) => x.startsWith(`RESULT ${prefix}`));
  assert.ok(l, `probe must print a RESULT ${prefix} line; got: ${out}`);
  return l;
};
const field = (l, name) => {
  const m = l.match(new RegExp(`${name}=([^ ]*)`));
  return m ? m[1] : null;
};

test(
  "AR-10 (a): revoked token is still rejected by protect (revocation check intact)",
  { timeout: 190000 },
  async () => {
    const l = await line("revoked");
    assert.match(
      l,
      /Session revoked/,
      `revoked token must be rejected by the revocation check; got: ${l}`,
    );
    assert.equal(
      field(l, "userSet"),
      "false",
      "no req.user may be attached for a revoked token",
    );
  },
);

test(
  "AR-10 (b): deactivated account is still rejected 401 by protect",
  { timeout: 190000 },
  async () => {
    const l = await line("deactivated");
    assert.match(l, /nextErr=401:/, `deactivated account must 401; got: ${l}`);
    assert.equal(field(l, "userSet"), "false");
  },
);

test(
  "AR-10: token for a deleted user is still rejected 401 by protect",
  { timeout: 190000 },
  async () => {
    const l = await line("ghost");
    assert.match(l, /nextErr=401:/, `missing user must 401; got: ${l}`);
    assert.equal(field(l, "userSet"), "false");
  },
);

test(
  "AR-10 (d): valid token loads a lean req.user carrying every consumer field",
  { timeout: 190000 },
  async () => {
    const l = await line("happy");
    assert.equal(
      field(l, "nextErr"),
      "none",
      `valid token must pass; got: ${l}`,
    );
    assert.equal(
      field(l, "isDoc"),
      "false",
      "req.user must be a lean plain object, not a Mongoose document",
    );
    assert.equal(
      field(l, "idMatches"),
      "true",
      "req.user.id (the virtual consumers read) must equal the user id",
    );
    assert.equal(
      field(l, "iatMatches"),
      "true",
      "req.user.iat must carry the token's iat (profile deleteAccount reads it)",
    );
    assert.equal(
      field(l, "phone"),
      "9800000000",
      "order checkout reads req.user.phone",
    );
    assert.equal(field(l, "role"), "customer");
    const keys = (field(l, "keys") || "").split(",");
    for (const needed of [
      "_id",
      "id",
      "email",
      "firstName",
      "lastName",
      "role",
      "isActive",
      "deletedAt",
      "iat",
    ]) {
      assert.ok(
        keys.includes(needed),
        `req.user must carry ${needed}; keys: ${keys}`,
      );
    }
    const jsonBytes = Number(field(l, "jsonBytes"));
    const fullBytes = Number(field(l, "fullDocBytes"));
    assert.ok(
      jsonBytes < fullBytes,
      `lean user (${jsonBytes} B) must be smaller than the fully hydrated document (${fullBytes} B)`,
    );
  },
);

test(
  "AR-10: protect issues exactly 2 finds per call and the user find is projected",
  { timeout: 190000 },
  async () => {
    const l = await line("bench");
    const n = Number(field(l, "n"));
    assert.equal(
      Number(field(l, "usersFinds")),
      n,
      "exactly one users find per protect call",
    );
    assert.equal(
      Number(field(l, "revokedFinds")),
      n,
      "exactly one revocation find per protect call (check NOT removed)",
    );
    assert.equal(Number(field(l, "totalFinds")), 2 * n, "no extra round-trips");
    const proj = field(l, "usersProjection");
    assert.ok(
      proj && proj !== "none" && proj !== "null",
      `users find must carry a projection; got: ${l}`,
    );
    assert.ok(
      !proj.includes("preferences") &&
        !proj.includes("googleId") &&
        !proj.includes("password"),
      `projection must exclude non-consumer fields; got: ${proj}`,
    );
  },
);
