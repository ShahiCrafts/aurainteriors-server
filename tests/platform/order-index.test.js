// AR-03 — the Order model's idempotencyKey must have exactly ONE index
// declaration (field-level unique+sparse), so index creation is
// deterministic: ensureIndexes must not throw, and the live index must
// be unique+sparse. Verified against a real mongod via a child probe
// (tests/platform/fixtures/order-index-probe.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const repo = path.join(__dirname, "..", "..");
const probe = path.join(
  repo,
  "tests",
  "platform",
  "fixtures",
  "order-index-probe.js",
);

function runProbe() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [probe], {
      cwd: repo,
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      out += d;
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, out }));
  });
}

test(
  "AR-03: Order.ensureIndexes does not throw and idempotencyKey index is unique+sparse",
  { timeout: 120000 },
  async () => {
    const { code, out } = await runProbe();
    assert.equal(code, 0, `probe failed:\n${out}`);
    assert.match(
      out,
      /ENSURE_INDEXES_OK/,
      `ensureIndexes must not throw:\n${out}`,
    );
    const m = out.match(/IDEMPOTENCY_INDEX: (.+)/);
    assert.ok(m, `probe must report the idempotency index:\n${out}`);
    const spec = JSON.parse(m[1]);
    assert.ok(spec, "an index on idempotencyKey must exist");
    assert.equal(spec.unique, true, "idempotencyKey index must be unique");
    assert.equal(spec.sparse, true, "idempotencyKey index must be sparse");
  },
);

test("AR-03: order model declares idempotencyKey index exactly once", () => {
  const src = require("node:fs").readFileSync(
    path.join(repo, "models", "order.model.js"),
    "utf8",
  );
  const schemaIndexCalls =
    src.match(/orderSchema\.index\(\{\s*idempotencyKey/g) || [];
  assert.equal(
    schemaIndexCalls.length,
    0,
    "duplicate schema.index({idempotencyKey}) declaration must be gone",
  );
  assert.match(
    src,
    /idempotencyKey:\s*\{\s*type: String, unique: true, sparse: true \}/,
    "field-level unique+sparse declaration must remain",
  );
});
