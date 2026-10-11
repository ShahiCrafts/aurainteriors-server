require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user.model");
const { getAdminCredentials } = require("../utils/adminCredentials");

// Operator-only command: requires database credentials; never called by server.
(async () => {
  try {
    const { email, password } = getAdminCredentials();
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    await mongoose.connect(process.env.MONGO_URI);
    if (await User.exists({ email })) {
      throw new Error("Account already exists; no role or password was changed");
    }
    await User.create({ email, password, role: "admin", isActive: true, isEmailVerified: true });
    console.log("Administrator created successfully");
  } catch (_error) {
    console.error("Administrator provisioning failed; check credentials, database connection and whether the account already exists");
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
