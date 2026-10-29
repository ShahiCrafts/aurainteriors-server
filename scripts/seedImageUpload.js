// Seed-image Cloudinary upload (owner decision, 2026-10-29).
//
// The seed catalogue stores site-relative "/images/seed/<file>"
// paths whose files are self-hosted in the web app's public/
// folder. When the server is seeded with Cloudinary configured
// (the same CLOUDINARY_* credentials the admin-panel uploads use),
// each distinct seed photo is uploaded to Cloudinary ONCE and the
// catalogue is written with the returned secure_url instead —
// matching how admin-uploaded product images are stored.
//
// Fallbacks (never fatal, always logged):
//   - Cloudinary not configured  -> keep the local "/images/seed/…"
//     path (the web app serves it from its public/ folder).
//   - Seed file not found on disk -> keep the local path.
//   - Upload request fails        -> keep the local path.
// Re-running the seed is safe: uploads use a stable public_id
// ("aura-interiors/seed/<file-name>") with overwrite, and the
// in-run cache means each distinct photo is uploaded at most once
// no matter how many categories/products reference it.
//
// Where the files are looked up, first hit wins:
//   1. $SEED_IMAGE_DIR (a directory that mirrors the web public/
//      layout, i.e. it contains images/seed/<file>)
//   2. ../../aurainteriors-web/public (the monorepo layout: this
//      repo beside aurainteriors-web/)
//   3. ../public inside this repo

const fs = require("fs");
const path = require("path");

const SEED_IMAGE_PREFIX = "/images/seed/";

const isSeedLocalPath = (value) =>
  typeof value === "string" && value.startsWith(SEED_IMAGE_PREFIX);

function cloudinaryConfigured(env = process.env) {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
}

function defaultImageRoots() {
  const roots = [];
  if (process.env.SEED_IMAGE_DIR) roots.push(process.env.SEED_IMAGE_DIR);
  roots.push(
    path.join(__dirname, "..", "..", "aurainteriors-web", "public"),
  );
  roots.push(path.join(__dirname, "..", "public"));
  return roots;
}

function createSeedImageResolver(deps = {}) {
  const env = deps.env || process.env;
  const roots = deps.roots || defaultImageRoots();
  const readFile = deps.readFile || ((p) => fs.promises.readFile(p));
  const log = deps.log || ((msg) => console.warn(`[seed-images] ${msg}`));
  const upload =
    deps.upload ||
    ((buffer, options) =>
      require("../config/cloudinary").uploadToCloudinary(buffer, options));

  const cache = new Map();
  let warnedNotConfigured = false;

  async function resolve(localPath) {
    if (!isSeedLocalPath(localPath)) return localPath;
    if (cache.has(localPath)) return cache.get(localPath);
    const promise = (async () => {
      if (!cloudinaryConfigured(env)) {
        if (!warnedNotConfigured) {
          warnedNotConfigured = true;
          log(
            "Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / " +
              "CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET missing); " +
              "seed images keep their local /images/seed/ paths.",
          );
        }
        return localPath;
      }
      let buffer = null;
      for (const root of roots) {
        try {
          buffer = await readFile(path.join(root, localPath));
          break;
        } catch {
          // try the next root
        }
      }
      if (!buffer) {
        log(
          `seed image file not found for ${localPath} (looked in: ` +
            `${roots.join(", ")}); keeping the local path. ` +
            "Set SEED_IMAGE_DIR if the web app lives elsewhere.",
        );
        return localPath;
      }
      try {
        const result = await upload(buffer, {
          folder: "aura-interiors/seed",
          public_id: path.basename(localPath, path.extname(localPath)),
          overwrite: true,
          resource_type: "image",
        });
        if (result && result.secure_url) return result.secure_url;
        log(`upload for ${localPath} returned no secure_url; keeping local path.`);
        return localPath;
      } catch (error) {
        log(`upload for ${localPath} failed (${error.message}); keeping local path.`);
        return localPath;
      }
    })();
    cache.set(localPath, promise);
    return promise;
  }

  async function resolveCatalogueImages(catalogue) {
    const categories = [];
    for (const category of catalogue.categories || []) {
      categories.push({ ...category, image: await resolve(category.image) });
    }
    const products = [];
    for (const product of catalogue.products || []) {
      const images = [];
      for (const image of product.images || []) {
        images.push({ ...image, url: await resolve(image && image.url) });
      }
      products.push({ ...product, images });
    }
    return { ...catalogue, categories, products };
  }

  return { resolve, resolveCatalogueImages };
}

module.exports = {
  SEED_IMAGE_PREFIX,
  isSeedLocalPath,
  cloudinaryConfigured,
  defaultImageRoots,
  createSeedImageResolver,
};
