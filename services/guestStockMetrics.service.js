// AR-25 (D-D), always-on half: the guest confirmation/capture-time
// stock-failure counter. This runs in BOTH GUEST_STOCK_RESERVATION
// modes (and both flag states): whenever a guest order's deferred
// stock commitment fails at its trust point — commitGuestCodStock
// at confirmation, or eSewa capture after money moved — the failure
// is counted here and emitted as ONE structured JSON error log, so
// the accepted oversell risk (flag off) and reservation leakage
// (flag on) are visible instead of silent. In-process only: the
// counter resets on restart; the log line is the durable record.
let total = 0;

function recordGuestStockConfirmFailure({ orderId, source, reason } = {}) {
  total += 1;
  console.error(
    JSON.stringify({
      event: "guest_stock_confirm_failure",
      orderId: orderId ? String(orderId) : null,
      source: source || null,
      reason: reason ? String(reason) : null,
      total,
    }),
  );
  return total;
}

function getGuestStockConfirmFailures() {
  return total;
}

// Test support: probes assert increments from a known baseline.
function _resetGuestStockConfirmFailures() {
  total = 0;
}

module.exports = {
  recordGuestStockConfirmFailure,
  getGuestStockConfirmFailures,
  _resetGuestStockConfirmFailures,
};
