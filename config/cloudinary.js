const cloudinary = require("cloudinary").v2;

const getCloudinaryConfig = () => {
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  return cloudinary;
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
  const client = getCloudinaryConfig();
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
  const client = getCloudinaryConfig();
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
  const client = getCloudinaryConfig();
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
  uploadToCloudinary,
  deleteFromCloudinary,
  signDirectUploadParams,
  getDirectUploadResource,
};
