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

const uploadToCloudinary = async (buffer, options = {}) => {
    const client = getCloudinaryConfig();
    return new Promise((resolve, reject) => {
        const uploadStream = client.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    const client = getCloudinaryConfig();
    try {
        const result = await client.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result;
    } catch (error) {
        console.error(`Failed to delete from Cloudinary: ${publicId}`, error.message);
        return null;
    }
};

module.exports = {
    cloudinary,
    getCloudinaryConfig,
    uploadToCloudinary,
    deleteFromCloudinary,
};
