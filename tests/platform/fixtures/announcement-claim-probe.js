// Child-process probe for AR-08 (announcement atomic claim). Runs
// against a real mongodb-memory-server mongod (disk-backed dbPath under
// ~/workspace/aura-audit/mms-data - this VM's /tmp is a 512 MB tmpfs).
//
// Scenario: one due scheduled announcement; TWO processor ticks run
// concurrently (two app instances, or an instance + the manual
// endpoint). To make the interleaving deterministic, Announcement.find
// is wrapped in a barrier so both ticks read the due list BEFORE
// either proceeds - exactly the overlap the FA-70 claim pattern exists
// for. notifyUsersAboutAnnouncement is replaced with a counter (the
// fan-out itself is notificationService's concern, not this finding's).
// Prints one RESULT line.
const path = require("node:path");
const fs = require("node:fs");

const REPO = path.resolve(__dirname, "../../..");

async function main() {
  const { MongoMemoryServer } = require(
    path.join(REPO, "node_modules/mongodb-memory-server"),
  );
  const base = path.join(process.env.HOME, "workspace/aura-audit/mms-data");
  fs.mkdirSync(base, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(base, "announce-"));
  const mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri("aura_announce_claim_test");

  const mongoose = require(path.join(REPO, "node_modules/mongoose"));
  await mongoose.connect(uri);
  const Announcement = require(path.join(REPO, "models/announcement.model"));
  const service = require(path.join(REPO, "services/announcementService"));

  let notifyCount = 0;
  service.notifyUsersAboutAnnouncement = async () => {
    notifyCount += 1;
  };

  const ann = await Announcement.create({
    title: "Claim test",
    content: "body",
    status: "scheduled",
    scheduledAt: new Date(Date.now() - 60_000),
    createdBy: new mongoose.Types.ObjectId(),
  });

  // Barrier: the first two find() calls (one per tick) wait for each
  // other, then both execute against the still-"scheduled" document.
  const realFind = Announcement.find.bind(Announcement);
  let arrived = 0;
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  Announcement.find = function (...args) {
    arrived += 1;
    if (arrived === 2) release();
    if (arrived <= 2) {
      return gate.then(() => realFind(...args));
    }
    return realFind(...args);
  };

  // Save barrier: in the unfixed processor each tick mutates its
  // in-memory copy and save()s it. Hold both saves until BOTH ticks
  // have reached save() (750 ms fallback so a lone save never hangs) -
  // this forces the lost-update interleaving deterministically instead
  // of hoping the event loop races on a fast local mongod. The fixed
  // processor claims via findOneAndUpdate and never calls save(), so
  // this barrier simply never engages there.
  const proto = Announcement.prototype;
  const realSave = proto.save;
  let saveArrived = 0;
  let releaseSave;
  const saveGate = new Promise((r) => {
    releaseSave = r;
  });
  proto.save = function (...args) {
    saveArrived += 1;
    if (saveArrived === 2) releaseSave();
    const wait =
      saveArrived <= 2
        ? Promise.race([saveGate, new Promise((r) => setTimeout(r, 750))])
        : Promise.resolve();
    return wait.then(() => realSave.apply(this, args));
  };

  const [r1, r2] = await Promise.all([
    service.processScheduledAnnouncements(),
    service.processScheduledAnnouncements(),
  ]);
  Announcement.find = realFind;
  proto.save = realSave;

  const after = await Announcement.findById(ann._id).lean();
  const processedTotal = (r1?.processed || 0) + (r2?.processed || 0);
  console.log(
    `RESULT status=${after.status} notifyCount=${notifyCount} processedTotal=${processedTotal}`,
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
