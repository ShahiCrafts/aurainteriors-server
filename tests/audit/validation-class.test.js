// Validation class: B-30 (guest checkout caps), C-03 (announcement
// mass-assignment), C-12 (contact form schema), C-07 (push-token
// validator wiring), C-09 (promotion tracking atomicity + limit).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers");

// ---------- B-30 ----------
const { guestCheckoutSchema } = require("../../validators/order.validator");
function guestBody(items) {
  return {
    email: "guest@example.com",
    firstName: "Gue",
    lastName: "St",
    phone: "+977-9800000000",
    items,
    shippingAddress: {
      fullName: "Gue St",
      phone: "+977-9800000000",
      addressLine1: "Street 1",
      city: "Kathmandu",
      postalCode: "44600",
    },
    paymentMethod: "cod",
  };
}
const oneItem = { productId: "507f1f77bcf86cd799439011", quantity: 1 };

test("characterization: a normal guest checkout body validates", () => {
  const { error } = guestCheckoutSchema.validate(guestBody([oneItem]));
  assert.equal(error, undefined, error && error.message);
});

test("B-30: guest checkout rejects more than 50 items and absurd quantities", () => {
  const many = Array.from({ length: 51 }, () => ({ ...oneItem }));
  const tooMany = guestCheckoutSchema.validate(guestBody(many));
  assert.ok(tooMany.error, "51 items must be rejected");
  const hugeQty = guestCheckoutSchema.validate(
    guestBody([{ ...oneItem, quantity: 500 }]),
  );
  assert.ok(hugeQty.error, "quantity 500 must be rejected");
});

// ---------- C-03 ----------
let announcementDoc;
stubModule("models/announcement.model.js", {
  findById: async () => announcementDoc,
});
stubModule("services/notificationService.js", {});
stubModule("models/user.model.js", {});
const announcementService = require("../../services/announcementService");

test("C-03: announcement update only applies whitelisted fields", async () => {
  announcementDoc = {
    title: "Old",
    status: "draft",
    viewCount: 5,
    createdBy: "owner-1",
    async save() {
      return this;
    },
    populate() {
      return this;
    },
  };
  await announcementService.updateAnnouncement(
    "507f1f77bcf86cd799439011",
    {
      title: "New title",
      viewCount: 999999,
      createdBy: "attacker",
      _id: "507f1f77bcf86cd799439099",
      isPinned: true,
    },
    "admin-1",
  );
  assert.equal(announcementDoc.title, "New title");
  assert.equal(
    announcementDoc.isPinned,
    true,
    "whitelisted fields still update",
  );
  assert.equal(
    announcementDoc.viewCount,
    5,
    "stats must not be settable via update",
  );
  assert.equal(
    announcementDoc.createdBy,
    "owner-1",
    "ownership must not be settable via update",
  );
  assert.notEqual(announcementDoc._id, "507f1f77bcf86cd799439099");
});

// ---------- C-12 ----------
test("C-12: a submit-contact schema exists and enforces the model's constraints", () => {
  const contactValidator = require("../../validators/contact.validator");
  assert.equal(
    typeof contactValidator.submitContactSchema,
    "object",
    "submitContactSchema should be exported",
  );
  const schema = contactValidator.submitContactSchema;
  const valid = {
    name: "A Person",
    email: "a@example.com",
    subject: "Hello",
    message: "Hi there",
    category: "support",
  };
  assert.equal(schema.validate(valid).error, undefined);
  assert.ok(
    schema.validate({ ...valid, message: undefined }).error,
    "message is required",
  );
  assert.ok(
    schema.validate({ ...valid, message: "x".repeat(5001) }).error,
    "message is capped at the model's 5000",
  );
  assert.ok(
    schema.validate({ ...valid, category: "nonsense" }).error,
    "category is an enum",
  );
  assert.ok(
    schema.validate({ ...valid, email: "not-an-email" }).error,
    "email must be valid",
  );
});

// ---------- C-09 ----------
let promotionUpdate;
stubModule("models/promotion.model.js", {
  findById: async () => ({
    async updateMetrics(field) {
      promotionUpdate = { via: "updateMetrics", field };
    },
  }),
  findByIdAndUpdate: async (id, update) => {
    promotionUpdate = { via: "findByIdAndUpdate", id, update };
    return {};
  },
});
const promotionService = require("../../services/promotionService");

test("C-09: engagement tracking increments atomically ($inc), not read-modify-write", async () => {
  promotionUpdate = undefined;
  await promotionService.trackEngagement("507f1f77bcf86cd799439011", "clicked");
  assert.ok(promotionUpdate, "an update should be issued");
  assert.equal(promotionUpdate.via, "findByIdAndUpdate");
  assert.deepEqual(promotionUpdate.update, {
    $inc: { "metrics.clickCount": 1 },
  });
});

// ---------- wiring (C-07, C-09 route, C-12 route) ----------
function routeHandlers(router, path, method) {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method],
  );
  return layer ? layer.route.stack.length : 0;
}
stubModule("middleware/auth.middleware.js", {
  protect: (req, res, next) => next(),
  restrictTo: () => (req, res, next) => next(),
  protectOptional: (req, res, next) => next(),
});
stubModule(
  "controllers/notification.controller.js",
  new Proxy({}, { get: () => (req, res, next) => next() }),
);
stubModule(
  "controllers/promotion.controller.js",
  new Proxy({}, { get: () => (req, res, next) => next() }),
);
stubModule(
  "controllers/contact.controller.js",
  new Proxy({}, { get: () => (req, res, next) => next() }),
);

test("C-07: the push-token registration route runs its validator before the controller", () => {
  const router = require("../../routes/notification.routes");
  assert.ok(
    routeHandlers(router, "/push-tokens/register", "post") >= 2,
    "validator + controller expected on the register route",
  );
});

test("C-09: the promotion /track route is rate-limited (validator + limiter + controller)", () => {
  const router = require("../../routes/promotion.routes");
  assert.ok(
    routeHandlers(router, "/track", "post") >= 3,
    "limiter + validator + controller expected on /track",
  );
});

test("C-12: the public contact route validates and rate-limits submissions", () => {
  const router = require("../../routes/contact.routes");
  assert.ok(
    routeHandlers(router, "/", "post") >= 3,
    "limiter + validator + controller expected on POST /contacts",
  );
});
