// Child-process probe for AR-10 (protect: lean + select). Runs against
// a real mongodb-memory-server mongod (disk-backed dbPath under
// ~/workspace/aura-audit/mms-data - this VM's /tmp is a 512 MB tmpfs).
//
// Exercises the REAL middleware/auth.middleware.js protect against a
// real mongod and reports, per scenario, the outcome plus - for the
// happy path - the DB operations ONE protect invocation issues
// (driver command monitoring: mongoose.connect monitorCommands:true,
// 'commandStarted' events on the underlying MongoClient; only 'find'
// commands are counted, bucketed by collection, and the users find's
// projection is captured verbatim), the serialized size of req.user,
// and the mean wall time over N invocations. Prints RESULT lines.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");
process.env.JWT_SECRET = "<redacted>";

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "auth-protect-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri("aura_auth_protect_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri, { monitorCommands: true });

  const findEvents = [];
  const client = mongoose.connection.client || mongoose.connection.getClient();
  client.on("commandStarted", (e) => {
    if (e.commandName === "find") {
      findEvents.push({
        collection: e.command.find,
        projection: e.command.projection
          ? Object.keys(e.command.projection)
          : null,
      });
    }
  });

  const User = require(path.join(REPO, "models/user.model"));
  const RevokedToken = require(path.join(REPO, "models/revokedToken.model"));
  const authToken = require(path.join(REPO, "utils/authToken"));
  const { protect } = require(path.join(REPO, "middleware/auth.middleware"));
  const jwt = require(path.join(REPO, "node_modules/jsonwebtoken"));

  const crypto = require("node:crypto");
  const sign = (user) =>
    jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: 600,
        issuer: "aura-interiors",
        audience: "aura-interiors-api",
        // Unique per call (mirrors the real signToken): without a jti,
        // same-second tokens for one user are byte-identical and the
        // "revoked" token below would silently revoke every later token.
        jwtid: crypto.randomBytes(16).toString("hex"),
      },
    );

  // A user with every optional field populated, so full hydration has
  // a measurable serialized size.
  const active = await User.create({
    email: "active@example.com",
    firstName: "Active",
    lastName: "User",
    phone: "9800000000",
    role: "customer",
    avatar: "https://example.com/a.png",
    avatarPublicId: "avatar-public-id-1",
    dateOfBirth: new Date("1990-01-01"),
    gender: "other",
    googleId: "google-id-123",
    preferences: {
      newsletter: true,
      preferredCategories: ["living_room", "bedroom", "decor"],
    },
  });
  const deactivated = await User.create({
    email: "off@example.com",
    firstName: "Off",
    lastName: "User",
    role: "customer",
    isActive: false,
  });

  // catchAsync does not return the wrapped promise, so completion is
  // signaled by the next() call itself.
  const runProtect = (token) =>
    new Promise((resolve) => {
      const req = { headers: { authorization: `Bearer ${token}` } };
      protect(req, {}, (err) => resolve({ req, nextArg: err || null }));
    });

  // (d) valid token
  const token = sign(active);
  const decoded = jwt.decode(token);
  const happy = await runProtect(token);
  const u = happy.req.user;
  const fullDoc = await User.findById(active._id);
  const fullBytes = JSON.stringify(fullDoc).length;
  const userJson = u ? JSON.stringify(u) : "";
  console.log(
    `RESULT happy nextErr=${happy.nextArg ? `${happy.nextArg.statusCode}:${happy.nextArg.message}` : "none"}` +
      ` isDoc=${u ? typeof u.save === "function" : "no-user"}` +
      ` jsonBytes=${userJson.length} fullDocBytes=${fullBytes}` +
      ` keys=${u ? Object.keys(u).sort().join(",") : ""}` +
      ` idField=${u ? String(u.id) : ""} idMatches=${u ? String(u.id) === String(active._id) : false}` +
      ` iat=${u && u.iat !== undefined ? u.iat : "absent"} iatMatches=${u ? u.iat === decoded.iat : false}` +
      ` phone=${u ? String(u.phone) : ""} role=${u ? String(u.role) : ""}`,
  );

  // (a) revoked token still 401
  const revokedToken = sign(active);
  await RevokedToken.updateOne(
    { _id: authToken.hash(revokedToken) },
    { $set: { expiresAt: new Date(Date.now() + 600_000) } },
    { upsert: true },
  );
  const revoked = await runProtect(revokedToken);
  console.log(
    `RESULT revoked nextErr=${revoked.nextArg ? `${revoked.nextArg.statusCode}:${revoked.nextArg.message}` : "none"} userSet=${Boolean(revoked.req.user)}`,
  );

  // (b) deactivated user still rejected
  const offToken = sign(deactivated);
  const off = await runProtect(offToken);
  console.log(
    `RESULT deactivated nextErr=${off.nextArg ? `${off.nextArg.statusCode}:${off.nextArg.message}` : "none"} userSet=${Boolean(off.req.user)}`,
  );

  // token for a user that no longer exists
  const ghostToken = sign({
    _id: new mongoose.Types.ObjectId(),
    email: "ghost@example.com",
    role: "customer",
  });
  const ghost = await runProtect(ghostToken);
  console.log(
    `RESULT ghost nextErr=${ghost.nextArg ? `${ghost.nextArg.statusCode}:${ghost.nextArg.message}` : "none"} userSet=${Boolean(ghost.req.user)}`,
  );

  // Bench: ops + wall time per protect invocation (fresh token; the
  // per-iteration token differs only by iat/jti absence - same shape).
  findEvents.length = 0;
  const N = 100;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) await runProtect(sign(active));
  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const usersFinds = findEvents.filter((e) => e.collection === "users");
  const revokedFinds = findEvents.filter(
    (e) => e.collection === "revokedtokens",
  );
  const proj = usersFinds.length
    ? JSON.stringify(usersFinds[0].projection)
    : "none";
  console.log(
    `RESULT bench n=${N} totalFinds=${findEvents.length} usersFinds=${usersFinds.length} revokedFinds=${revokedFinds.length}` +
      ` usersProjection=${proj} avgMsPerCall=${(elapsedMs / N).toFixed(3)} totalMs=${elapsedMs.toFixed(1)}`,
  );

  await mongoose.disconnect();
  await mongod.stop({ doCleanup: true, force: true });
}

main().then(
  () => process.exit(0),
  (err) => {
    console.log(`RESULT probe-error ${err && err.message}`);
    process.exit(2);
  },
);
