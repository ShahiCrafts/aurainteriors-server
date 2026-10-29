const crypto = require("crypto");
const ChatUpload = require("../models/chatUpload.model");
const ChatMessage = require("../models/chatMessage.model");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");
const {
  MAX_ATTACHMENT_BYTES,
  matchesFileType,
} = require("../utils/chatAttachmentPolicy");
const AppError = require("../utils/AppError");
const ONE_DAY = 24 * 60 * 60 * 1000;
const actorKey = (userId, guestSessionId) =>
  crypto
    .createHash("sha256")
    .update(userId ? `user:${userId}` : `guest:${guestSessionId || ""}`)
    .digest("hex");

async function uploadAttachment(chatId, actor, file) {
  if (
    !file ||
    file.size <= 0 ||
    file.size > MAX_ATTACHMENT_BYTES ||
    !matchesFileType(file.buffer, file.mimetype)
  ) {
    throw new AppError(
      "Upload a valid JPEG, PNG, WebP, GIF or PDF up to 10 MB",
      400,
    );
  }
  const resourceType = file.mimetype === "application/pdf" ? "raw" : "image";
  const result = await uploadToCloudinary(file.buffer, {
    folder: "aura/chat",
    resource_type: resourceType,
    public_id: `${crypto.randomUUID()}${resourceType === "raw" ? ".pdf" : ""}`,
  });
  const expiresAt = new Date(Date.now() + ONE_DAY);
  try {
    await ChatUpload.create({
      chat: chatId,
      actor,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType,
      expiresAt,
    });
  } catch (error) {
    await deleteFromCloudinary(result.public_id, resourceType);
    throw error;
  }
  return {
    expiresAt,
    attachment: {
      fileName:
        file.originalname.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255) ||
        "Attachment",
      fileUrl: result.secure_url,
      fileType: resourceType === "raw" ? "document" : "image",
      fileSize: result.bytes || file.size,
    },
  };
}

async function retainAttachments(chatId, actor, attachments) {
  for (const attachment of attachments) {
    const upload = await ChatUpload.findOne({ url: attachment.fileUrl });
    if (!upload) continue; // Previously uploaded attachments remain compatible.
    if (String(upload.chat) !== String(chatId) || upload.actor !== actor)
      throw new AppError("Attachment does not belong to this chat", 403);
    const retained = await ChatUpload.updateOne(
      { _id: upload._id, state: "available", expiresAt: { $gt: new Date() } },
      { $set: { expiresAt: new Date(Date.now() + ONE_DAY) } },
    );
    if (retained.matchedCount !== 1)
      throw new AppError("Attachment expired. Upload it again.", 400);
  }
}

async function cleanupExpiredUploads(now = new Date()) {
  const candidates = await ChatUpload.find({ expiresAt: { $lte: now } }).limit(
    50,
  );
  for (const candidate of candidates) {
    const upload = await ChatUpload.findOneAndUpdate(
      {
        _id: candidate._id,
        expiresAt: { $lte: now },
        $or: [
          { state: "available" },
          {
            state: "deleting",
            cleanupClaimedAt: { $lt: new Date(now.getTime() - 10 * 60 * 1000) },
          },
        ],
      },
      { $set: { state: "deleting", cleanupClaimedAt: now } },
      { returnDocument: "after" },
    );
    if (!upload) continue;
    try {
      if (await ChatMessage.exists({ "attachments.fileUrl": upload.url })) {
        await ChatUpload.deleteOne({ _id: upload._id }); // Keep media referenced by a saved message.
        continue;
      }
      const deleted = await deleteFromCloudinary(
        upload.publicId,
        upload.resourceType,
      );
      if (deleted && ["ok", "not found"].includes(deleted.result))
        await ChatUpload.deleteOne({ _id: upload._id });
      else
        await ChatUpload.updateOne(
          { _id: upload._id },
          { $set: { state: "available" } },
        );
    } catch (_error) {
      await ChatUpload.updateOne(
        { _id: upload._id },
        { $set: { state: "available" } },
      );
    }
  }
}
module.exports = {
  actorKey,
  uploadAttachment,
  retainAttachments,
  cleanupExpiredUploads,
};
