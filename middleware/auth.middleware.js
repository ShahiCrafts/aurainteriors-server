const authToken = require("../utils/authToken");
const User = require("../models/user.model");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

exports.protect = catchAsync(async (req, res, next) => {
  const token = authToken.extract(req);

  if (!token) {
    return next(
      new AppError("You are not logged in. Please log in to get access.", 401),
    );
  }

  const decoded = await authToken.verify(token);

  // AR-10: lean + select, mirroring protectOptional below. The field
  // set is the consumer audit, not a guess: across controllers,
  // services and middleware, protect's req.user is read ONLY for
  // _id, id, role, firstName, lastName, email, phone, isActive and
  // deletedAt (order checkout reads phone; review creation reads the
  // name; signToken(req.user) reads _id/email/role). No consumer calls
  // a document method (.save/.comparePassword/...) on it - handlers
  // that need the full document (profile) re-fetch by req.user.id -
  // so no hydrated variant is kept. Every security check is unchanged:
  // revocation still runs inside authToken.verify above, and the
  // isActive/deletedAt rejection below is verbatim.
  const user = await User.findById(decoded.id)
    .select("_id role isActive deletedAt email firstName lastName avatar phone")
    .lean();
  if (!user) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401),
    );
  }

  if (!user.isActive || user.deletedAt) {
    return next(new AppError("This account has been deactivated.", 401));
  }

  // `id` is the string virtual consumers read (absent on lean
  // results); `iat` is a token claim, not a user field - profile
  // deleteAccount reads req.user.iat for its fresh-auth check
  // (FA-64), which under full hydration silently read undefined.
  req.user = { ...user, id: user._id.toString(), iat: decoded.iat };
  req.isAuthenticated = true;
  next();
});

/**
 * protectOptional middleware — allows both authenticated and unauthenticated requests
 * If valid token provided: attaches req.user and sets req.isAuthenticated = true
 * If no/invalid token: treats as guest, sets req.isAuthenticated = false, continues (does not 401)
 */
exports.protectOptional = catchAsync(async (req, res, next) => {
  const token = authToken.extract(req);
  req.isAuthenticated = false;
  req.user = null;

  if (token) {
    try {
      const decoded = await authToken.verify(token);
      const user = await User.findById(decoded.id)
        .select("_id role isActive deletedAt email firstName lastName avatar")
        .lean();

      if (user && user.isActive && !user.deletedAt) {
        req.user = user;
        req.isAuthenticated = true;
      }
      // Invalid user record or deactivated — treat as guest
    } catch (error) {
      // Token verification failed (expired, invalid signature, etc.) — treat as guest
    }
  }

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    }
    next();
  };
};
