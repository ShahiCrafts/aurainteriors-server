class AppError extends Error {
  constructor(message, statusCode, code = undefined) {
    super(message);

    this.statusCode = statusCode;
    // Phase 4 (catalog): an optional stable, machine-readable code
    // (e.g. "VARIANT_REQUIRED") clients can branch on. Existing
    // callers pass two arguments and keep code === undefined.
    if (code !== undefined) this.code = code;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
