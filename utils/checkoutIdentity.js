const crypto = require("crypto");
const AppError = require("./AppError");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
exports.checkoutIdentity = req => {
  const key = req.get("Idempotency-Key") || req.body.idempotencyKey;
  if (!key) throw new AppError("A checkout idempotency key is required", 400);
  if (typeof key !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) throw new AppError("Invalid checkout idempotency key", 400);
  const owner = req.user?._id ? `user:${req.user._id}` : `guest:${String(req.body.email).trim().toLowerCase()}`;
  const idempotencyKey = crypto.createHash("sha256").update(`${owner}:${key}`).digest("hex");
  const body = { ...req.body }; delete body.idempotencyKey;
  const requestHash = crypto.createHash("sha256").update(JSON.stringify(canonical(body))).digest("hex");
  return { _id: idempotencyKey.slice(0, 24), idempotencyKey, requestHash };
};
