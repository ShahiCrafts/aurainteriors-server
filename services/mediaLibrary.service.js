"use strict";

// Batch 5: media library over the store's Cloudinary account.
//
// Upload folders used across the codebase (middleware/
// upload.middleware.js): "aura/avatars", "aura/categories",
// "aura/products", "aura/models", "aura/knowledge_base"; settings
// images ride the category pipeline ("aura/categories"). The
// library therefore scopes every read to folder:aura/* and refuses
// to delete anything outside the "aura/" prefix.

const AppError = require("../utils/AppError");

async function resolveClient() {
  const cloudinaryModule = require("../config/cloudinary");
  const cloudinary = await cloudinaryModule.resolveCloudinaryConfig();
  const cfg =
    cloudinary && typeof cloudinary.config === "function"
      ? cloudinary.config() || {}
      : {};
  if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
    throw new AppError("Cloudinary is not configured", 503);
  }
  return cloudinary;
}

function wrapSdkError(err) {
  if (err instanceof AppError) return err;
  const message =
    (err && err.message) || "Cloudinary request failed";
  // Never echo credentials: SDK messages do not carry them, and the
  // config object is never interpolated here.
  return new AppError(`Cloudinary error: ${message}`, 502);
}

function mapResource(resource) {
  return {
    publicId: resource.public_id,
    url: resource.secure_url,
    format: resource.format,
    width: resource.width,
    height: resource.height,
    bytes: resource.bytes,
    createdAt: resource.created_at,
    folder: resource.folder,
  };
}

async function listMedia({ cursor, search } = {}) {
  const cloudinary = await resolveClient();
  try {
    let expression = "folder:aura/*";
    if (typeof search === "string" && search.trim()) {
      expression += ` AND filename:*${search.trim()}*`;
    }
    let query = cloudinary.search
      .expression(expression)
      .sort_by("created_at", "desc")
      .max_results(60);
    if (cursor) query = query.next_cursor(cursor);
    const result = await query.execute();
    const resources = Array.isArray(result.resources)
      ? result.resources
      : [];
    return {
      media: resources.map(mapResource),
      nextCursor: result.next_cursor || null,
    };
  } catch (err) {
    throw wrapSdkError(err);
  }
}

async function deleteMedia(publicId) {
  if (typeof publicId !== "string" || !publicId.trim()) {
    throw new AppError("A non-empty 'publicId' string is required", 400);
  }
  const id = publicId.trim();
  if (!id.startsWith("aura/")) {
    throw new AppError(
      "Refusing to delete media outside the aura/ folders",
      400,
    );
  }
  const cloudinary = await resolveClient();
  try {
    return await cloudinary.uploader.destroy(id);
  } catch (err) {
    throw wrapSdkError(err);
  }
}

module.exports = { listMedia, deleteMedia };
