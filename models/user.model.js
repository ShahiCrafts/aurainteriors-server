const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{7,15}$/, "Please enter a valid phone number"],
    },

    avatar: { type: String, default: null },
    avatarPublicId: { type: String, default: null },

    dateOfBirth: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    password: {
      type: String,
      select: false,
      // FA-86: the length floor lives in the schema so every path that
      // sets a password (registration, reset, seeders, scripts) is held
      // to it - not just the validated HTTP handlers. Validation runs
      // on the plaintext BEFORE the pre-save bcrypt hook, and accounts
      // without a password (magic-link / Google) are unaffected because
      // the field stays optional.
      minlength: [8, "Password must be at least 8 characters long"],
    },

    loginOtp: {
      type: String,
      select: false,
    },

    loginOtpExpires: {
      type: Date,
      select: false,
    },

    loginOtpChallenge: { type: String, select: false },
    loginOtpAttempts: { type: Number, select: false, default: 0 },

    // Magic link (used for both signup and passwordless login)
    magicLinkToken: { type: String, select: false },
    magicLinkExpires: { type: Date, select: false },

    preferences: {
      newsletter: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false },
      orderUpdates: { type: Boolean, default: true },
      promotionalEmails: { type: Boolean, default: false },
      preferredCategories: [
        {
          type: String,
          enum: [
            "living_room",
            "bedroom",
            "dining",
            "office",
            "outdoor",
            "storage",
            "decor",
          ],
        },
      ],
    },

    // Unique + sparse: one Google identity (sub) maps to at most one
    // account, while users without Google sign-in stay out of the index.
    // Deploy note: if duplicates somehow exist, index creation fails at
    // startup - check with a db.users group-by on googleId before deploy.
    googleId: { type: String, sparse: true, unique: true },

    lastLogin: Date,
    loginCount: { type: Number, default: 0 },

    deactivatedAt: { type: Date, default: null },
    deactivationReason: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.index({ role: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });

userSchema.virtual("fullName").get(function () {
  if (this.firstName && this.lastName)
    return `${this.firstName} ${this.lastName}`;
  return this.firstName || null;
});

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Create OTP
userSchema.methods.createOtp = function () {
  const otp = crypto.randomInt(100000, 1000000).toString(); // 6 digit string
  this.loginOtp = require("../utils/otpHash").hashOtp(otp); // HMAC, not bare SHA-256 (A-12)
  this.loginOtpChallenge = crypto.randomBytes(32).toString("hex");
  this.loginOtpAttempts = 0;
  this.loginOtpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
  return otp;
};

userSchema.methods.createMagicLinkToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.magicLinkToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  this.magicLinkExpires = Date.now() + 15 * 60 * 1000;
  return rawToken;
};

userSchema.methods.updateLoginActivity = async function () {
  const now = new Date();
  if (this.isNew) {
    // Not persisted yet: keep the values in memory - the caller's
    // save() persists them with the rest of the document.
    this.lastLogin = now;
    this.loginCount = (this.loginCount || 0) + 1;
    return;
  }
  // AR-23: persist with ONE atomic updateOne ($set lastLogin, $inc
  // loginCount) instead of mutating the loaded document and relying
  // on the caller to save() the whole user - that rewrote every field
  // the copy carried and raced concurrent profile mutations. The
  // resulting values are mirrored via _doc (NOT the setters), so the
  // in-memory document reflects them without being dirtied: a later
  // caller save() cannot rewrite loginCount as a stale absolute
  // value. Callers: config/passport.js Google paths (updated to
  // simply await this).
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { lastLogin: now }, $inc: { loginCount: 1 } },
  );
  this._doc.lastLogin = now;
  this._doc.loginCount = (this.loginCount || 0) + 1;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
