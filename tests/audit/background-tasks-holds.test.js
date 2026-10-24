// Commit-audit C-5 regression: the FA-09 guest-COD hold-release
// interval was created INSIDE the daily-cleanup setTimeout callback
// (backgroundTasks.js), as a callback-local const. Two structural
// consequences: (1) hold release never ran from boot until the first
// 02:00 UTC tick, unlike every sibling interval which starts at boot;
// (2) stopBackgroundTasks could never clear it - it leaked past
// shutdown. The interval must be module-scope, created by
// startBackgroundTasks and cleared by stopBackgroundTasks.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery } = require("../audit/helpers");

let orderFindCalls = 0;
stubModule("models/order.model", {
  find: () => { orderFindCalls += 1; return makeQuery([]); },
});
stubModule("services/orderTransition.service", { transitionOrder: async () => {} });
stubModule("services/notificationService", { cleanupExpiredNotifications: async () => {} });
stubModule("services/chatUpload.service", { cleanupExpiredUploads: async () => {} });
stubModule("services/promotionService", { processScheduledPromotions: async () => {} });
stubModule("services/announcementService", { processScheduledAnnouncements: async () => {} });

const tasks = require("../../services/backgroundTasks");
const ONE_MINUTE = 60 * 1000;

test("C-5: guest hold release runs hourly from boot and stops with the other tasks", async (t) => {
  const savedEnv = process.env.GUEST_COD_HOLD_RELEASE_HOURS;
  process.env.GUEST_COD_HOLD_RELEASE_HOURS = "1";
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  try {
    orderFindCalls = 0;
    tasks.startBackgroundTasks();
    // One hour after boot the release job must have run at least once -
    // before the fix it could not exist until the first 02:00 UTC tick.
    t.mock.timers.tick(61 * ONE_MINUTE);
    await new Promise((r) => setImmediate(r));
    assert.ok(orderFindCalls >= 1, "hold release should run within the first hour after boot");

    tasks.stopBackgroundTasks();
    const callsAtStop = orderFindCalls;
    t.mock.timers.tick(5 * 60 * ONE_MINUTE);
    await new Promise((r) => setImmediate(r));
    assert.equal(orderFindCalls, callsAtStop, "no interval may survive stopBackgroundTasks");
  } finally {
    try { tasks.stopBackgroundTasks(); } catch { /* already stopped */ }
    t.mock.timers.reset();
    if (savedEnv === undefined) delete process.env.GUEST_COD_HOLD_RELEASE_HOURS;
    else process.env.GUEST_COD_HOLD_RELEASE_HOURS = savedEnv;
  }
});
