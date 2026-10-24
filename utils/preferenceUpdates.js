// AR-31(f): the shared notification-preference update builder.
// notification.controller.updatePreferences and
// profile.controller.updatePreferences carried the same operation —
// take the known preference keys from the request body and build a
// dotted-path $set — as two hand-written copies. The key set and the
// $set construction now live here once. The handlers' differing
// identity source, read-back projection, response shape and error
// channel stay at the call sites (pinned in
// tests/platform/preference-updates.test.js).
const PREFERENCE_KEYS = [
  "newsletter",
  "smsNotifications",
  "orderUpdates",
  "promotionalEmails",
  "preferredCategories",
];

// { "preferences.<key>": value } for every known key that is present
// (not undefined) in `body`. Unknown keys are dropped.
const buildPreferenceUpdates = (body) => {
  const updates = {};
  for (const key of PREFERENCE_KEYS) {
    if (body && body[key] !== undefined) {
      updates[`preferences.${key}`] = body[key];
    }
  }
  return updates;
};

module.exports = { PREFERENCE_KEYS, buildPreferenceUpdates };
