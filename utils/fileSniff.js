// Content-based file type detection (magic bytes), used by the upload
// middleware. The client-supplied MIME type and filename are claims;
// these helpers check what the bytes actually are. Raster detection
// reuses the chat pipeline's matchesFileType so there is one definition.
const { matchesFileType } = require("./chatAttachmentPolicy");

exports.detectImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (matchesFileType(buffer, "image/jpeg")) return "jpeg";
  if (matchesFileType(buffer, "image/png")) return "png";
  if (matchesFileType(buffer, "image/webp")) return "webp";
  if (matchesFileType(buffer, "image/gif")) return "gif";
  // SVG has no magic bytes (it is XML text). Detect an <svg> root in the
  // first chunk. Whether SVG is *accepted* is a per-path policy decision
  // (see ND-3 in AUDIT_STATE.md); detection only reports the truth.
  const head = buffer
    .subarray(0, 1024)
    .toString("utf8")
    .trimStart()
    .toLowerCase();
  if (
    head.startsWith("<svg") ||
    (head.startsWith("<?xml") && head.includes("<svg"))
  )
    return "svg";
  return null;
};

const isTextBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.includes(0))
    return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
};

// For the knowledge-base document path, whose allowed types are
// pdf / docx (zip container) / plain text (txt, csv).
exports.detectDocumentType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (matchesFileType(buffer, "application/pdf")) return "pdf";
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  )
    return "docx";
  if (isTextBuffer(buffer)) return "text";
  return null;
};

// 3D model content checks per extension.
exports.matchesModelFile = (buffer, ext) => {
  if (!Buffer.isBuffer(buffer)) return false;
  if (ext === "glb")
    return buffer.length >= 4 && buffer.subarray(0, 4).toString() === "glTF";
  if (ext === "usdz")
    return (
      buffer.length >= 4 &&
      buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    );
  if (ext === "gltf") {
    try {
      const parsed = JSON.parse(buffer.toString("utf8"));
      return Boolean(
        parsed && parsed.asset && typeof parsed.asset.version === "string",
      );
    } catch {
      return false;
    }
  }
  return false;
};

// FA-79: a DOCX is a ZIP with a specific member. detectDocumentType only
// sees the ZIP magic, so ANY archive (an .xlsx, a random .zip) was
// classified "docx". This verifies the container actually carries
// word/document.xml (central directory only - nothing is inflated).
exports.isDocxBuffer = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  try {
    const JSZip = require("jszip");
    const zip = await JSZip.loadAsync(buffer);
    return Boolean(zip.file("word/document.xml"));
  } catch {
    return false;
  }
};
