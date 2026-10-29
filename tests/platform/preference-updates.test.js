// AR-31(f) characterization: notification preferences are written by
// TWO handlers — notification.controller.updatePreferences and
// profile.controller.updatePreferences. The preference KEY SET and the
// dotted-$set building are the same operation in both; the handlers
// differ (pinned, NOT unified) in:
//   - identity source: req.user._id (notification) vs req.user.id (profile)
//   - read-back: notification selects "preferences" and responds
//     { data: { preferences } }; profile responds { data: { user } }
//   - error channel: next(error) vs profile's sendClientError mapping
// This file pins the exact findByIdAndUpdate arguments and responses
// of both handlers over a body matrix, before and after the shared
// buildPreferenceUpdates extraction.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
} = require("../audit/helpers");

const updateCalls = [];
const userDoc = {
  _id: "u1",
  id: "u1",
  email: "user@example.com",
  preferences: {
    newsletter: true,
    smsNotifications: false,
    orderUpdates: true,
    promotionalEmails: false,
    preferredCategories: ["sofas"],
  },
};
stubModule("models/user.model", {
  findByIdAndUpdate: (id, update, opts) => {
    updateCalls.push({ id, update, opts });
    return makeQuery(userDoc);
  },
  findById: () => makeQuery(userDoc),
});
stubModule("models/notification.model", {});
stubModule("services/notificationService", {});
stubModule("services/pushTokenService", {});
stubModule("models/revokedToken.model", {});
stubModule("config/cloudinary", { deleteFromCloudinary: async () => ({}) });

const notifCtrl = require("../../controllers/notification.controller");
const profileCtrl = require("../../controllers/profile.controller");

const BODIES = [
  { newsletter: true },
  {
    newsletter: false,
    smsNotifications: true,
    orderUpdates: false,
    promotionalEmails: true,
    preferredCategories: ["beds"],
  },
  {},
  { unknownKey: "x", newsletter: true },
  { preferredCategories: [] },
];

for (const body of BODIES) {
  test(`AR-31f both handlers build the identical $set for body ${JSON.stringify(body)}`, async () => {
    updateCalls.length = 0;
    const resN = mockRes();
    const nextN = mockNext();
    await notifCtrl.updatePreferences(
      { user: { _id: "u1" }, body },
      resN,
      nextN,
    );
    assert.equal(nextN.error, undefined);
    const resP = mockRes();
    const nextP = mockNext();
    await profileCtrl.updatePreferences(
      { user: { id: "u1" }, body },
      resP,
      nextP,
    );
    assert.equal(updateCalls.length, 2);
    const [nCall, pCall] = updateCalls;
    assert.deepEqual(
      pCall.update,
      nCall.update,
      "$set payloads must be identical",
    );
    assert.deepEqual(nCall.opts, { returnDocument: "after", runValidators: true });
    assert.deepEqual(pCall.opts, { returnDocument: "after", runValidators: true });
    // Pinned divergences: identity source + response shape.
    assert.equal(nCall.id, "u1");
    assert.equal(pCall.id, "u1");
    assert.deepEqual(resN.body, {
      status: "success",
      data: { preferences: userDoc.preferences },
    });
    assert.deepEqual(resP.body, { status: "success", data: { user: userDoc } });
  });
}

test("AR-31f unknown keys are dropped and undefined values are skipped", async () => {
  updateCalls.length = 0;
  const res = mockRes();
  const next = mockNext();
  await notifCtrl.updatePreferences(
    {
      user: { _id: "u1" },
      body: { hacker: "x", newsletter: undefined, orderUpdates: true },
    },
    res,
    next,
  );
  assert.deepEqual(updateCalls[0].update, {
    $set: { "preferences.orderUpdates": true },
  });
});
