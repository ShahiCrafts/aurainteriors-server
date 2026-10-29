// Phase 3 (testing programme): unit battery for
// services/guestUserService.js — previously ZERO test references,
// despite sitting on the guest-chat identity path. The User model is
// stubbed in require.cache (audit/helpers pattern); the service
// module is re-required fresh per test so its static cache starts
// empty. No DB, no network.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { stubModule } = require("./helpers");

const repo = path.resolve(__dirname, "../..");
const GUEST_EMAIL = "guest@aura-interiors.local";

function loadService(userStub) {
  stubModule("models/user.model.js", userStub);
  const servicePath = path.join(repo, "services/guestUserService.js");
  delete require.cache[servicePath];
  return require(servicePath);
}

// findOne stub returning the house query chain (.select().lean()).
function findOneReturning(doc, record) {
  return () => ({
    select: () => ({
      lean: async () => {
        if (record) record.findOneCalls += 1;
        return doc;
      },
    }),
  });
}

test("should return the existing guest user when one is already stored", async () => {
  const record = { findOneCalls: 0, createCalls: 0 };
  const existing = { _id: "guest-id-1" };
  const svc = loadService({
    findOne: findOneReturning(existing, record),
    create: async () => {
      record.createCalls += 1;
      throw new Error("create must not be called");
    },
  });
  const guest = await svc.getOrCreateGuestUser();
  assert.equal(guest, existing);
  assert.equal(record.createCalls, 0);
});

test("should create the guest placeholder with the expected shape when none exists", async () => {
  let createdWith = null;
  const svc = loadService({
    findOne: findOneReturning(null),
    create: async (doc) => {
      createdWith = doc;
      return { _id: "guest-id-2", ...doc };
    },
  });
  const originalLog = console.log;
  console.log = () => {}; // service logs the creation; keep test output clean
  try {
    var guest = await svc.getOrCreateGuestUser();
  } finally {
    console.log = originalLog;
  }
  assert.equal(guest._id, "guest-id-2");
  assert.equal(createdWith.email, GUEST_EMAIL);
  assert.equal(createdWith.firstName, "Guest");
  assert.equal(createdWith.role, "customer");
  assert.equal(createdWith.password, null, "guest placeholder has no password");
  assert.equal(createdWith.isActive, true);
});

test("should re-read and return the guest when creation loses a unique-key race", async () => {
  let findCalls = 0;
  const winner = { _id: "guest-id-3" };
  const svc = loadService({
    findOne: () => ({
      select: () => ({
        lean: async () => {
          findCalls += 1;
          return findCalls === 1 ? null : winner;
        },
      }),
    }),
    create: async () => {
      const err = new Error("duplicate key");
      err.code = 11000;
      throw err;
    },
  });
  const guest = await svc.getOrCreateGuestUser();
  assert.equal(guest, winner, "11000 race resolves to the winner's row");
  assert.equal(findCalls, 2);
});

test("should propagate non-duplicate creation errors instead of swallowing them", async () => {
  const svc = loadService({
    findOne: findOneReturning(null),
    create: async () => {
      throw new Error("connection lost");
    },
  });
  await assert.rejects(() => svc.getOrCreateGuestUser(), /connection lost/);
});

test("should cache the guest id so repeat calls make no further lookups", async () => {
  const record = { findOneCalls: 0 };
  const svc = loadService({
    findOne: findOneReturning({ _id: "guest-id-4" }, record),
    create: async () => {
      throw new Error("create must not be called");
    },
  });
  const first = await svc.getGuestUserId();
  const second = await svc.getGuestUserId();
  assert.equal(first, "guest-id-4");
  assert.equal(second, "guest-id-4");
  assert.equal(record.findOneCalls, 1, "second call is served from cache");
});

test("should collapse concurrent cold-start calls into a single lookup", async () => {
  const record = { findOneCalls: 0 };
  const svc = loadService({
    findOne: findOneReturning({ _id: "guest-id-5" }, record),
    create: async () => {
      throw new Error("create must not be called");
    },
  });
  const [a, b, c] = await Promise.all([
    svc.getGuestUserId(),
    svc.getGuestUserId(),
    svc.getGuestUserId(),
  ]);
  assert.deepEqual([a, b, c], ["guest-id-5", "guest-id-5", "guest-id-5"]);
  assert.equal(record.findOneCalls, 1, "concurrent calls share one promise");
});

test("isGuestUser should recognise only the cached guest id", async () => {
  const svc = loadService({
    findOne: findOneReturning({ _id: "guest-id-6" }),
    create: async () => {
      throw new Error("create must not be called");
    },
  });
  assert.equal(svc.isGuestUser("guest-id-6"), false, "not known before load");
  await svc.getGuestUserId();
  assert.equal(svc.isGuestUser("guest-id-6"), true);
  assert.equal(svc.isGuestUser("someone-else"), false);
  assert.equal(svc.isGuestUser(null), false);
  assert.equal(svc.isGuestUser(undefined), false);
  assert.equal(svc.isGuestUser(""), false);
});
