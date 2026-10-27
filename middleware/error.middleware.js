const AppError = require("../utils/AppError");
const { AuthRequiredError, RateLimitError } = require("../utils/errors");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // keyPattern/keyValue are not present on every duplicate-key error
  // (e.g. write-concern or index-build variants). Reading [0] of an
  // undefined pattern crashed the error handler itself, turning a
  // clean 400 into an unhandled 500 (B-17).
  const field =
    (err.keyPattern && Object.keys(err.keyPattern)[0]) ||
    (err.keyValue && Object.keys(err.keyValue)[0]);
  const message = field
    ? `Duplicate field value for '${field}'. Please use another value.`
    : "Duplicate field value. Please use another value.";
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError("Invalid token. Please log in again.", 401);

const handleJWTExpiredError = () => new AppError("Your token has expired. Please log in again.", 401);

const handleMulterError = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    // The limit differs per route (10-50MB); quoting a single number
    // here sent users chasing a limit that does not exist (B-17).
    return new AppError("File too large. The upload exceeds the size limit for this endpoint.", 400);
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return new AppError("Too many files. Maximum is 10 files.", 400);
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError("Unexpected field name for file upload.", 400);
  }
  return new AppError(err.message, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    // Handle structured AUTH_REQUIRED errors
    if (err.code === "AUTH_REQUIRED" || err.isAuthRequired) {
      return res.status(err.statusCode).json({
        status: "fail",
        code: "AUTH_REQUIRED",
        message: err.message,
        suggestion: err.suggestion || "Please sign in or create an account",
        actions: err.actions || ["sign_in", "create_account"],
      });
    }

    // Handle RATE_LIMIT errors
    if (err.code === "RATE_LIMIT_EXCEEDED") {
      return res.status(err.statusCode).json({
        status: "fail",
        code: "RATE_LIMIT_EXCEEDED",
        message: err.message,
        retryAfter: err.retryAfter || 900,
      });
    }

    // Standard operational error. SR-P7-1 (Phase 9+10): when the
    // AppError carries a stable machine-readable code (e.g.
    // VARIANT_REQUIRED), include it so clients can branch on the
    // code instead of matching message text. Uncoded errors keep
    // the exact legacy { status, message } shape.
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(typeof err.code === "string" && err.code ? { code: err.code } : {}),
    });
  } else {
    console.error("ERROR:", err);

    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

// VULN-003: normalise NODE_ENV before comparing, exactly like the
// rest of the codebase (auth.controller isProduction, appConfig
// validateEnv). A raw `=== "development"` compare meant values like
// "Development" or " development " silently took a different branch
// here than everywhere else. Normalised, they mean development —
// consistently — and never leak stacks in the production branch.
const isDevelopment = (value = process.env.NODE_ENV) =>
  String(value || "").trim().toLowerCase() === "development";

const errorHandler = (err, req, res, next) => {
  console.error(err); // Always log error for debugging
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (isDevelopment()) {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (err.name === "CastError") error = handleCastErrorDB(error);

    if (err.code === 11000) error = handleDuplicateFieldsDB(error);

    if (err.name === "ValidationError") error = handleValidationErrorDB(error);

    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

    if (err.name === "MulterError") error = handleMulterError(error);

    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;
module.exports.isDevelopment = isDevelopment; // exported for tests
