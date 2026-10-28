// SSRF + content class: B-22 (allowlist sanitizer), B-08 (RSS fetch
// private-IP guard), B-09 (ingestion fetch bounds), B-28 (blog
// counters atomic), B-29 (return-request conditional writes).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("./helpers");

// ---------- B-22 ----------
const { sanitizeArticleHtml } = require("../../utils/sanitizeArticleHtml");

test("B-22: sanitizer keeps ordinary article markup", () => {
  const html = sanitizeArticleHtml(
    '<h2>Title</h2><p>Text with <strong>bold</strong> and <a href="https://example.com/a?x=1&y=2">a link</a>.</p>' +
      '<ul><li>one</li><li>two</li></ul><img src="https://cdn.example.com/i.jpg" alt="pic" width="600">',
  );
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /href="https:\/\/example\.com\/a\?x=1&amp;y=2"/);
  assert.match(
    html,
    /<img src="https:\/\/cdn\.example\.com\/i\.jpg" alt="pic" width="600">/,
  );
});

test("B-22: sanitizer defeats the denylist bypass battery", () => {
  const attacks = [
    '<a href="javascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<a href="java&#115;cript:alert(1)">x</a>',
    '<a href="&#106;avascript:alert(1)">x</a>',
    '<a href="java\tscript:alert(1)">x</a>',
    '<a href="  javascript:alert(1)">x</a>',
    '<a href="//evil.example/phish">x</a>',
    '<img src="https://e.example/i.png" onerror="alert(1)">',
    "<img src=x onerror=alert(1)>",
    '<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">',
    '<svg onload="alert(1)"><script>alert(2)</script></svg>',
    "<math><mtext><script>alert(1)</script></mtext></math>",
    '<iframe src="https://evil.example"></iframe>',
    '<object data="https://evil.example/x.swf"></object>',
    '<meta http-equiv="refresh" content="0;url=https://evil.example">',
    '<base href="https://evil.example/">',
    '<form action="https://evil.example"><input type="submit"></form>',
    '<p onclick="alert(1)" style="xss:expression(alert(1))">t</p>',
    '<div href="javascript:alert(1)">t</div>',
  ];
  for (const attack of attacks) {
    const out = sanitizeArticleHtml(`<p>before</p>${attack}<p>after</p>`);
    assert.ok(
      !/javascript:/i.test(out),
      `javascript: survived: ${attack} -> ${out}`,
    );
    assert.ok(
      !/onerror|onclick|onload/i.test(out),
      `event handler survived: ${attack} -> ${out}`,
    );
    assert.ok(
      !/<(svg|math|iframe|object|meta|base|form|input|script)/i.test(out),
      `dangerous tag survived: ${attack} -> ${out}`,
    );
    assert.ok(
      !/data:image/i.test(out),
      `data: URL survived: ${attack} -> ${out}`,
    );
    assert.match(out, /<p>before<\/p>/);
    assert.match(out, /<p>after<\/p>/);
  }
});

// ---------- B-08 ----------
const { isPrivateIp, assertPublicHost } = require("../../utils/ssrfGuard");

test("B-08: private/reserved IP ranges are recognised", () => {
  for (const ip of [
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "127.0.0.1",
    "169.254.1.1",
    "0.0.0.0",
    "::1",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "224.0.0.1",
  ]) {
    assert.equal(isPrivateIp(ip), true, `${ip} should be non-public`);
  }
  for (const ip of [
    "8.8.8.8",
    "1.1.1.1",
    "172.15.0.1",
    "172.32.0.1",
    "193.168.1.1",
    "2606:4700:4700::1111",
  ]) {
    assert.equal(isPrivateIp(ip), false, `${ip} should be public`);
  }
});

test("B-08: assertPublicHost rejects loopback hosts and IP literals", async () => {
  await assert.rejects(() => assertPublicHost("localhost"), /SSRF guard/);
  await assert.rejects(() => assertPublicHost("127.0.0.1"), /SSRF guard/);
  await assert.rejects(() => assertPublicHost("192.168.0.10"), /SSRF guard/);
  await assertPublicHost("8.8.8.8"); // public literal passes without DNS
});

// ---------- B-28 ----------
// FA-25 (FRESH) supersedes the like flow's shape: the counter still moves
// via ONE atomic $inc (B-28's property), but only when the caller's
// unique engagement record is newly inserted (per-actor dedup).
let blogUpdate;
stubModule("models/blog.model.js", {
  findById: async () => {
    throw new Error("findById must not be used for the like counter");
  },
  findOne: async () => ({ _id: "507f1f77bcf86cd799439011", likes: 41 }),
  findByIdAndUpdate: async (id, update, options) => {
    blogUpdate = { id, update, options };
    return { _id: id, likes: 42 };
  },
});
stubModule("models/blogEngagement.model.js", { create: async () => ({}) });
const blogController = require("../../controllers/blog.controller");

test("B-28: liking a blog is one atomic $inc, not read-modify-write", async () => {
  blogUpdate = undefined;
  const res = mockRes();
  const next = mockNext();
  blogController.likeBlog(
    {
      params: { id: "507f1f77bcf86cd799439011" },
      cookies: {},
      user: { _id: "507f1f77bcf86cd799439012" },
    },
    res,
    next,
  );
  await until(() => res.statusCode !== undefined || next.error);
  assert.equal(next.error, undefined, next.error && next.error.message);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(blogUpdate.update, { $inc: { likes: 1 } });
  assert.equal(res.body.data.likes, 42);
});

// ---------- B-29 ----------
let orderFindOneAndUpdate;
let orderDoc;
function orderQuery(doc) {
  return makeQuery(doc);
}
stubModule("models/order.model.js", {
  findOne: () => orderQuery(orderDoc),
  findById: () => orderQuery(orderDoc),
  findOneAndUpdate: (filter, update, options) => {
    orderFindOneAndUpdate = { filter, update, options };
    return orderQuery(
      orderDoc
        ? {
            ...orderDoc,
            returnRequest: {
              ...(orderDoc.returnRequest || {}),
              status: "requested",
            },
          }
        : null,
    );
  },
});
stubModule("models/cart.model.js", {});
stubModule("models/product.model.js", {});
stubModule("models/discount.model.js", {});
stubModule("models/address.model.js", {});
stubModule("services/discountUsage.service.js", {
  consumeDiscountUsage: async () => {},
});
stubModule("services/orderTransition.service.js", {
  transitionOrder: async () => {},
});
stubModule("services/email.service.js", {
  sendOrderConfirmationEmail: async () => {},
});
stubModule("services/esewaCapture.service.js", {
  captureEsewaPayment: async () => {},
});
const orderController = require("../../controllers/order.controller");

function deliveredOrder() {
  return {
    _id: "507f1f77bcf86cd799439011",
    orderId: "ORD-1",
    user: {
      _id: "507f1f77bcf86cd799439012",
      firstName: "A",
      lastName: "B",
      email: "a@example.com",
    },
    orderStatus: "delivered",
    deliveredAt: new Date(),
    updatedAt: new Date(),
    returnRequest: { status: "none" },
    paymentStatus: "paid",
    async save() {
      this._saved = true;
      return this;
    },
    addStatusHistory() {},
  };
}

test("B-29: requesting a return is a conditional atomic write guarded by order state", async () => {
  orderDoc = deliveredOrder();
  orderFindOneAndUpdate = undefined;
  const res = mockRes();
  const next = mockNext();
  orderController.requestReturn(
    {
      params: { id: orderDoc._id },
      user: { _id: orderDoc.user._id },
      body: { reason: "Changed mind" },
    },
    res,
    next,
  );
  await until(() => res.statusCode !== undefined || next.error);
  assert.equal(next.error, undefined, next.error && next.error.message);
  assert.equal(res.statusCode, 200);
  assert.ok(
    orderFindOneAndUpdate,
    "the write must go through findOneAndUpdate",
  );
  assert.equal(
    orderFindOneAndUpdate.filter.orderStatus,
    "delivered",
    "the state guard must be in the write filter",
  );
  assert.ok(
    JSON.stringify(orderFindOneAndUpdate.filter).includes(
      "returnRequest.status",
    ),
    "the no-pending-return guard must be in the write filter",
  );
  assert.equal(
    orderDoc._saved,
    undefined,
    "the pre-read document must not be save()d back",
  );
});

test("B-29: processing a return is a conditional atomic write (no double-processing)", async () => {
  orderDoc = deliveredOrder();
  orderDoc.returnRequest = {
    status: "requested",
    reason: "Changed mind",
    requestedAt: new Date(),
  };
  orderFindOneAndUpdate = undefined;
  const res = mockRes();
  const next = mockNext();
  orderController.processReturnRequest(
    {
      params: { id: orderDoc._id },
      body: { status: "approved", adminNote: "OK" },
    },
    res,
    next,
  );
  await until(() => res.statusCode !== undefined || next.error);
  assert.equal(next.error, undefined, next.error && next.error.message);
  assert.equal(res.statusCode, 200);
  assert.ok(
    orderFindOneAndUpdate,
    "the write must go through findOneAndUpdate",
  );
  assert.equal(
    orderFindOneAndUpdate.filter["returnRequest.status"],
    "requested",
    "the pending-state guard must be in the write filter",
  );
  assert.equal(
    orderFindOneAndUpdate.update.$set["returnRequest.status"],
    "approved",
  );
  assert.equal(
    orderFindOneAndUpdate.update.$set.refundRequest.status,
    "pending",
    "paid orders get a pending refund request on approval",
  );
  assert.equal(
    orderDoc._saved,
    undefined,
    "the pre-read document must not be save()d back",
  );
});
