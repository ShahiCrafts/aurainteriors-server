const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let dummyPasswordHash = null;
const dummyPasswordHashPromise = bcrypt
  .hash("timing-equalization-dummy", 12)
  .then((hash) => {
    dummyPasswordHash = hash;
    return hash;
  });
dummyPasswordHashPromise.catch(() => {});
const getDummyPasswordHash = async () =>
  dummyPasswordHash !== null ? dummyPasswordHash : dummyPasswordHashPromise;
const authToken = require("../utils/authToken");
const runtimeContext = require("../services/runtimeContext");
const { maskEmail } = require("../utils/maskEmail");
const RevokedToken = require("../models/revokedToken.model");
const User = require("../models/user.model");
const { sendMagicLinkEmail } = require("../services/email.service");
const getEmailOutbox = () => {
  try {
    return require("../services/emailOutbox.service");
  } catch {
    return null;
  }
};

const isProduction = () =>
  (process.env.NODE_ENV || "").trim().toLowerCase() === "production";

const TOKEN_ISSUER = "aura-interiors";
const TOKEN_AUDIENCE = "aura-interiors-api";
const tokenLifetimeMs = () => {
  const raw = String(process.env.JWT_EXPIRES_IN || "7d").trim();
  const match = raw.match(/^(\d+)\s*([smhd])?$/i);
  if (match) {
    const mult = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[
      (match[2] || "s").toLowerCase()
    ];
    return Number(match[1]) * mult;
  }
  const days = Number(process.env.JWT_COOKIE_EXPIRES_IN);
  return (Number.isFinite(days) && days > 0 ? days : 7) * 864e5;
};

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: Math.floor(tokenLifetimeMs() / 1000),
      jwtid: crypto.randomBytes(16).toString("hex"),
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    },
  );

const attachTokenCookie = (res, token) => {
  res.cookie("jwt", token, {
    expires: new Date(Date.now() + tokenLifetimeMs()),
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/",
  });
};

const sendAuthResponse = (user, statusCode, res) => {
  const token = signToken(user);
  attachTokenCookie(res, token);
  const body = { status: "success", data: { user } };
  if (require("../config/appConfig").getString("RETURN_TOKEN_IN_BODY") === "1")
    body.token = token;
  res.status(statusCode).json(body);
};
exports._sendAuthResponse = sendAuthResponse; // exported for tests
exports._tokenLifetimeMs = tokenLifetimeMs;
exports._getDummyPasswordHash = getDummyPasswordHash; // exported for tests (AR-34)

exports.sendMagicLink = async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
      return res
        .status(400)
        .json({ status: "fail", message: "Email is required" });
    }

    let user = await User.findOne({ email, deletedAt: null });

    if (user && (user.role === "admin" || !user.isActive)) {
      return res.status(200).json({
        status: "success",
        message: "Sign-in link sent to your email. It expires in 15 minutes.",
      });
    }

    if (!user) {
      user = new User({ email });
    }

    const rawToken = user.createMagicLinkToken();
    await user.save({ validateBeforeSave: false });

    const magicLink = `${process.env.FRONTEND_URL}/auth/verify?token=${rawToken}`;
    // Bearer links must never be written to logs.
    console.log(
      "[auth] Brevo config check - API Key:",
      process.env.BREVO_API_KEY ? "✓" : "✗",
    );

    console.log("[auth] About to send magic link email to:", maskEmail(email));

    const emailOutbox = getEmailOutbox();
    if (emailOutbox && emailOutbox.isOutboxMode()) {
      await emailOutbox.dispatchEmail({
        kind: "magic-link",
        to: email,
        payload: { email, magicLink, firstName: user.firstName },
      });
      res.status(200).json({
        status: "success",
        message: "Sign-in link sent to your email. It expires in 15 minutes.",
      });
    } else {
      res.status(200).json({
        status: "success",
        message: "Sign-in link sent to your email. It expires in 15 minutes.",
      });
      if (emailOutbox) {
        emailOutbox
          .dispatchEmail({
            kind: "magic-link",
            to: email,
            payload: { email, magicLink, firstName: user.firstName },
          })
          .then((r) => {
            if (r.status === "sent")
              console.log(
                `[email] Magic link sent successfully to ${maskEmail(email)}`,
              );
            else
              console.error(
                `[email] Magic link failed for ${maskEmail(email)}`,
              );
          })
          .catch(() =>
            console.error(`[email] Magic link failed for ${maskEmail(email)}`),
          );
      } else {
        sendMagicLinkEmail(email, magicLink)
          .then(() =>
            console.log(
              `[email] Magic link sent successfully to ${maskEmail(email)}`,
            ),
          )
          .catch(() =>
            console.error(`[email] Magic link failed for ${maskEmail(email)}`),
          );
      }
    }
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message:
          "Authentication temporarily unavailable. Please try again later.",
      });
  }
};

exports.verifyMagicLink = async (req, res) => {
  try {
    const token = req.body?.token;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return res
        .status(400)
        .json({ status: "fail", message: "Token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOneAndUpdate(
      {
        magicLinkToken: hashedToken,
        magicLinkExpires: { $gt: Date.now() },
        deletedAt: null,
      },
      {
        $unset: { magicLinkToken: 1, magicLinkExpires: 1 },
        $set: { isEmailVerified: true, lastLogin: new Date() },
        $inc: { loginCount: 1 },
      },
      { new: true },
    );

    if (!user) {
      return res.status(400).json({
        status: "fail",
        message:
          "This link is invalid or has expired. Please request a new one.",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        status: "fail",
        message: "Admins must log in through the Admin Portal.",
      });
    }

    if (!user.isActive)
      return res
        .status(400)
        .json({
          status: "fail",
          message: "This link is invalid or has expired.",
        });

    sendAuthResponse(user, 200, res);
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message:
          "Authentication temporarily unavailable. Please try again later.",
      });
  }
};

exports.googleCallback = (req, res) => {
  if (
    !req.user ||
    !req.user.isActive ||
    req.user.deletedAt ||
    req.user.role === "admin"
  ) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/?error=unauthorized_admin`,
    );
  }
  const token = signToken(req.user);
  attachTokenCookie(res, token);
  res.redirect(`${process.env.FRONTEND_URL}/auth/success`);
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message:
          "Authentication temporarily unavailable. Please try again later.",
      });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = authToken.extract(req);
    if (token) {
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ["HS256"],
        });
      } catch {
        /* Already invalid. */
      }
      if (decoded) {
        await RevokedToken.updateOne(
          { _id: authToken.hash(token) },
          { $set: { expiresAt: new Date(decoded.exp * 1000) } },
          { upsert: true },
        );
        for (const socket of runtimeContext
          .getIo()
          ?.sockets?.sockets?.values() || []) {
          // AR-33: registry, not global.io
          if (
            socket.sessionToken === token ||
            socket.handshake.auth?.token === token
          )
            socket.disconnect(true);
        }
      }
    }
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: isProduction(),
      sameSite: isProduction() ? "none" : "lax",
      path: "/",
    });
    res
      .status(200)
      .json({ status: "success", message: "Logged out successfully" });
  } catch {
    res
      .status(503)
      .json({
        status: "error",
        message: "Unable to revoke session. Please retry logout.",
      });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password = req.body?.password;
    if (
      !email ||
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof password !== "string" ||
      !password ||
      password.length > 1024
    ) {
      return res
        .status(400)
        .json({ status: "fail", message: "Email and password are required" });
    }

    const user = await User.findOne({ email, deletedAt: null }).select(
      "+password +role +isActive",
    );

    let isCorrect = false;
    if (user && user.role === "admin" && user.password) {
      isCorrect = await user.comparePassword(password, user.password);
    } else {
      await bcrypt.compare(password, await getDummyPasswordHash());
    }
    if (!user || user.role !== "admin" || !isCorrect) {
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: "fail",
        message: "This account has been deactivated. Please contact support.",
      });
    }

    // Generate OTP
    const rawOtp = user.createOtp();
    await user.save({ validateBeforeSave: false });

    // Send email

    console.log("[auth] Admin OTP created for:", maskEmail(email));
    console.log(
      "[auth] Brevo config check - API Key:",
      process.env.BREVO_API_KEY ? "✓" : "✗",
    );
    console.log("[auth] About to send OTP email to:", maskEmail(email));

    const emailOutbox = getEmailOutbox();
    if (emailOutbox && emailOutbox.isOutboxMode()) {
      await emailOutbox.dispatchEmail({
        kind: "otp",
        to: email,
        payload: { email, otp: rawOtp },
      });
      res.status(200).json({
        status: "success",
        otpRequired: true,
        challengeId: user.loginOtpChallenge,
        message: "A verification code has been sent to your email.",
      });
    } else {
      res.status(200).json({
        status: "success",
        otpRequired: true,
        challengeId: user.loginOtpChallenge,
        message: "A verification code has been sent to your email.",
      });
      if (emailOutbox) {
        emailOutbox
          .dispatchEmail({
            kind: "otp",
            to: email,
            payload: { email, otp: rawOtp },
          })
          .then((r) => {
            if (r.status === "sent")
              console.log(
                `[email] Admin OTP sent successfully to ${maskEmail(email)}`,
              );
            else
              console.error(`[email] Admin OTP failed for ${maskEmail(email)}`);
          })
          .catch(() =>
            console.error(`[email] Admin OTP failed for ${maskEmail(email)}`),
          );
      } else {
        const { sendOtpEmail } = require("../services/email.service");
        sendOtpEmail(email, rawOtp)
          .then(() =>
            console.log(
              `[email] Admin OTP sent successfully to ${maskEmail(email)}`,
            ),
          )
          .catch(() =>
            console.error(`[email] Admin OTP failed for ${maskEmail(email)}`),
          );
      }
    }
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message:
          "Authentication temporarily unavailable. Please try again later.",
      });
  }
};

exports.adminVerifyOtp = async (req, res) => {
  try {
    const { otp, challengeId } = req.body || {};
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const reject = () =>
      res.status(400).json({
        status: "fail",
        message:
          "The code is invalid or has expired. Please sign in again if necessary.",
      });
    if (
      !email ||
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp) ||
      typeof challengeId !== "string" ||
      !/^[a-f0-9]{64}$/.test(challengeId)
    )
      return reject();

    // Reserve one guess atomically; parallel requests cannot exceed five.
    const filter = {
      email,
      role: "admin",
      isActive: true,
      deletedAt: null,
      loginOtpChallenge: challengeId,
      loginOtpExpires: { $gt: new Date() },
    };
    const attempt = await User.findOneAndUpdate(
      { ...filter, loginOtpAttempts: { $lt: 5 } },
      { $inc: { loginOtpAttempts: 1 } },
      { new: true },
    ).select("+loginOtp");
    if (!attempt) return reject();
    const hashedOtp = require("../utils/otpHash").hashOtp(otp); // must match createOtp (A-12)
    if (attempt.loginOtp !== hashedOtp) return reject();

    // Claim the challenge once before issuing a JWT, preventing OTP replay.
    const user = await User.findOneAndUpdate(
      { ...filter, loginOtp: hashedOtp },
      {
        $unset: {
          loginOtp: 1,
          loginOtpExpires: 1,
          loginOtpChallenge: 1,
          loginOtpAttempts: 1,
        },
        $set: { isEmailVerified: true, lastLogin: new Date() },
        $inc: { loginCount: 1 },
      },
      { new: true },
    );
    if (!user) return reject();

    sendAuthResponse(user, 200, res);
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message:
          "Authentication temporarily unavailable. Please try again later.",
      });
  }
};
