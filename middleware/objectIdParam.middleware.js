const AppError = require("../utils/AppError");

// router.param guard (C-08): reject malformed ObjectId route params
// with a clean 400 in every environment. Without it, a junk :id falls
// through to Mongoose, which throws a CastError - handled as a 400 in
// production but a 500 with a stack trace in development. Mirrors the
// guards address.routes and contact.routes already had.
module.exports = (req, res, next, value, name) => {
  if (!/^[a-f0-9]{24}$/i.test(String(value))) {
    return next(new AppError(`Invalid ${name} parameter`, 400));
  }
  return next();
};
