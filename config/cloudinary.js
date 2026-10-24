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

// AR-09: Cloudinary calls previously had no timeout bound under this
// codebase's control, and destroy failures vanished into a single
// console line. CLOUDINARY_TIMEOUT_MS (default 30000) is now passed to
// the SDK AND enforced with a hard deadline race in this wrapper, so
// an unresponsive Cloudinary fails the call in bounded time instead
// of hanging the request behind it.
const cloudinaryTimeoutMs = () => {
    const n = Number(require("./appConfig").getInt("CLOUDINARY_TIMEOUT_MS"));
    return Number.isFinite(n) && n > 0 ? n : 30000;
};

const withDeadline = (promise, ms, label) => {
    let timer;
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
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
            }
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
            "Cloudinary destroy"
        );
    } catch (error) {
        // AR-09: failures (including deadline expiry) are logged as a
        // structured, alertable record instead of a bare console line.
        // The null return is the long-standing failure signal the
        // callers already tolerate, so response shapes do not change.
        console.error(JSON.stringify({
            level: "error",
            event: "cloudinary_delete_failed",
            publicId,
            resourceType,
            error: error.message,
        }));
        return null;
    }
};

module.exports = {
    cloudinary,
    getCloudinaryConfig,
    uploadToCloudinary,
    deleteFromCloudinary,
};
