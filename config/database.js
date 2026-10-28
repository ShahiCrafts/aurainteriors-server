const mongoose = require("mongoose");

const poolOptions = () => {
  const max = Number(require("./appConfig").getInt("MONGO_MAX_POOL_SIZE"));
  const min = Number(require("./appConfig").getInt("MONGO_MIN_POOL_SIZE"));
  return {
    maxPoolSize: Number.isFinite(max) && max > 0 ? max : 100,
    minPoolSize: Number.isFinite(min) && min >= 0 ? min : 0,
  };
};

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
      console.error(
        `MongoDb connection attempt ${attempt}/${maxAttempts} failed: ${error.message} Retrying in ${delay}ms...`,
      );
      await sleep(delay);
    }
  }
  console.error("MongoDb Connection failed!", lastError.message);
  process.exit(1);
};

module.exports = { connectDatabase };
