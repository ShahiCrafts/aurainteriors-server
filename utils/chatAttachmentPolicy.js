const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];
function matchesFileType(buffer, mime) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (mime === "image/jpeg")
    return (
      buffer.length >= 3 &&
      buffer[0] === 255 &&
      buffer[1] === 216 &&
      buffer[2] === 255
    );
  if (mime === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp")
    return (
      buffer.subarray(0, 4).toString() === "RIFF" &&
      buffer.subarray(8, 12).toString() === "WEBP"
    );
  if (mime === "image/gif")
    return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString());
  if (mime === "application/pdf")
    return buffer.subarray(0, 5).toString() === "%PDF-";
  return false;
}
module.exports = { MAX_ATTACHMENT_BYTES, MIME_TYPES, matchesFileType };
