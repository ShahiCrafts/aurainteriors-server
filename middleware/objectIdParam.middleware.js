const AppError = require("../utils/AppError");

// router.param guard (C-08): reject malformed ObjectId route params
// with a clean 400 in every environment. Without it, a junk :id falls
// through to Mongoose, which throws a CastError - handled as a 400 in
// production but a 500 with a stack trace in development. Mirrors the
// guards address.routes and contact.routes already had.
const objectIdParam = (req, res, next, value, name) => {
  if (!/^[a-f0-9]{24}$/i.test(String(value))) {
    return next(new AppError(`Invalid ${name} parameter`, 400));
  }
  return next();
};

// SR-8 (Phase 0.5): variant for the routers whose PUBLIC detail GETs
// resolve slug-or-id in the controller (products, categories). A GET
// passes through to that resolution untouched - an unknown slug gets
// the controller's 404 - while every other method keeps the strict
// ObjectId guard above, so mutations and admin routes still 400 on a
// malformed or slug-shaped id. Routes whose controllers have no slug
// branch (e.g. the reviews nesting, /:id/related) do not use this
// variant and stay strict for GETs too.
const slugOrObjectIdParam = (req, res, next, value, name) => {
  if (req.method === "GET") return next();
  return objectIdParam(req, res, next, value, name);
};

module.exports = objectIdParam;
module.exports.slugOrObjectIdParam = slugOrObjectIdParam;
