// Child-process probe for AR-42 (atomic isDefault). Against a real
// mongodb-memory-server mongod (disk-backed dbPath under
// ~/workspace/aura-audit/mms-data - /tmp is a 512 MB tmpfs here):
// seed one user with three addresses, then fire TEN parallel
// Address.switchDefault calls with alternating targets. Because the
// switch is a single pipeline updateMany, the end state must contain
// EXACTLY ONE default. (The pre-fix code has no switchDefault at all -
// isDefault was enforced by a non-atomic pre-save hook - so at the
// parent commit this probe reports probe-error.) Prints one RESULT.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "addr-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri("aura_address_default_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Address = require(path.join(REPO, "models/address.model"));

  if (typeof Address.switchDefault !== "function") {
    console.log("RESULT probe-error switchDefault-missing");
    await mongoose.disconnect();
    await mongod.stop({ doCleanup: true, force: true });
    return;
  }

  const userId = new mongoose.Types.ObjectId();
  const mk = (n) => ({
    user: userId,
    fullName: `Person ${n}`,
    phone: "9800000000",
    addressLine1: `Line ${n}`,
    city: "Kathmandu",
    postalCode: "44600",
    country: "Nepal",
  });
  const [a, b, c] = await Address.create([mk(1), mk(2), mk(3)]);

  const targets = [
    a._id,
    b._id,
    c._id,
    a._id,
    c._id,
    b._id,
    a._id,
    b._id,
    c._id,
    a._id,
  ];
  await Promise.all(targets.map((t) => Address.switchDefault(userId, t)));

  const defaults = await Address.find({ user: userId, isDefault: true }).lean();
  console.log(
    `RESULT defaultCount=${defaults.length} defaultId=${defaults.length === 1 ? String(defaults[0]._id) : "n/a"}`,
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
