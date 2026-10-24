const crypto = require("crypto");

// Storage hash for admin login OTPs (A-12).
//
// An OTP is a 6-digit code (~900k possibilities). Stored as a bare
// SHA-256, anyone with a database read can brute-force the whole
// space offline in milliseconds and mint an admin session within
// the code's 5-minute life. Keyed as an HMAC with a server-side
// secret, a database leak alone no longer suffices - the attacker
// also needs the secret. OTP_PEPPER is a dedicated env var so the
// key can be separated from JWT_SECRET (see ND-7 in AUDIT_STATE.md);
// until it is set, JWT_SECRET is used, which needs no new config to
// deploy. NOTE: deploying this invalidates OTPs issued before the
// deploy (they live at most 5 minutes).
const otpKey = () => process.env.OTP_PEPPER || process.env.JWT_SECRET || "";

exports.hashOtp = (otp) =>
  crypto.createHmac("sha256", otpKey()).update(String(otp)).digest("hex");
