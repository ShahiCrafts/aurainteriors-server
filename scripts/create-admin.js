require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user.model");
const { getAdminCredentials } = require("../utils/adminCredentials");
const { connectDatabase } = require("../config/database");

// Operator-only command: requires database credentials; never called by server.
(async () => {
  try {
    const { email, password } = getAdminCredentials();
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    // AR-35: connect through the SAME connector as the server (was a
    // bare mongoose.connect here: no timeouts, no pool options, no
    // retry, and - because it skipped the dbName default - it could
    // provision the admin into a different database than the server
    // actually uses when MONGO_DB_NAME/the URI path disagreed).
    await connectDatabase();
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
