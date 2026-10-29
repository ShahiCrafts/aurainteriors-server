// Phase 3 (testing programme): direct unit batteries for
// validators/notification.validator.js (middleware-style) and
// validators/review.validator.js (Joi schemas) — both previously had
// ZERO direct test references. Pure validation: no DB, no network.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateNotificationCreation,
  validateMarkAsRead,
  validateArchive,
  validatePushTokenRegistration,
} = require("../../validators/notification.validator");
const {
  createReviewSchema,
  updateReviewSchema,
  getReviewsQuerySchema,
  adminResponseSchema,
  productIdSchema,
  reviewIdSchema,
} = require("../../validators/review.validator");

function runMiddleware(mw, body) {
  const req = { body };
  let statusCode = null;
  let payload = null;
  let nextCalled = false;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(bodyOut) {
      payload = bodyOut;
      return this;
    },
  };
  mw(req, res, () => {
    nextCalled = true;
  });
  return { req, statusCode, payload, nextCalled };
}

const OID = "507f1f77bcf86cd799439011";
const OID2 = "507f1f77bcf86cd799439012";

// ---------- notification ----------

test("should pass a valid notification creation through with defaults applied", () => {
  const { req, nextCalled, statusCode } = runMiddleware(
    validateNotificationCreation,
    { userId: "u1", title: "Order shipped", type: "order" },
  );
  assert.equal(nextCalled, true);
  assert.equal(statusCode, null);
  assert.equal(req.body.category, "info", "category defaults to info");
  assert.equal(req.body.priority, "normal", "priority defaults to normal");
});

test("should reject notification creation when required fields are missing or over-length", () => {
  for (const body of [
    { title: "x", type: "order" }, // no userId
    { userId: "u1", type: "order" }, // no title
    { userId: "u1", title: "x" }, // no type
    { userId: "u1", title: "t".repeat(201), type: "order" },
    { userId: "u1", title: "x", type: "order", category: "bogus" },
    { userId: "u1", title: "x", type: "order", priority: "urgent" },
  ]) {
    const { nextCalled, statusCode, payload } = runMiddleware(
      validateNotificationCreation,
      body,
    );
    assert.equal(nextCalled, false, JSON.stringify(body));
    assert.equal(statusCode, 400);
    assert.equal(payload.status, "fail");
  }
});

test("should accept a mark-as-read batch of unique ObjectIds and reject duplicates, non-ObjectIds and empty batches", () => {
  const ok = runMiddleware(validateMarkAsRead, {
    notificationIds: [OID, OID2],
  });
  assert.equal(ok.nextCalled, true);
  for (const body of [
    { notificationIds: [] },
    { notificationIds: [OID, OID] },
    { notificationIds: ["not-an-id"] },
    { notificationIds: [{ $ne: "" }] },
    {},
  ]) {
    const r = runMiddleware(validateMarkAsRead, body);
    assert.equal(r.nextCalled, false, JSON.stringify(body));
    assert.equal(r.statusCode, 400);
  }
});

test("should share the same batch contract for archive validation", () => {
  assert.equal(
    runMiddleware(validateArchive, { notificationIds: [OID] }).nextCalled,
    true,
  );
  assert.equal(
    runMiddleware(validateArchive, { notificationIds: ["x"] }).nextCalled,
    false,
  );
});

test("should validate push token registration platform and required fields", () => {
  const ok = runMiddleware(validatePushTokenRegistration, {
    token: "device-token-value",
    deviceId: "device-1",
    platform: "android",
  });
  assert.equal(ok.nextCalled, true);
  for (const body of [
    { deviceId: "d1", platform: "web" }, // no token
    { token: "t", platform: "web" }, // no deviceId
    { token: "t", deviceId: "d1", platform: "windows" }, // bad platform
    { token: { $ne: "" }, deviceId: "d1", platform: "ios" }, // object token
  ]) {
    const r = runMiddleware(validatePushTokenRegistration, body);
    assert.equal(r.nextCalled, false, JSON.stringify(body));
    assert.equal(r.statusCode, 400);
  }
});

// ---------- review ----------

test("should accept a valid review and reject ratings outside the 1-5 integer range", () => {
  const ok = createReviewSchema.validate({
    rating: 5,
    comment: "Great quality and finish",
  });
  assert.equal(ok.error, undefined, ok.error && ok.error.message);
  for (const rating of [0, 6, 3.5, "five", { $gt: 0 }]) {
    const { error } = createReviewSchema.validate({
      rating,
      comment: "Great quality and finish",
    });
    assert.ok(error, `rating ${JSON.stringify(rating)} must be rejected`);
  }
});

test("should enforce the review comment length contract on create", () => {
  assert.ok(
    createReviewSchema.validate({ rating: 4, comment: "short" }).error,
    "comment under 10 chars rejected",
  );
  assert.ok(
    createReviewSchema.validate({ rating: 4, comment: "x".repeat(1001) })
      .error,
    "comment over 1000 chars rejected",
  );
  assert.ok(
    createReviewSchema.validate({ rating: 4 }).error,
    "missing comment rejected",
  );
});

test("should reject an empty review update and accept a single-field one", () => {
  assert.ok(updateReviewSchema.validate({}).error);
  assert.equal(updateReviewSchema.validate({ rating: 3 }).error, undefined);
  assert.ok(updateReviewSchema.validate({ rating: 9 }).error);
});

test("should apply query defaults and reject invalid sort or paging in the reviews query schema", () => {
  const { error, value } = getReviewsQuerySchema.validate({});
  assert.equal(error, undefined, error && error.message);
  assert.equal(value.page, 1);
  assert.equal(value.limit, 10);
  assert.equal(value.sort, "-createdAt");
  assert.ok(getReviewsQuerySchema.validate({ limit: 51 }).error);
  assert.ok(getReviewsQuerySchema.validate({ sort: "$natural" }).error);
  assert.ok(getReviewsQuerySchema.validate({ sort: "-__v" }).error);
  assert.equal(
    getReviewsQuerySchema.validate({ sort: "-helpfulCount" }).error,
    undefined,
  );
});

test("should require a non-empty admin response within 500 characters", () => {
  assert.equal(
    adminResponseSchema.validate({ comment: "Thanks for the feedback" }).error,
    undefined,
  );
  assert.ok(adminResponseSchema.validate({ comment: "" }).error);
  assert.ok(adminResponseSchema.validate({ comment: "x".repeat(501) }).error);
  assert.ok(adminResponseSchema.validate({}).error);
});

test("should accept only 24-hex ObjectId strings in the id schemas", () => {
  assert.equal(productIdSchema.validate({ productId: OID }).error, undefined);
  assert.equal(reviewIdSchema.validate({ reviewId: OID }).error, undefined);
  assert.ok(productIdSchema.validate({ productId: "abc" }).error);
  assert.ok(reviewIdSchema.validate({ reviewId: { $ne: "" } }).error);
  assert.ok(reviewIdSchema.validate({}).error);
});
