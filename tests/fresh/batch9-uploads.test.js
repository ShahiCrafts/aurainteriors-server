// Batch 9 (FRESH remediation): FA-21, FA-22, FA-23, FA-24, FA-50, FA-52,
// FA-53, FA-68, FA-79.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");

test("FA-52: sanitizer survives out-of-range numeric character references", () => {
  const { sanitizeArticleHtml } = require(
    path.join(repo, "utils/sanitizeArticleHtml.js"),
  );
  const html = `<p title="&#x110000;">a</p><p title="&#99999999999999999999;">b</p><p>&#xD800; c</p>`;
  let out;
  assert.doesNotThrow(() => {
    out = sanitizeArticleHtml(html);
  });
  assert.ok(out.includes("a") && out.includes("b") && out.includes("c"));
});

test("FA-53: self-closing or unclosed drop-tags cannot swallow the article", () => {
  const { sanitizeArticleHtml } = require(
    path.join(repo, "utils/sanitizeArticleHtml.js"),
  );
  const selfClosing = sanitizeArticleHtml(
    `<script src="https://evil.example/x.js" /><p>hello world</p>`,
  );
  assert.ok(
    selfClosing.includes("hello world"),
    `self-closing script dropped only itself: ${selfClosing}`,
  );
  const unclosed = sanitizeArticleHtml(
    `<script>${"x".repeat(100500)}<p>after the drop</p>`,
  );
  assert.ok(
    unclosed.includes("after the drop"),
    "recovery after the drop-region cap",
  );
  const normal = sanitizeArticleHtml(`<script>alert(1)</script><p>kept</p>`);
  assert.ok(
    !normal.includes("alert(1)") && normal.includes("kept"),
    "ordinary script still dropped with contents",
  );
});

test("FA-79: isDocxBuffer requires word/document.xml inside the ZIP", async () => {
  const JSZip = require("jszip");
  const { isDocxBuffer } = require(path.join(repo, "utils/fileSniff.js"));
  const docx = new JSZip();
  docx.file("word/document.xml", "<w:document/>");
  docx.file("[Content_Types].xml", "<Types/>");
  assert.equal(
    await isDocxBuffer(await docx.generateAsync({ type: "nodebuffer" })),
    true,
  );
  const plainZip = new JSZip();
  plainZip.file("sheet.xml", "<workbook/>");
  assert.equal(
    await isDocxBuffer(await plainZip.generateAsync({ type: "nodebuffer" })),
    false,
    "an .xlsx-style zip is not a docx",
  );
  assert.equal(await isDocxBuffer(Buffer.from("not a zip at all")), false);
});

function docReq(originalname, buffer) {
  return {
    file: {
      originalname,
      buffer,
      size: buffer.length,
      mimetype: "application/octet-stream",
    },
  };
}
async function runMw(mw, req) {
  return new Promise((resolve) => mw(req, {}, (e) => resolve(e || null)));
}

test("FA-22: document upload allowlists the extension before anything else", async () => {
  const mw = require(path.join(repo, "middleware/upload.middleware.js"));
  const err = await runMw(
    mw.processDocumentFile,
    docReq("evil.html", Buffer.from("<html>hi</html>")),
  );
  assert.ok(
    err && err.statusCode === 400 && /Only \.pdf/.test(err.message),
    `got ${err && err.message}`,
  );
  const err2 = await runMw(
    mw.processDocumentFile,
    docReq("archive.zip", Buffer.from("PK\x03\x04junk")),
  );
  assert.ok(err2 && err2.statusCode === 400);
});

test("FA-79: a non-Word ZIP named .docx is rejected at upload", async () => {
  const JSZip = require("jszip");
  const zip = new JSZip();
  zip.file("xl/workbook.xml", "<workbook/>");
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const mw = require(path.join(repo, "middleware/upload.middleware.js"));
  const err = await runMw(mw.processDocumentFile, docReq("sheet.docx", buffer));
  assert.ok(
    err && err.statusCode === 400 && /Word document/.test(err.message),
    `got ${err && err.message}`,
  );
});

test("FA-21: CATEGORY_SVG_POLICY=reject refuses SVG category images", async () => {
  process.env.CATEGORY_SVG_POLICY = "reject";
  const mw = require(path.join(repo, "middleware/upload.middleware.js"));
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
  );
  const err = await runMw(mw.resizeCategoryImage, {
    file: { buffer: svg, originalname: "x.svg", mimetype: "image/svg+xml" },
  });
  assert.ok(
    err && err.statusCode === 400 && /SVG/.test(err.message),
    `got ${err && err.message}`,
  );
  delete process.env.CATEGORY_SVG_POLICY;
});

test("FA-21: by default an SVG category image is rasterized to PNG before upload", async () => {
  delete process.env.CATEGORY_SVG_POLICY;
  const { stubModule } = require("../audit/helpers");
  let uploaded = null;
  const stubbedPath = stubModule("config/cloudinary.js", {
    uploadToCloudinary: async (buffer) => {
      uploaded = buffer;
      return {
        secure_url: "https://cdn.example/x.png",
        public_id: "category-1",
      };
    },
    deleteFromCloudinary: async () => {},
  });
  delete require.cache[path.join(repo, "middleware/upload.middleware.js")];
  const mw = require(path.join(repo, "middleware/upload.middleware.js"));
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>`,
  );
  const err = await runMw(mw.resizeCategoryImage, {
    file: { buffer: svg, originalname: "x.svg", mimetype: "image/svg+xml" },
  });
  assert.equal(err, null, `unexpected error: ${err && err.message}`);
  assert.ok(uploaded, "an upload happened");
  assert.deepEqual(
    [...uploaded.subarray(0, 4)],
    [0x89, 0x50, 0x4e, 0x47],
    "uploaded bytes are PNG, not the original SVG",
  );
  delete require.cache[stubbedPath];
  delete require.cache[path.join(repo, "middleware/upload.middleware.js")];
});

test("FA-24: legacy chat attachment exports are gone", () => {
  const mw = require(path.join(repo, "middleware/upload.middleware.js"));
  assert.equal(mw.uploadChatAttachment, undefined);
  assert.equal(mw.processChatAttachment, undefined);
});

test("FA-23: product create/update chains end with an upload-cleanup error handler", () => {
  const router = require(path.join(repo, "routes/product.routes.js"));
  for (const [method, p] of [
    ["post", "/"],
    ["patch", "/:id"],
  ]) {
    const layer = router.stack.find(
      (l) => l.route && l.route.path === p && l.route.methods[method],
    );
    assert.ok(layer, `${method} ${p} exists`);
    const handles = layer.route.stack.map((s) => s.handle);
    const mw = require(path.join(repo, "middleware/upload.middleware.js"));
    assert.equal(
      handles[2],
      mw.processProductFiles,
      "processing runs third, after multer + validation",
    );
    assert.equal(
      handles[handles.length - 1].length,
      4,
      "last handler is a 4-arg error handler (cleanup)",
    );
    assert.equal(
      handles[handles.length - 1].name,
      "cleanupUploadedProductFiles",
    );
  }
});
