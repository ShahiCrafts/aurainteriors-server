const mongoose = require("mongoose");

// AR-35: explicit pool sizing. The values below are the MongoDB
// driver's own defaults - the change is that they are now EXPLICIT
// and env-tunable instead of implicit.
const poolOptions = () => {
  const max = Number(require("./appConfig").getInt("MONGO_MAX_POOL_SIZE"));
  const min = Number(require("./appConfig").getInt("MONGO_MIN_POOL_SIZE"));
  return {
    maxPoolSize: Number.isFinite(max) && max > 0 ? max : 100,
    minPoolSize: Number.isFinite(min) && min >= 0 ? min : 0,
  };
};

// AR-35: bounded connect retry. MONGO_CONNECT_RETRIES (default 5)
// retries AFTER the first attempt, with exponential backoff (1 s,
// 2 s, 4 s, ... capped at 30 s) and full jitter - a Mongo that is
// still starting (or a DNS/proxy that comes up late) no longer kills
// the process on the first 10 s server-selection timeout; a Mongo
// that never arrives still ends in process.exit(1), just later and
// with every attempt logged.
const connectRetries = () => {
  const n = Number(require("./appConfig").getInt("MONGO_CONNECT_RETRIES"));
  return Number.isInteger(n) && n >= 0 ? n : 5;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDatabase = async () => {
  const maxAttempts = connectRetries() + 1;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        dbName: require("./appConfig").getString("MONGO_DB_NAME"),
        // FA-89: explicit timeouts (previously the driver defaults, which
        // can leave a dead deployment hanging for 30s+ per operation).
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        ...poolOptions(),
      });
      console.log("MongoDb Connection Succeeded!");
      return;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      const backoffCap = Math.min(1000 * 2 ** (attempt - 1), 30000);
      const delay = Math.floor(Math.random() * backoffCap);
      console.error(`MongoDb connection attempt ${attempt}/${maxAttempts} failed: ${error.message} Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  console.error("MongoDb Connection failed!", lastError.message);
  process.exit(1);
};

module.exports = { connectDatabase };
