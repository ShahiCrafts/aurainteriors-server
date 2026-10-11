const crypto = require("crypto");
const axios = require("axios");
const SIGNED_FIELDS = "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names";
const TEST_SECRET = "8gBm/:&EnhH.1/q";
exports.getEsewaConfig = () => {
  const production = process.env.NODE_ENV === "production";
  const merchantId = process.env.ESEWA_MERCHANT_ID || (production ? "" : "EPAYTEST");
  const secretKey = process.env.ESEWA_SECRET_KEY || (production ? "" : TEST_SECRET);
  if (!merchantId || !secretKey || (production && (merchantId === "EPAYTEST" || secretKey === TEST_SECRET))) {
    throw new Error("Valid production eSewa merchant credentials are required");
  }
  return { merchantId, secretKey,
    paymentUrl: production ? "https://epay.esewa.com.np/api/epay/main/v2/form" : "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl: production ? "https://epay.esewa.com.np/api/epay/transaction/status/" : "https://uat.esewa.com.np/api/epay/transaction/status/",
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
  if (data?.status !== "FULL_REFUND" || (data.product_code ?? data.scd) !== config.merchantId ||
      (data.transaction_uuid ?? data.pid) !== order.orderId ||
      amountMinor(data.total_amount ?? data.totalAmount) !== amountMinor(order.total.toFixed(2)) ||
      (data.ref_id ?? data.refId) !== order.paymentDetails?.transactionId) throw new Error("REFUND_NOT_VERIFIED");
  return data.ref_id ?? data.refId;
};
