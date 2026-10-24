// Test preload (FA-40 boot test): replaces config/database's
// connectDatabase with a no-op BEFORE server.js loads, so the app can
// boot in this environment, which has no MongoDB. mongoose stays
// disconnected, so /health/ready reports "degraded" - exactly the
// payload shape under test.
const path = require("path");
const dbPath = path.join(__dirname, "..", "..", "..", "config", "database.js");
require(dbPath);
require.cache[dbPath].exports = { connectDatabase: async () => {} };
