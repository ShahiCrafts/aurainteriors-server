const Joi = require("joi");

exports.validateNotificationCreation = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    title: Joi.string().required().max(200),
    type: Joi.string().required().max(100),
    description: Joi.string().max(1000),
    category: Joi.string()
      .valid("info", "warning", "success", "error", "system")
      .default("info"),
    priority: Joi.string()
      .valid("low", "normal", "high", "critical")
      .default("normal"),
    actionUrl: Joi.string().max(500),
    data: Joi.object().optional(),
    idempotencyKey: Joi.string().max(256),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: "fail",
      message: error.details[0].message,
    });
  }

  req.body = value;
  next();
};

exports.validateMarkAsRead = (req, res, next) => {
  const schema = Joi.object({
    notificationIds: Joi.array()
      .items(Joi.string().pattern(/^[a-f0-9]{24}$/i).required())
      .min(1)
      .max(100)
      .unique()
      .required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: "fail",
      message: error.details[0].message,
    });
  }

  req.body = value;
  next();
};

exports.validateArchive = (req, res, next) => {
  const schema = Joi.object({
    notificationIds: Joi.array()
      .items(Joi.string().pattern(/^[a-f0-9]{24}$/i).required())
      .min(1)
      .max(100)
      .unique()
      .required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: "fail",
      message: error.details[0].message,
    });
  }

  req.body = value;
  next();
};

exports.validatePushTokenRegistration = (req, res, next) => {
  const schema = Joi.object({
    token: Joi.string().required().max(500),
    deviceId: Joi.string().required().max(256),
    deviceName: Joi.string().max(200),
    platform: Joi.string().valid("web", "android", "ios").required(),
    metadata: Joi.object().optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: "fail",
      message: error.details[0].message,
    });
  }

  req.body = value;
  next();
};

module.exports = exports;
