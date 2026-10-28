// AR-41 (code side) — guest session activity anchoring.
// The GuestSession TTL index sits on createdAt and resolveGuestSession
// filtered validity by createdAt, so an actively chatting guest lost
// their session exactly 24h after minting; lastActivityAt existed but
// the hot resolve path never touched it (only creation, the pre-save
// hook, and chat creation did). Fix: resolveGuestSession now performs
// a throttled, conditional, fire-and-forget touch of lastActivityAt
// (needed in BOTH modes so the field is honest when the owner flips),
// and the validity filter anchors to lastActivityAt only behind
// GUEST_SESSION_TTL_MODE=activity (default "creation" = current
// behavior), paired with the TTL re-anchor in MIGRATIONS.md M-2.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery } = require("./helpers");

let findOneFilter = null;
let updateOneCalls = [];
let sessionDoc = null;

stubModule("models/guestSession.model", {
  findOne: (filter) => {
    findOneFilter = filter;
    return makeQuery(sessionDoc);
  },
  updateOne: (filter, update) => {
    updateOneCalls.push({ filter, update });
    return Promise.resolve({ matchedCount: 1 });
  },
});
stubModule("models/chat.model", {});
stubModule("models/chatMessage.model", {});
stubModule("models/user.model", {});
stubModule("services/notificationEventEmitter", {});

const service = require("../../services/chatService");
const SID = `guest_${"a".repeat(64)}`;
const FLAG = "GUEST_SESSION_TTL_MODE";

function freshSession() {
  return {
    _id: "gs1",
    sessionId: SID,
    email: null,
    lastActivityAt: new Date(),
  };
}
function staleSession() {
  return {
    _id: "gs1",
    sessionId: SID,
    email: null,
    lastActivityAt: new Date(Date.now() - 60 * 60 * 1000),
  };
}

test("AR-41 default mode: validity still anchors to createdAt (current behavior preserved)", async () => {
  delete process.env[FLAG];
  findOneFilter = null;
  updateOneCalls = [];
  sessionDoc = freshSession();
  const s = await service.resolveGuestSession(SID);
  assert.ok(s, "session must resolve");
  assert.ok(
    findOneFilter.createdAt && findOneFilter.createdAt.$gt instanceof Date,
    `default filter must use createdAt; got ${JSON.stringify(Object.keys(findOneFilter))}`,
  );
  assert.ok(
    !("lastActivityAt" in findOneFilter),
    "default filter must not use lastActivityAt",
  );
});

test("AR-41 activity mode: validity anchors to lastActivityAt", async () => {
  process.env[FLAG] = "activity";
  try {
    findOneFilter = null;
    updateOneCalls = [];
    sessionDoc = freshSession();
    const s = await service.resolveGuestSession(SID);
    assert.ok(s);
    assert.ok(
      findOneFilter.lastActivityAt &&
        findOneFilter.lastActivityAt.$gt instanceof Date,
      `activity filter must use lastActivityAt; got ${JSON.stringify(Object.keys(findOneFilter))}`,
    );
    assert.ok(
      !("createdAt" in findOneFilter),
      "activity filter must not use createdAt",
    );
  } finally {
    delete process.env[FLAG];
  }
});

test("AR-41: a stale lastActivityAt is touched (throttled conditional write); a fresh one is not; unknown sessions are untouched", async () => {
  delete process.env[FLAG];
  updateOneCalls = [];
  sessionDoc = staleSession();
  await service.resolveGuestSession(SID);
  assert.equal(
    updateOneCalls.length,
    1,
    "stale session must get exactly one touch",
  );
  assert.ok(
    updateOneCalls[0].update.$set.lastActivityAt instanceof Date,
    "touch must set lastActivityAt to now",
  );
  assert.ok(
    updateOneCalls[0].filter.lastActivityAt &&
      updateOneCalls[0].filter.lastActivityAt.$lt instanceof Date,
    "touch must be conditional on still being stale (race-safe)",
  );

  updateOneCalls = [];
  sessionDoc = freshSession();
  await service.resolveGuestSession(SID);
  assert.equal(
    updateOneCalls.length,
    0,
    "fresh session must not be rewritten (throttle)",
  );

  updateOneCalls = [];
  sessionDoc = null;
  const s = await service.resolveGuestSession(SID);
  assert.equal(s, null);
  assert.equal(updateOneCalls.length, 0, "no touch for a missing session");
});
