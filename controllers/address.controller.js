const Address = require("../models/address.model");

const sendServerError = (res, error, where) => {
  console.error(`[address:${where}]`, error);
  return res
    .status(500)
    .json({
      status: "error",
      message: "Something went wrong. Please try again.",
    });
};
const sendClientError = (res, error, where) => {
  if (error?.name === "ValidationError") {
    const details = Object.values(error.errors || {}).map((e) => e.message);
    return res
      .status(400)
      .json({
        status: "fail",
        message: `Invalid input data. ${details.join(". ")}`,
      });
  }
  if (error?.name === "CastError") {
    return res
      .status(400)
      .json({
        status: "fail",
        message: `Invalid ${error.path}: ${error.value}`,
      });
  }
  console.error(`[address:${where}]`, error);
  return res
    .status(400)
    .json({ status: "fail", message: "Invalid request data." });
};

exports.getAllAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      status: "success",
      results: addresses.length,
      data: {
        addresses,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "handler");
  }
};

exports.getAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        address,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "handler");
  }
};

exports.createAddress = async (req, res) => {
  try {
    const {
      label,
      customLabel,
      type,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    // If this is the first address, make it default
    const existingAddresses = await Address.countDocuments({
      user: req.user.id,
    });
    const shouldBeDefault = existingAddresses === 0 ? true : isDefault;

    const address = await Address.create({
      user: req.user.id,
      label,
      customLabel,
      type,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault: shouldBeDefault,
    });

    if (shouldBeDefault) {
      await Address.switchDefault(req.user.id, address._id);
    }

    res.status(201).json({
      status: "success",
      data: {
        address,
      },
    });
  } catch (error) {
    return sendClientError(res, error, "handler");
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const {
      label,
      customLabel,
      type,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    if (label !== undefined) address.label = label;
    if (customLabel !== undefined) address.customLabel = customLabel;
    if (type !== undefined) address.type = type;
    if (fullName !== undefined) address.fullName = fullName;
    if (phone !== undefined) address.phone = phone;
    if (addressLine1 !== undefined) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (postalCode !== undefined) address.postalCode = postalCode;
    if (country !== undefined) address.country = country;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await address.save();
    if (isDefault === true) {
      await Address.switchDefault(req.user.id, address._id);
    }

    res.status(200).json({
      status: "success",
      data: {
        address,
      },
    });
  } catch (error) {
    return sendClientError(res, error, "handler");
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    const wasDefault = address.isDefault;
    await Address.findByIdAndDelete(req.params.id);

    if (wasDefault) {
      const nextAddress = await Address.findOne({ user: req.user.id }).sort({
        createdAt: -1,
      });
      if (nextAddress) {
        await Address.switchDefault(req.user.id, nextAddress._id);
      }
    }

    res.status(200).json({
      status: "success",
      message: "Address deleted successfully",
    });
  } catch (error) {
    return sendServerError(res, error, "handler");
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        status: "fail",
        message: "Address not found",
      });
    }

    await Address.switchDefault(req.user.id, address._id);
    address.isDefault = true; // response payload reflects the switch

    res.status(200).json({
      status: "success",
      data: {
        address,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "handler");
  }
};
