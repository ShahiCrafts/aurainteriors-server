// Seed-image Cloudinary upload (owner decision, 2026-10-29):
// scripts/seedImageUpload.js resolves the seed catalogue's local
// "/images/seed/…" paths to Cloudinary secure_urls when Cloudinary
// is configured, and falls back to the local path otherwise. The
// uploader and file reader are injected fakes — no network, no real
// Cloudinary, no real filesystem reads outside the fixtures below.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isSeedLocalPath,
  cloudinaryConfigured,
  createSeedImageResolver,
} = require("../../scripts/seedImageUpload");

const CONFIGURED = {
  CLOUDINARY_CLOUD_NAME: "demo",
  CLOUDINARY_API_KEY: "key",
  CLOUDINARY_API_SECRET: "secret",
};

const fakeReadFile = (files) => async (p) => {
  const key = Object.keys(files).find((k) => p.endsWith(k));
  if (key) return files[key];
  const err = new Error("ENOENT");
  err.code = "ENOENT";
  throw err;
};

test("isSeedLocalPath matches only seed-local paths", () => {
  assert.equal(isSeedLocalPath("/images/seed/seed-sofa.webp"), true);
  assert.equal(isSeedLocalPath("https://res.cloudinary.com/x.jpg"), false);
  assert.equal(isSeedLocalPath("/images/other/pic.webp"), false);
  assert.equal(isSeedLocalPath(null), false);
});

test("cloudinaryConfigured requires all three credentials", () => {
  assert.equal(cloudinaryConfigured(CONFIGURED), true);
  assert.equal(cloudinaryConfigured({ CLOUDINARY_CLOUD_NAME: "demo" }), false);
  assert.equal(cloudinaryConfigured({}), false);
});

test("without Cloudinary config the local path is kept and nothing uploads", async () => {
  let uploads = 0;
  const resolver = createSeedImageResolver({
    env: {},
    roots: ["/web/public"],
    readFile: fakeReadFile({ "seed-sofa.webp": Buffer.from("x") }),
    upload: async () => {
      uploads += 1;
      return { secure_url: "https://res.cloudinary.com/demo/seed-sofa" };
    },
    log: () => {},
  });
  assert.equal(
    await resolver.resolve("/images/seed/seed-sofa.webp"),
    "/images/seed/seed-sofa.webp",
  );
  assert.equal(uploads, 0);
});

test("configured: uploads once per distinct file and returns the secure_url", async () => {
  const seen = [];
  const resolver = createSeedImageResolver({
    env: CONFIGURED,
    roots: ["/web/public"],
    readFile: fakeReadFile({ "seed-sofa.webp": Buffer.from("img") }),
    upload: async (buffer, options) => {
      seen.push(options);
      return {
        secure_url:
          "https://res.cloudinary.com/demo/image/upload/aura-interiors/seed/seed-sofa",
      };
    },
    log: () => {},
  });
  const a = await resolver.resolve("/images/seed/seed-sofa.webp");
  const b = await resolver.resolve("/images/seed/seed-sofa.webp");
  assert.match(a, /^https:\/\/res\.cloudinary\.com\//);
  assert.equal(a, b);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].folder, "aura-interiors/seed");
  assert.equal(seen[0].public_id, "seed-sofa");
});

test("missing file and upload failure both fall back to the local path", async () => {
  const missing = createSeedImageResolver({
    env: CONFIGURED,
    roots: ["/web/public"],
    readFile: fakeReadFile({}),
    upload: async () => ({ secure_url: "https://res.cloudinary.com/demo/x" }),
    log: () => {},
  });
  assert.equal(
    await missing.resolve("/images/seed/seed-gone.webp"),
    "/images/seed/seed-gone.webp",
  );

  const failing = createSeedImageResolver({
    env: CONFIGURED,
    roots: ["/web/public"],
    readFile: fakeReadFile({ "seed-sofa.webp": Buffer.from("img") }),
    upload: async () => {
      throw new Error("cloudinary down");
    },
    log: () => {},
  });
  assert.equal(
    await failing.resolve("/images/seed/seed-sofa.webp"),
    "/images/seed/seed-sofa.webp",
  );
});

test("non-seed values pass through untouched", async () => {
  const resolver = createSeedImageResolver({
    env: CONFIGURED,
    roots: ["/web/public"],
    readFile: fakeReadFile({}),
    upload: async () => {
      throw new Error("must not be called");
    },
    log: () => {},
  });
  assert.equal(
    await resolver.resolve("https://res.cloudinary.com/demo/image/upload/sofa.jpg"),
    "https://res.cloudinary.com/demo/image/upload/sofa.jpg",
  );
  assert.equal(await resolver.resolve(undefined), undefined);
});

test("resolveCatalogueImages rewrites category + product images without mutating the input", async () => {
  const resolver = createSeedImageResolver({
    env: CONFIGURED,
    roots: ["/web/public"],
    readFile: fakeReadFile({
      "seed-sofa.webp": Buffer.from("a"),
      "seed-bed.webp": Buffer.from("b"),
    }),
    upload: async (buffer, options) => ({
      secure_url: `https://res.cloudinary.com/demo/image/upload/${options.public_id}`,
    }),
    log: () => {},
  });
  const catalogue = {
    version: "test",
    categories: [{ key: "c1", image: "/images/seed/seed-sofa.webp" }],
    products: [
      {
        sku: "SKU-1",
        images: [
          { url: "/images/seed/seed-bed.webp", alt: "bed", isPrimary: true },
          { url: "https://res.cloudinary.com/demo/existing.jpg", alt: "kept" },
        ],
      },
    ],
  };
  const resolved = await resolver.resolveCatalogueImages(catalogue);
  assert.equal(
    resolved.categories[0].image,
    "https://res.cloudinary.com/demo/image/upload/seed-sofa",
  );
  assert.equal(
    resolved.products[0].images[0].url,
    "https://res.cloudinary.com/demo/image/upload/seed-bed",
  );
  assert.equal(resolved.products[0].images[0].alt, "bed");
  assert.equal(
    resolved.products[0].images[1].url,
    "https://res.cloudinary.com/demo/existing.jpg",
  );
  // Input untouched (the seed data literal is the owner's dataset).
  assert.equal(catalogue.categories[0].image, "/images/seed/seed-sofa.webp");
  assert.equal(
    catalogue.products[0].images[0].url,
    "/images/seed/seed-bed.webp",
  );
});

test("seedCatalogue completes with a URL-rewriting resolver and stores the Cloudinary URLs (regression: end-of-run revalidation)", async () => {
  const { seedCatalogue } = require("../../scripts/seed");
  const { createSeedImageResolver } = require("../../scripts/seedImageUpload");

  // Minimal in-memory model stand-ins: seedCatalogue only needs
  // findOne / constructor / save.
  const makeModel = () => {
    const docs = [];
    class FakeDoc {
      constructor(payload) {
        Object.assign(this, payload);
        docs.push(this);
      }
      async save() {
        return this;
      }
    }
    FakeDoc.findOne = async () => null;
    FakeDoc.docs = docs;
    return FakeDoc;
  };
  const Category = makeModel();
  const Product = makeModel();

  const description = "A ".repeat(300); // 600 chars: >= 500, <= 5000
  const catalogue = {
    version: "test",
    currency: "NPR",
    categories: [
      {
        key: "living-room",
        name: "Living Room",
        slug: "living-room",
        parentKey: null,
        depth: 0,
        description: "Living room category",
        image: "/images/seed/seed-sofa.webp",
        sortOrder: 1,
        status: "active",
      },
      {
        key: "sofas",
        name: "Sofas",
        slug: "sofas",
        parentKey: "living-room",
        depth: 1,
        description: "Sofas category",
        image: "/images/seed/seed-sofa.webp",
        sortOrder: 1,
        status: "active",
      },
    ],
    products: [
      {
        name: "Test Sofa",
        slug: "test-sofa",
        sku: "AUR-DEMO-TEST-01",
        categoryKey: "sofas",
        description,
        shortDescription: "A test sofa",
        metaTitle: "Test Sofa",
        metaDescription: "A test sofa product",
        price: 1000,
        stock: 3,
        status: "active",
        style: "modern",
        dimensions: { width: 100, height: 80, depth: 90, unit: "cm" },
        weight: { value: 20, unit: "kg" },
        images: [
          { url: "/images/seed/seed-sofa.webp", alt: "sofa", isPrimary: true },
        ],
        modelFiles: [],
        arAvailable: false,
        rating: { average: 0, count: 0 },
      },
    ],
  };

  const imageResolver = createSeedImageResolver({
    env: CONFIGURED,
    roots: ["/web/public"],
    readFile: fakeReadFile({ "seed-sofa.webp": Buffer.from("img") }),
    upload: async () => ({
      secure_url:
        "https://res.cloudinary.com/demo/image/upload/aura-interiors/seed/seed-sofa",
    }),
    log: () => {},
  });

  const result = await seedCatalogue({
    Category,
    Product,
    catalogue,
    imageResolver,
  });

  assert.equal(result.categoriesCreated, 2);
  assert.equal(result.productsCreated, 1);
  assert.equal(
    Category.docs[0].image,
    "https://res.cloudinary.com/demo/image/upload/aura-interiors/seed/seed-sofa",
  );
  assert.equal(
    Product.docs[0].images[0].url,
    "https://res.cloudinary.com/demo/image/upload/aura-interiors/seed/seed-sofa",
  );
  // Authored data still carries the local reference path.
  assert.equal(
    catalogue.products[0].images[0].url,
    "/images/seed/seed-sofa.webp",
  );
});
