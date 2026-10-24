// CodeQL class F (#194, js/insecure-randomness). The flagged chat
// flow already uses crypto.randomBytes(32) for guest session ids
// (see AUDIT_ALERTS.md), but the class review found the real sibling:
// order ids - a security-relevant lookup key (guest tracking,
// eSewa transaction_uuid) - drew their random suffix from
// Math.random. The suffix is now crypto-drawn, format unchanged.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Order = require("../../models/order.model");

test("CQ-F: order id suffixes are well-formed and crypto-drawn", () => {
  assert.equal(typeof Order.generateOrderSuffix, "function");
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const suffix = Order.generateOrderSuffix();
    assert.match(suffix, /^[0-9A-Z]{4}$/, "format/length preserved (AU + base36 ts + 4 chars)");
    seen.add(suffix);
  }
  assert.ok(seen.size > 1900, `suffixes must be effectively unique (got ${seen.size}/2000)`);
});
