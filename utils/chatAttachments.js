// FA-14 (FRESH): one strict attachment validator for every chat write path.
// Previously sendMessage accepted any object with a truthy fileUrl/fileName
// while updateMessageAttachments enforced the strict rules below; the loose
// path let arbitrary URLs be persisted and broadcast as message attachments.
// Returns a sanitized array (only the four known fields), or null when any
// entry is invalid. An empty array is valid (a message may have no files).
const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateChatAttachments(attachments) {
  if (!Array.isArray(attachments)) return null;
  if (attachments.length > MAX_ATTACHMENTS) return null;
  const clean = [];
  for (const att of attachments) {
    if (!att || typeof att !== "object") return null;
    const { fileName, fileUrl, fileType, fileSize } = att;
    if (typeof fileName !== "string" || !fileName || fileName.length > 255)
      return null;
    if (
      typeof fileUrl !== "string" ||
      !/^https:\/\//.test(fileUrl) ||
      fileUrl.length > 2048
    )
      return null;
    if (typeof fileType !== "string" || !fileType || fileType.length > 50)
      return null;
    if (
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    )
      return null;
    clean.push({ fileName, fileUrl, fileType, fileSize });
  }
  return clean;
}

module.exports = { validateChatAttachments, MAX_ATTACHMENTS, MAX_FILE_SIZE };
