const crypto = require("crypto");
const ChatService = require("../services/chatService");
const GuestSession = require("../models/guestSession.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const runtimeContext = require("../services/runtimeContext"); // AR-33: explicit registry, not globals

// Helper to extract guest session ID from request. FA-33: bearer
// credentials do not belong in URLs (they leak into logs, history and
// Referer headers). Owner-approved 2026-10-23: the query-string
// source is OFF by default and accepted only when
// GUEST_SESSION_ALLOW_QUERY=1 (a legacy escape hatch for a client
// that provably needs it). Header/cookie/body are always accepted
// and take precedence. See OWNER_DECISIONS.md (D-3, decided).
const getGuestSessionId = (req) => {
  const fromQuery = require("../config/appConfig").getString("GUEST_SESSION_ALLOW_QUERY") === "1" ? req.query?.guestSessionId : undefined;
  return req.headers?.['x-guest-session-id'] || req.cookies?.guestSessionId || req.body?.guestSessionId || fromQuery;
};
exports._getGuestSessionId = getGuestSessionId; // exported for tests

// ==================== CUSTOMER OPERATIONS ====================

/**
 * Retired direct-upload endpoint; new attachments use authorized server uploads
 */
exports.getUploadSignature = (_req, res) => res.status(410).json({ status: "fail", message: "Use the chat attachment upload endpoint" });
exports.uploadAttachment = catchAsync(async (req, res) => {
  const data = await require("../services/chatUpload.service").uploadAttachment(req.params.id, req.attachmentActor, req.file);
  res.status(201).json({ status: "success", data });
});

/**
 * Start a new chat (Customer or Guest)
 */
exports.startChat = catchAsync(async (req, res, next) => {
  const { subject, guestEmail } = req.body;
  // FA-39: network metadata is derived server-side, never taken from the
  // request body (a client could otherwise forge another user's IP/UA).
  const metadata = {
    ...(req.body.metadata || {}),
    userAgent: String(req.get?.("user-agent") || "").slice(0, 512),
    ipAddress: req.ip || "",
    referrer: String(req.get?.("referer") || req.get?.("referrer") || "").slice(0, 512),
  };


  if (req.isAuthenticated) {
    // Authenticated user
    const chat = await ChatService.createChat(req.user._id, {
      subject,
      metadata,
    });

    res.status(201).json({
      status: "success",
      message: "Chat started successfully",
      data: { chat },
    });
  } else {
    // Guest user - the browser stores a public session key (guest_...), while
    // Chat.guestSession stores the GuestSession Mongo ObjectId. Resolve/create
    // the session here and always return the public key to the browser.
    const suppliedGuestSessionId = getGuestSessionId(req);
    let guestSession = suppliedGuestSessionId
      ? await ChatService.resolveGuestSession(suppliedGuestSessionId)
      : null;

    if (!guestSession) {
      guestSession = await GuestSession.create({
        sessionId: `guest_${crypto.randomBytes(32).toString("hex")}`,
        email: guestEmail || null,
      });
    } else if (guestEmail && !guestSession.email) {
      await GuestSession.updateOne({ _id: guestSession._id, email: null }, { $set: { email: guestEmail } });
    }

    const chat = await ChatService.createGuestChat(guestSession.sessionId, {
      subject,
      metadata,
    });

    res.status(201).json({
      status: "success",
      message: "Chat started successfully",
      data: { 
        chat,
        guestSessionId: guestSession.sessionId, // Public key; never expose/reuse Mongo _id as browser identity
      },
    });
  }
});

/**
 * Get customer's chats (Authenticated users only)
 */
exports.getMyChats = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;

  const result = await ChatService.getCustomerChats(req.user._id, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    status,
  });

  res.status(200).json({
    status: "success",
    data: {
      chats: result.chats,
      pagination: result.pagination,
    },
  });
});

/**
 * Get chat details (Customer/Guest/Admin)
 */
exports.getChatDetails = catchAsync(async (req, res, next) => {
  const guestSessionId = getGuestSessionId(req);
  
  const chat = await ChatService.getChatById(
    req.params.id,
    req.user?._id,
    req.user?.role || 'guest',
    guestSessionId
  );

  res.status(200).json({
    status: "success",
    data: { chat },
  });
});

/**
 * Get chat messages (Customer/Guest/Admin)
 */
exports.getChatMessages = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;
  const guestSessionId = getGuestSessionId(req);

  const result = await ChatService.getChatMessages(
    req.params.id,
    req.user?._id,
    req.user?.role || 'guest',
    guestSessionId,
    {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    }
  );

  res.status(200).json({
    status: "success",
    data: {
      messages: result.messages,
      pagination: result.pagination,
    },
  });
});

/**
 * Send message in chat (Customer/Guest/Admin)
 */
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { content, attachments, clientMessageId } = req.body;
  const guestSessionId = getGuestSessionId(req);

  // FA-14: attachments are validated with the SAME strict rules the
  // update-attachments path enforces (https only, bounded fields, max 3) -
  // previously any object with a truthy fileUrl/fileName was passed through.
  const { validateChatAttachments } = require("../utils/chatAttachments");
  const processedAttachments = attachments === undefined ? [] : validateChatAttachments(attachments);
  if (processedAttachments === null) {
    return next(new AppError("Provide valid uploaded attachments (max 3, https URLs)", 400));
  }

  // Ensure either content or attachments is provided
  if ((!content || !content.trim()) && processedAttachments.length === 0) {
    return next(new AppError("Message content or attachments required", 400));
  }

  if (processedAttachments.length) {
    const { actorKey, retainAttachments } = require("../services/chatUpload.service");
    await retainAttachments(req.params.id, actorKey(req.user?._id, guestSessionId), processedAttachments);
  }

  const message = await ChatService.sendMessage(
    req.params.id,
    req.user?._id,
    req.user?.role || 'customer',
    {
      content,
      attachments: processedAttachments,
      clientMessageId,
    },
    guestSessionId
  );

  res.status(202).json({
    status: "success",
    message: "Message accepted",
    data: { message },
  });
});

/**
 * Mark messages as read (Customer/Guest/Admin)
 */
exports.markMessagesRead = catchAsync(async (req, res, next) => {
  const guestSessionId = getGuestSessionId(req);

  const result = await ChatService.markMessagesAsRead(
    req.params.id,
    req.user?._id,
    req.user?.role || 'customer',
    guestSessionId
  );

  res.status(200).json({
    status: "success",
    message: "Messages marked as read",
    data: { modifiedCount: result.modifiedCount },
  });
});

/**
 * Close chat (Customer/Guest/Admin)
 */
exports.closeChat = catchAsync(async (req, res, next) => {
  const guestSessionId = getGuestSessionId(req);

  const chat = await ChatService.closeChat(
    req.params.id,
    req.user?._id,
    req.user?.role || 'customer',
    guestSessionId
  );

  res.status(200).json({
    status: "success",
    message: "Chat closed successfully",
    data: { chat },
  });
});

// ==================== ADMIN OPERATIONS ====================

/**
 * Get all chats (Admin)
 */
exports.getAllChats = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, priority, sortBy } = req.query;

  const result = await ChatService.getAllChats({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    status,
    priority,
    sortBy,
  });

  res.status(200).json({
    status: "success",
    data: {
      chats: result.chats,
      pagination: result.pagination,
    },
  });
});

/**
 * Get waiting queue (Admin)
 */
exports.getWaitingQueue = catchAsync(async (req, res, next) => {
  const chats = await ChatService.getWaitingQueue();

  res.status(200).json({
    status: "success",
    data: { chats },
  });
});

/**
 * Resolve chat (Admin)
 */
exports.resolveChat = catchAsync(async (req, res, next) => {
  const chat = await ChatService.resolveChat(req.params.id, req.user._id);

  res.status(200).json({
    status: "success",
    message: "Chat resolved successfully",
    data: { chat },
  });
});

/**
 * Get chat statistics (Admin)
 */
exports.getChatStats = catchAsync(async (req, res, next) => {
  const stats = await ChatService.getChatStats();

  res.status(200).json({
    status: "success",
    data: { stats },
  });
});

/**
 * Toggle AI Bot active state (Customer/Guest/Admin)
 */
exports.toggleBot = catchAsync(async (req, res, next) => {
  const { botActive } = req.body;
  const guestSessionId = getGuestSessionId(req);

  const chat = await ChatService.toggleBot(
    req.params.id,
    req.user?._id,
    req.user?.role || 'customer',
    guestSessionId,
    botActive
  );

  res.status(200).json({
    status: "success",
    message: `AI Bot ${botActive ? "enabled" : "disabled"} successfully`,
    data: { chat },
  });
});

/**
 * Update message attachments with real URLs after Cloudinary upload completes
 * Called after client-side upload succeeds to sync real URLs back to DB
 * (Customer/Guest/Admin)
 */
exports.updateMessageAttachments = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const { attachments } = req.body;
  const guestSessionId = getGuestSessionId(req);

  if (!messageId) {
    return next(new AppError("Message ID is required", 400));
  }

  if (!Array.isArray(attachments)) {
    return next(new AppError("Attachments must be an array", 400));
  }

  // FA-14: shared strict validator (utils/chatAttachments).
  const { validateChatAttachments } = require("../utils/chatAttachments");
  const validAttachments = validateChatAttachments(attachments);
  if (!validAttachments || validAttachments.length < 1) return next(new AppError("Provide 1–3 valid uploaded attachments", 400));

  const ChatMessage = require("../models/chatMessage.model");
  const message = await ChatMessage.findOne({ _id: messageId, deletedAt: null }).populate("chat");
  if (!message?.chat) return next(new AppError("Message not found", 404));
  const chat = message.chat;
  const authorized = await ChatService.authorizeChat(chat._id, req.user?._id,
    req.user?.role || "customer", req.user ? null : guestSessionId);
  if (!authorized) return next(new AppError("You cannot update this message", 403));

  const ownership = { _id: messageId, chat: chat._id, deletedAt: null, isAiGenerated: false };
  if (req.user) {
    ownership.sender = req.user._id;
    ownership.senderRole = req.user.role;
    ownership.senderGuestSession = null;
  } else {
    const guest = await ChatService.resolveGuestSession(guestSessionId);
    if (!guest) return next(new AppError("You cannot update this message", 403));
    ownership.senderGuestSession = guest._id;
    ownership.senderRole = "customer";
  }
  // Check authorship in the write predicate, including guests whose sender
  // placeholder is shared. Chat participation alone does not authorize edits.
  const updatedMessage = await ChatMessage.findOneAndUpdate(ownership,
    { $set: { attachments: validAttachments } }, { new: true, runValidators: true })
    .populate("sender", "firstName lastName role avatar"); // FA-58: no sender email to chat participants
  if (!updatedMessage) return next(new AppError("Message not found or not authored by you", 404));

  // Broadcast update via socket. S-9/AR-07: the previous code required
  // ../services/socketService, which does not exist anywhere in the
  // repo - the require threw on every call, the broadcast never fired,
  // and the catch logged "Failed to broadcast socket update". Emit
  // through the real gateway, the way every other chat broadcast does.
  try {
    runtimeContext.getIo()?.to(`chat:${chat._id.toString()}`).emit('message:attachments:updated', { // AR-33: registry, not global.notificationGateway
      chatId: chat._id.toString(),
      message: updatedMessage,
      messageId: messageId.toString(),
    });
  } catch (error) {
    console.error("Failed to broadcast socket update:", error.message);
    // Don't fail the response if socket broadcast fails
  }

  res.status(200).json({
    status: "success",
    message: "Message attachments updated successfully",
    data: { message: updatedMessage },
  });
});

module.exports = exports;
