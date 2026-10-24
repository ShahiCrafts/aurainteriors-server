const crypto = require("crypto");
const axios = require("axios");
const SIGNED_FIELDS = "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names";
// FA-19: NO credential material lives in this source file any more -
// not even eSewa's published sandbox secret, which used to sit here as
// a literal and silently became the active key whenever NODE_ENV was
// development. Every environment supplies its own ESEWA_MERCHANT_ID
// and ESEWA_SECRET_KEY. For sandbox work, copy eSewa's published test
// values into your local .env and set ESEWA_ENV=sandbox. The sandbox
// endpoints are used ONLY for ESEWA_ENV=sandbox or NODE_ENV=test;
// every other environment talks to the production endpoints, and a
// missing key fails fast instead of falling back to a known secret.
// Whether the old literal should also be purged from git history is
// the owner's call (OWNER_DECISIONS.md, FA-19) - it is eSewa's public
// test value, but it should still stop being this repo's fallback.
exports.getEsewaConfig = () => {
  // Lead review item 3 (GROUP C): the NODE_ENV "development" default lived
  // at ~6 call sites pre-AR-32; it now lives only in the registry and this
  // reads it from there. Behavior is identical for set/unset values (the
  // registry returns def "development" on empty); a whitespace-only
  // NODE_ENV now normalizes to "development" instead of "" (saner, and
  // consistent with validateEnv).
  const nodeEnv = String(require("../config/appConfig").get("NODE_ENV")).trim().toLowerCase();
  const production = nodeEnv === "production";
  const sandbox = process.env.ESEWA_ENV === "sandbox" || nodeEnv === "test";
  const merchantId = process.env.ESEWA_MERCHANT_ID || "";
  const secretKey = process.env.ESEWA_SECRET_KEY || "";
  if (!merchantId || !secretKey) {
    throw new Error(production
      ? "Valid production eSewa merchant credentials are required"
      : "eSewa merchant credentials are required: set ESEWA_MERCHANT_ID and ESEWA_SECRET_KEY (for sandbox testing, use eSewa's published test credentials with ESEWA_ENV=sandbox)");
  }
  if (production && merchantId === "EPAYTEST") {
    throw new Error("Valid production eSewa merchant credentials are required");
  }
  return { merchantId, secretKey,
    paymentUrl: sandbox ? "https://rc-epay.esewa.com.np/api/epay/main/v2/form" : "https://epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl: sandbox ? "https://uat.esewa.com.np/api/epay/transaction/status/" : "https://epay.esewa.com.np/api/epay/transaction/status/",
  };
};
const amountMinor = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const raw = String(value);
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.replace(/,/g, "").split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
};
exports.verifyEsewaSignature = (data, config) => {
  if (!data || typeof data !== "object" || Array.isArray(data) || data.signed_field_names !== SIGNED_FIELDS) return false;
  for (const field of ["transaction_code", "status", "transaction_uuid", "product_code"]) {
    if (typeof data[field] !== "string" || !data[field] || data[field].length > 200 || /[\r\n,=]/.test(data[field])) return false;
  }
  if (!/^[a-zA-Z0-9-]+$/.test(data.transaction_uuid) || amountMinor(data.total_amount) === null ||
      typeof data.signature !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(data.signature)) return false;
  const message = SIGNED_FIELDS.split(",").map(field => `${field}=${data[field]}`).join(",");
  const expected = crypto.createHmac("sha256", config.secretKey).update(message).digest();
  const actual = Buffer.from(data.signature, "base64");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
exports.verifyEsewaPayment = async (data, order, config) => {
  const expectedAmount = typeof order.total === "number" && Number.isFinite(order.total) ? amountMinor(order.total.toFixed(2)) : null;
  if (!expectedAmount || data.status !== "COMPLETE" || order.paymentMethod !== "esewa" ||
      data.transaction_uuid !== order.orderId || data.product_code !== config.merchantId ||
      amountMinor(data.total_amount) !== expectedAmount) throw new Error("PAYMENT_BINDING_MISMATCH");
  // Fixed provider endpoint, server-owned parameters, no redirect following.
  const { data: provider } = await axios.get(config.statusUrl, {
    params: { product_code: config.merchantId, transaction_uuid: order.orderId, total_amount: order.total.toFixed(2) },
    timeout: 10000, maxRedirects: 0, maxContentLength: 16384,
  });
  // eSewa documents both legacy camelCase and newer snake_case responses.
  const field = (primary, legacy) => {
    if (provider?.[primary] !== undefined && provider?.[legacy] !== undefined &&
        String(provider[primary]) !== String(provider[legacy])) throw new Error("PAYMENT_STATUS_CONFLICT");
    return provider?.[primary] ?? provider?.[legacy];
  };
  if (!provider || provider.status !== "COMPLETE" ||
      field("product_code", "scd") !== config.merchantId ||
      field("transaction_uuid", "pid") !== order.orderId ||
      amountMinor(field("total_amount", "totalAmount")) !== expectedAmount ||
      field("ref_id", "refId") !== data.transaction_code) throw new Error("PAYMENT_NOT_VERIFIED");
  return true;
};

// Full refunds are reconciled from provider state, never inferred from cancellation.
exports.verifyEsewaRefund = async (order, config) => {
  const { data } = await axios.get(config.statusUrl, {
    params: { product_code: config.merchantId, transaction_uuid: order.orderId, total_amount: order.total.toFixed(2) },
    timeout: 10000, maxRedirects: 0, maxContentLength: 16384,
  });
  // Same field-conflict discipline as verifyEsewaPayment (B-23): when
  // the provider returns BOTH the modern and legacy spellings of a
  // field and they disagree, the response is not trustworthy - the
  // previous ?? fallback silently trusted whichever came first.
  const field = (primary, legacy) => {
    if (data?.[primary] !== undefined && data?.[legacy] !== undefined &&
        String(data[primary]) !== String(data[legacy])) throw new Error("REFUND_NOT_VERIFIED");
    return data?.[primary] ?? data?.[legacy];
  };
  if (data?.status !== "FULL_REFUND" || field("product_code", "scd") !== config.merchantId ||
      field("transaction_uuid", "pid") !== order.orderId ||
      amountMinor(field("total_amount", "totalAmount")) !== amountMinor(order.total.toFixed(2)) ||
      field("ref_id", "refId") !== order.paymentDetails?.transactionId) throw new Error("REFUND_NOT_VERIFIED");
  return field("ref_id", "refId");
};
