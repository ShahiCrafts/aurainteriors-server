// Batch 7 (FRESH remediation): FA-09 (release path), FA-45, FA-47, FA-48,
// FA-25, FA-36. (FA-80 is an owner decision; FA-09 velocity/caps are
// integration-shaped and covered by code review + the release test.)
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};
process.env.JWT_SECRET = "test-secret-at-least-32-characters-long!!";

// catchAsync does not return its promise; flush microtasks after invoking
// a wrapped handler before asserting on res/next.
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };

function mkRes() {
  return { code: null, body: null, cookie() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}

test("FA-45: public order tracking returns a status-level projection only", async () => {
  const full = {
    orderId: "ORD-1", orderStatus: "shipped", paymentStatus: "paid", paymentMethod: "esewa",
    items: [{ name: "Chair", quantity: 1, price: 100 }], subtotal: 100, discountAmount: 0,
    shippingCost: 10, tax: 0, total: 110, createdAt: new Date(), updatedAt: new Date(),
    shippingAddress: { street: "Secret St 1", phone: "9800000000" }, billingAddress: { street: "Secret St 2" },
    guestInfo: { email: "g@example.com", phone: "9800000000" },
    paymentDetails: { gatewayResponse: { secret: "payload" } }, adminNote: "internal",
  };
  stub("models/order.model.js", { findOne: () => ({ select: async () => full }) });
  const ctrl = require(path.join(repo, "controllers/order.controller.js"));
  const res = mkRes();
  ctrl.trackOrder({ body: { orderId: "ord-1", email: "g@example.com" } }, res, (e) => { throw e; });
  await flush();
  const view = res.body.data.order;
  assert.equal(view.orderStatus, "shipped");
  assert.equal(view.total, 110);
  assert.equal(view.shippingAddress, undefined);
  assert.equal(view.billingAddress, undefined);
  assert.equal(view.guestInfo, undefined);
  assert.equal(view.paymentDetails, undefined);
  assert.equal(view.adminNote, undefined);
  assert.deepEqual(Object.keys(view.items[0]).sort(), ["name", "price", "quantity"]);
});

test("FA-36: NotificationService.markAsRead is scoped by recipient", async () => {
  let seenFilter = null;
  stub("models/notification.model.js", {
    findOneAndUpdate: async (filter) => { seenFilter = filter; return { _id: "n1", isRead: true }; },
  });
  stub("models/user.model.js", {});
  delete require.cache[path.join(repo, "services/notificationService.js")];
  const svc = require(path.join(repo, "services/notificationService.js"));
  const instance = svc.markAsRead ? svc : new svc();
  await instance.markAsRead("n1", "64b64c2f9f1b2c3d4e5f6009");
  assert.equal(seenFilter._id, "n1");
  assert.equal(seenFilter.recipient, "64b64c2f9f1b2c3d4e5f6009");
});

test("FA-48: helpful votes reject self-votes and toggle atomically", async () => {
  let pipeline = null;
  const reviewDoc = { _id: "r1", user: "author-1", helpfulVotes: [], helpfulCount: 0 };
  stub("models/review.model.js", {
    findOne: async () => reviewDoc,
    findOneAndUpdate: async (filter, update) => { pipeline = update; return { ...reviewDoc, helpfulVotes: ["voter-1"], helpfulCount: 1 }; },
  });
  const ctrl = require(path.join(repo, "controllers/review.controller.js"));
  // self-vote refused
  let res = mkRes(); let nextErr = null;
  ctrl.markHelpful({ params: { reviewId: "r1" }, user: { _id: "author-1" }, query: {} }, res, (e) => { nextErr = e; });
  await flush();
  assert.ok(nextErr && nextErr.statusCode === 400, "self-vote rejected");
  // normal vote uses the atomic pipeline
  res = mkRes(); nextErr = null;
  ctrl.markHelpful({ params: { reviewId: "r1" }, user: { _id: "voter-1" }, query: {} }, res, (e) => { nextErr = e; });
  await flush();
  assert.equal(nextErr, null);
  assert.ok(Array.isArray(pipeline), "update is an aggregation pipeline");
  const text = JSON.stringify(pipeline);
  assert.ok(text.includes("$setDifference") && text.includes("$setUnion") && text.includes("$size"), "toggle + derived count in one atomic update");
  assert.equal(res.body.data.helpfulCount, 1);
  assert.equal(res.body.data.voted, true);
});

test("FA-25: blog likes are idempotent per actor", async () => {
  let increments = 0; let creates = 0;
  const blog = { _id: "64b64c2f9f1b2c3d4e5f60bb", slug: "post", likes: 5, incrementViews: async () => {} };
  stub("models/blog.model.js", {
    findOne: async () => blog,
    findByIdAndUpdate: async () => { increments++; return { ...blog, likes: 6 }; },
  });
  stub("models/blogEngagement.model.js", {
    create: async () => { creates++; if (creates > 1) { const e = new Error("dup"); e.code = 11000; throw e; } return {}; },
  });
  const ctrl = require(path.join(repo, "controllers/blog.controller.js"));
  const req = { params: { id: "post" }, cookies: {}, user: { _id: "user-7" } };
  let res = mkRes();
  ctrl.likeBlog(req, res, (e) => { throw e; });
  await flush();
  assert.equal(res.body.data.likes, 6);
  res = mkRes();
  ctrl.likeBlog(req, res, (e) => { throw e; });
  await flush();
  assert.equal(increments, 1, "second like from the same actor does not move the counter");
  assert.equal(res.body.data.likes, 5, "repeat like returns the current count");
});

test("FA-47: cart quantity write is optimistic-concurrency guarded", async () => {
  const item = { _id: "i1", product: "64b64c2f9f1b2c3d4e5f6001", quantity: 1 };
  const items = [item]; items.id = (id) => items.find((x) => x._id === id) || null;
  const cart = { _id: "c1", __v: 3, items, populate: async function () { this.items.forEach((i) => { i.product = { _id: i.product, price: 10 }; }); return this; } };
  let matched = 1;
  stub("models/cart.model.js", {
    findOne: async () => cart,
    updateOne: async () => ({ matchedCount: matched }),
  });
  stub("models/product.model.js", { findOne: async () => ({ _id: item.product, stock: 10 }) });
  const ctrl = require(path.join(repo, "controllers/cart.controller.js"));
  const req = { params: { itemId: "i1" }, body: { quantity: 2 }, user: { _id: "u1" } };
  let res = mkRes(); let nextErr = null;
  ctrl.updateCartItem(req, res, (e) => { nextErr = e; });
  await flush();
  assert.equal(nextErr, null);
  assert.equal(res.code, 200);
  matched = 0; res = mkRes(); nextErr = null;
  ctrl.updateCartItem(req, res, (e) => { nextErr = e; });
  await flush();
  assert.ok(nextErr && nextErr.statusCode === 409, "a cart changed underneath the write is a conflict, not an oversell");
});

test("FA-09: expired guest COD holds are released through the cancelling transition", async () => {
  process.env.GUEST_COD_HOLD_RELEASE_HOURS = "48";
  const transitioned = [];
  stub("models/order.model.js", {
    find: () => ({ select: () => ({ lean: async () => [{ _id: "o1" }, { _id: "o2" }] }) }),
  });
  stub("services/orderTransition.service.js", {
    transitionOrder: async (filter, status) => { transitioned.push([filter._id, status]); return {}; },
  });
  delete require.cache[path.join(repo, "services/backgroundTasks.js")];
  const tasks = require(path.join(repo, "services/backgroundTasks.js"));
  await tasks.releaseExpiredGuestCodHolds();
  assert.deepEqual(transitioned, [["o1", "cancelled"], ["o2", "cancelled"]]);
  delete process.env.GUEST_COD_HOLD_RELEASE_HOURS;
});
