const AppError = require("../utils/AppError");

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(". ");
      return next(new AppError(errorMessage, 400));
    }

    if (property === "query") {
      // Express 5 exposes a getter-only query property. Shadow it locally so
      // downstream handlers see Joi defaults/coercions and stripped input.
      Object.defineProperty(req, "query", {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[property] = value;
    }
    next();
  };
};

module.exports = validate;
