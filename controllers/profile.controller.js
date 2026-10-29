const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const RevokedToken = require("../models/revokedToken.model");
const authToken = require("../utils/authToken");
const { deleteFromCloudinary } = require("../config/cloudinary");
const { buildPreferenceUpdates } = require("../utils/preferenceUpdates");

// FA-17: clients get a generic 500 (the real error is logged here);
// 400s surface only field-level validation messages, mirroring the
// global error handler, never raw internal error text.
const sendServerError = (res, error, where) => {
  console.error(`[profile:${where}]`, error);
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
  console.error(`[profile:${where}]`, error);
  return res
    .status(400)
    .json({ status: "fail", message: "Invalid request data." });
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "handler");
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, gender, dateOfBirth } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    return sendClientError(res, error, "handler");
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "fail",
        message: "Please upload an image",
      });
    }

    const currentUser = await User.findById(req.user.id);
    // AR-21: the old avatar is destroyed only AFTER the update commits
    // (previously a failed update left the profile pointing at a
    // destroyed avatar).
    const oldAvatarPublicId = currentUser.avatarPublicId || null;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        avatar: req.file.cloudinaryUrl,
        avatarPublicId: req.file.cloudinaryPublicId,
      },
      { returnDocument: "after" },
    );

    if (oldAvatarPublicId) {
      const result = await deleteFromCloudinary(oldAvatarPublicId);
      if (result === null) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "asset_cleanup_pending",
            publicId: oldAvatarPublicId,
            resourceType: "image",
            context: "profile.updateAvatar",
          }),
        );
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "handler");
  }
};

exports.removeAvatar = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    // AR-21: destroy the avatar only after the update commits (see
    // updateAvatar).
    const oldAvatarPublicId = currentUser.avatarPublicId || null;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: null, avatarPublicId: null },
      { returnDocument: "after" },
    );

    if (oldAvatarPublicId) {
      const result = await deleteFromCloudinary(oldAvatarPublicId);
      if (result === null) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "asset_cleanup_pending",
            publicId: oldAvatarPublicId,
            resourceType: "image",
            context: "profile.removeAvatar",
          }),
        );
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "handler");
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    // AR-31(f): shared with notification.controller via
    // utils/preferenceUpdates (same key set, same dotted $set).
    const updateData = buildPreferenceUpdates(req.body);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { returnDocument: "after", runValidators: true },
    );

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    return sendClientError(res, error, "handler");
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    // FA-64: deletion is irreversible, so it requires a fresh
    // authentication factor - a stolen session alone is not enough.
    // Password accounts confirm their current password; passwordless
    // (magic-link) accounts must use a session authenticated within the
    // last 10 minutes (obtaining one required a fresh email link).
    const user = await User.findById(req.user.id).select("+password");
    if (!user || user.deletedAt) {
      return res
        .status(404)
        .json({ status: "fail", message: "Account not found" });
    }
    if (user.password) {
      const candidate =
        typeof req.body?.currentPassword === "string"
          ? req.body.currentPassword
          : "";
      if (!candidate || !(await bcrypt.compare(candidate, user.password))) {
        return res
          .status(400)
          .json({
            status: "fail",
            message:
              "Current password confirmation is required to delete your account",
          });
      }
    } else {
      const iat = Number(req.user.iat || 0);
      if (!iat || Date.now() - iat * 1000 > 10 * 60 * 1000) {
        return res
          .status(403)
          .json({
            status: "fail",
            message:
              "Please sign in again (fresh authentication) before deleting your account",
          });
      }
    }

    await User.findByIdAndUpdate(req.user.id, {
      isActive: false,
      deletedAt: Date.now(),
    });

    // Revoke the current session token and clear the cookie with the
    // same attributes it was set with.
    const currentToken = authToken.extract(req);
    if (currentToken) {
      const decoded = require("jsonwebtoken").decode(currentToken);
      await RevokedToken.updateOne(
        { _id: authToken.hash(currentToken) },
        {
          $setOnInsert: {
            expiresAt: new Date(
              (decoded?.exp || Math.floor(Date.now() / 1000) + 3600) * 1000,
            ),
          },
        },
        { upsert: true },
      );
    }
    const isProd =
      (process.env.NODE_ENV || "").trim().toLowerCase() === "production";
    res.cookie("jwt", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });

    res.status(200).json({
      status: "success",
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("[profile:deleteAccount]", error);
    res.status(500).json({
      status: "error",
      message: "Account deletion failed. Please try again.",
    });
  }
};
