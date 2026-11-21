const cloudinary = require("cloudinary").v2;

// Batch 2: track the last config applied to the (global) cloudinary
// object so resolveCloudinaryConfig() only re-configures when the
// merged values actually differ.
let lastAppliedConfig = null;
function applyCloudinaryConfig(cfg) {
  const signature = JSON.stringify(cfg);
  if (signature === lastAppliedConfig) return cloudinary;
  cloudinary.config(cfg);
  lastAppliedConfig = signature;
  return cloudinary;
}

const getCloudinaryConfig = () => {
  if (!cloudinary.config().cloud_name) {
    applyCloudinaryConfig({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  return cloudinary;
};

// Pure merge (unit-tested): admin Settings values win per-field, env
// fills the gaps. `secret` is the already-resolved secret (admin
// encrypted value else env, via secretsService) — pass null to fall
// back to the env secret here.
function mergeCloudinaryConfig(settingsValues, secret, env = process.env) {
  const s = settingsValues || {};
  return {
    cloud_name: s.cloudName || env.CLOUDINARY_CLOUD_NAME,
    api_key: s.apiKey || env.CLOUDINARY_API_KEY,
    api_secret: secret || env.CLOUDINARY_API_SECRET,
  };
}

// Async settings-backed resolution used by the upload/delete paths.
// Reads integrations.cloudinary {cloudName, apiKey} from the RAW
// stored settings doc (defaults are "" anyway, but raw keeps env
// parity exact) + the resolved media.cloudinarySecret. Any failure
// (no DB, no saved values) leaves the sync env behaviour untouched.
const resolveCloudinaryConfig = async () => {
  try {
    const settingsService = require("../services/settings/settingsService");
    if (settingsService.isDbReady()) {
      const raw = await settingsService.getRawStoredData();
      const saved =
        raw && raw.integrations && raw.integrations.cloudinary
          ? raw.integrations.cloudinary
          : {};
      const secretsService = require("../services/settings/secretsService");
      const secret = await secretsService
        .getResolvedSecret("media.cloudinarySecret")
        .catch(() => null);
      const merged = mergeCloudinaryConfig(
        {
          cloudName:
            typeof saved.cloudName === "string" ? saved.cloudName : "",
          apiKey: typeof saved.apiKey === "string" ? saved.apiKey : "",
        },
        secret,
      );
      if (merged.cloud_name || merged.api_key || merged.api_secret) {
        return applyCloudinaryConfig(merged);
      }
    }
  } catch {
    // fall through to the env path
  }
  return getCloudinaryConfig();
};

const cloudinaryTimeoutMs = () => {
  const n = Number(require("./appConfig").getInt("CLOUDINARY_TIMEOUT_MS"));
  return Number.isFinite(n) && n > 0 ? n : 30000;
};

const withDeadline = (promise, ms, label) => {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
};

const uploadToCloudinary = async (buffer, options = {}) => {
  const client = await resolveCloudinaryConfig();
  const timeoutMs = cloudinaryTimeoutMs();
  const upload = new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      { ...options, timeout: timeoutMs },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    uploadStream.end(buffer);
  });
  return withDeadline(upload, timeoutMs, "Cloudinary upload");
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  const client = await resolveCloudinaryConfig();
  const timeoutMs = cloudinaryTimeoutMs();
  try {
    return await withDeadline(
      client.uploader.destroy(publicId, {
        resource_type: resourceType,
        timeout: timeoutMs,
      }),
      timeoutMs,
      "Cloudinary destroy",
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "cloudinary_delete_failed",
        publicId,
        resourceType,
        error: error.message,
      }),
    );
    return null;
  }
};

// Direct (browser -> Cloudinary) signed uploads: the server signs a
// narrow parameter set (folder + public_id + timestamp) and the
// browser uploads straight to Cloudinary, skipping the app-server
// hop entirely. Only the public values (cloud name, API key) ever
// leave the server; the API secret is used here and nowhere else.
const signDirectUploadParams = ({ folder, publicId }) => {
  // Sync by contract (chatUpload.service + its tests call it
  // synchronously): it uses the most recently applied config — the
  // env config at boot, or the settings-merged config after any
  // upload/delete/resource call has resolved it.
  const client = getCloudinaryConfig();
  const { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret } =
    client.config();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured for direct uploads");
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = client.utils.api_sign_request(
    { folder, public_id: publicId, timestamp },
    apiSecret,
  );
  return { cloudName, apiKey, timestamp, signature, folder, publicId };
};

// Read back an asset the browser claims to have uploaded directly,
// so the completion step can verify it against the attachment
// policy (real format, real byte count) instead of trusting the
// client's report.
const getDirectUploadResource = async (publicId) => {
  const client = await resolveCloudinaryConfig();
  const timeoutMs = cloudinaryTimeoutMs();
  return withDeadline(
    client.api.resource(publicId, {
      resource_type: "image",
      timeout: timeoutMs,
    }),
    timeoutMs,
    "Cloudinary resource lookup",
  );
};

module.exports = {
  cloudinary,
  getCloudinaryConfig,
  resolveCloudinaryConfig,
  mergeCloudinaryConfig,
  uploadToCloudinary,
  deleteFromCloudinary,
  signDirectUploadParams,
  getDirectUploadResource,
};
